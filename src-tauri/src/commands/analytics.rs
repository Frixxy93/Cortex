use tauri::State;
use uuid::Uuid;
use crate::engines::analytics::AnalyticsDashboard;
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn get_analytics(vault_id: String, state: State<'_, AppState>) -> Result<AnalyticsDashboard, CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.analytics_engine.get_dashboard(id)
}

#[tauri::command]
pub async fn track_event(
    vault_id: String,
    event_type: String,
    object_id: Option<String>,
    object_type: Option<String>,
    data: Option<serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<(), CortexError> {
    let id = Uuid::parse_str(&vault_id).map_err(|_| CortexError::Validation("Invalid UUID".into()))?;
    state.analytics_engine.track(
        id,
        &event_type,
        object_id.as_deref(),
        object_type.as_deref(),
        data.unwrap_or_default(),
    )
}
