use tauri::State;
use crate::AppState;
use crate::engines::bridge::{DetectedSoftware, detect_all_software};
use crate::error::CortexError;

#[tauri::command]
pub async fn bridge_detect_software(
    state: State<'_, AppState>,
) -> Result<Vec<DetectedSoftware>, CortexError> {
    let mut detected = detect_all_software();
    // Mark any that are already connected
    let connected = state.bridge_engine.connected_clients();
    for sw in &mut detected {
        sw.is_connected = connected.iter().any(|c| {
            c.software.to_lowercase().contains(&sw.kind.display_name().to_lowercase())
        });
    }
    Ok(detected)
}

#[tauri::command]
pub async fn bridge_start(
    state: State<'_, AppState>,
) -> Result<u16, CortexError> {
    state.bridge_engine
        .start_server(|nodes| {
            tracing::info!("Bridge callback: {} nodes received", nodes.len());
        })
        .map_err(|e| CortexError::Io(e.to_string()))
}

#[tauri::command]
pub async fn bridge_stop(
    state: State<'_, AppState>,
) -> Result<(), CortexError> {
    state.bridge_engine.stop_server();
    Ok(())
}

#[tauri::command]
pub async fn bridge_connected_clients(
    state: State<'_, AppState>,
) -> Result<Vec<ConnectedClientDto>, CortexError> {
    let clients = state.bridge_engine.connected_clients();
    Ok(clients.into_iter().map(|c| ConnectedClientDto {
        client_id:    c.client_id,
        software:     c.software,
        version:      c.version,
        connected_at: c.connected_at.to_rfc3339(),
    }).collect())
}

#[tauri::command]
pub async fn bridge_drain_nodes(
    state: State<'_, AppState>,
) -> Result<usize, CortexError> {
    use crate::domain::node::CreateNodeInput;

    let bridge_nodes = state.bridge_engine.drain_nodes();
    if bridge_nodes.is_empty() {
        return Ok(0);
    }

    tracing::info!("bridge_drain_nodes: {} nodes from bridge — replacing library", bridge_nodes.len());

    // Convert BridgeNode → CreateNodeInput (vault_id = None — nodes are global)
    let inputs: Vec<CreateNodeInput> = bridge_nodes.iter().map(|bn| {
        let category = map_category(&bn.category);
        let parameters = map_bridge_parms(&bn.parameters);
        CreateNodeInput {
            vault_id:        None,
            software_id:     None,
            name:            bn.name.clone(),
            display_name:    bn.display_name.clone(),
            category,
            object_type:     crate::domain::node::NodeObjectType::SoftwareNode,
            description:     bn.description.clone(),
            version:         None,
            color:           None,
            icon:            None,
            tags:            bn.tags.clone(),
            inputs:          make_ports(bn.max_inputs, "in"),
            outputs:         make_ports(bn.max_outputs, "out"),
            parameters,
            documentation:   None,
            notes:           None,
            production_tips: vec![],
            metadata:        None,
        }
    }).collect();

    // Replace the whole library (clear seed, insert live nodes, rebuild FTS)
    state.node_engine.replace_all_nodes(inputs)
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn map_category(raw: &str) -> crate::domain::node::NodeCategory {
    use crate::domain::node::NodeCategory;
    match raw.to_lowercase().as_str() {
        "sop"     => NodeCategory::Sop,
        "dop"     => NodeCategory::Dop,
        "cop"|"cop2" => NodeCategory::Cop,
        "vop"     => NodeCategory::Vop,
        "lop"     => NodeCategory::Lop,
        "rop"|"driver" => NodeCategory::Rop,
        "chop"    => NodeCategory::Chop,
        "top"     => NodeCategory::Top,
        "object"|"obj" => NodeCategory::Object,
        "shader"|"shop" => NodeCategory::Shader,
        "compositor"|"comp" => NodeCategory::Compositor,
        "material"|"mat"    => NodeCategory::Material,
        "animation"|"anim"  => NodeCategory::Animation,
        "geometry"|"geo"    => NodeCategory::Geometry,
        _         => NodeCategory::Other,
    }
}

fn make_ports(count: u32, prefix: &str) -> Vec<crate::domain::node::NodePort> {
    (0..count.min(8)).map(|i| crate::domain::node::NodePort {
        id:          format!("{prefix}{}", i + 1),
        name:        format!("{}{}", prefix.to_uppercase(), i + 1),
        data_type:   "geometry".to_string(),
        required:    prefix == "in" && i == 0,
        multi:       false,
        description: None,
    }).collect()
}

/// Map the bridge's lightweight BridgeParm list to full Parameter objects.
fn map_bridge_parms(parms: &[crate::engines::bridge::BridgeParm]) -> Vec<crate::domain::parameter::Parameter> {
    use crate::domain::parameter::{Parameter, ParameterType, PerformanceImpact};
    use uuid::Uuid;

    parms.iter().enumerate().map(|(i, p)| {
        let param_type = match p.ptype.as_str() {
            "integer" => ParameterType::Integer,
            "float"   => ParameterType::Float,
            "string"  => ParameterType::String,
            "boolean" => ParameterType::Boolean,
            "enum"    => ParameterType::Enum,
            "button"  => ParameterType::Button,
            "ramp"    => ParameterType::Ramp,
            "color"   => ParameterType::Color,
            "vector2" => ParameterType::Vector2,
            "vector3" => ParameterType::Vector3,
            "vector4" => ParameterType::Vector4,
            _         => ParameterType::Float,
        };
        let options = p.options.as_ref().map(|opts| {
            opts.iter().filter_map(|o| {
                let obj = o.as_object()?;
                Some(crate::domain::parameter::ParameterOption {
                    value: obj.get("value")?.clone(),
                    label: obj.get("label")?.as_str().unwrap_or("").to_string(),
                    icon:  None,
                })
            }).collect::<Vec<_>>()
        }).filter(|v: &Vec<_>| !v.is_empty());

        Parameter {
            id:                   Uuid::new_v4(),
            name:                 p.name.clone(),
            display_name:         if p.label.is_empty() { p.name.clone() } else { p.label.clone() },
            param_type,
            default_value:        p.default.clone(),
            min_value:            None,
            max_value:            None,
            options,
            description:          None,
            group:                None,
            visible_when:         None,
            enabled_when:         None,
            performance_impact:   PerformanceImpact::None,
            is_animatable:        true,
            is_expression_capable: true,
            sort_order:           i as i32,
        }
    }).collect()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedClientDto {
    pub client_id:    String,
    pub software:     String,
    pub version:      String,
    pub connected_at: String,
}
