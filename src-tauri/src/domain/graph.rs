use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Graph {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub frames: Vec<GraphFrame>,
    pub comments: Vec<GraphComment>,
    pub viewport: Viewport,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: Uuid,
    pub node_id: Uuid,        // references domain Node
    pub graph_id: Uuid,
    pub position: Position,
    pub size: Option<Size>,
    pub color: Option<String>,
    pub label: Option<String>,
    pub is_collapsed: bool,
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub id: Uuid,
    pub source_node_id: Uuid,
    pub source_port_id: Option<Uuid>,
    pub target_node_id: Uuid,
    pub target_port_id: Option<Uuid>,
    pub label: Option<String>,
    pub color: Option<String>,
    pub edge_type: EdgeType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeType {
    Data,
    Reference,
    Depends,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphFrame {
    pub id: Uuid,
    pub graph_id: Uuid,
    pub label: String,
    pub color: Option<String>,
    pub position: Position,
    pub size: Size,
    pub node_ids: Vec<Uuid>,
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphComment {
    pub id: Uuid,
    pub graph_id: Uuid,
    pub text: String,
    pub position: Position,
    pub color: Option<String>,
    pub font_size: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGraphInput {
    pub vault_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGraphInput {
    pub id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub nodes: Option<Vec<GraphNode>>,
    pub edges: Option<Vec<GraphEdge>>,
    pub frames: Option<Vec<GraphFrame>>,
    pub comments: Option<Vec<GraphComment>>,
    pub viewport: Option<Viewport>,
}
