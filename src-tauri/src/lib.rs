use tauri::{Emitter, Manager};

mod error;
mod domain;
mod storage;
mod engines;
mod commands;
mod data;

use engines::{
    vault::VaultEngine,
    node::NodeEngine,
    graph::GraphEngine,
    relationship::RelationshipEngine,
    search::SearchEngine,
    asset::AssetEngine,
    analytics::AnalyticsEngine,
    bridge::BridgeEngine,
};
use storage::database::{create_pool, init_database, DbPool};

pub struct AppState {
    pub vault_engine:         VaultEngine,
    pub node_engine:          NodeEngine,
    pub graph_engine:         GraphEngine,
    pub relationship_engine:  RelationshipEngine,
    pub search_engine:        SearchEngine,
    pub asset_engine:         AssetEngine,
    pub analytics_engine:     AnalyticsEngine,
    pub bridge_engine:        BridgeEngine,
}

impl AppState {
    fn new(pool: DbPool) -> Self {
        Self {
            vault_engine:        VaultEngine::new(pool.clone()),
            node_engine:         NodeEngine::new(pool.clone()),
            graph_engine:        GraphEngine::new(pool.clone()),
            relationship_engine: RelationshipEngine::new(pool.clone()),
            search_engine:       SearchEngine::new(pool.clone()),
            asset_engine:        AssetEngine::new(pool.clone()),
            analytics_engine:    AnalyticsEngine::new(pool.clone()),
            bridge_engine:       BridgeEngine::new(),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let png_bytes = include_bytes!("../icons/256x256.png");
                    if let Ok(img) = image::load_from_memory(png_bytes) {
                        let rgba = img.into_rgba8();
                        let (w, h) = rgba.dimensions();
                        let icon = tauri::image::Image::new_owned(rgba.into_raw(), w, h);
                        let _ = window.set_icon(icon);
                    }
                }
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let db_path = app_data_dir.join("cortex.db");
            let pool    = create_pool(&db_path).expect("Failed to create database pool");
            {
                let conn = pool.get().expect("Failed to get DB connection");
                init_database(&conn).expect("Failed to initialize database");
            }

            let state = AppState::new(pool.clone());

            // Start VFX bridge. When a DCC sends its node catalogue,
            // nodes are saved to DB and "vfx:imported" is emitted to the frontend.
            {
                let handle = app.handle().clone();
                if let Err(e) = state.bridge_engine.start(pool, move |software, count| {
                    tracing::info!("Bridge: {count} nodes imported from {software}");
                    let _ = handle.emit("vfx:imported", serde_json::json!({
                        "software": software,
                        "count":    count,
                    }));
                }) {
                    tracing::warn!("Bridge start failed: {e}");
                }
            }

            app.manage(state);
            tracing::info!("CORTEX initialized. DB: {}", db_path.display());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault
            commands::vault::list_vaults,
            commands::vault::get_vault,
            commands::vault::create_vault,
            commands::vault::update_vault,
            commands::vault::delete_vault,
            // Nodes
            commands::node::list_nodes,
            commands::node::get_node,
            commands::node::create_node,
            commands::node::update_node,
            commands::node::delete_node,
            commands::node::batch_create_nodes,
            commands::node::soft_delete_node,
            commands::node::restore_node,
            commands::node::list_trashed_nodes,
            commands::node::empty_trash,
            commands::node::clear_vault_nodes,
            commands::node::clear_all_nodes,
            commands::node::list_all_nodes,
            commands::node::reseed_nodes,
            commands::node::generate_node_seed,
            // Graphs
            commands::graph::list_graphs,
            commands::graph::get_graph,
            commands::graph::create_graph,
            commands::graph::save_graph,
            commands::graph::delete_graph,
            // Relationships
            commands::relationship::get_relationships,
            commands::relationship::create_relationship,
            commands::relationship::delete_relationship,
            // Search
            commands::search::search,
            // Assets
            commands::asset::list_assets,
            commands::asset::import_asset,
            // Analytics
            commands::analytics::get_analytics,
            commands::analytics::track_event,
            // AI
            commands::ai::ai_chat,
            commands::ai::ai_stream,
            // Import
            commands::import::import_file,
            // VFX Bridge
            commands::bridge::bridge_start,
            commands::bridge::bridge_stop,
            commands::bridge::bridge_clients,
            commands::bridge::bridge_detect,
            commands::bridge::bridge_exec_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CORTEX");
}
