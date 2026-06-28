use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum CortexError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Vault error: {0}")]
    Vault(String),

    #[error("Node error: {0}")]
    Node(String),

    #[error("Graph error: {0}")]
    Graph(String),

    #[error("Search error: {0}")]
    Search(String),

    #[error("Import error: {0}")]
    Import(String),

    #[error("AI error: {0}")]
    Ai(String),

    #[error("Asset error: {0}")]
    Asset(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),
}

impl From<rusqlite::Error> for CortexError {
    fn from(e: rusqlite::Error) -> Self {
        CortexError::Database(e.to_string())
    }
}

impl From<serde_json::Error> for CortexError {
    fn from(e: serde_json::Error) -> Self {
        CortexError::Serialization(e.to_string())
    }
}

impl From<std::io::Error> for CortexError {
    fn from(e: std::io::Error) -> Self {
        CortexError::Io(e.to_string())
    }
}

impl From<anyhow::Error> for CortexError {
    fn from(e: anyhow::Error) -> Self {
        CortexError::Io(e.to_string())
    }
}

pub type CortexResult<T> = Result<T, CortexError>;
