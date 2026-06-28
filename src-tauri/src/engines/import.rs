use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::{CortexError, CortexResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub nodes_imported: u32,
    pub edges_imported: u32,
    pub parameters_imported: u32,
    pub warnings: Vec<String>,
}

pub struct ImportEngine;

impl ImportEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn import_file(&self, path: &str) -> CortexResult<ImportResult> {
        let p = Path::new(path);
        let ext = p.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        match ext.as_str() {
            "hip" | "hiplc" | "hipnc" => self.import_houdini(path),
            "nk" => self.import_nuke(path),
            "blend" => self.import_blender(path),
            "json" => self.import_json(path),
            _ => Err(CortexError::Import(format!("Unsupported file format: .{ext}"))),
        }
    }

    fn import_houdini(&self, _path: &str) -> CortexResult<ImportResult> {
        // Houdini .hip files are binary — full parsing requires the Houdini DSO.
        // For now: stub that reads exported JSON from `hython` scripts.
        Ok(ImportResult {
            nodes_imported: 0,
            edges_imported: 0,
            parameters_imported: 0,
            warnings: vec![
                "Houdini binary import requires hython export script. See docs/importers/houdini.md".into()
            ],
        })
    }

    fn import_nuke(&self, path: &str) -> CortexResult<ImportResult> {
        // .nk files are text-based — parseable directly
        let content = std::fs::read_to_string(path)?;
        let mut nodes_imported = 0u32;

        // Very basic .nk node counting (each node block starts with NodeType {)
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.ends_with('{') && !trimmed.starts_with('#') && !trimmed.starts_with("Root") {
                nodes_imported += 1;
            }
        }

        Ok(ImportResult {
            nodes_imported,
            edges_imported: 0,
            parameters_imported: 0,
            warnings: vec!["Full parameter extraction from .nk files is a WIP".into()],
        })
    }

    fn import_blender(&self, _path: &str) -> CortexResult<ImportResult> {
        Ok(ImportResult {
            nodes_imported: 0,
            edges_imported: 0,
            parameters_imported: 0,
            warnings: vec![
                "Blender .blend import requires Python export script. See docs/importers/blender.md".into()
            ],
        })
    }

    fn import_json(&self, path: &str) -> CortexResult<ImportResult> {
        let content = std::fs::read_to_string(path)?;
        let value: serde_json::Value = serde_json::from_str(&content)?;

        let nodes_imported = value.get("nodes")
            .and_then(|n| n.as_array())
            .map(|a| a.len() as u32)
            .unwrap_or(0);

        let edges_imported = value.get("edges")
            .and_then(|e| e.as_array())
            .map(|a| a.len() as u32)
            .unwrap_or(0);

        Ok(ImportResult {
            nodes_imported,
            edges_imported,
            parameters_imported: 0,
            warnings: vec![],
        })
    }
}
