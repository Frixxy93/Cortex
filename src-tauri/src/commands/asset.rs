use tauri::State;
use uuid::Uuid;
use crate::domain::asset::Asset;
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn list_assets(vault_id: String, state: State<'_, AppState>) -> Result<Vec<Asset>, CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.asset_engine.list_assets(id)
}

#[tauri::command]
pub async fn import_asset(vault_id: String, file_path: String, state: State<'_, AppState>) -> Result<Asset, CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.asset_engine.import_asset(id, &file_path)
}
