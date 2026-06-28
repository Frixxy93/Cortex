use tauri::State;
use uuid::Uuid;
use crate::domain::relationship::{Relationship, CreateRelationshipInput};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn get_relationships(object_id: String, state: State<'_, AppState>) -> Result<Vec<Relationship>, CortexError> {
    let id = Uuid::parse_str(&object_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.relationship_engine.get_relationships_for(id)
}

#[tauri::command]
pub async fn create_relationship(input: CreateRelationshipInput, state: State<'_, AppState>) -> Result<Relationship, CortexError> {
    state.relationship_engine.create_relationship(input)
}

#[tauri::command]
pub async fn delete_relationship(id: String, state: State<'_, AppState>) -> Result<(), CortexError> {
    let id = Uuid::parse_str(&id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.relationship_engine.delete_relationship(id)
}
