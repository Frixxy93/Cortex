/// CORTEX VFX Bridge — WebSocket import server
/// DCC connects → HELLO → CORTEX sends REQUEST_NODES
/// DCC sends NODE_CATALOGUE with parameters → saved directly to DB

use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
};

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

use crate::{
    domain::{
        node::{CreateNodeInput, NodeCategory, NodeObjectType, NodePort},
        parameter::{Parameter, ParameterOption, ParameterType, PerformanceImpact},
    },
    engines::node::NodeEngine,
    error::CortexError,
    storage::database::DbPool,
};

// ── Public types ──────────────────────────────────────────────────────────────

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

// ── Incoming node format from Python scripts ──────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeParam {
    name:  String,
    label: String,
    #[serde(rename = "type")]
    ptype: String,
    #[serde(default)]
    default: Option<serde_json::Value>,
    #[serde(default)]
    min:    Option<serde_json::Value>,
    #[serde(default)]
    max:    Option<serde_json::Value>,
    #[serde(default)]
    options: Option<Vec<BridgeParamOption>>,
    #[serde(default)]
    group:  Option<String>,
}

#[derive(Debug, Deserialize)]
struct BridgeParamOption {
    value: serde_json::Value,
    label: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeNode {
    name:         String,
    display_name: String,
    category:     String,
    #[serde(default)]
    description:  Option<String>,
    #[serde(default)]
    max_inputs:   u32,
    #[serde(default = "one")]
    max_outputs:  u32,
    #[serde(default)]
    parameters:   Vec<BridgeParam>,
}
fn one() -> u32 { 1 }

// ── WebSocket protocol ────────────────────────────────────────────────────────

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
    Welcome { #[serde(rename = "serverVersion")] server_version: String },
    RequestNodes,
    Pong,
    Error { message: String },
}

// ── Engine ────────────────────────────────────────────────────────────────────

type Clients    = Arc<Mutex<HashMap<String, ConnectedClient>>>;

pub struct BridgeEngine {
    pub port:    u16,
    clients:     Clients,
    shutdown_tx: Arc<Mutex<Option<tokio::sync::broadcast::Sender<()>>>>,
}

impl BridgeEngine {
    pub fn new() -> Self {
        Self {
            port:        7878,
            clients:     Arc::new(Mutex::new(HashMap::new())),
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Start WS server. On receiving NODE_CATALOGUE: deletes existing nodes for
    /// that software, batch-inserts new ones with parameters, fires `on_imported`.
    pub fn start(
        &self,
        pool: DbPool,
        on_imported: impl Fn(String, usize) + Send + Sync + 'static,
    ) -> Result<u16, CortexError> {
        if self.shutdown_tx.lock().unwrap().is_some() {
            return Ok(self.port);
        }

        let port    = self.port;
        let clients = self.clients.clone();
        let cb      = Arc::new(on_imported);

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
                            pool.clone(),
                            cb.clone(),
                        ));
                    }
                    _ = rx.recv() => { break; }
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
}

// ── Connection handler ────────────────────────────────────────────────────────

async fn handle_conn(
    stream:      TcpStream,
    peer:        SocketAddr,
    clients:     Clients,
    pool:        DbPool,
    on_imported: Arc<dyn Fn(String, usize) + Send + Sync>,
) {
    let ws = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { tracing::warn!("Bridge: WS handshake {peer}: {e}"); return; }
    };
    let (mut tx, mut rx) = ws.split();
    let conn_id           = Uuid::new_v4().to_string();
    let mut client_software = String::from("unknown");

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
                    serde_json::to_string(&OutMsg::Error { message: e.to_string() }).unwrap().into()
                )).await;
                continue;
            }
        };

        match parsed {
            InMsg::Hello { software, version, client_id } => {
                client_software = software.clone();
                let id = if client_id.is_empty() { conn_id.clone() } else { client_id };
                clients.lock().unwrap().insert(id.clone(), ConnectedClient {
                    id, software: software.clone(), version: version.clone(),
                });
                tracing::info!("Bridge: {software} {version} connected ({peer})");
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::Welcome {
                        server_version: env!("CARGO_PKG_VERSION").into(),
                    }).unwrap().into()
                )).await;
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::RequestNodes).unwrap().into()
                )).await;
            }

            InMsg::NodeCatalogue { nodes, .. } => {
                let software   = client_software.clone();
                let node_count = nodes.len();
                tracing::info!("Bridge: received {node_count} nodes from {software}");

                let pool2  = pool.clone();
                let sw2    = software.clone();
                let cb2    = on_imported.clone();

                tokio::task::spawn_blocking(move || {
                    let engine = NodeEngine::new(pool2);

                    // Replace: delete old software nodes, insert new ones
                    if let Err(e) = engine.delete_by_software(&sw2) {
                        tracing::warn!("Bridge: delete_by_software failed: {e}");
                    }

                    let inputs: Vec<CreateNodeInput> = nodes.into_iter()
                        .map(|n| bridge_node_to_input(n, &sw2))
                        .collect();

                    match engine.batch_create_nodes(inputs) {
                        Ok(saved) => {
                            tracing::info!("Bridge: saved {} nodes for {sw2}", saved.len());
                            cb2(sw2, saved.len());
                        }
                        Err(e) => tracing::error!("Bridge: save failed: {e}"),
                    }
                }).await.ok();
            }

            InMsg::Ping => {
                let _ = tx.send(Message::Text(
                    serde_json::to_string(&OutMsg::Pong).unwrap().into()
                )).await;
            }
            InMsg::Pong => {}
        }
    }

    tracing::info!("Bridge: {peer} disconnected");
    clients.lock().unwrap().retain(|_, c| c.id != conn_id);
}

// ── Node conversion ───────────────────────────────────────────────────────────

fn bridge_node_to_input(node: BridgeNode, software: &str) -> CreateNodeInput {
    let params: Vec<Parameter> = node.parameters.into_iter().enumerate()
        .map(|(i, p)| Parameter {
            id:          Uuid::new_v4(),
            name:        p.name,
            display_name: p.label,
            param_type:  param_type(p.ptype.as_str()),
            default_value: p.default,
            min_value:   p.min,
            max_value:   p.max,
            options:     p.options.map(|opts| opts.into_iter().map(|o| ParameterOption {
                value: o.value, label: o.label, icon: None,
            }).collect()),
            description: None,
            group:       p.group,
            visible_when:  None,
            enabled_when:  None,
            performance_impact: PerformanceImpact::None,
            is_animatable:       true,
            is_expression_capable: true,
            sort_order:  i as i32,
        })
        .collect();

    let inputs: Vec<NodePort> = (0..node.max_inputs.min(8)).map(|i| NodePort {
        id:          format!("in_{i}"),
        name:        format!("input{i}"),
        data_type:   "any".into(),
        required:    false,
        multi:       false,
        description: None,
    }).collect();

    let outputs: Vec<NodePort> = (0..node.max_outputs.min(4)).map(|i| NodePort {
        id:          format!("out_{i}"),
        name:        format!("output{i}"),
        data_type:   "any".into(),
        required:    false,
        multi:       false,
        description: None,
    }).collect();

    CreateNodeInput {
        vault_id:    None,
        software_id: None,
        name:        node.name,
        display_name: node.display_name,
        category:    category(node.category.as_str()),
        object_type: NodeObjectType::SoftwareNode,
        description: node.description,
        version:     None,
        color:       software_color(software),
        icon:        None,
        tags:        vec![software.to_string()],
        inputs,
        outputs,
        parameters:  params,
        documentation: None,
        notes:       None,
        production_tips: vec![],
        metadata:    Some(serde_json::json!({ "software": software })),
    }
}

fn category(s: &str) -> NodeCategory {
    match s {
        "sop"       => NodeCategory::Sop,
        "vop"       => NodeCategory::Vop,
        "dop"       => NodeCategory::Dop,
        "chop"      => NodeCategory::Chop,
        "lop"       => NodeCategory::Lop,
        "rop"       => NodeCategory::Rop,
        "cop"       => NodeCategory::Cop,
        "top"       => NodeCategory::Top,
        "object"    => NodeCategory::Object,
        "shader"    => NodeCategory::Shader,
        "geometry"  => NodeCategory::Geometry,
        "compositor"=> NodeCategory::Compositor,
        "color"     => NodeCategory::Color,
        "filter"    => NodeCategory::Filter,
        "merge"     => NodeCategory::Merge,
        "transform" => NodeCategory::Transform,
        "channel"   => NodeCategory::Channel,
        "draw"      => NodeCategory::Draw,
        "deep"      => NodeCategory::Deep,
        "material"  => NodeCategory::Material,
        "math"      => NodeCategory::Math,
        "utility"   => NodeCategory::Utility,
        _           => NodeCategory::Other,
    }
}

fn param_type(s: &str) -> ParameterType {
    match s {
        "string"                  => ParameterType::String,
        "integer" | "int"         => ParameterType::Integer,
        "float"                   => ParameterType::Float,
        "boolean" | "bool"        => ParameterType::Boolean,
        "enum" | "menu"           => ParameterType::Enum,
        "vector2"                 => ParameterType::Vector2,
        "vector3"                 => ParameterType::Vector3,
        "vector4"                 => ParameterType::Vector4,
        "color"                   => ParameterType::Color,
        "file"                    => ParameterType::File,
        "image"                   => ParameterType::Image,
        "ramp"                    => ParameterType::Ramp,
        "button"                  => ParameterType::Button,
        "separator"               => ParameterType::Separator,
        "label"                   => ParameterType::Label,
        _                         => ParameterType::String,
    }
}

fn software_color(software: &str) -> Option<String> {
    match software {
        "houdini" => Some("#FF6B35".into()),
        "nuke"    => Some("#8BC34A".into()),
        "katana"  => Some("#E8A020".into()),
        _         => None,
    }
}

// ── Software detection ────────────────────────────────────────────────────────

pub fn detect_software() -> Vec<DetectedSoftware> {
    let mut found = Vec::new();

    #[cfg(target_os = "windows")]
    {
        scan_dir(&mut found, "houdini", "Houdini", r"C:\Program Files\Side Effects Software");
        scan_dir(&mut found, "nuke",    "Nuke",    r"C:\Program Files");
        scan_dir(&mut found, "katana",  "Katana",  r"C:\Program Files\Foundry");
    }

    found
}

#[cfg(target_os = "windows")]
fn scan_dir(out: &mut Vec<DetectedSoftware>, kind: &str, display: &str, root: &str) {
    let Ok(entries) = std::fs::read_dir(root) else { return };
    let needle     = kind.replace('_', " ").to_lowercase();
    let disp_lower = display.to_lowercase();

    for e in entries.flatten() {
        let folder = e.file_name().to_string_lossy().to_string();
        let lower  = folder.to_lowercase();
        if !lower.contains(&needle) || !e.path().is_dir() { continue; }
        if lower.contains("server") { continue; }

        let ver = if folder.contains(' ') {
            folder.split_whitespace()
                .filter(|s| s.chars().any(|c| c.is_ascii_digit()))
                .last()
                .unwrap_or("")
                .to_string()
        } else {
            let stripped = if lower.starts_with(&disp_lower) {
                folder[disp_lower.len()..].to_string()
            } else { folder.clone() };
            stripped
        };

        let display_name = format!("{display} {ver}").trim().to_string();
        let id = format!("{}_{}", kind, ver.replace(['.', ' '], "_"));
        if out.iter().any(|s| s.id == id) { continue; }

        out.push(DetectedSoftware { id, name: display_name, version: ver, kind: kind.to_string() });
    }
}

// ── Script writer ─────────────────────────────────────────────────────────────

pub fn write_exec_cmd(kind: &str) -> Result<String, CortexError> {
    let valid = ["houdini", "nuke", "katana"];
    if !valid.contains(&kind) {
        return Err(CortexError::Io(format!("No export script for '{kind}'")));
    }

    // Point directly to the source export-scripts folder.
    // CARGO_MANIFEST_DIR is the src-tauri directory at compile time;
    // its parent is the project root (D:\FRIXXY\APP\cortex).
    let scripts_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| CortexError::Io("Cannot resolve project root".into()))?
        .join("export-scripts");

    let path = scripts_dir.join(format!("cortex_export_{kind}.py"));
    let p    = path.to_string_lossy().to_string();

    Ok(format!("exec(open(r\"{p}\").read())"))
}

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               