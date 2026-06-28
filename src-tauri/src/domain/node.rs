#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use super::parameter::Parameter;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: Uuid,
    pub vault_id: Option<Uuid>,
    pub software_id: Option<Uuid>,
    pub name: String,
    pub display_name: String,
    pub category: NodeCategory,
    pub object_type: NodeObjectType,
    pub description: Option<String>,
    pub version: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub tags: Vec<String>,
    pub inputs: Vec<NodePort>,
    pub outputs: Vec<NodePort>,
    pub parameters: Vec<Parameter>,
    pub documentation: Option<String>,
    pub notes: Option<String>,
    pub production_tips: Vec<String>,
    pub media_ids: Vec<Uuid>,
    pub is_deprecated: bool,
    pub deprecated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeCategory {
    // Houdini categories
    Sop,
    Dop,
    Cop,
    Vop,
    Lop,
    Rop,
    Chop,
    Top,
    Object,
    // Nuke
    Color,
    Filter,
    Merge,
    Transform,
    Channel,
    Draw,
    Deep,
    // Blender
    Geometry,
    Shader,
    Compositor,
    // Unreal
    Blueprint,
    Material,
    Animation,
    // Generic
    Utility,
    Math,
    Logic,
    Custom,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeObjectType {
    SoftwareNode,
    Recipe,
    Blueprint,
    Documentation,
    Asset,
    Project,
    Template,
    Reference,
    LearningTopic,
    ExternalLink,
    Note,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodePort {
    pub id: String,
    pub name: String,
    pub data_type: String,
    pub required: bool,
    pub multi: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeInput {
    pub vault_id: Option<Uuid>,
    pub software_id: Option<Uuid>,
    pub name: String,
    pub display_name: String,
    pub category: NodeCategory,
    pub object_type: NodeObjectType,
    pub description: Option<String>,
    pub version: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub inputs: Vec<NodePort>,
    #[serde(default)]
    pub outputs: Vec<NodePort>,
    #[serde(default)]
    pub parameters: Vec<Parameter>,
    pub documentation: Option<String>,
    pub notes: Option<String>,
    #[serde(default)]
    pub production_tips: Vec<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodeInput {
    pub id: Uuid,
    pub name: Option<String>,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub tags: Option<Vec<String>>,
    pub parameters: Option<Vec<Parameter>>,
    pub documentation: Option<String>,
    pub notes: Option<String>,
    pub production_tips: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
    pub category: Option<String>,
    pub object_type: Option<String>,
    pub inputs: Option<Vec<NodePort>>,
    pub outputs: Option<Vec<NodePort>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Software {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
    pub version: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
    pub website: Option<String>,
    pub created_at: DateTime<Utc>,
}
