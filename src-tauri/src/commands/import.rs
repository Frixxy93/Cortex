use tauri::State;
use crate::engines::import::ImportResult;
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn import_file(file_path: String, _state: State<'_, AppState>) -> Result<ImportResult, CortexError> {
    let engine = crate::engines::import::ImportEngine::new();
    engine.import_file(&file_path)
}
