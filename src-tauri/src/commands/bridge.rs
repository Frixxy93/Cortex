use tauri::State;
use serde::Serialize;

use crate::AppState;
use crate::engines::bridge::{detect_software, write_exec_cmd, DetectedSoftware};
use crate::error::CortexError;
use crate::domain::node::CreateNodeInput;

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientDto {
    pub id:       String,
    pub software: String,
    pub version:  String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn bridge_start(state: State<'_, AppState>) -> Result<u16, CortexError> {
    // idempotent — Rust side already started in setup(); just return port
    Ok(state.bridge_engine.port)
}

#[tauri::command]
pub async fn bridge_stop(state: State<'_, AppState>) -> Result<(), CortexError> {
    state.bridge_engine.stop();
    Ok(())
}

#[tauri::command]
pub async fn bridge_clients(state: State<'_, AppState>) -> Result<Vec<ClientDto>, CortexError> {
    Ok(state.bridge_engine.clients().into_iter().map(|c| ClientDto {
        id: c.id, software: c.software, version: c.version,
    }).collect())
}

#[tauri::command]
pub async fn bridge_detect(_state: State<'_, AppState>) -> Result<Vec<DetectedSoftware>, CortexError> {
    Ok(detect_software())
}

#[tauri::command]
pub async fn bridge_drain(state: State<'_, AppState>) -> Result<usize, CortexError> {
    let nodes = state.bridge_engine.drain();
    if nodes.is_empty() { return Ok(0); }

    let inputs: Vec<CreateNodeInput> = nodes.iter().map(|n| CreateNodeInput {
        vault_id:        None,
        software_id:     None,
        name:            n.name.clone(),
        display_name:    n.display_name.clone(),
        category:        map_cat(&n.category),
        object_type:     crate::domain::node::NodeObjectType::SoftwareNode,
        description:     Some(n.description.clone()),
        version:         None,
        color:           None,
        icon:            None,
        tags:            vec![],
        inputs:          make_ports(n.max_inputs, "in"),
        outputs:         make_ports(n.max_outputs, "out"),
        parameters:      vec![],
        documentation:   None,
        notes:           None,
        production_tips: vec![],
        metadata:        None,
    }).collect();

    let count = inputs.len();
    tracing::info!("bridge_drain: replacing library with {} nodes", count);
    state.node_engine.replace_all_nodes(inputs)?;
    Ok(count)
}

#[tauri::command]
pub async fn bridge_exec_cmd(
    _state: State<'_, AppState>,
    kind: String,
) -> Result<String, CortexError> {
    write_exec_cmd(&kind)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn map_cat(s: &str) -> crate::domain::node::NodeCategory {
    use crate::domain::node::NodeCategory;
    match s {
        "sop"                  => NodeCategory::Sop,
        "vop"                  => NodeCategory::Vop,
        "dop"                  => NodeCategory::Dop,
        "chop"                 => NodeCategory::Chop,
        "lop"                  => NodeCategory::Lop,
        "rop" | "driver"       => NodeCategory::Rop,
        "top"                  => NodeCategory::Top,
        "cop" | "cop2"         => NodeCategory::Cop,
        "object"               => NodeCategory::Object,
        "shop" | "shader"      => NodeCategory::Shader,
        "geometry"             => NodeCategory::Geometry,
        "compositor"           => NodeCategory::Compositor,
        "material"             => NodeCategory::Material,
        _                      => NodeCategory::Other,
    }
}

fn make_ports(n: u32, prefix: &str) -> Vec<crate::domain::node::NodePort> {
    (0..n.min(8)).map(|i| crate::domain::node::NodePort {
        id:          format!("{prefix}{}", i + 1),
        name:        format!("{}{}", prefix.to_uppercase(), i + 1),
        data_type:   "any".into(),
        required:    prefix == "in" && i == 0,
        multi:       false,
        description: None,
    }).collect()
}
