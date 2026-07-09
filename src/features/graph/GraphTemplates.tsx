import { useState } from 'react'
import { useGraphStore } from '@/stores/graph.store'
import { useVaultStore } from '@/stores/vault.store'
import { useUiStore } from '@/stores/ui.store'
import { NodeService } from '@/services/node.service'
import { GraphService } from '@/services/graph.service'
import type { GraphNode, GraphEdge } from '@/types/graph'
import type { CortexNode } from '@/types'

/* ── Template definition types ──────────────────────────── */

interface TemplateNodeDef {
  key: string           // local reference key for edge wiring
  names: string[]       // candidate node names to search (first match wins)
  label?: string        // override label shown on canvas
  color?: string
  position: { x: number; y: number }
}

interface TemplateEdgeDef {
  from: string          // key from TemplateNodeDef
  to: string
  edgeType?: GraphNode['color'] // reuse color slot
  label?: string
}

interface Template {
  name: string
  description: string
  tags: string[]
  accent: string
  icon: string
  nodes: TemplateNodeDef[]
  edges: TemplateEdgeDef[]
}

/* ── Template definitions with real node names ──────────── */

const TEMPLATES: Template[] = [
  {
    name: 'Pyro FX',
    description: 'Smoke & fire simulation graph — source, solver, and volume render.',
    tags: ['houdini', 'simulation', 'vfx'],
    accent: '#f97316',
    icon: '🔥',
    nodes: [
      { key: 'src',    names: ['pyro_source', 'pyrosource', 'source', 'volume_source'],        label: 'Pyro Source',   color: '#f97316', position: { x: 100, y: 100 } },
      { key: 'solver', names: ['pyrosolver', 'pyro_solver', 'solver', 'gasupresssolver'],      label: 'Pyro Solver',  color: '#fb923c', position: { x: 300, y: 100 } },
      { key: 'shape',  names: ['volumerasterizecurve', 'volume_rasterize', 'vdbfromparticles'],label: 'Shape',         color: '#fdba74', position: { x: 500, y: 100 } },
      { key: 'render', names: ['mantra', 'karma', 'renderman', 'arnold', 'volume_render'],     label: 'Render',        color: '#7b6fff', position: { x: 700, y: 100 } },
    ],
    edges: [
      { from: 'src', to: 'solver', label: 'volume' },
      { from: 'solver', to: 'shape', label: 'sim' },
      { from: 'shape', to: 'render', label: 'beauty' },
    ],
  },
  {
    name: 'Character Rig',
    description: 'KineFX skeleton setup with IK solvers and blend shapes.',
    tags: ['houdini', 'rigging', 'kinefx'],
    accent: '#34d399',
    icon: '🦴',
    nodes: [
      { key: 'geo',    names: ['file', 'filecache', 'object_merge', 'geo'],                 label: 'Geo In',         color: '#34d399', position: { x: 100, y: 100 } },
      { key: 'skel',   names: ['kinefx_skeletonblend', 'skeleton', 'joint'],               label: 'Skeleton',       color: '#6ee7b7', position: { x: 300, y: 80  } },
      { key: 'ik',     names: ['kinefx_iksolver', 'ik', 'iksolver', 'inversekinematic'],   label: 'IK Solver',      color: '#a7f3d0', position: { x: 500, y: 80  } },
      { key: 'blend',  names: ['blendshapes', 'blend', 'shapeblend', 'blendpose'],         label: 'Blend Shapes',   color: '#059669', position: { x: 300, y: 220 } },
      { key: 'out',    names: ['output', 'null', 'dopnet'],                                label: 'Output',         color: '#7b6fff', position: { x: 700, y: 150 } },
    ],
    edges: [
      { from: 'geo',   to: 'skel',  label: 'rest' },
      { from: 'skel',  to: 'ik',    label: 'skeleton' },
      { from: 'geo',   to: 'blend', label: 'shapes' },
      { from: 'ik',    to: 'out',   label: 'deformed' },
      { from: 'blend', to: 'out',   label: 'correctives' },
    ],
  },
  {
    name: 'Procedural City',
    description: 'City block generation using scatter, instance, and crowd nodes.',
    tags: ['houdini', 'procedural', 'environment'],
    accent: '#60a5fa',
    icon: '🏙️',
    nodes: [
      { key: 'grid',      names: ['grid', 'heightfield', 'box'],                             label: 'Ground Plane',  color: '#60a5fa', position: { x: 100, y: 100 } },
      { key: 'divide',    names: ['divide', 'voronoi', 'scatter'],                           label: 'Block Split',   color: '#93c5fd', position: { x: 300, y: 80  } },
      { key: 'buildings', names: ['copy_to_points', 'copytopoints', 'instance'],             label: 'Buildings',     color: '#bfdbfe', position: { x: 500, y: 80  } },
      { key: 'roads',     names: ['resample', 'polywire', 'carve'],                          label: 'Roads',         color: '#93c5fd', position: { x: 300, y: 220 } },
      { key: 'merge',     names: ['merge', 'join', 'boolean'],                               label: 'Merge',         color: '#3b82f6', position: { x: 700, y: 150 } },
      { key: 'out',       names: ['output', 'null', 'filecache'],                            label: 'Cache Out',     color: '#7b6fff', position: { x: 900, y: 150 } },
    ],
    edges: [
      { from: 'grid', to: 'divide' },
      { from: 'divide', to: 'buildings' },
      { from: 'grid', to: 'roads' },
      { from: 'buildings', to: 'merge' },
      { from: 'roads', to: 'merge' },
      { from: 'merge', to: 'out' },
    ],
  },
  {
    name: 'VDB Workflow',
    description: 'OpenVDB pipeline — convert, smooth, combine, and render volumes.',
    tags: ['houdini', 'vdb', 'volumes'],
    accent: '#a78bfa',
    icon: '🫧',
    nodes: [
      { key: 'geo',     names: ['file', 'geo', 'filecache', 'object_merge'],              label: 'Geo In',        color: '#a78bfa', position: { x: 100, y: 100 } },
      { key: 'convert', names: ['vdbfrompolygons', 'isooffset', 'vdbfromparticles'],     label: 'VDB Convert',   color: '#c4b5fd', position: { x: 300, y: 100 } },
      { key: 'smooth',  names: ['vdbsmooth', 'vdb_smooth', 'volumeblur'],                label: 'VDB Smooth',    color: '#ddd6fe', position: { x: 500, y: 100 } },
      { key: 'combine', names: ['vdbcombine', 'volumecombine', 'merge'],                 label: 'VDB Combine',   color: '#8b5cf6', position: { x: 700, y: 100 } },
      { key: 'render',  names: ['mantra', 'karma', 'arnold', 'renderman'],               label: 'Volume Render', color: '#7b6fff', position: { x: 900, y: 100 } },
    ],
    edges: [
      { from: 'geo', to: 'convert' },
      { from: 'convert', to: 'smooth' },
      { from: 'smooth', to: 'combine' },
      { from: 'combine', to: 'render' },
    ],
  },
  {
    name: 'Nuke Comp',
    description: 'Standard Nuke comp tree — Read, grade, merge, and Write.',
    tags: ['nuke', 'comp', 'vfx'],
    accent: '#f472b6',
    icon: '🎬',
    nodes: [
      { key: 'read_bg',  names: ['read', 'readgeo', 'input'],                             label: 'Read BG',       color: '#f472b6', position: { x: 100, y: 80  } },
      { key: 'read_fg',  names: ['read', 'readgeo', 'input'],                             label: 'Read FG',       color: '#f472b6', position: { x: 100, y: 220 } },
      { key: 'grade',    names: ['grade', 'colorcorrect', 'colormatrix'],                 label: 'Grade',         color: '#f9a8d4', position: { x: 300, y: 80  } },
      { key: 'merge',    names: ['merge', 'merge2', 'mergeexpression'],                   label: 'Merge',         color: '#ec4899', position: { x: 500, y: 150 } },
      { key: 'write',    names: ['write', 'writegeo', 'output'],                          label: 'Write',         color: '#7b6fff', position: { x: 700, y: 150 } },
    ],
    edges: [
      { from: 'read_bg', to: 'grade' },
      { from: 'grade', to: 'merge', label: 'bg' },
      { from: 'read_fg', to: 'merge', label: 'fg' },
      { from: 'merge', to: 'write' },
    ],
  },
  {
    name: 'Lookdev',
    description: 'Material and lighting setup for asset lookdev review.',
    tags: ['lookdev', 'shading', 'lighting'],
    accent: '#facc15',
    icon: '💡',
    nodes: [
      { key: 'geo',      names: ['file', 'geo', 'object_merge', 'filecache'],              label: 'Asset',         color: '#facc15', position: { x: 100, y: 150 } },
      { key: 'material', names: ['material', 'materiallibrary', 'principled', 'shader'],  label: 'Material',      color: '#fde68a', position: { x: 300, y: 80  } },
      { key: 'hdri',     names: ['envlight', 'environment', 'skylight', 'dome'],          label: 'HDRI Light',    color: '#fef3c7', position: { x: 300, y: 220 } },
      { key: 'camera',   names: ['camera', 'cam', 'viewcamera'],                          label: 'Camera',        color: '#d97706', position: { x: 500, y: 80  } },
      { key: 'render',   names: ['mantra', 'karma', 'arnold', 'renderman'],               label: 'Render',        color: '#7b6fff', position: { x: 700, y: 150 } },
    ],
    edges: [
      { from: 'geo', to: 'material' },
      { from: 'material', to: 'render' },
      { from: 'hdri', to: 'render', label: 'env' },
      { from: 'camera', to: 'render' },
    ],
  },
  {
    name: 'Crowd Sim',
    description: 'Agent setup, terrain analysis, and crowd solver for large-scale sims.',
    tags: ['houdini', 'crowds', 'simulation'],
    accent: '#fb923c',
    icon: '🧑‍🤝‍🧑',
    nodes: [
      { key: 'terrain', names: ['heightfield', 'grid', 'terrain'],                          label: 'Terrain',       color: '#fb923c', position: { x: 100, y: 100 } },
      { key: 'agent',   names: ['agentclip', 'crowdagent', 'agent'],                        label: 'Agent Clips',   color: '#fdba74', position: { x: 100, y: 250 } },
      { key: 'scatter', names: ['scatter', 'crowdspawn', 'popspawn'],                       label: 'Spawn',         color: '#fed7aa', position: { x: 300, y: 175 } },
      { key: 'solver',  names: ['crowdsolver', 'crowd_solver', 'solver'],                   label: 'Crowd Solver',  color: '#ea580c', position: { x: 500, y: 175 } },
      { key: 'cache',   names: ['filecache', 'dopimport', 'output'],                        label: 'Cache',         color: '#7b6fff', position: { x: 700, y: 175 } },
    ],
    edges: [
      { from: 'terrain', to: 'scatter' },
      { from: 'agent', to: 'scatter' },
      { from: 'scatter', to: 'solver' },
      { from: 'solver', to: 'cache' },
    ],
  },
  {
    name: 'Pipeline Handoff',
    description: 'Track asset dependencies across departments — model → rig → anim → fx → comp.',
    tags: ['pipeline', 'dependencies', 'tracking'],
    accent: '#7b6fff',
    icon: '🔗',
    nodes: [
      { key: 'model',  names: ['geo', 'file', 'alembic', 'usd'],                          label: 'Model',         color: '#7b6fff', position: { x: 100, y: 150 } },
      { key: 'rig',    names: ['skeleton', 'joint', 'kinefx_skeletonblend', 'rig'],       label: 'Rig',           color: '#a78bfa', position: { x: 300, y: 150 } },
      { key: 'anim',   names: ['motionclip', 'agentclip', 'channel', 'anim'],             label: 'Animation',     color: '#c4b5fd', position: { x: 500, y: 150 } },
      { key: 'fx',     names: ['dopnet', 'solver', 'pyrosolver', 'fx'],                   label: 'FX',            color: '#f97316', position: { x: 500, y: 300 } },
      { key: 'comp',   names: ['merge', 'read', 'output', 'write'],                       label: 'Comp',          color: '#f472b6', position: { x: 700, y: 220 } },
    ],
    edges: [
      { from: 'model', to: 'rig',   label: 'mesh', },
      { from: 'rig',   to: 'anim',  label: 'skeleton' },
      { from: 'anim',  to: 'fx',    label: 'deformed' },
      { from: 'anim',  to: 'comp',  label: 'render' },
      { from: 'fx',    to: 'comp',  label: 'fx render' },
    ],
  },
]

/* ── Name resolver ──────────────────────────────────────── */

function resolveNodes(
  templateNodes: TemplateNodeDef[],
  library: CortexNode[],
  graphId: string,
): { graphNodes: GraphNode[]; keyToGnId: Map<string, string> } {
  const keyToGnId = new Map<string, string>()
  const graphNodes: GraphNode[] = []

  for (const def of templateNodes) {
    // Try each candidate name — case-insensitive, partial match
    const match = def.names.reduce<CortexNode | undefined>((found, candidate) => {
      if (found) return found
      const lower = candidate.toLowerCase()
      return library.find(n =>
        n.name.toLowerCase() === lower ||
        n.name.toLowerCase().includes(lower) ||
        n.displayName?.toLowerCase().includes(lower)
      )
    }, undefined)

    const gnId = crypto.randomUUID()
    keyToGnId.set(def.key, gnId)

    if (match) {
      graphNodes.push({
        id: gnId,
        nodeId: match.id,
        graphId,
        position: def.position,
        color: def.color,
        label: def.label,
        isCollapsed: false,
        zIndex: 0,
      })
    }
    // If no match: skip (don't add a broken node reference)
  }

  return { graphNodes, keyToGnId }
}

function resolveEdges(
  templateEdges: TemplateEdgeDef[],
  keyToGnId: Map<string, string>,
): GraphEdge[] {
  return templateEdges.flatMap(e => {
    const src = keyToGnId.get(e.from)
    const tgt = keyToGnId.get(e.to)
    if (!src || !tgt) return []
    return [{
      id: crypto.randomUUID(),
      sourceNodeId: src,
      targetNodeId: tgt,
      label: e.label,
      edgeType: 'data' as const,
    }]
  })
}

/* ── Component ──────────────────────────────────────────── */

export function GraphTemplates() {
  const { activeVaultId } = useVaultStore()
  const { createGraph } = useGraphStore()
  const activeGraph = useGraphStore(s => s.activeGraph())
  const { addToast } = useUiStore()
  const [creating, setCreating] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async (t: Template) => {
    if (!activeVaultId || creating) return
    setCreating(t.name)
    try {
      // 1. Create the empty graph
      const graph = await createGraph({
        vaultId: activeVaultId,
        name: t.name,
        description: t.description,
        tags: t.tags,
      })

      // 2. Fetch the vault's node library to resolve names
      const library = await NodeService.list(activeVaultId)
      const { graphNodes, keyToGnId } = resolveNodes(t.nodes, library, graph.id)
      const graphEdges = resolveEdges(t.edges, keyToGnId)

      if (graphNodes.length > 0) {
        // 3. Save the graph with the resolved nodes + edges
        await GraphService.save({
          id: graph.id,
          nodes: graphNodes,
          edges: graphEdges,
          frames: [],
          comments: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        })

        // 4. Patch the in-memory store so the canvas reflects immediately
        useGraphStore.setState(s => {
          const g = s.graphs[graph.id]
          if (g) { g.nodes = graphNodes; g.edges = graphEdges }
        })

        addToast(
          `Created "${t.name}" — ${graphNodes.length} nodes, ${graphEdges.length} edges`,
          { variant: 'success' }
        )
      } else {
        addToast(
          `Created "${t.name}" — no matching nodes found in your library`,
          { variant: 'warning' }
        )
      }
    } catch (e) {
      addToast(`Failed to create template: ${String(e)}`, { variant: 'error' })
    } finally {
      setCreating(null)
    }
  }

  const handleSaveCurrent = async () => {
    if (!activeGraph || !activeVaultId) {
      addToast('Open a graph first', { variant: 'error' })
      return
    }
    const name = customName.trim() || `${activeGraph.name} (copy)`
    setSaving(true)
    try {
      await createGraph({
        vaultId: activeVaultId,
        name,
        description: activeGraph.description ?? '',
        tags: activeGraph.tags ?? [],
      })
      addToast(`Saved "${name}" as new graph`, { variant: 'success' })
      setCustomName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Save current graph as new */}
      {activeGraph && (
        <div className="px-3 pt-3 pb-2 border-b border-cx-border/40">
          <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
            Save Current as New
          </div>
          <div className="flex gap-1.5">
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={`${activeGraph.name} (copy)`}
              onKeyDown={e => e.key === 'Enter' && handleSaveCurrent()}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
              style={{ background: 'rgba(24,24,58,0.8)', border: '1px solid rgba(60,60,100,0.5)', color: 'var(--cx-text)', caretColor: 'var(--cx-accent)' }}
            />
            <button
              onClick={handleSaveCurrent}
              disabled={saving}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.3)', color: 'rgba(180,170,255,0.9)' }}
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Starter templates */}
      <div className="p-3 space-y-2">
        <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
          Starter Templates
        </div>
        {TEMPLATES.map(t => {
          const isBusy = creating === t.name
          return (
            <button
              key={t.name}
              onClick={() => handleCreate(t)}
              disabled={!!creating}
              className="w-full text-left rounded-xl p-3 transition-all group disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = `${t.accent}40`
                ;(e.currentTarget as HTMLElement).style.background = `${t.accent}08`
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-[12px] font-semibold" style={{ color: 'rgba(234,234,248,0.85)' }}>
                  {t.name}
                </span>
                {isBusy && (
                  <span className="ml-auto text-[10px] animate-pulse" style={{ color: t.accent }}>
                    Building…
                  </span>
                )}
                {!isBusy && (
                  <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: `${t.accent}18`, color: `${t.accent}cc`, border: `1px solid ${t.accent}30` }}>
                    {t.nodes.length} nodes
                  </span>
                )}
              </div>
              <div className="text-[10px] leading-relaxed mb-2" style={{ color: 'rgba(234,234,248,0.4)' }}>
                {t.description}
              </div>
              <div className="flex flex-wrap gap-1">
                {t.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[9px]"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(234,234,248,0.3)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
