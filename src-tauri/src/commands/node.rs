use tauri::State;
use uuid::Uuid;
use crate::domain::node::{Node, CreateNodeInput, UpdateNodeInput};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn list_nodes(vault_id: String, state: State<'_, AppState>) -> Result<Vec<Node>, CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.node_engine.list_nodes(id)
}

#[tauri::command]
pub async fn get_node(id: String, state: State<'_, AppState>) -> Result<Node, CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.node_engine.get_node(id)
}

#[tauri::command]
pub async fn create_node(input: CreateNodeInput, state: State<'_, AppState>) -> Result<Node, CortexError> {
    state.node_engine.create_node(input)
}

#[tauri::command]
pub async fn update_node(input: UpdateNodeInput, state: State<'_, AppState>) -> Result<Node, CortexError> {
    state.node_engine.update_node(input)
}

#[tauri::command]
pub async fn delete_node(id: String, state: State<'_, AppState>) -> Result<(), CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.node_engine.delete_node(id)
}

#[tauri::command]
pub async fn batch_create_nodes(inputs: Vec<CreateNodeInput>, state: State<'_, AppState>) -> Result<Vec<Node>, CortexError> {
    state.node_engine.batch_create_nodes(inputs)
}

#[tauri::command]
pub async fn clear_vault_nodes(vault_id: String, state: State<'_, AppState>) -> Result<usize, CortexError> {
    let vault_id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.node_engine.clear_vault_nodes(vault_id)
}

#[tauri::command]
pub async fn clear_all_nodes(state: State<'_, AppState>) -> Result<usize, CortexError> {
    state.node_engine.clear_all_nodes()
}

#[tauri::command]
pub async fn list_all_nodes(state: State<'_, AppState>) -> Result<Vec<Node>, CortexError> {
    state.node_engine.list_all_nodes()
}

#[tauri::command]
pub async fn reseed_nodes(state: State<'_, AppState>) -> Result<usize, CortexError> {
    state.node_engine.reseed_nodes()
}

/// Reads every node currently in the database and writes them to
/// `src-tauri/src/data/nodes_seed.sql` as INSERT statements.
/// After calling this, rebuild CORTEX — every user will have these nodes on install.
#[tauri::command]
pub async fn generate_node_seed(state: State<'_, AppState>) -> Result<usize, CortexError> {
    state.node_engine.generate_seed_sql()
}
