use rusqlite::Connection;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;
use crate::error::CortexResult;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn create_pool(db_path: &Path) -> CortexResult<DbPool> {
    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn| {
            // Enable WAL mode for concurrent reads
            conn.execute_batch("
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=NORMAL;
                PRAGMA cache_size=10000;
                PRAGMA foreign_keys=ON;
                PRAGMA temp_store=MEMORY;
            ")?;
            Ok(())
        });

    let pool = Pool::builder()
        .max_size(10)
        .build(manager)
        .map_err(|e| crate::error::CortexError::Database(e.to_string()))?;

    Ok(pool)
}

pub fn init_database(conn: &Connection) -> CortexResult<()> {
    crate::storage::migrations::run_migrations(conn)?;
    Ok(())
}
