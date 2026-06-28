use std::time::Instant;
use uuid::Uuid;
use crate::domain::search::{SearchQuery, SearchResult, SearchHit};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct SearchEngine {
    pool: DbPool,
}

impl SearchEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn search(&self, query: SearchQuery) -> CortexResult<SearchResult> {
        let start = Instant::now();
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;

        let fts_query = format!("{}*", query.query.replace('"', "\"\""));
        let vault_id = query.vault_id.to_string();

        let mut stmt = conn.prepare(
            "SELECT n.id, n.name, n.display_name, n.description, n.object_type,
                    bm25(nodes_fts) AS score
             FROM nodes_fts
             JOIN nodes n ON n.id = nodes_fts.id
             WHERE nodes_fts MATCH ?1 AND n.vault_id = ?2
             ORDER BY score
             LIMIT ?3 OFFSET ?4"
        ).map_err(|e| CortexError::Search(e.to_string()))?;

        let limit = query.limit.unwrap_or(50) as i64;
        let offset = query.offset.unwrap_or(0) as i64;

        let hits = stmt.query_map(
            rusqlite::params![fts_query, vault_id, limit, offset],
            |row| {
                Ok(SearchHit {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    object_type: row.get(4)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    score: (row.get::<_, f64>(5).unwrap_or(0.0) * -1.0) as f32,
                    highlights: vec![],
                    metadata: serde_json::Value::Null,
                })
            }
        ).map_err(|e| CortexError::Search(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| CortexError::Search(e.to_string()))?;

        let took_ms = start.elapsed().as_millis() as u64;

        Ok(SearchResult {
            total: hits.len() as u64,
            items: hits,
            took_ms,
        })
    }
}
