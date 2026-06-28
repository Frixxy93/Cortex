use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub vault_id: Uuid,
    pub filters: SearchFilters,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SearchFilters {
    pub object_types: Vec<String>,
    pub software: Vec<String>,
    pub tags: Vec<String>,
    pub categories: Vec<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub total: u64,
    pub items: Vec<SearchHit>,
    pub took_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub id: Uuid,
    pub object_type: String,
    pub name: String,
    pub description: Option<String>,
    pub score: f32,
    pub highlights: Vec<Highlight>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Highlight {
    pub field: String,
    pub fragments: Vec<String>,
}
