use uuid::Uuid;
use chrono::Utc;
use crate::domain::node::{Node, CreateNodeInput, UpdateNodeInput};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct NodeEngine {
    pool: DbPool,
}

impl NodeEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn list_nodes(&self, vault_id: Uuid) -> CortexResult<Vec<Node>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, vault_id, software_id, name, display_name, category, object_type,
                    description, version, color, icon, tags, inputs, outputs, parameters,
                    documentation, notes, production_tips, media_ids, is_deprecated,
                    deprecated_by, metadata, created_at, updated_at
             FROM nodes WHERE vault_id = ?1 ORDER BY display_name ASC"
        )?;
        let nodes = stmt.query_map([vault_id.to_string()], |row| Self::row_to_node(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(nodes)
    }

    pub fn list_all_nodes(&self) -> CortexResult<Vec<Node>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, vault_id, software_id, name, display_name, category, object_type,
                    description, version, color, icon, tags, inputs, outputs, parameters,
                    documentation, notes, production_tips, media_ids, is_deprecated,
                    deprecated_by, metadata, created_at, updated_at
             FROM nodes ORDER BY display_name ASC"
        )?;
        let nodes = stmt.query_map([], |row| Self::row_to_node(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(nodes)
    }

    pub fn get_node(&self, id: Uuid) -> CortexResult<Node> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.query_row(
            "SELECT id, vault_id, software_id, name, display_name, category, object_type,
                    description, version, color, icon, tags, inputs, outputs, parameters,
                    documentation, notes, production_tips, media_ids, is_deprecated,
                    deprecated_by, metadata, created_at, updated_at
             FROM nodes WHERE id = ?1",
            [id.to_string()],
            |row| Self::row_to_node(row),
        ).map_err(|_| CortexError::NotFound(format!("Node {id} not found")))
    }

    pub fn create_node(&self, input: CreateNodeInput) -> CortexResult<Node> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO nodes (id, vault_id, software_id, name, display_name, category, object_type,
              description, version, color, icon, tags, inputs, outputs, parameters,
              documentation, notes, production_tips, media_ids, metadata, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?21)",
            rusqlite::params![
                id.to_string(),
                input.vault_id.map(|u| u.to_string()),
                input.software_id.map(|u| u.to_string()),
                input.name,
                input.display_name,
                serde_json::to_string(&input.category)?,
                serde_json::to_string(&input.object_type)?,
                input.description,
                input.version,
                input.color,
                input.icon,
                serde_json::to_string(&input.tags)?,
                serde_json::to_string(&input.inputs)?,
                serde_json::to_string(&input.outputs)?,
                serde_json::to_string(&input.parameters)?,
                input.documentation,
                input.notes,
                serde_json::to_string(&input.production_tips)?,
                "[]",
                serde_json::to_string(&input.metadata.as_ref().unwrap_or(&serde_json::Value::Null))?,
                now,
            ],
        )?;
        self.get_node(id)
    }

    pub fn update_node(&self, input: UpdateNodeInput) -> CortexResult<Node> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE nodes SET
                name = COALESCE(?2, name),
                display_name = COALESCE(?3, display_name),
                description = COALESCE(?4, description),
                color = COALESCE(?5, color),
                icon = COALESCE(?6, icon),
                documentation = COALESCE(?7, documentation),
                notes = COALESCE(?8, notes),
                category = COALESCE(?10, category),
                object_type = COALESCE(?11, object_type),
                tags = COALESCE(?12, tags),
                parameters = COALESCE(?13, parameters),
                production_tips = COALESCE(?14, production_tips),
                inputs = COALESCE(?15, inputs),
                outputs = COALESCE(?16, outputs),
                updated_at = ?9
             WHERE id = ?1",
            rusqlite::params![
                input.id.to_string(),
                input.name,
                input.display_name,
                input.description,
                input.color,
                input.icon,
                input.documentation,
                input.notes,
                now,
                input.category.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.object_type.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.tags.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.parameters.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.production_tips.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.inputs.as_ref().map(|v| serde_json::to_string(v).ok()),
                input.outputs.as_ref().map(|v| serde_json::to_string(v).ok()),
            ],
        )?;
        self.get_node(input.id)
    }

    pub fn batch_create_nodes(&self, inputs: Vec<CreateNodeInput>) -> CortexResult<Vec<Node>> {
        let mut conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let tx = conn.transaction()?;
        let now = Utc::now().to_rfc3339();
        let mut results = Vec::new();
        for input in inputs {
            let id = Uuid::new_v4();
            tx.execute(
                "INSERT INTO nodes (id, vault_id, software_id, name, display_name, category, object_type,
                                    description, version, color, icon, tags, inputs, outputs, parameters,
                                    documentation, notes, production_tips, media_ids, is_deprecated,
                                    metadata, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,0,?20,?21,?21)",
                rusqlite::params![
                    id.to_string(),
                    input.vault_id.map(|u| u.to_string()),
                    input.software_id.map(|s| s.to_string()),
                    input.name,
                    input.display_name,
                    serde_json::to_string(&input.category)?,
                    serde_json::to_string(&input.object_type)?,
                    input.description,
                    input.version,
                    input.color,
                    input.icon,
                    serde_json::to_string(&input.tags)?,
                    serde_json::to_string(&input.inputs)?,
                    serde_json::to_string(&input.outputs)?,
                    serde_json::to_string(&input.parameters)?,
                    input.documentation,
                    input.notes,
                    serde_json::to_string(&input.production_tips)?,
                    "[]",
                    serde_json::to_string(&input.metadata.as_ref().unwrap_or(&serde_json::Value::Null))?,
                    now,
                ],
            )?;
            results.push(self.get_node_with_conn(&tx, id)?);
        }
        tx.commit()?;
        Ok(results)
    }

    /// Replace the entire node library with `inputs`.
    /// Drops FTS triggers, clears nodes, bulk-inserts, rebuilds FTS index, restores triggers.
    pub fn replace_all_nodes(&self, inputs: Vec<CreateNodeInput>) -> CortexResult<usize> {
        let mut conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        // 1. Drop FTS triggers + clear all nodes (no trigger overhead)
        conn.execute_batch(r#"
            DROP TRIGGER IF EXISTS nodes_fts_insert;
            DROP TRIGGER IF EXISTS nodes_fts_update;
            DROP TRIGGER IF EXISTS nodes_fts_delete;
            INSERT INTO nodes_fts(nodes_fts) VALUES('delete-all');
            DELETE FROM nodes;
        "#)?;

        // 2. Bulk insert in one transaction
        {
            let tx = conn.transaction()?;
            {
                let mut stmt = tx.prepare(
                    "INSERT INTO nodes (id, vault_id, software_id, name, display_name, category, object_type,
                                       description, version, color, icon, tags, inputs, outputs, parameters,
                                       documentation, notes, production_tips, media_ids, is_deprecated,
                                       metadata, created_at, updated_at)
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,0,?20,?21,?21)"
                )?;
                for input in &inputs {
                    let id = Uuid::new_v4();
                    stmt.execute(rusqlite::params![
                        id.to_string(),
                        input.vault_id.map(|u| u.to_string()),
                        input.software_id.map(|s| s.to_string()),
                        &input.name,
                        &input.display_name,
                        serde_json::to_string(&input.category)?,
                        serde_json::to_string(&input.object_type)?,
                        &input.description,
                        &input.version,
                        &input.color,
                        &input.icon,
                        serde_json::to_string(&input.tags)?,
                        serde_json::to_string(&input.inputs)?,
                        serde_json::to_string(&input.outputs)?,
                        serde_json::to_string(&input.parameters)?,
                        &input.documentation,
                        &input.notes,
                        serde_json::to_string(&input.production_tips)?,
                        "[]",
                        serde_json::to_string(&input.metadata.as_ref().unwrap_or(&serde_json::Value::Null))?,
                        &now,
                    ])?;
                }
            }
            tx.commit()?;
        }

        // 3. Rebuild FTS + restore triggers
        conn.execute_batch(r#"
            INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild');
            CREATE TRIGGER IF NOT EXISTS nodes_fts_insert AFTER INSERT ON nodes BEGIN
                INSERT INTO nodes_fts(rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES (new.rowid, new.id, new.name, new.display_name, new.description, new.documentation, new.notes, new.tags);
            END;
            CREATE TRIGGER IF NOT EXISTS nodes_fts_update AFTER UPDATE ON nodes BEGIN
                INSERT INTO nodes_fts(nodes_fts, rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES ('delete', old.rowid, old.id, old.name, old.display_name, old.description, old.documentation, old.notes, old.tags);
                INSERT INTO nodes_fts(rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES (new.rowid, new.id, new.name, new.display_name, new.description, new.documentation, new.notes, new.tags);
            END;
            CREATE TRIGGER IF NOT EXISTS nodes_fts_delete AFTER DELETE ON nodes BEGIN
                INSERT INTO nodes_fts(nodes_fts, rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES ('delete', old.rowid, old.id, old.name, old.display_name, old.description, old.documentation, old.notes, old.tags);
            END;
        "#)?;

        let count: usize = conn
            .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get(0))
            .unwrap_or(0);
        tracing::info!("replace_all_nodes: {} nodes imported", count);
        Ok(count)
    }

    fn get_node_with_conn(&self, conn: &rusqlite::Connection, id: Uuid) -> CortexResult<Node> {
        conn.query_row(
            "SELECT id, vault_id, software_id, name, display_name, category, object_type,
                    description, version, color, icon, tags, inputs, outputs, parameters,
                    documentation, notes, production_tips, media_ids, is_deprecated,
                    deprecated_by, metadata, created_at, updated_at
             FROM nodes WHERE id = ?1",
            [id.to_string()],
            Self::row_to_node,
        ).map_err(|e| CortexError::Database(e.to_string()))
    }

    pub fn delete_node(&self, id: Uuid) -> CortexResult<()> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.execute("DELETE FROM nodes WHERE id = ?1", [id.to_string()])?;
        Ok(())
    }

    pub fn clear_vault_nodes(&self, vault_id: Uuid) -> CortexResult<usize> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM nodes WHERE vault_id = ?1", [vault_id.to_string()])?;
        Ok(deleted)
    }

    pub fn clear_all_nodes(&self) -> CortexResult<usize> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM nodes", [])?;
        Ok(deleted)
    }

    fn row_to_node(row: &rusqlite::Row) -> rusqlite::Result<Node> {
        Ok(Node {
            id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
            vault_id: row.get::<_, Option<String>>(1)?.and_then(|s| Uuid::parse_str(&s).ok()),
            software_id: row.get::<_, Option<String>>(2)?.and_then(|s| Uuid::parse_str(&s).ok()),
            name: row.get(3)?,
            display_name: row.get(4)?,
            category: serde_json::from_str(&row.get::<_, String>(5)?).unwrap(),
            object_type: serde_json::from_str(&row.get::<_, String>(6)?).unwrap(),
            description: row.get(7)?,
            version: row.get(8)?,
            color: row.get(9)?,
            icon: row.get(10)?,
            tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
            inputs: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or_default(),
            outputs: serde_json::from_str(&row.get::<_, String>(13)?).unwrap_or_default(),
            parameters: serde_json::from_str(&row.get::<_, String>(14)?).unwrap_or_default(),
            documentation: row.get(15)?,
            notes: row.get(16)?,
            production_tips: serde_json::from_str(&row.get::<_, String>(17)?).unwrap_or_default(),
            media_ids: serde_json::from_str(&row.get::<_, String>(18)?).unwrap_or_default(),
            is_deprecated: row.get::<_, i32>(19)? != 0,
            deprecated_by: row.get::<_, Option<String>>(20)?.and_then(|s| Uuid::parse_str(&s).ok()),
            metadata: serde_json::from_str(&row.get::<_, String>(21)?).unwrap_or_default(),
            created_at: row.get::<_, String>(22)?.parse().unwrap(),
            updated_at: row.get::<_, String>(23)?.parse().unwrap(),
        })
    }

    pub fn reseed_nodes(&self) -> CortexResult<usize> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        // Drop FTS triggers so DELETE doesn't try to update the stale index
        conn.execute_batch(r#"
            DROP TRIGGER IF EXISTS nodes_fts_insert;
            DROP TRIGGER IF EXISTS nodes_fts_update;
            DROP TRIGGER IF EXISTS nodes_fts_delete;
            DELETE FROM nodes_fts;
            DELETE FROM nodes;
        "#)?;
        // Insert all nodes (no triggers active — fast single transaction)
        conn.execute_batch(crate::data::NODES_SEED_SQL)?;
        // Rebuild FTS index from current nodes table, then restore triggers
        conn.execute_batch(r#"
            INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild');
            CREATE TRIGGER IF NOT EXISTS nodes_fts_insert AFTER INSERT ON nodes BEGIN
                INSERT INTO nodes_fts(rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES (new.rowid, new.id, new.name, new.display_name, new.description, new.documentation, new.notes, new.tags);
            END;
            CREATE TRIGGER IF NOT EXISTS nodes_fts_update AFTER UPDATE ON nodes BEGIN
                INSERT INTO nodes_fts(nodes_fts, rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES ('delete', old.rowid, old.id, old.name, old.display_name, old.description, old.documentation, old.notes, old.tags);
                INSERT INTO nodes_fts(rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES (new.rowid, new.id, new.name, new.display_name, new.description, new.documentation, new.notes, new.tags);
            END;
            CREATE TRIGGER IF NOT EXISTS nodes_fts_delete AFTER DELETE ON nodes BEGIN
                INSERT INTO nodes_fts(nodes_fts, rowid, id, name, display_name, description, documentation, notes, tags)
                VALUES ('delete', old.rowid, old.id, old.name, old.display_name, old.description, old.documentation, old.notes, old.tags);
            END;
        "#)?;
        let count: usize = conn
            .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get(0))
            .unwrap_or(0);
        tracing::info!("reseed_nodes: {} nodes inserted", count);
        Ok(count)
    }
}
