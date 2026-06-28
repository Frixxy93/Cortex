/// CORTEX VFX Bridge — clean rewrite
/// WebSocket server on ws://127.0.0.1:7878
/// DCC connects → sends HELLO → CORTEX asks for nodes → DCC sends NODE_CATALOGUE

use std::{
    collections::HashMap,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

use crate::error::CortexError;

// ── Public types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeNode {
    pub name:         String,
    pub display_name: String,
    pub category:     String,
    #[serde(default)]
    pub description:  String,
    #[serde(default)]
    pub max_inputs:   u32,
    #[serde(default = "one")]
    pub max_outputs:  u32,
}
fn one() -> u32 { 1 }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedClient {
    pub id:       String,
    pub software: String,
    pub version:  String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedSoftware {
    pub id:      String,
    pub name:    String,
    pub version: String,
    pub kind:    String,
}

// ── Protocol ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
enum InMsg {
    Hello {
        software:  String,
        version:   String,
        #[serde(rename = "clientId", default)]
        client_id: String,
    },
    NodeCatalogue {
        nodes: Vec<BridgeNode>,
        #[serde(default)]
        #[allow(dead_code)]
        total: usize,
    },
    Ping,
    Pong,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
enum OutMsg {
    Welcome {
        #[serde(rename = "serverVersion")]
        server_version: String,
    },
    RequestNodes,
    Pong,
    Error { message: String },
}

// ── Engine ────────────────────────────────────────────────────────────────────

type Clients    = Arc<Mutex<HashMap<String, ConnectedClient>>>;
type NodeBuffer = Arc<Mutex<Vec<BridgeNode>>>;

pub struct BridgeEngine {
    pub port:    u16,
    clients:     Clients,
    buffer:      NodeBuffer,
    shutdown_tx: Arc<Mutex<Option<tokio::sync::broadcast::Sender<()>>>>,
}

impl BridgeEngine {
    pub fn new() -> Self {
        Self {
            port:        7878,
            clients:     Arc::new(Mutex::new(HashMap::new())),
            buffer:      Arc::new(Mutex::new(Vec::new())),
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Start WS server. Idempotent — returns port if already running.
    pub fn start(&self, on_nodes: impl Fn(usize) + Send + Sync + 'static) -> Result<u16, CortexError> {
        if self.shutdown_tx.lock().unwrap().is_some() {
            return Ok(self.port);
        }

        let port    = self.port;
        let clients = self.clients.clone();
        let buffer  = self.buffer.clone();
        let cb      = Arc::new(on_nodes);

        let (tx, _) = tokio::sync::broadcast::channel::<()>(1);
        *self.shutdown_tx.lock().unwrap() = Some(tx.clone());

        tauri::async_runtime::spawn(async move {
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            let sock = match tokio::net::TcpSocket::new_v4() {
                Ok(s)  => s,
                Err(e) => { tracing::error!("Bridge: socket error: {e}"); return; }
            };
            let _ = sock.set_reuseaddr(true);
            if let Err(e) = sock.bind(addr)  { tracing::error!("Bridge: bind: {e}"); return; }
            let listener = match sock.listen(64) {
                Ok(l)  => l,
                Err(e) => { tracing::error!("Bridge: listen: {e}"); return; }
            };
            tracing::info!("CORTEX Bridge: ws://127.0.0.1:{port}");

            loop {
                let mut rx = tx.subscribe();
                tokio::select! {
                    Ok((stream, peer)) = listener.accept() => {
                        tokio::spawn(handle_conn(
                            stream, peer,
                            clients.clone(),
                            buffer.clone(),
                            cb.clone(),
                        ));
                    }
                    _ = rx.recv() => {
                        tracing::info!("Bridge: shut down");
                        break;
                    }
                }
            }
        });

        Ok(port)
    }

    pub fn stop(&self) {
        if let Some(tx) = self.shutdown_tx.lock().unwrap().take() {
            let _ = tx.send(());
        }
        self.clients.lock().unwrap().clear();
    }

    pub fn clients(&self) -> Vec<ConnectedClient> {
        self.clients.lock().unwrap().values().cloned().collect()
    }

    /// Drain the node buffer — caller is responsible for persisting to DB.
    pub fn drain(&self) -> Vec<BridgeNode> {
        std::mem::take(&mut *self.buffer.lock().unwrap())
    }
}

// ── Connection handler ────────────────────────────────────────────────────────

async fn handle_conn(
    stream:   TcpStream,
    peer:     SocketAddr,
    clients:  Clients,
    buffer:   NodeBuffer,
    on_nodes: Arc<dyn Fn(usize) + Send + Sync>,
) {
    let ws = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { tracing::warn!("Bridge: WS handshake {peer}: {e}"); return; }
    };
    let (mut tx, mut rx) = ws.split();
    let conn_id = Uuid::new_v4().to_string();

    while let Some(Ok(msg)) = rx.next().await {
        let text = match msg {
            Message::Text(t)  => t,
            Message::Ping(d)  => { let _ = tx.send(Message::Pong(d)).await; continue; }
            Message::Close(_) => break,
            _                 => continue,
        };

        let parsed: InMsg = match serde_json::from_str(&text) {
            Ok(m)  => m,
            Err(e) => {
                tracing::warn!("Bridge: bad msg from {peer}: {e}");
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::Error { message: e.to_string() }).unwrap()
                )).await;
                continue;
            }
        };

        match parsed {
            InMsg::Hello { software, version, client_id } => {
                let id = if client_id.is_empty() { conn_id.clone() } else { client_id };
                // Clear buffer for fresh session
                buffer.lock().unwrap().clear();
                clients.lock().unwrap().insert(id.clone(), ConnectedClient {
                    id, software: software.clone(), version: version.clone(),
                });
                tracing::info!("Bridge: {software} {version} connected ({peer})");
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::Welcome {
                        server_version: env!("CARGO_PKG_VERSION").into(),
                    }).unwrap()
                )).await;
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::RequestNodes).unwrap()
                )).await;
            }
            InMsg::NodeCatalogue { nodes, .. } => {
                let count = nodes.len();
                buffer.lock().unwrap().extend(nodes);
                let total = buffer.lock().unwrap().len();
                tracing::info!("Bridge: {count} nodes received, {total} buffered");
                on_nodes(total);
            }
            InMsg::Ping => {
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::Pong).unwrap()
                )).await;
            }
            InMsg::Pong => {}
        }
    }

    tracing::info!("Bridge: {peer} disconnected");
    clients.lock().unwrap().retain(|_, c| c.id != conn_id);
}

// ── Software detection ────────────────────────────────────────────────────────

pub fn detect_software() -> Vec<DetectedSoftware> {
    let mut found = Vec::new();

    #[cfg(target_os = "windows")]
    {
        scan_dir(&mut found, "houdini",  "Houdini",        r"C:\Program Files\Side Effects Software");
        scan_dir(&mut found, "blender",  "Blender",        r"C:\Program Files\Blender Foundation");
        scan_dir(&mut found, "maya",     "Maya",           r"C:\Program Files\Autodesk");
        scan_dir(&mut found, "nuke",     "Nuke",           r"C:\Program Files");
        scan_dir(&mut found, "unreal",   "Unreal Engine",  r"C:\Program Files\Epic Games");

        // DaVinci Resolve — fixed path
        let dv = std::path::Path::new(r"C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe");
        if dv.exists() {
            found.push(DetectedSoftware {
                id: "davinci_resolve".into(), name: "DaVinci Resolve".into(),
                version: "".into(), kind: "davinci_resolve".into(),
            });
        }
    }

    found
}

#[cfg(target_os = "windows")]
fn scan_dir(out: &mut Vec<DetectedSoftware>, kind: &str, display: &str, root: &str) {
    let Ok(entries) = std::fs::read_dir(root) else { return };
    let needle = kind.replace('_', " ").to_lowercase();
    for e in entries.flatten() {
        let name  = e.file_name().to_string_lossy().to_string();
        let lower = name.to_lowercase();
        if lower.contains(&needle) && e.path().is_dir() {
            let ver = name.split_whitespace().last().unwrap_or("").to_string();
            let id  = format!("{}_{}", kind, ver.replace('.', "_"));
            // Avoid duplicates
            if out.iter().any(|s| s.id == id) { continue; }
            out.push(DetectedSoftware {
                id,
                name:    format!("{display} {ver}").trim().to_string(),
                version: ver,
                kind:    kind.to_string(),
            });
        }
    }
}

// ── Script writer ─────────────────────────────────────────────────────────────

/// Write the bridge script to ~/Documents/cortex-bridge/<kind>.py
/// and return the exec one-liner the user pastes into the DCC.
pub fn write_exec_cmd(kind: &str) -> Result<String, CortexError> {
    let script: &str = match kind {
        "houdini" => include_str!("../../../bridge-plugins/cortex_bridge_houdini.py"),
        "blender" => include_str!("../../../bridge-plugins/cortex_bridge_blender.py"),
        _         => return Err(CortexError::Io(format!("No bridge script for '{kind}'"))),
    };

    let home = home_dir().ok_or_else(|| CortexError::Io("Cannot resolve home dir".into()))?;
    let dir  = home.join("Documents").join("cortex-bridge");
    std::fs::create_dir_all(&dir).map_err(|e| CortexError::Io(e.to_string()))?;

    let path = dir.join(format!("cortex_bridge_{kind}.py"));
    std::fs::write(&path, script).map_err(|e| CortexError::Io(e.to_string()))?;

    let p = path.to_string_lossy().replace('\\', "/");
    Ok(format!("exec(open(r\"{p}\").read())"))
}

pub fn home_dir() -> Option<PathBuf> {
    std::env::var("USERPROFILE").ok().map(PathBuf::from)
        .or_else(|| std::env::var("HOME").ok().map(PathBuf::from))
}
