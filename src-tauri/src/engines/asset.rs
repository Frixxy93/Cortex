use uuid::Uuid;
use chrono::Utc;
use std::path::Path;
use crate::domain::asset::{Asset, AssetType};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct AssetEngine {
    pool: DbPool,
}

impl AssetEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn list_assets(&self, vault_id: Uuid) -> CortexResult<Vec<Asset>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, vault_id, name, file_name, file_path, asset_type, mime_type, file_size,
                    width, height, duration_seconds, thumbnail_path, tags, description, metadata, created_at, updated_at
             FROM assets WHERE vault_id = ?1 ORDER BY created_at DESC"
        )?;

        let assets = stmt.query_map([vault_id.to_string()], |row| {
            Ok(Asset {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                vault_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                name: row.get(2)?,
                file_name: row.get(3)?,
                file_path: row.get(4)?,
                asset_type: serde_json::from_str(&row.get::<_, String>(5)?).unwrap(),
                mime_type: row.get(6)?,
                file_size: row.get::<_, i64>(7)? as u64,
                width: row.get::<_, Option<i64>>(8)?.map(|v| v as u32),
                height: row.get::<_, Option<i64>>(9)?.map(|v| v as u32),
                duration_seconds: row.get(10)?,
                thumbnail_path: row.get(11)?,
                tags: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or_default(),
                description: row.get(13)?,
                metadata: serde_json::from_str(&row.get::<_, String>(14)?).unwrap_or_default(),
                created_at: row.get::<_, String>(15)?.parse().unwrap(),
                updated_at: row.get::<_, String>(16)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(assets)
    }

    pub fn import_asset(&self, vault_id: Uuid, file_path: &str) -> CortexResult<Asset> {
        let path = Path::new(file_path);
        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        let extension = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        let asset_type = AssetType::from_extension(extension);
        let file_size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);

        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();
        let name = path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&file_name)
            .to_string();

        conn.execute(
            "INSERT INTO assets (id, vault_id, name, file_name, file_path, asset_type, file_size, tags, metadata, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,'[]','{}',?8,?8)",
            rusqlite::params![
                id.to_string(),
                vault_id.to_string(),
                name.clone(),
                file_name.clone(),
                file_path,
                serde_json::to_string(&asset_type)?,
                file_size as i64,
                now,
            ],
        )?;

        Ok(Asset {
            id,
            vault_id,
            name,
            file_name,
            file_path: file_path.to_string(),
            asset_type,
            mime_type: None,
            file_size,
            width: None,
            height: None,
            duration_seconds: None,
            thumbnail_path: None,
            tags: vec![],
            description: None,
            metadata: serde_json::Value::Null,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        })
    }
}
