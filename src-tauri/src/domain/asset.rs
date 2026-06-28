use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: Uuid,
    pub vault_id: Uuid,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub asset_type: AssetType,
    pub mime_type: Option<String>,
    pub file_size: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<f64>,
    pub thumbnail_path: Option<String>,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    Image,
    Video,
    Gif,
    Audio,
    Pdf,
    Texture,
    Hdri,
    ZipArchive,
    ProjectFile,
    Document,
    Other,
}

impl AssetType {
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "webp" | "tiff" | "bmp" | "exr" => Self::Image,
            "mp4" | "mov" | "avi" | "mkv" | "webm" => Self::Video,
            "gif" => Self::Gif,
            "mp3" | "wav" | "ogg" | "flac" | "aiff" => Self::Audio,
            "pdf" => Self::Pdf,
            "hdr" | "hdri" => Self::Hdri,
            "zip" | "7z" | "tar" | "gz" => Self::ZipArchive,
            "hip" | "hiplc" | "hipnc" | "nk" | "blend" => Self::ProjectFile,
            "md" | "txt" | "doc" | "docx" => Self::Document,
            _ => Self::Other,
        }
    }
}
