use tauri::State;
use uuid::Uuid;
use crate::domain::vault::{Vault, CreateVaultInput, UpdateVaultInput};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn list_vaults(state: State<'_, AppState>) -> Result<Vec<Vault>, CortexError> {
    state.vault_engine.list_vaults()
}

#[tauri::command]
pub async fn get_vault(id: String, state: State<'_, AppState>) -> Result<Vault, CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.vault_engine.get_vault(id)
}

#[tauri::command]
pub async fn create_vault(input: CreateVaultInput, state: State<'_, AppState>) -> Result<Vault, CortexError> {
    state.vault_engine.create_vault(input)
}

#[tauri::command]
pub async fn update_vault(input: UpdateVaultInput, state: State<'_, AppState>) -> Result<Vault, CortexError> {
    state.vault_engine.update_vault(input)
}

#[tauri::command]
pub async fn delete_vault(id: String, state: State<'_, AppState>) -> Result<(), CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.vault_engine.delete_vault(id)
}
