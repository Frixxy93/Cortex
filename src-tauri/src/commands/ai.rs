use tauri::{AppHandle, State};
use crate::engines::ai::{AiRequest, AiResponse, AiProvider};
use crate::error::CortexError;
use crate::AppState;

#[tauri::command]
pub async fn ai_chat(
    request: AiRequest,
    provider: Option<String>,
    api_key: Option<String>,
    _state: State<'_, AppState>,
) -> Result<AiResponse, CortexError> {
    let engine = make_engine(provider, api_key);
    engine.chat(request).await
}

/// Streams tokens to the frontend via `cortex:ai-token` events.
/// Fires `cortex:ai-done` when complete.
#[tauri::command]
pub async fn ai_stream(
    app: AppHandle,
    request: AiRequest,
    provider: Option<String>,
    api_key: Option<String>,
    _state: State<'_, AppState>,
) -> Result<(), CortexError> {
    let engine = make_engine(provider, api_key);
    engine.stream(&app, request).await
}

fn make_engine(provider: Option<String>, api_key: Option<String>) -> crate::engines::ai::AiEngine {
    let prov = match provider.as_deref() {
        Some("openai") => AiProvider::OpenAi,
        Some("ollama") => AiProvider::Ollama,
        _ => AiProvider::Anthropic,
    };
    crate::engines::ai::AiEngine::new(prov, api_key, None)
}
