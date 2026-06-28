#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::graph::Graph;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blueprint {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub tags: Vec<String>,
    pub software: Option<String>,
    pub graph: Graph,
    pub thumbnail_id: Option<Uuid>,
    pub media_ids: Vec<Uuid>,
    pub author: Option<String>,
    pub is_published: bool,
    pub instance_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlueprintInstance {
    pub id: Uuid,
    pub blueprint_id: Uuid,
    pub graph_id: Uuid,
    pub vault_id: Uuid,
    pub name: Option<String>,
    pub overrides: serde_json::Value,   // parameter overrides
    pub synced_at: Option<DateTime<Utc>>,
    pub is_detached: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBlueprintInput {
    pub vault_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub software: Option<String>,
    pub graph_id: Uuid,
}
