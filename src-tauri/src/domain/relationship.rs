use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub source_id: Uuid,
    pub target_id: Uuid,
    pub relationship_type: RelationshipType,
    pub label: Option<String>,
    pub strength: f32,         // 0.0 – 1.0
    pub description: Option<String>,
    pub bidirectional: bool,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipType {
    Uses,
    DependsOn,
    Consumes,
    Creates,
    References,
    ConnectedTo,
    SimilarTo,
    AlternativeTo,
    Parent,
    Child,
    ReplacedBy,
    DeprecatedBy,
    PartOf,
    Contains,
    Triggers,
    Custom,
}

impl RelationshipType {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Uses => "uses",
            Self::DependsOn => "depends on",
            Self::Consumes => "consumes",
            Self::Creates => "creates",
            Self::References => "references",
            Self::ConnectedTo => "connected to",
            Self::SimilarTo => "similar to",
            Self::AlternativeTo => "alternative to",
            Self::Parent => "parent",
            Self::Child => "child",
            Self::ReplacedBy => "replaced by",
            Self::DeprecatedBy => "deprecated by",
            Self::PartOf => "part of",
            Self::Contains => "contains",
            Self::Triggers => "triggers",
            Self::Custom => "related to",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRelationshipInput {
    pub vault_id: Uuid,
    pub source_id: Uuid,
    pub target_id: Uuid,
    pub relationship_type: RelationshipType,
    pub label: Option<String>,
    pub strength: Option<f32>,
    pub description: Option<String>,
    pub bidirectional: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}
