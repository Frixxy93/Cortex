use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct AnalyticsEngine {
    pool: DbPool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsDashboard {
    pub node_count: u64,
    pub graph_count: u64,
    pub recipe_count: u64,
    pub blueprint_count: u64,
    pub relationship_count: u64,
    pub asset_count: u64,
    pub most_viewed_nodes: Vec<AnalyticsItem>,
    pub recent_activity: Vec<AnalyticsEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsItem {
    pub id: String,
    pub name: String,
    pub count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsEvent {
    pub id: String,
    pub event_type: String,
    pub object_type: Option<String>,
    pub object_id: Option<String>,
    pub created_at: String,
}

impl AnalyticsEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn track(&self, vault_id: Uuid, event_type: &str, object_id: Option<&str>, object_type: Option<&str>, data: serde_json::Value) -> CortexResult<()> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO analytics_events (id, vault_id, event_type, object_id, object_type, data, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            rusqlite::params![
                id.to_string(),
                vault_id.to_string(),
                event_type,
                object_id,
                object_type,
                serde_json::to_string(&data)?,
                now,
            ],
        )?;

        Ok(())
    }

    pub fn get_dashboard(&self, vault_id: Uuid) -> CortexResult<AnalyticsDashboard> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let vault_id_str = vault_id.to_string();

        let node_count: u64 = conn.query_row(
            "SELECT COUNT(*) FROM nodes WHERE vault_id = ?1", [&vault_id_str], |r| r.get(0)
        ).unwrap_or(0);

        let graph_count: u64 = conn.query_row(
            "SELECT COUNT(*) FROM graphs WHERE vault_id = ?1", [&vault_id_str], |r| r.get(0)
        ).unwrap_or(0);

        let relationship_count: u64 = conn.query_row(
            "SELECT COUNT(*) FROM relationships WHERE vault_id = ?1", [&vault_id_str], |r| r.get(0)
        ).unwrap_or(0);

        Ok(AnalyticsDashboard {
            node_count,
            graph_count,
            recipe_count: 0,
            blueprint_count: 0,
            relationship_count,
            asset_count: 0,
            most_viewed_nodes: vec![],
            recent_activity: vec![],
        })
    }
}
