use tauri::State;
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
    let prov = match provider.as_deref() {
        Some("openai") => AiProvider::OpenAi,
        Some("ollama") => AiProvider::Ollama,
        _ => AiProvider::Anthropic,
    };

    let engine = crate::engines::ai::AiEngine::new(prov, api_key, None);
    engine.chat(request).await
}
