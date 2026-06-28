use uuid::Uuid;
use chrono::Utc;
use crate::domain::vault::{Vault, CreateVaultInput, UpdateVaultInput, VaultSettings, VaultStats};
use crate::error::{CortexError, CortexResult};
use crate::storage::database::DbPool;

pub struct VaultEngine {
    pool: DbPool,
}

impl VaultEngine {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn list_vaults(&self) -> CortexResult<Vec<Vault>> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT
                v.id, v.name, v.description, v.path, v.color, v.icon, v.settings,
                v.created_at, v.updated_at, v.last_opened_at,
                (SELECT COUNT(*) FROM graphs  g WHERE g.vault_id = v.id) AS graph_count,
                (SELECT COUNT(*) FROM assets  a WHERE a.vault_id = v.id) AS asset_count
             FROM vaults v ORDER BY v.last_opened_at DESC NULLS LAST"
        )?;

        let vaults = stmt.query_map([], |row| {
            Ok(Vault {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                description: row.get(2)?,
                path: row.get(3)?,
                color: row.get(4)?,
                icon: row.get(5)?,
                settings: row.get::<_, String>(6)
                    .map(|s| serde_json::from_str(&s).unwrap_or_default())
                    .unwrap_or_default(),
                created_at: row.get::<_, String>(7).map(|s| s.parse().unwrap())?,
                updated_at: row.get::<_, String>(8).map(|s| s.parse().unwrap())?,
                last_opened_at: row.get::<_, Option<String>>(9)
                    .map(|opt| opt.and_then(|s| s.parse().ok()))?,
                stats: VaultStats {
                    graph_count: row.get::<_, i64>(10).unwrap_or(0) as u64,
                    asset_count: row.get::<_, i64>(11).unwrap_or(0) as u64,
                    ..Default::default()
                },
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(vaults)
    }

    pub fn create_vault(&self, input: CreateVaultInput) -> CortexResult<Vault> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();
        let settings = serde_json::to_string(&VaultSettings {
            auto_save: true,
            auto_save_interval_seconds: 30,
            ..Default::default()
        })?;

        conn.execute(
            "INSERT INTO vaults (id, name, description, path, color, icon, settings, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            rusqlite::params![
                id.to_string(),
                input.name,
                input.description,
                input.path,
                input.color,
                input.icon,
                settings,
                now,
            ],
        )?;

        self.get_vault(id)
    }

    pub fn get_vault(&self, id: Uuid) -> CortexResult<Vault> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let result = conn.query_row(
            "SELECT id, name, description, path, color, icon, settings, created_at, updated_at, last_opened_at
             FROM vaults WHERE id = ?1",
            [id.to_string()],
            |row| {
                Ok(Vault {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    name: row.get(1)?,
                    description: row.get(2)?,
                    path: row.get(3)?,
                    color: row.get(4)?,
                    icon: row.get(5)?,
                    settings: row.get::<_, String>(6)
                        .map(|s| serde_json::from_str(&s).unwrap_or_default())
                        .unwrap_or_default(),
                    created_at: row.get::<_, String>(7).map(|s| s.parse().unwrap())?,
                    updated_at: row.get::<_, String>(8).map(|s| s.parse().unwrap())?,
                    last_opened_at: row.get::<_, Option<String>>(9)
                        .map(|opt| opt.and_then(|s| s.parse().ok()))?,
                    stats: VaultStats::default(),
                })
            }
        );

        result.map_err(|_| CortexError::NotFound(format!("Vault {id} not found")))
    }

    pub fn update_vault(&self, input: UpdateVaultInput) -> CortexResult<Vault> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE vaults SET
                name = COALESCE(?2, name),
                description = COALESCE(?3, description),
                color = COALESCE(?4, color),
                icon = COALESCE(?5, icon),
                updated_at = ?6
             WHERE id = ?1",
            rusqlite::params![
                input.id.to_string(),
                input.name,
                input.description,
                input.color,
                input.icon,
                now,
            ],
        )?;

        self.get_vault(input.id)
    }

    pub fn delete_vault(&self, id: Uuid) -> CortexResult<()> {
        let conn = self.pool.get().map_err(|e| CortexError::Database(e.to_string()))?;
        conn.execute("DELETE FROM vaults WHERE id = ?1", [id.to_string()])?;
        Ok(())
    }
}
