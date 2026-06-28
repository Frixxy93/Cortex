use tauri::State;
use serde::Serialize;
use crate::{AppState, error::CortexError};
use crate::engines::bridge::{ConnectedClient, DetectedSoftware, detect_software, write_exec_cmd};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientDto {
    pub id:       String,
    pub software: String,
    pub version:  String,
}
impl From<ConnectedClient> for ClientDto {
    fn from(c: ConnectedClient) -> Self {
        Self { id: c.id, software: c.software, version: c.version }
    }
}

/// Returns port (bridge already started at app init).
#[tauri::command]
pub async fn bridge_start(state: State<'_, AppState>) -> Result<u16, CortexError> {
    Ok(state.bridge_engine.port)
}

#[tauri::command]
pub async fn bridge_stop(state: State<'_, AppState>) -> Result<(), CortexError> {
    state.bridge_engine.stop();
    Ok(())
}

#[tauri::command]
pub async fn bridge_clients(state: State<'_, AppState>) -> Result<Vec<ClientDto>, CortexError> {
    Ok(state.bridge_engine.clients().into_iter().map(ClientDto::from).collect())
}

#[tauri::command]
pub async fn bridge_detect() -> Result<Vec<DetectedSoftware>, CortexError> {
    Ok(detect_software())
}

/// Write the export script for `kind` to ~/Documents/cortex-bridge/ and return exec one-liner.
#[tauri::command]
pub async fn bridge_exec_cmd(kind: String) -> Result<String, CortexError> {
    write_exec_cmd(&kind)
}
