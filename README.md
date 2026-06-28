# CORTEX

**Procedural Intelligence Platform & Knowledge Operating System for VFX artists.**

CORTEX is a desktop app that creates living digital twins of your DCC software — turning Houdini nodes, Nuke graphs, Blender materials, and Maya rigs into a searchable, connectable knowledge base you actually own.

---

## What it does

- **Node Library** — 5,000+ Houdini nodes (SOP, VOP, DOP, LOP, CHOP, ROP, APEX, KineFX, Karma) indexed with parameters, tags, and documentation
- **Visual Graph** — drag nodes onto an infinite canvas, connect them, and build procedural knowledge maps
- **Auto-Bridge** — one-click install injects a startup hook into Houdini, Blender, Nuke, or Maya; every time the DCC opens it auto-connects and syncs its live node catalogue to CORTEX with no manual steps
- **Command Palette** — ⌘K to search nodes, switch vaults, open graphs
- **Vaults** — isolated knowledge spaces per project, client, or discipline

---

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| UI | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (cx- design tokens) |
| State | Zustand + Immer |
| Graph canvas | @xyflow/react v12 |
| Database | SQLite (rusqlite + r2d2, WAL mode) |
| Bridge protocol | WebSocket (port 7878, RFC 6455) |

---

## Getting started

```bash
# Install dependencies
npm install

# Dev mode (hot-reload frontend + Rust backend)
npm run tauri:dev

# Production build
npm run tauri:build
```

> **Windows note:** if Vite cache is stale after a Rust change, clear it first:
> `Remove-Item -Recurse -Force node_modules\.vite`

---

## Auto-Bridge

CORTEX runs a WebSocket server on `ws://127.0.0.1:7878` automatically on launch.

To enable zero-click sync for a DCC:

1. Open CORTEX → click the 🔌 bridge icon in the sidebar
2. Click **Install** next to Houdini / Blender / Nuke / Maya
3. Restart that software — it auto-connects and pushes its node catalogue

The bridge plugin is written to the DCC's startup directory:

| Software | Startup path (Windows) |
|---|---|
| Houdini | `%USERPROFILE%\Documents\houdini{ver}\scripts\pythonstartup.py` |
| Blender | `%APPDATA%\Blender Foundation\Blender\{ver}\scripts\startup\` |
| Nuke | `%USERPROFILE%\.nuke\init.py` |
| Maya | `%USERPROFILE%\Documents\maya\{ver}\scripts\userSetup.py` |

The plugin uses only Python's built-in `socket` module — no pip install required. If CORTEX isn't running when the DCC opens, the plugin retries every 12 seconds silently in the background.

---

## Project structure

```
cortex/
├── src/                        # React frontend
│   ├── components/
│   │   ├── canvas/             # GraphCanvas, CortexNodeCard, CortexEdge
│   │   ├── panels/             # TitleBar, LeftSidebar, RightPanel, BridgePanel, CommandPalette
│   │   └── ui/                 # CortexLogo, shared components
│   ├── stores/                 # Zustand stores (vault, node, graph, ui, bridge, admin)
│   ├── services/               # Tauri IPC wrappers
│   └── types/                  # Shared TypeScript types
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri IPC command handlers
│   │   ├── engines/            # SQLite CRUD + bridge engine
│   │   └── domain/             # Rust structs (serde camelCase)
│   └── icons/
├── bridge-plugins/             # DCC Python bridge scripts
│   ├── cortex_bridge_houdini.py
│   ├── cortex_bridge_blender.py
│   ├── cortex_bridge_nuke.py
│   └── cortex_bridge_maya.py
└── src-tauri/tauri.conf.json
```

---

## Design system

All colors use `--cx-*` CSS variables defined in `src/index.css`:

| Token | Value | Use |
|---|---|---|
| `--cx-bg` | `#05050c` | Canvas / page background |
| `--cx-surface` | `#09091a` | Panel backgrounds |
| `--cx-elevated` | `#0e0e22` | Cards, inputs |
| `--cx-border` | `#18183a` | Dividers |
| `--cx-accent` | `#7b6fff` | Primary accent (violet) |
| `--cx-text` | `#e2e2f0` | Primary text |
| `--cx-text-dim` | `#8888b8` | Secondary text |
| `--cx-text-muted` | `#44447a` | Placeholder / hint text |

---

## Admin mode

CORTEX ships in read-only mode. To unlock editing:

- Click the lock icon in the sidebar (or press `⌘⇧A`) and enter the admin PIN
- Admin mode enables: creating/deleting vaults and graphs, importing from bridge, bulk node operations
- Default PIN: `0000` (change in Settings)

---

*Built by FX / FRIXXY — vorartdesigns@gmail.com*
