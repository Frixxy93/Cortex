use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter};
use crate::error::{CortexError, CortexResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiRequest {
    pub messages: Vec<AiMessage>,
    pub system: Option<String>,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub content: String,
    pub model: String,
    pub tokens_used: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AiProvider {
    Anthropic,
    OpenAi,
    Ollama,
}

pub struct AiEngine {
    provider: AiProvider,
    api_key: Option<String>,
    base_url: Option<String>,
}

impl AiEngine {
    pub fn new(provider: AiProvider, api_key: Option<String>, base_url: Option<String>) -> Self {
        Self { provider, api_key, base_url }
    }

    pub async fn chat(&self, request: AiRequest) -> CortexResult<AiResponse> {
        match &self.provider {
            AiProvider::Anthropic => self.chat_anthropic(request).await,
            AiProvider::OpenAi   => self.chat_openai(request).await,
            AiProvider::Ollama   => self.chat_ollama(request).await,
        }
    }

    /// Stream tokens to the frontend via Tauri events.
    /// Emits `cortex:ai-token` with each text delta and
    /// `cortex:ai-done` with the final AiResponse.
    pub async fn stream(&self, app: &AppHandle, request: AiRequest) -> CortexResult<()> {
        match &self.provider {
            AiProvider::Anthropic => self.stream_anthropic(app, request).await,
            AiProvider::OpenAi   => self.stream_openai(app, request).await,
            AiProvider::Ollama   => self.stream_ollama(app, request).await,
        }
    }

    // ── Non-streaming fallbacks ─────────────────────────────────────

    async fn chat_anthropic(&self, request: AiRequest) -> CortexResult<AiResponse> {
        let api_key = self.api_key.as_ref()
            .ok_or_else(|| CortexError::Ai("Anthropic API key not configured".into()))?;

        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "claude-opus-4-5".to_string());

        let body = serde_json::json!({
            "model": model,
            "max_tokens": request.max_tokens.unwrap_or(4096),
            "system": request.system.clone().unwrap_or_else(|| CORTEX_SYSTEM_PROMPT.to_string()),
            "messages": request.messages
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let json: serde_json::Value = resp.json().await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let content = json["content"][0]["text"].as_str().unwrap_or("").to_string();
        Ok(AiResponse {
            content,
            model: json["model"].as_str().unwrap_or("").to_string(),
            tokens_used: json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32,
        })
    }

    async fn chat_openai(&self, request: AiRequest) -> CortexResult<AiResponse> {
        let api_key = self.api_key.as_ref()
            .ok_or_else(|| CortexError::Ai("OpenAI API key not configured".into()))?;

        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "gpt-4o".to_string());

        let mut messages = vec![];
        if let Some(sys) = &request.system {
            messages.push(serde_json::json!({ "role": "system", "content": sys }));
        }
        messages.extend(request.messages.iter().map(|m| serde_json::json!({
            "role": m.role, "content": m.content
        })));

        let body = serde_json::json!({
            "model": model,
            "max_tokens": request.max_tokens.unwrap_or(4096),
            "messages": messages
        });

        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let json: serde_json::Value = resp.json().await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let content = json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
        Ok(AiResponse {
            content,
            model: json["model"].as_str().unwrap_or("").to_string(),
            tokens_used: json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32,
        })
    }

    async fn chat_ollama(&self, request: AiRequest) -> CortexResult<AiResponse> {
        let base_url = self.base_url.as_deref().unwrap_or("http://localhost:11434");
        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "llama3".to_string());

        let body = serde_json::json!({
            "model": model,
            "messages": request.messages,
            "stream": false
        });

        let resp = client
            .post(format!("{base_url}/api/chat"))
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let json: serde_json::Value = resp.json().await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let content = json["message"]["content"].as_str().unwrap_or("").to_string();
        Ok(AiResponse { content, model, tokens_used: 0 })
    }

    // ── Streaming implementations ───────────────────────────────────

    async fn stream_anthropic(&self, app: &AppHandle, request: AiRequest) -> CortexResult<()> {
        let api_key = self.api_key.as_ref()
            .ok_or_else(|| CortexError::Ai("Anthropic API key not configured".into()))?;

        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "claude-opus-4-5".to_string());

        let body = serde_json::json!({
            "model": model,
            "max_tokens": request.max_tokens.unwrap_or(4096),
            "system": request.system.clone().unwrap_or_else(|| CORTEX_SYSTEM_PROMPT.to_string()),
            "messages": request.messages,
            "stream": true
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let mut stream = resp.bytes_stream();
        let mut full = String::new();
        let mut buf = String::new();

        while let Some(chunk) = stream.next().await {
            let bytes = chunk.map_err(|e| CortexError::Ai(e.to_string()))?;
            buf.push_str(&String::from_utf8_lossy(&bytes));

            // SSE lines are separated by \n
            while let Some(pos) = buf.find('\n') {
                let line = buf[..pos].to_string();
                buf = buf[pos + 1..].to_string();

                if let Some(data) = line.strip_prefix("data: ") {
                    if data.trim() == "[DONE]" { break; }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if json["type"] == "content_block_delta" {
                            if let Some(token) = json["delta"]["text"].as_str() {
                                full.push_str(token);
                                let _ = app.emit("cortex:ai-token", token);
                            }
                        }
                    }
                }
            }
        }

        let _ = app.emit("cortex:ai-done", AiResponse {
            content: full,
            model,
            tokens_used: 0,
        });
        Ok(())
    }

    async fn stream_openai(&self, app: &AppHandle, request: AiRequest) -> CortexResult<()> {
        let api_key = self.api_key.as_ref()
            .ok_or_else(|| CortexError::Ai("OpenAI API key not configured".into()))?;

        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "gpt-4o".to_string());

        let mut messages = vec![];
        if let Some(sys) = &request.system {
            messages.push(serde_json::json!({ "role": "system", "content": sys }));
        }
        messages.extend(request.messages.iter().map(|m| serde_json::json!({
            "role": m.role, "content": m.content
        })));

        let body = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true
        });

        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let mut stream = resp.bytes_stream();
        let mut full = String::new();
        let mut buf = String::new();

        while let Some(chunk) = stream.next().await {
            let bytes = chunk.map_err(|e| CortexError::Ai(e.to_string()))?;
            buf.push_str(&String::from_utf8_lossy(&bytes));

            while let Some(pos) = buf.find('\n') {
                let line = buf[..pos].to_string();
                buf = buf[pos + 1..].to_string();

                if let Some(data) = line.strip_prefix("data: ") {
                    if data.trim() == "[DONE]" { break; }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(token) = json["choices"][0]["delta"]["content"].as_str() {
                            full.push_str(token);
                            let _ = app.emit("cortex:ai-token", token);
                        }
                    }
                }
            }
        }

        let _ = app.emit("cortex:ai-done", AiResponse {
            content: full,
            model,
            tokens_used: 0,
        });
        Ok(())
    }

    async fn stream_ollama(&self, app: &AppHandle, request: AiRequest) -> CortexResult<()> {
        let base_url = self.base_url.as_deref().unwrap_or("http://localhost:11434");
        let client = reqwest::Client::new();
        let model = request.model.clone().unwrap_or_else(|| "llama3".to_string());

        let body = serde_json::json!({
            "model": model,
            "messages": request.messages,
            "stream": true
        });

        let resp = client
            .post(format!("{base_url}/api/chat"))
            .json(&body)
            .send()
            .await
            .map_err(|e| CortexError::Ai(e.to_string()))?;

        let mut stream = resp.bytes_stream();
        let mut full = String::new();
        let mut buf = String::new();

        while let Some(chunk) = stream.next().await {
            let bytes = chunk.map_err(|e| CortexError::Ai(e.to_string()))?;
            buf.push_str(&String::from_utf8_lossy(&bytes));

            // Ollama streams NDJSON
            while let Some(pos) = buf.find('\n') {
                let line = buf[..pos].to_string();
                buf = buf[pos + 1..].to_string();

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(line.trim()) {
                    if let Some(token) = json["message"]["content"].as_str() {
                        full.push_str(token);
                        let _ = app.emit("cortex:ai-token", token);
                    }
                    if json["done"].as_bool().unwrap_or(false) {
                        break;
                    }
                }
            }
        }

        let _ = app.emit("cortex:ai-done", AiResponse {
            content: full,
            model,
            tokens_used: 0,
        });
        Ok(())
    }
}

const CORTEX_SYSTEM_PROMPT: &str = r#"
You are CORTEX AI, an intelligent copilot integrated into the CORTEX Knowledge Operating System.
CORTEX is a procedural intelligence platform for artists and technical directors working with node-based software like Houdini, Nuke, Blender, Unreal, and others.

Your capabilities include:
- Explaining software nodes and their parameters
- Generating node networks and workflows
- Recommending optimal node setups for specific goals
- Creating step-by-step learning paths
- Suggesting optimizations and best practices
- Analyzing project structures and identifying gaps
- Building recipes and blueprints

When discussing nodes, always reference:
- The specific software (Houdini, Nuke, Blender, etc.)
- Node inputs and outputs
- Key parameters and their effects
- Performance considerations
- Common use cases and production tips

Format node networks using clear visual flows:
NodeA → NodeB → NodeC

Be precise, technical, and practical. Artists need real production knowledge, not vague generalities.
"#;
