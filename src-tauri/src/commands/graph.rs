use tauri::State;
use uuid::Uuid;
use crate::domain::graph::{Graph, CreateGraphInput, UpdateGraphInput};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn list_graphs(vault_id: String, state: State<'_, AppState>) -> Result<Vec<Graph>, CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.graph_engine.list_graphs(id)
}

#[tauri::command]
pub async fn get_graph(id: String, state: State<'_, AppState>) -> Result<Graph, CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.graph_engine.get_graph(id)
}

#[tauri::command]
pub async fn create_graph(input: CreateGraphInput, state: State<'_, AppState>) -> Result<Graph, CortexError> {
    state.graph_engine.create_graph(input)
}

#[tauri::command]
pub async fn save_graph(input: UpdateGraphInput, state: State<'_, AppState>) -> Result<Graph, CortexError> {
    state.graph_engine.save_graph(input)
}

#[tauri::command]
pub async fn delete_graph(id: String, state: State<'_, AppState>) -> Result<(), CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.graph_engine.delete_graph(id)
}
