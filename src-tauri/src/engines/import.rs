use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::{CortexError, CortexResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub nodes_imported: u32,
    pub edges_imported: u32,
    pub parameters_imported: u32,
    pub warnings: Vec<String>,
    /// Extracted node type/name strings for library matching on the frontend
    pub node_names: Vec<String>,
    /// Suggested graph name derived from the source file
    pub graph_name: String,
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

    fn import_houdini(&self, path: &str) -> CortexResult<ImportResult> {
        // .hip/.hiplc are binary. .hipnc can be ASCII or gzip — try ASCII first.
        let content = std::fs::read_to_string(path).ok();
        if let Some(text) = content {
            if text.starts_with("set -g FPS") || text.contains("opset ") || text.contains("opcreate ") {
                // ASCII .hipnc — count node creation calls
                let nodes_imported = text.lines()
                    .filter(|l| l.trim_start().starts_with("opcreate "))
                    .count() as u32;
                let edges_imported = text.lines()
                    .filter(|l| l.trim_start().starts_with("opwire "))
                    .count() as u32;
                let graph_name = std::path::Path::new(path)
                    .file_stem().and_then(|s| s.to_str()).unwrap_or("Houdini Import").to_string();
                let node_names: Vec<String> = text.lines()
                    .filter(|l| l.trim_start().starts_with("opcreate "))
                    .filter_map(|l| l.trim_start().strip_prefix("opcreate ").map(|s| s.trim().to_string()))
                    .collect();
                return Ok(ImportResult {
                    nodes_imported,
                    edges_imported,
                    parameters_imported: 0,
                    warnings: if nodes_imported == 0 {
                        vec!["Parsed as ASCII .hipnc but found no opcreate blocks.".into()]
                    } else { vec![] },
                    node_names,
                    graph_name,
                });
            }
        }
        // Binary .hip — needs hython
        Err(CortexError::Import(
            "Binary .hip files require a Houdini export.
             In Houdini: run `hython cortex_export.py` (see Bridge panel for the script)              then drag the exported .json into CORTEX.".into()
        ))
    }

    fn import_nuke(&self, path: &str) -> CortexResult<ImportResult> {
        let content = std::fs::read_to_string(path)?;
        let graph_name = std::path::Path::new(path)
            .file_stem().and_then(|s| s.to_str()).unwrap_or("Nuke Import").to_string();

        let mut nodes_imported = 0u32;
        let mut edges_imported = 0u32;
        let mut parameters_imported = 0u32;
        let mut node_names: Vec<String> = Vec::new();
        let mut in_node = false;
        let mut current_type = String::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') { continue }

            if !in_node && trimmed.ends_with('{') && !trimmed.starts_with("Root") && !trimmed.starts_with("set ") {
                // NodeType {  — capture the type name
                current_type = trimmed.trim_end_matches('{').trim().to_string();
                in_node = true;
                nodes_imported += 1;
                continue;
            }
            if in_node {
                if trimmed == "}" {
                    // Store the node type for library matching
                    if !current_type.is_empty() {
                        node_names.push(current_type.clone());
                        current_type.clear();
                    }
                    in_node = false;
                    continue;
                }
                if trimmed.starts_with("inputs ") {
                    if let Ok(n) = trimmed["inputs ".len()..].parse::<u32>() {
                        if n > 0 { edges_imported += n }
                    }
                } else if !trimmed.starts_with("name ") && !trimmed.starts_with("xpos ")
                       && !trimmed.starts_with("ypos ") && !trimmed.starts_with("selected ") {
                    parameters_imported += 1;
                }
            }
        }

        let warnings = if nodes_imported == 0 {
            vec!["No node blocks found — is this a valid .nk file?".into()]
        } else { vec![] };

        Ok(ImportResult { nodes_imported, edges_imported, parameters_imported, warnings, node_names, graph_name })
    }

    fn import_blender(&self, _path: &str) -> CortexResult<ImportResult> {
        Err(CortexError::Import(
            "Blender .blend files are binary and cannot be read directly.
             In Blender: run the CORTEX export add-on (Scripting workspace → cortex_export.py),              then drag the exported .json into CORTEX.".into()
        ))
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

        let graph_name = std::path::Path::new(path)
            .file_stem().and_then(|s| s.to_str()).unwrap_or("JSON Import").to_string();
        let node_names: Vec<String> = value.get("nodes")
            .and_then(|n| n.as_array())
            .map(|a| a.iter()
                .filter_map(|node| node.get("label").or_else(|| node.get("name"))
                    .and_then(|v| v.as_str()).map(|s| s.to_string()))
                .collect())
            .unwrap_or_default();
        Ok(ImportResult {
            nodes_imported,
            edges_imported,
            parameters_imported: 0,
            warnings: vec![],
            node_names,
            graph_name,
        })
    }
}
