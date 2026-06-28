use tauri::State;
use crate::domain::search::{SearchQuery, SearchResult};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn search(query: SearchQuery, state: State<'_, AppState>) -> Result<SearchResult, CortexError> {
    state.search_engine.search(query)
}
