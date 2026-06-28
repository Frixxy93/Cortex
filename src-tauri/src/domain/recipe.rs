#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recipe {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub difficulty: RecipeDifficulty,
    pub tags: Vec<String>,
    pub software: Option<String>,
    pub steps: Vec<RecipeStep>,
    pub graph_id: Option<Uuid>,
    pub asset_ids: Vec<Uuid>,
    pub media_ids: Vec<Uuid>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecipeDifficulty {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipeStep {
    pub id: Uuid,
    pub order: u32,
    pub title: String,
    pub description: Option<String>,
    pub node_id: Option<Uuid>,
    pub parameters: serde_json::Value,
    pub notes: Option<String>,
    pub media_ids: Vec<Uuid>,
}
