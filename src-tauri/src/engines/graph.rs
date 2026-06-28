use uuid::Uuid;
use chrono::Utc;
use crate::domain::graph::{Graph, CreateGraphInput, UpdateGraphInput, Viewport};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct GraphEngine {
    pool: DbPool,
}

impl GraphEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn list_graphs(&self, vault_id: Uuid) -> CortexResult<Vec<Graph>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, vault_id, name, description, tags, nodes, edges, frames, comments, viewport, metadata, created_at, updated_at
             FROM graphs WHERE vault_id = ?1 ORDER BY updated_at DESC"
        )?;

        let graphs = stmt.query_map([vault_id.to_string()], |row| {
            Self::row_to_graph(row)
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(graphs)
    }

    pub fn get_graph(&self, id: Uuid) -> CortexResult<Graph> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.query_row(
            "SELECT id, vault_id, name, description, tags, nodes, edges, frames, comments, viewport, metadata, created_at, updated_at
             FROM graphs WHERE id = ?1",
            [id.to_string()],
            |row| Self::row_to_graph(row),
        ).map_err(|_| CortexError::NotFound(format!("Graph {id} not found")))
    }

    pub fn create_graph(&self, input: CreateGraphInput) -> CortexResult<Graph> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO graphs (id, vault_id, name, description, tags, nodes, edges, frames, comments, viewport, metadata, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,'[]','[]','[]','[]',?6,'{}',?7,?7)",
            rusqlite::params![
                id.to_string(),
                input.vault_id.to_string(),
                input.name,
                input.description,
                serde_json::to_string(&input.tags)?,
                serde_json::to_string(&Viewport { x: 0.0, y: 0.0, zoom: 1.0 })?,
                now,
            ],
        )?;

        self.get_graph(id)
    }

    pub fn save_graph(&self, input: UpdateGraphInput) -> CortexResult<Graph> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE graphs SET
                name = COALESCE(?2, name),
                description = COALESCE(?3, description),
                tags = COALESCE(?4, tags),
                nodes = COALESCE(?5, nodes),
                edges = COALESCE(?6, edges),
                frames = COALESCE(?7, frames),
                comments = COALESCE(?8, comments),
                viewport = COALESCE(?9, viewport),
                updated_at = ?10
             WHERE id = ?1",
            rusqlite::params![
                input.id.to_string(),
                input.name,
                input.description,
                input.tags.as_ref().map(|t| serde_json::to_string(t).ok()),
                input.nodes.as_ref().map(|n| serde_json::to_string(n).ok()),
                input.edges.as_ref().map(|e| serde_json::to_string(e).ok()),
                input.frames.as_ref().map(|f| serde_json::to_string(f).ok()),
                input.comments.as_ref().map(|c| serde_json::to_string(c).ok()),
                input.viewport.as_ref().map(|v| serde_json::to_string(v).ok()),
                now,
            ],
        )?;

        self.get_graph(input.id)
    }


    pub fn delete_graph(&self, id: Uuid) -> CortexResult<()> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.execute("DELETE FROM graphs WHERE id = ?1", [id.to_string()])?;
        Ok(())
    }

    fn row_to_graph(row: &rusqlite::Row) -> rusqlite::Result<Graph> {
        Ok(Graph {
            id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
            vault_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
            name: row.get(2)?,
            description: row.get(3)?,
            tags: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
            nodes: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
            edges: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
            frames: serde_json::from_str(&row.get::<_, String>(7)?).unwrap_or_default(),
            comments: serde_json::from_str(&row.get::<_, String>(8)?).unwrap_or_default(),
            viewport: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
            metadata: serde_json::from_str(&row.get::<_, String>(10)?).unwrap_or_default(),
            created_at: row.get::<_, String>(11)?.parse().unwrap(),
            updated_at: row.get::<_, String>(12)?.parse().unwrap(),
        })
    }
}
