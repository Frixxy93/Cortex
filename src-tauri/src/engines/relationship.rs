use uuid::Uuid;
use chrono::Utc;
use crate::domain::relationship::{Relationship, CreateRelationshipInput};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct RelationshipEngine {
    pool: DbPool,
}

impl RelationshipEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn get_relationships_for(&self, object_id: Uuid) -> CortexResult<Vec<Relationship>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id_str = object_id.to_string();
        let mut stmt = conn.prepare(
            "SELECT id, vault_id, source_id, target_id, relationship_type, label, strength, description, bidirectional, metadata, created_at
             FROM relationships WHERE source_id = ?1 OR target_id = ?1"
        )?;

        let rels = stmt.query_map([&id_str], |row| {
            Ok(Relationship {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                vault_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                source_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                target_id: Uuid::parse_str(&row.get::<_, String>(3)?).unwrap(),
                relationship_type: serde_json::from_str(&row.get::<_, String>(4)?).unwrap(),
                label: row.get(5)?,
                strength: row.get::<_, f64>(6)? as f32,
                description: row.get(7)?,
                bidirectional: row.get::<_, i32>(8)? != 0,
                metadata: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                created_at: row.get::<_, String>(10)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(rels)
    }

    pub fn create_relationship(&self, input: CreateRelationshipInput) -> CortexResult<Relationship> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();
        let strength = input.strength.unwrap_or(0.5);
        let bidirectional = input.bidirectional.unwrap_or(false);

        conn.execute(
            "INSERT INTO relationships (id, vault_id, source_id, target_id, relationship_type, label, strength, description, bidirectional, metadata, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            rusqlite::params![
                id.to_string(),
                input.vault_id.to_string(),
                input.source_id.to_string(),
                input.target_id.to_string(),
                serde_json::to_string(&input.relationship_type)?,
                input.label,
                strength as f64,
                input.description,
                bidirectional as i32,
                serde_json::to_string(&input.metadata.unwrap_or_default())?,
                now,
            ],
        )?;

        Ok(Relationship {
            id,
            vault_id: input.vault_id,
            source_id: input.source_id,
            target_id: input.target_id,
            relationship_type: input.relationship_type,
            label: input.label,
            strength,
            description: input.description,
            bidirectional,
            metadata: serde_json::Value::Object(Default::default()),
            created_at: Utc::now(),
        })
    }

    pub fn delete_relationship(&self, id: Uuid) -> CortexResult<()> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.execute("DELETE FROM relationships WHERE id = ?1", [id.to_string()])?;
        Ok(())
    }
}
