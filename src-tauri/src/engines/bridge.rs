/// VFX Software Bridge Engine
/// Detects installed DCC apps, runs a local WebSocket server,
/// and imports node data from connected software into CORTEX.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

use crate::error::CortexError;

pub type CortexResult<T> = Result<T, CortexError>;

// ── Software kinds ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum SoftwareKind {
    Houdini,
    Blender,
    Maya,
    Nuke,
    DaVinciResolve,
    UnrealEngine,
    Cinema4D,
    Katana,
    Substance,
    Unknown,
}

impl SoftwareKind {
    pub fn display_name(&self) -> &str {
        match self {
            Self::Houdini       => "Houdini",
            Self::Blender       => "Blender",
            Self::Maya          => "Maya",
            Self::Nuke          => "Nuke",
            Self::DaVinciResolve => "DaVinci Resolve",
            Self::UnrealEngine  => "Unreal Engine",
            Self::Cinema4D      => "Cinema 4D",
            Self::Katana        => "Katana",
            Self::Substance     => "Substance 3D",
            Self::Unknown       => "Unknown",
        }
    }

    pub fn category(&self) -> &str {
        match self {
            Self::Houdini | Self::Blender | Self::Cinema4D => "3D / VFX",
            Self::Maya              => "3D / Animation",
            Self::Nuke              => "Compositing",
            Self::DaVinciResolve    => "Color / Edit",
            Self::UnrealEngine      => "Game Engine",
            Self::Katana            => "Look Development",
            Self::Substance         => "Texturing",
            Self::Unknown           => "Other",
        }
    }
}

// ── Detected installation ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedSoftware {
    pub id:           String,
    pub kind:         SoftwareKind,
    pub display_name: String,
    pub version:      String,
    pub install_path: String,
    pub executable:   String,
    pub category:     String,
    pub is_connected: bool,
}

// ── Bridge message protocol ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BridgeMessage {
    /// DCC app → CORTEX: initial handshake
    Hello {
        software:  String,
        version:   String,
        #[serde(rename = "clientId", alias = "client_id")]
        client_id: String,
    },
    /// CORTEX → DCC: acknowledge connection
    Welcome {
        #[serde(rename = "serverVersion")]
        server_version: String,
        #[serde(rename = "clientId")]
        client_id:      String,
    },
    /// DCC → CORTEX: heartbeat
    Ping,
    /// CORTEX → DCC: heartbeat reply
    Pong,
    /// CORTEX → DCC: request all node type definitions
    RequestNodes,
    /// DCC → CORTEX: full node type catalogue
    NodeCatalogue {
        nodes: Vec<BridgeNode>,
        total: usize,
    },
    /// CORTEX → DCC: request current scene graph
    RequestScene,
    /// DCC → CORTEX: current scene graph
    SceneGraph {
        nodes:       Vec<SceneNode>,
        connections: Vec<SceneConnection>,
    },
    /// DCC → CORTEX: live event
    NodeEvent {
        event:   String,
        node:    Option<SceneNode>,
        #[serde(rename = "nodeId", alias = "node_id")]
        node_id: Option<String>,
    },
    /// Generic error
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeNode {
    pub name:         String,
    pub display_name: String,
    pub category:     String,
    pub description:  Option<String>,
    #[serde(default)]
    pub tags:         Vec<String>,
    #[serde(default)]
    pub max_inputs:   u32,
    #[serde(default = "default_one")]
    pub max_outputs:  u32,
    #[serde(default)]
    pub parameters:   Vec<BridgeParm>,
}

fn default_one() -> u32 { 1 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeParm {
    pub name:    String,
    pub label:   String,
    pub ptype:   String,
    pub default: Option<serde_json::Value>,
    #[serde(default)]
    pub options: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneNode {
    pub id:           String,
    pub name:         String,
    pub node_type:    String,
    pub category:     String,
    pub position:     [f32; 2],
    pub parameters:   HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneConnection {
    pub from_node:   String,
    pub from_output: u32,
    pub to_node:     String,
    pub to_input:    u32,
}

// ── Connected client state ────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ConnectedClient {
    pub client_id:    String,
    pub software:     String,
    pub version:      String,
    pub connected_at: chrono::DateTime<chrono::Utc>,
}

// ── Bridge engine ─────────────────────────────────────────────────────────────

pub type ClientMap = Arc<Mutex<HashMap<String, ConnectedClient>>>;
pub type NodeBuffer = Arc<Mutex<Vec<BridgeNode>>>;

pub struct BridgeEngine {
    pub port:        u16,
    pub clients:     ClientMap,
    pub node_buffer: NodeBuffer,
    shutdown_tx:     Arc<Mutex<Option<tokio::sync::broadcast::Sender<()>>>>,
}

impl BridgeEngine {
    pub fn new() -> Self {
        Self {
            port:        7878,
            clients:     Arc::new(Mutex::new(HashMap::new())),
            node_buffer: Arc::new(Mutex::new(Vec::new())),
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Start the WebSocket server (non-blocking — spawns a Tokio task).
    pub fn start_server(
        &self,
        on_nodes: impl Fn(Vec<BridgeNode>) + Send + Sync + 'static,
    ) -> CortexResult<u16> {
        // Guard: if already running, return the port immediately
        if self.shutdown_tx.lock().unwrap().is_some() {
            return Ok(self.port);
        }

        let port    = self.port;
        let clients = self.clients.clone();
        let buffer  = self.node_buffer.clone();
        let cb      = Arc::new(on_nodes);

        let (tx, _rx) = tokio::sync::broadcast::channel::<()>(1);
        *self.shutdown_tx.lock().unwrap() = Some(tx.clone());

        tauri::async_runtime::spawn(async move {
            let addr = SocketAddr::from(([127, 0, 0, 1], port));

            // Use SO_REUSEADDR so fast restarts don't hit "address already in use"
            let listener = {
                let sock = match tokio::net::TcpSocket::new_v4() {
                    Ok(s) => s,
                    Err(e) => { tracing::error!("Bridge: socket create failed: {e}"); return; }
                };
                let _ = sock.set_reuseaddr(true);
                match sock.bind(addr) {
                    Ok(_) => {},
                    Err(e) => { tracing::error!("Bridge: bind failed: {e}"); return; }
                }
                match sock.listen(128) {
                    Ok(l) => l,
                    Err(e) => { tracing::error!("Bridge: listen failed: {e}"); return; }
                }
            };
            tracing::info!("CORTEX Bridge listening on ws://127.0.0.1:{port}");

            loop {
                let mut shutdown_rx = tx.subscribe();
                tokio::select! {
                    Ok((stream, peer)) = listener.accept() => {
                        let clients2 = clients.clone();
                        let buffer2  = buffer.clone();
                        let cb2      = cb.clone();
                        tokio::spawn(handle_connection(stream, peer, clients2, buffer2, cb2));
                    }
                    _ = shutdown_rx.recv() => {
                        tracing::info!("Bridge: shutting down");
                        break;
                    }
                }
            }
        });

        Ok(port)
    }

    pub fn stop_server(&self) {
        if let Ok(mut guard) = self.shutdown_tx.lock() {
            if let Some(tx) = guard.take() {
                let _ = tx.send(());
            }
        }
        self.clients.lock().unwrap().clear();
    }

    pub fn connected_clients(&self) -> Vec<ConnectedClient> {
        self.clients.lock().unwrap().values().cloned().collect()
    }

    pub fn drain_nodes(&self) -> Vec<BridgeNode> {
        let mut buf = self.node_buffer.lock().unwrap();
        std::mem::take(&mut *buf)
    }
}

async fn handle_connection(
    stream:  TcpStream,
    peer:    SocketAddr,
    clients: ClientMap,
    buffer:  NodeBuffer,
    on_nodes: Arc<dyn Fn(Vec<BridgeNode>) + Send + Sync>,
) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { tracing::warn!("Bridge: WS handshake failed from {peer}: {e}"); return; }
    };

    tracing::info!("Bridge: new connection from {peer}");
    let (mut write, mut read) = ws_stream.split();
    let client_id = Uuid::new_v4().to_string();

    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(m)  => m,
            Err(e) => { tracing::warn!("Bridge: read error from {peer}: {e}"); break; }
        };

        let text = match msg {
            Message::Text(t)   => t,
            Message::Ping(d)   => { let _ = write.send(Message::Pong(d)).await; continue; }
            Message::Close(_)  => break,
            _                  => continue,
        };

        let parsed: BridgeMessage = match serde_json::from_str(&text) {
            Ok(p)  => p,
            Err(e) => {
                tracing::warn!("Bridge: bad msg from {peer}: {e}\n  raw: {text}");
                let err = BridgeMessage::Error { message: format!("Parse error: {e}") };
                let _ = write.send(Message::Text(serde_json::to_string(&err).unwrap())).await;
                continue;
            }
        };

        match parsed {
            BridgeMessage::Hello { software, version, client_id: cid } => {
                let id = if cid.is_empty() { client_id.clone() } else { cid };
                clients.lock().unwrap().insert(id.clone(), ConnectedClient {
                    client_id:    id.clone(),
                    software:     software.clone(),
                    version:      version.clone(),
                    connected_at: chrono::Utc::now(),
                });
                tracing::info!("Bridge: {software} {version} connected (id={id})");
                let reply = BridgeMessage::Welcome {
                    server_version: env!("CARGO_PKG_VERSION").to_string(),
                    client_id:      id,
                };
                let _ = write.send(Message::Text(serde_json::to_string(&reply).unwrap())).await;
                // Immediately ask for node catalogue
                let req = BridgeMessage::RequestNodes;
                let _ = write.send(Message::Text(serde_json::to_string(&req).unwrap())).await;
            }
            BridgeMessage::Ping => {
                let _ = write.send(Message::Text(serde_json::to_string(&BridgeMessage::Pong).unwrap())).await;
            }
            BridgeMessage::NodeCatalogue { nodes, total: _ } => {
                tracing::info!("Bridge: received {} node defs from {peer}", nodes.len());
                buffer.lock().unwrap().extend(nodes.clone());
                on_nodes(nodes);
            }
            BridgeMessage::SceneGraph { nodes, connections } => {
                tracing::info!("Bridge: scene graph — {} nodes, {} connections", nodes.len(), connections.len());
            }
            BridgeMessage::NodeEvent { event, node: _, node_id } => {
                tracing::debug!("Bridge: node event '{event}' node_id={node_id:?}");
            }
            _ => {}
        }
    }

    tracing::info!("Bridge: {peer} disconnected");
    clients.lock().unwrap().retain(|_, c| c.client_id != client_id);
}

// ── Software detector ─────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn search_paths() -> Vec<(SoftwareKind, Vec<&'static str>)> {
    vec![
        (SoftwareKind::Houdini,        vec![
            r"C:\Program Files\Side Effects Software",
        ]),
        (SoftwareKind::Blender,        vec![
            r"C:\Program Files\Blender Foundation",
            r"C:\Program Files (x86)\Blender Foundation",
        ]),
        (SoftwareKind::Maya,           vec![
            r"C:\Program Files\Autodesk",
        ]),
        (SoftwareKind::Nuke,           vec![
            r"C:\Program Files",
            r"C:\Program Files (x86)",
        ]),
        (SoftwareKind::DaVinciResolve, vec![
            r"C:\Program Files\Blackmagic Design\DaVinci Resolve",
        ]),
        (SoftwareKind::UnrealEngine,   vec![
            r"C:\Program Files\Epic Games",
        ]),
        (SoftwareKind::Cinema4D,       vec![
            r"C:\Program Files\Maxon Cinema 4D",
            r"C:\Program Files\MAXON",
        ]),
        (SoftwareKind::Katana,         vec![
            r"C:\Program Files\Foundry\Katana",
        ]),
        (SoftwareKind::Substance,      vec![
            r"C:\Program Files\Adobe\Adobe Substance 3D",
            r"C:\Program Files\Allegorithmic",
        ]),
    ]
}

#[cfg(target_os = "macos")]
fn search_paths() -> Vec<(SoftwareKind, Vec<&'static str>)> {
    vec![
        (SoftwareKind::Houdini,        vec!["/Applications/Houdini"]),
        (SoftwareKind::Blender,        vec!["/Applications"]),
        (SoftwareKind::Maya,           vec!["/Applications/Autodesk"]),
        (SoftwareKind::Nuke,           vec!["/Applications"]),
        (SoftwareKind::DaVinciResolve, vec!["/Applications"]),
        (SoftwareKind::UnrealEngine,   vec!["/Users/Shared/Epic Games"]),
        (SoftwareKind::Cinema4D,       vec!["/Applications"]),
        (SoftwareKind::Katana,         vec!["/Applications/Katana"]),
        (SoftwareKind::Substance,      vec!["/Applications/Adobe Substance 3D"]),
    ]
}

#[cfg(target_os = "linux")]
fn search_paths() -> Vec<(SoftwareKind, Vec<&'static str>)> {
    vec![
        (SoftwareKind::Houdini,  vec!["/opt/hfs", "/usr/local/houdini"]),
        (SoftwareKind::Blender,  vec!["/usr/bin", "/opt/blender", "/usr/local/bin"]),
        (SoftwareKind::Maya,     vec!["/usr/autodesk", "/opt/autodesk"]),
        (SoftwareKind::Nuke,     vec!["/usr/local/Nuke", "/opt/Nuke"]),
    ]
}

fn detect_kind(kind: &SoftwareKind, roots: &[&str]) -> Option<DetectedSoftware> {
    let (exe_name, name_prefix) = match kind {
        SoftwareKind::Houdini        => ("houdini.exe", "Houdini"),
        SoftwareKind::Blender        => ("blender.exe", "Blender"),
        SoftwareKind::Maya           => ("maya.exe",    "Maya"),
        SoftwareKind::Nuke           => ("Nuke",        "Nuke"),
        SoftwareKind::DaVinciResolve => ("Resolve.exe", "DaVinci Resolve"),
        SoftwareKind::UnrealEngine   => ("UnrealEditor.exe", "UE_"),
        SoftwareKind::Cinema4D       => ("Cinema 4D.exe", "Cinema 4D"),
        SoftwareKind::Katana         => ("katana.exe",  "Katana"),
        SoftwareKind::Substance      => ("Adobe Substance 3D Painter.exe", "Adobe Substance"),
        SoftwareKind::Unknown        => return None,
    };

    for root in roots {
        let root_path = PathBuf::from(root);
        if !root_path.exists() { continue; }

        // Walk one level deep looking for version dirs
        if let Ok(entries) = std::fs::read_dir(&root_path) {
            for entry in entries.flatten() {
                let entry_name = entry.file_name().to_string_lossy().to_string();
                if !entry_name.contains(name_prefix) { continue; }

                // Look for executable inside
                let candidates = [
                    entry.path().join(exe_name),
                    entry.path().join("bin").join(exe_name),
                    entry.path().join("Engine").join("Binaries").join("Win64").join(exe_name),
                ];
                for exe in &candidates {
                    if exe.exists() {
                        let version = entry_name
                            .replace(name_prefix, "")
                            .trim_start_matches(|c: char| !c.is_numeric())
                            .to_string();
                        return Some(DetectedSoftware {
                            id:           format!("{}-{}", kind.display_name().to_lowercase().replace(' ', "_"), &version),
                            kind:         kind.clone(),
                            display_name: format!("{} {}", kind.display_name(), version),
                            version,
                            install_path: entry.path().to_string_lossy().to_string(),
                            executable:   exe.to_string_lossy().to_string(),
                            category:     kind.category().to_string(),
                            is_connected: false,
                        });
                    }
                }
            }
        }

        // Direct match (DaVinci Resolve lives directly at the root path)
        let direct_exe = root_path.join(exe_name);
        if direct_exe.exists() {
            return Some(DetectedSoftware {
                id:           kind.display_name().to_lowercase().replace(' ', "_"),
                kind:         kind.clone(),
                display_name: kind.display_name().to_string(),
                version:      String::new(),
                install_path: root_path.to_string_lossy().to_string(),
                executable:   direct_exe.to_string_lossy().to_string(),
                category:     kind.category().to_string(),
                is_connected: false,
            });
        }
    }
    None
}

pub fn detect_all_software() -> Vec<DetectedSoftware> {
    let paths = search_paths();
    let mut found = Vec::new();
    for (kind, roots) in &paths {
        if let Some(sw) = detect_kind(kind, roots) {
            tracing::info!("Detected: {} at {}", sw.display_name, sw.install_path);
            found.push(sw);
        }
    }
    found
}

// ── Auto-bridge install / uninstall ──────────────────────────────────────────

/// Marker comment we insert so we can detect + remove our block later
const CORTEX_MARKER_START: &str = "# >>> CORTEX AUTO-BRIDGE START <<<";
const CORTEX_MARKER_END:   &str = "# >>> CORTEX AUTO-BRIDGE END <<<";

/// Where we write the bridge plugin file + which init file to append to.
fn auto_bridge_paths(sw: &DetectedSoftware) -> Option<(PathBuf, Option<PathBuf>)> {
    let home = dirs_home()?;

    match sw.kind {
        SoftwareKind::Houdini => {
            // version like "20.5.550" → major.minor = "20.5"
            let ver = {
                let parts: Vec<&str> = sw.version.split('.').collect();
                if parts.len() >= 2 { format!("{}.{}", parts[0], parts[1]) }
                else { sw.version.clone() }
            };
            let pref = home.join("Documents").join(format!("houdini{ver}")).join("scripts");
            let plugin = pref.join("cortex_bridge_houdini.py");
            let init   = pref.join("pythonstartup.py");
            Some((plugin, Some(init)))
        }
        SoftwareKind::Blender => {
            // version like "4.2.0" → "4.2"
            let ver = {
                let parts: Vec<&str> = sw.version.split('.').collect();
                if parts.len() >= 2 { format!("{}.{}", parts[0], parts[1]) }
                else { sw.version.clone() }
            };
            #[cfg(target_os = "windows")]
            let base = {
                let appdata = std::env::var("APPDATA").ok()
                    .map(PathBuf::from)
                    .unwrap_or_else(|| home.join("AppData").join("Roaming"));
                appdata.join("Blender Foundation").join("Blender").join(&ver).join("scripts").join("startup")
            };
            #[cfg(not(target_os = "windows"))]
            let base = home.join(".config").join("blender").join(&ver).join("scripts").join("startup");
            Some((base.join("cortex_bridge_blender.py"), None))
        }
        SoftwareKind::Nuke => {
            #[cfg(target_os = "windows")]
            let nuke_dir = home.join(".nuke");
            #[cfg(not(target_os = "windows"))]
            let nuke_dir = home.join(".nuke");
            let plugin = nuke_dir.join("cortex_bridge_nuke.py");
            let init   = nuke_dir.join("init.py");
            Some((plugin, Some(init)))
        }
        SoftwareKind::Maya => {
            // Use the global Maya scripts dir — always exists if Maya is installed.
            // The version-specific dir may not exist until Maya is first launched.
            #[cfg(target_os = "windows")]
            let global = home.join("Documents").join("maya").join("scripts");
            #[cfg(not(target_os = "windows"))]
            let global = home.join("maya").join("scripts");
            let plugin = global.join("cortex_bridge_maya.py");
            let init   = global.join("userSetup.py");
            Some((plugin, Some(init)))
        }
        _ => None,
    }
}

/// Return the Python content for this software's bridge plugin.
pub fn bridge_plugin_content(sw: &DetectedSoftware) -> Option<&'static str> {
    match sw.kind {
        SoftwareKind::Houdini => Some(include_str!("../../../bridge-plugins/cortex_bridge_houdini.py")),
        SoftwareKind::Blender => Some(include_str!("../../../bridge-plugins/cortex_bridge_blender.py")),
        SoftwareKind::Nuke    => Some(include_str!("../../../bridge-plugins/cortex_bridge_nuke.py")),
        SoftwareKind::Maya    => Some(include_str!("../../../bridge-plugins/cortex_bridge_maya.py")),
        _                     => None,
    }
}

/// The one-liner appended to pythonstartup.py / init.py / userSetup.py.
fn init_exec_line(plugin_path: &Path) -> String {
    let path_str = plugin_path.to_string_lossy().replace('\\', "\\\\");
    format!(
        "{start}\nexec(open(r\"{path}\").read(), {{}})\n{end}\n",
        start = CORTEX_MARKER_START,
        path  = path_str,
        end   = CORTEX_MARKER_END,
    )
}

pub fn install_auto_bridge(sw: &DetectedSoftware) -> CortexResult<()> {
    let content = bridge_plugin_content(sw)
        .ok_or_else(|| CortexError::Io(format!("{} auto-bridge not supported", sw.display_name)))?;

    let (plugin_path, init_path) = auto_bridge_paths(sw)
        .ok_or_else(|| CortexError::Io("Cannot determine install path".to_string()))?;

    // Ensure directory exists
    if let Some(dir) = plugin_path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| CortexError::Io(format!("mkdir failed: {e}")))?;
    }

    // Write plugin file
    std::fs::write(&plugin_path, content)
        .map_err(|e| CortexError::Io(format!("Write plugin failed: {e}")))?;

    tracing::info!("Bridge: wrote plugin to {}", plugin_path.display());

    // Append exec line to the init file (if needed)
    if let Some(init) = init_path {
        if let Some(dir) = init.parent() {
            std::fs::create_dir_all(dir).ok();
        }
        let existing = std::fs::read_to_string(&init).unwrap_or_default();
        if !existing.contains(CORTEX_MARKER_START) {
            let exec_line = init_exec_line(&plugin_path);
            let new_content = format!("{existing}\n{exec_line}");
            match std::fs::write(&init, new_content) {
                Ok(_)  => tracing::info!("Bridge: appended exec to {}", init.display()),
                Err(e) => tracing::warn!("Bridge: could not write init file {}: {e} — plugin installed, add exec line manually", init.display()),
            }
        }
    }

    Ok(())
}

pub fn uninstall_auto_bridge(sw: &DetectedSoftware) -> CortexResult<()> {
    let (plugin_path, init_path) = match auto_bridge_paths(sw) {
        Some(p) => p,
        None    => return Ok(()),
    };

    // Remove plugin file
    if plugin_path.exists() {
        std::fs::remove_file(&plugin_path).ok();
    }

    // Strip our marker block from the init file
    if let Some(init) = init_path {
        if init.exists() {
            if let Ok(content) = std::fs::read_to_string(&init) {
                if content.contains(CORTEX_MARKER_START) {
                    let cleaned = strip_cortex_block(&content);
                    std::fs::write(&init, cleaned).ok();
                }
            }
        }
    }

    Ok(())
}

pub fn is_auto_bridge_installed(sw: &DetectedSoftware) -> bool {
    auto_bridge_paths(sw)
        .map(|(plugin, _)| plugin.exists())
        .unwrap_or(false)
}

fn strip_cortex_block(content: &str) -> String {
    let mut out = String::new();
    let mut skip = false;
    for line in content.lines() {
        if line.trim() == CORTEX_MARKER_START { skip = true; continue; }
        if line.trim() == CORTEX_MARKER_END   { skip = false; continue; }
        if !skip { out.push_str(line); out.push('\n'); }
    }
    out
}

#[cfg(target_os = "windows")]
pub fn dirs_home() -> Option<PathBuf> {
    std::env::var("USERPROFILE").ok().map(PathBuf::from)
        .or_else(|| std::env::var("HOMEDRIVE").ok().and_then(|d|
            std::env::var("HOMEPATH").ok().map(|p| PathBuf::from(d + &p))
        ))
}
#[cfg(not(target_os = "windows"))]
pub fn dirs_home() -> Option<PathBuf> {
    std::env::var("HOME").ok().map(PathBuf::from)
}
