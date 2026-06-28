"""
CORTEX — Houdini Node Exporter (v2)
=====================================
Run inside Houdini Python Shell:
  exec(open(r"D:/FRIXXY/APP/cortex/houdini_export.py").read())
"""

import hou
import json
import os

OUTPUT_PATH = os.path.join(os.path.expanduser("~"), "Desktop", "houdini_nodes_export.json")

CAT_MAP = {
    "Sop":      "sop",
    "Vop":      "vop",
    "Dop":      "dop",
    "Chop":     "chop",
    "Lop":      "lop",
    "Top":      "top",
    "Cop2":     "cop",
    "Driver":   "rop",
    "Object":   "object",
    "Shop":     "shop",
    "ChopNet":  "chopnet",
    "CopNet":   "copnet",
    "TopNet":   "topnet",
    "VopNet":   "vopnet",
    "Vex":      "vex",
    "Manager":  "manager",
    "Director": "director",
}

PARM_TYPES = {
    hou.parmTemplateType.Int:      "int",
    hou.parmTemplateType.Float:    "float",
    hou.parmTemplateType.String:   "string",
    hou.parmTemplateType.Toggle:   "toggle",
    hou.parmTemplateType.Menu:     "menu",
    hou.parmTemplateType.Button:   "button",
    hou.parmTemplateType.Folder:   "folder",
    hou.parmTemplateType.Ramp:     "ramp",
}


def safe(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


def extract_parm(pt):
    p = {
        "name":  safe(pt.name, ""),
        "label": safe(pt.label, ""),
        "type":  PARM_TYPES.get(safe(pt.type), "float"),
    }
    dv = safe(pt.defaultValue)
    if dv is not None:
        if isinstance(dv, (int, float, bool, str)):
            p["default"] = dv
        elif isinstance(dv, (tuple, list)) and dv:
            p["default"] = list(dv)
    mn = safe(pt.minValue)
    mx = safe(pt.maxValue)
    if mn is not None: p["min"] = mn
    if mx is not None: p["max"] = mx
    items  = safe(pt.menuItems)
    labels = safe(pt.menuLabels)
    if items:
        p["menuItems"] = [{"value": v, "label": (labels[i] if labels and i < len(labels) else v)}
                          for i, v in enumerate(items)]
    return p


def extract_node(nt):
    # Category
    cat_raw = safe(lambda: nt.nodeTypeCategory().name(), "Sop")
    category = CAT_MAP.get(cat_raw, cat_raw.lower())

    # Name — use just the base name without namespace/version
    full_name = safe(nt.name, "unknown")
    # nameComponents() → (namespace, name, version)  in H20
    nc = safe(nt.nameComponents, None)
    if nc and len(nc) >= 2:
        namespace = nc[0] or ""
        base_name = nc[1] or full_name
        version   = nc[2] if len(nc) > 2 else ""
    else:
        # Fall back: strip "::" delimiters manually
        parts = full_name.replace("::", "::").split("::")
        namespace = parts[0] if len(parts) > 2 else ""
        base_name = parts[-2] if len(parts) > 2 else (parts[-1] if parts else full_name)
        version   = parts[-1] if len(parts) > 2 else ""

    display = safe(lambda: nt.description(), base_name)

    # Tags from Houdini
    raw_tags = safe(lambda: list(nt.tags().values()), [])
    tags = [str(t).lower().replace(" ", "_") for t in raw_tags if t][:8]

    # Inputs / outputs
    max_in  = safe(lambda: nt.maxInputs(),  0)
    min_in  = safe(lambda: nt.minInputs(),  0)
    max_out = safe(lambda: nt.maxOutputs(), 1)
    in_types  = safe(lambda: list(nt.inputDataTypes()),  [])
    out_types = safe(lambda: list(nt.outputDataTypes()), [])

    def connectors(types, count, prefix):
        n = max(len(types), min(int(count), 6))
        return [{"id": f"{prefix}{i+1}", "label": str(types[i]) if i < len(types) else f"{prefix.upper()}{i+1}"}
                for i in range(n)]

    inputs  = connectors(in_types,  max_in,  "in")
    outputs = connectors(out_types, max_out, "out")

    # Parameters
    parms = []
    ptg = safe(lambda: nt.parmTemplateGroup())
    if ptg:
        for pt in safe(lambda: ptg.parmTemplates(), []):
            try:
                pt_type = safe(pt.type)
                if pt_type in (hou.parmTemplateType.Separator,
                               hou.parmTemplateType.Label,
                               hou.parmTemplateType.FolderSet,
                               hou.parmTemplateType.Folder):
                    continue
                ep = extract_parm(pt)
                if ep["name"]:
                    parms.append(ep)
                if len(parms) >= 40:
                    break
            except Exception:
                pass

    return {
        "name":        base_name,
        "displayName": display,
        "category":    category,
        "namespace":   namespace,
        "description": f"{display} ({category.upper()})",
        "tags":        tags,
        "maxInputs":   int(max_in),
        "maxOutputs":  int(max_out),
        "inputs":      inputs,
        "outputs":     outputs,
        "parameters":  parms,
    }


def run():
    all_nodes  = []
    errors     = []
    skipped    = 0

    categories = hou.nodeTypeCategories()

    for cat_name in sorted(categories.keys()):
        category    = categories[cat_name]
        node_types  = category.nodeTypes()
        kept        = 0

        for type_name, nt in node_types.items():
            # Skip hidden
            if safe(lambda: nt.hidden(), False):
                skipped += 1
                continue
            try:
                data = extract_node(nt)
                all_nodes.append(data)
                kept += 1
            except Exception as e:
                errors.append(f"{cat_name}/{type_name}: {e}")

        print(f"  [{cat_name}]  {len(node_types)} types  →  kept {kept}")

    print(f"\n✓ Exported  : {len(all_nodes)}")
    print(f"  Hidden    : {skipped}")
    print(f"  Errors    : {len(errors)}")
    if errors:
        print("  First 5 errors:")
        for e in errors[:5]:
            print(f"    {e}")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(all_nodes, fh, indent=2, ensure_ascii=False)

    print(f"\n→ Saved: {OUTPUT_PATH}")
    print("  Next: python houdini_to_ts.py  (in normal terminal)")


print("CORTEX Houdini Exporter v2 — starting ...\n")
run()