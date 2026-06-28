use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub path: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_opened_at: Option<DateTime<Utc>>,
    pub settings: VaultSettings,
    pub stats: VaultStats,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VaultSettings {
    pub default_software: Option<String>,
    pub auto_save: bool,
    pub auto_save_interval_seconds: u32,
    pub ai_enabled: bool,
    pub ai_provider: Option<AiProvider>,
    pub theme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AiProvider {
    OpenAi,
    Anthropic,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VaultStats {
    pub node_count: u64,
    pub graph_count: u64,
    pub recipe_count: u64,
    pub blueprint_count: u64,
    pub asset_count: u64,
    pub relationship_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVaultInput {
    pub name: String,
    pub description: Option<String>,
    pub path: String,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVaultInput {
    pub id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub settings: Option<VaultSettings>,
}
