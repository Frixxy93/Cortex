use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Parameter {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
    pub param_type: ParameterType,
    pub default_value: Option<serde_json::Value>,
    pub min_value: Option<serde_json::Value>,
    pub max_value: Option<serde_json::Value>,
    pub options: Option<Vec<ParameterOption>>,
    pub description: Option<String>,
    pub group: Option<String>,
    pub visible_when: Option<ParameterCondition>,
    pub enabled_when: Option<ParameterCondition>,
    pub performance_impact: PerformanceImpact,
    pub is_animatable: bool,
    pub is_expression_capable: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ParameterType {
    String,
    Integer,
    Float,
    Boolean,
    Enum,
    Vector2,
    Vector3,
    Vector4,
    Color,
    File,
    Image,
    Expression,
    Array,
    Object,
    Json,
    Button,
    Separator,
    Label,
    Ramp,
    Keyframe,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterOption {
    pub value: serde_json::Value,
    pub label: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParameterCondition {
    pub parameter: String,
    pub operator: ConditionOperator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConditionOperator {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Contains,
    NotContains,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum PerformanceImpact {
    #[default]
    None,
    Low,
    Medium,
    High,
    Critical,
}
