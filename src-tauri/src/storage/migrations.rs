use rusqlite::Connection;
use crate::error::CortexResult;

pub fn run_migrations(conn: &Connection) -> CortexResult<()> {
    conn.execute_batch(SCHEMA_V1)?;
    migrate_v2(conn)?;
    seed_nodes_if_empty(conn)?;
    Ok(())
}

fn seed_nodes_if_empty(conn: &Connection) -> CortexResult<()> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM nodes", [], |r| r.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let node_count = crate::data::NODES_SEED_SQL.lines().filter(|l| l.starts_with("INSERT")).count();
    tracing::info!("Seeding {} nodes from embedded library…", node_count);
    // Drop FTS triggers so seed inserts don't fire 3273 individual trigger writes.
    // Rebuild the index in one pass at the end — much faster.
    conn.execute_batch(r#"
        DROP TRIGGER IF EXISTS nodes_fts_insert;
        DROP TRIGGER IF EXISTS nodes_fts_update;
        DROP TRIGGER IF EXISTS nodes_fts_delete;
    "#)?;
    conn.execute_batch(crate::data::NODES_SEED_SQL)?;
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
    tracing::info!("Node library seeded and FTS index rebuilt.");
    Ok(())
}

fn migrate_v2(conn: &Connection) -> CortexResult<()> {
    // Check if already on v2
    let version: i64 = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0))
        .unwrap_or(0);
    if version >= 2 { return Ok(()); }

    // SQLite can't ALTER COLUMN — recreate nodes table with nullable vault_id
    conn.execute_batch(r#"
        PRAGMA foreign_keys=OFF;

        CREATE TABLE IF NOT EXISTS nodes_v2 (
            id              TEXT PRIMARY KEY,
            vault_id        TEXT,
            software_id     TEXT REFERENCES software(id),
            name            TEXT NOT NULL,
            display_name    TEXT NOT NULL,
            category        TEXT NOT NULL,
            object_type     TEXT NOT NULL,
            description     TEXT,
            version         TEXT,
            color           TEXT,
            icon            TEXT,
            tags            TEXT NOT NULL DEFAULT '[]',
            inputs          TEXT NOT NULL DEFAULT '[]',
            outputs         TEXT NOT NULL DEFAULT '[]',
            parameters      TEXT NOT NULL DEFAULT '[]',
            documentation   TEXT,
            notes           TEXT,
            production_tips TEXT NOT NULL DEFAULT '[]',
            media_ids       TEXT NOT NULL DEFAULT '[]',
            is_deprecated   INTEGER NOT NULL DEFAULT 0,
            deprecated_by   TEXT REFERENCES nodes_v2(id),
            metadata        TEXT NOT NULL DEFAULT '{}',
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO nodes_v2 SELECT * FROM nodes;
        DROP TABLE nodes;
        ALTER TABLE nodes_v2 RENAME TO nodes;

        DROP INDEX IF EXISTS idx_nodes_vault;
        DROP INDEX IF EXISTS idx_nodes_software;
        DROP INDEX IF EXISTS idx_nodes_category;
        DROP INDEX IF EXISTS idx_nodes_object_type;

        CREATE INDEX IF NOT EXISTS idx_nodes_vault     ON nodes(vault_id);
        CREATE INDEX IF NOT EXISTS idx_nodes_software  ON nodes(software_id);
        CREATE INDEX IF NOT EXISTS idx_nodes_category  ON nodes(category);
        CREATE INDEX IF NOT EXISTS idx_nodes_object_type ON nodes(object_type);

        PRAGMA foreign_keys=ON;

        INSERT OR IGNORE INTO schema_version (version) VALUES (2);
    "#)?;

    Ok(())
}

const SCHEMA_V1: &str = r#"
-- ─────────────────────────────────────────────────────────
--  CORTEX Database Schema v1
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Software ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS software (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    version      TEXT,
    icon         TEXT,
    color        TEXT,
    description  TEXT,
    website      TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Vaults ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaults (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    path            TEXT NOT NULL UNIQUE,
    color           TEXT,
    icon            TEXT,
    settings        TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_opened_at  TEXT
);

-- ── Nodes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nodes (
    id              TEXT PRIMARY KEY,
    vault_id        TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    software_id     TEXT REFERENCES software(id),
    name            TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    category        TEXT NOT NULL,
    object_type     TEXT NOT NULL,
    description     TEXT,
    version         TEXT,
    color           TEXT,
    icon            TEXT,
    tags            TEXT NOT NULL DEFAULT '[]',
    inputs          TEXT NOT NULL DEFAULT '[]',
    outputs         TEXT NOT NULL DEFAULT '[]',
    parameters      TEXT NOT NULL DEFAULT '[]',
    documentation   TEXT,
    notes           TEXT,
    production_tips TEXT NOT NULL DEFAULT '[]',
    media_ids       TEXT NOT NULL DEFAULT '[]',
    is_deprecated   INTEGER NOT NULL DEFAULT 0,
    deprecated_by   TEXT REFERENCES nodes(id),
    metadata        TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_vault ON nodes(vault_id);
CREATE INDEX IF NOT EXISTS idx_nodes_software ON nodes(software_id);
CREATE INDEX IF NOT EXISTS idx_nodes_category ON nodes(category);
CREATE INDEX IF NOT EXISTS idx_nodes_object_type ON nodes(object_type);

-- ── Graphs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graphs (
    id          TEXT PRIMARY KEY,
    vault_id    TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    tags        TEXT NOT NULL DEFAULT '[]',
    nodes       TEXT NOT NULL DEFAULT '[]',
    edges       TEXT NOT NULL DEFAULT '[]',
    frames      TEXT NOT NULL DEFAULT '[]',
    comments    TEXT NOT NULL DEFAULT '[]',
    viewport    TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    metadata    TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_graphs_vault ON graphs(vault_id);

-- ── Relationships ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relationships (
    id                  TEXT PRIMARY KEY,
    vault_id            TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    source_id           TEXT NOT NULL,
    target_id           TEXT NOT NULL,
    relationship_type   TEXT NOT NULL,
    label               TEXT,
    strength            REAL NOT NULL DEFAULT 0.5,
    description         TEXT,
    bidirectional       INTEGER NOT NULL DEFAULT 0,
    metadata            TEXT NOT NULL DEFAULT '{}',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_vault ON relationships(vault_id);

-- ── Blueprints ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blueprints (
    id              TEXT PRIMARY KEY,
    vault_id        TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    version         TEXT NOT NULL DEFAULT '1.0.0',
    tags            TEXT NOT NULL DEFAULT '[]',
    software        TEXT,
    graph_id        TEXT REFERENCES graphs(id),
    thumbnail_id    TEXT,
    media_ids       TEXT NOT NULL DEFAULT '[]',
    author          TEXT,
    is_published    INTEGER NOT NULL DEFAULT 0,
    instance_count  INTEGER NOT NULL DEFAULT 0,
    metadata        TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Recipes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
    id          TEXT PRIMARY KEY,
    vault_id    TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    difficulty  TEXT NOT NULL DEFAULT 'intermediate',
    tags        TEXT NOT NULL DEFAULT '[]',
    software    TEXT,
    steps       TEXT NOT NULL DEFAULT '[]',
    graph_id    TEXT REFERENCES graphs(id),
    asset_ids   TEXT NOT NULL DEFAULT '[]',
    media_ids   TEXT NOT NULL DEFAULT '[]',
    notes       TEXT,
    version     TEXT NOT NULL DEFAULT '1.0.0',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Assets ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    id               TEXT PRIMARY KEY,
    vault_id         TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    file_name        TEXT NOT NULL,
    file_path        TEXT NOT NULL,
    asset_type       TEXT NOT NULL,
    mime_type        TEXT,
    file_size        INTEGER NOT NULL DEFAULT 0,
    width            INTEGER,
    height           INTEGER,
    duration_seconds REAL,
    thumbnail_path   TEXT,
    tags             TEXT NOT NULL DEFAULT '[]',
    description      TEXT,
    metadata         TEXT NOT NULL DEFAULT '{}',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_vault ON assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);

-- ── AI Memory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_memories (
    id          TEXT PRIMARY KEY,
    vault_id    TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    context     TEXT,
    tokens      INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Analytics Events ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id          TEXT PRIMARY KEY,
    vault_id    TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    object_id   TEXT,
    object_type TEXT,
    data        TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_vault ON analytics_events(vault_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);

-- ── Full-Text Search ──────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    id UNINDEXED,
    name,
    display_name,
    description,
    documentation,
    notes,
    tags,
    content='nodes',
    content_rowid='rowid'
);

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

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
"#;
