import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type OnConnect,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useSettingsStore } from '@/stores/settings.store'

import { useGraphStore } from '@/stores/graph.store'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { CortexNodeCard } from './CortexNodeCard'
import { CortexEdge } from './CortexEdge'
import { NodePicker } from './NodePicker'
import { GRAPH_DEFAULTS, CATEGORY_COLORS } from '@/utils/constants'
import { nanoid } from 'nanoid'
import { cn } from '@/utils/cn'
import type { GraphEdge } from '@/types'

const NODE_TYPES: NodeTypes = { cortexNode: CortexNodeCard }
const EDGE_TYPES: EdgeTypes = { cortexEdge: CortexEdge }

export function GraphCanvas() {
  const { showMinimap, showGrid: _showGrid, showControls, snapToGrid: snapSetting, canvasBackground } = useSettingsStore()
  const { activeGraph, graphs, byVault, setActiveGraph, updateNode, removeNode,
          addEdge: storeAddEdge, removeEdge, setViewport, saveGraph, isDirty } = useGraphStore()
  const { getNode, selectNode } = useNodeStore()
  const vault = useVaultStore(s => s.activeVault())
  const activeVaultId = useVaultStore(s => s.activeVaultId)
  const graphsList = activeVaultId
    ? (byVault[activeVaultId] ?? []).map(id => graphs[id]).filter(Boolean)
    : []

  const graph = activeGraph()

  const rfNodes: Node[] = (graph?.nodes ?? []).map(gn => ({
    id: gn.id, type: 'cortexNode', position: gn.position,
    data: { graphNode: gn, node: getNode(gn.nodeId) },
    selected: false, draggable: true,
  }))

  const rfEdges: Edge[] = (graph?.edges ?? []).map(ge => ({
    id: ge.id, source: ge.sourceNodeId, target: ge.targetNodeId,
    sourceHandle: ge.sourcePortId, targetHandle: ge.targetPortId,
    type: 'cortexEdge', label: ge.label, data: { edge: ge },
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)
  const [nodePickerOpen, setNodePickerOpen] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setNodes(rfNodes) }, [graph?.nodes])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEdges(rfEdges) }, [graph?.edges])

  const onConnect: OnConnect = useCallback((connection) => {
    storeAddEdge({
      id: nanoid(), sourceNodeId: connection.source, targetNodeId: connection.target,
      sourcePortId: connection.sourceHandle ?? undefined,
      targetPortId: connection.targetHandle ?? undefined, edgeType: 'data',
    } as GraphEdge)
  }, [storeAddEdge])

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    for (const change of changes) {
      if (change.type === 'position' && change.position)
        updateNode({ ...graph!.nodes.find(n => n.id === change.id)!, position: change.position })
      if (change.type === 'remove') removeNode(change.id)
    }
  }, [onNodesChange, graph, updateNode, removeNode])

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    for (const change of changes) {
      if (change.type === 'remove') removeEdge(change.id)
    }
  }, [onEdgesChange, removeEdge])

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveGraph(), 5000)
    return () => clearTimeout(saveTimer.current)
  }, [graph?.nodes, graph?.edges, saveGraph])

  // Listen for Tab key event dispatched from app.tsx
  useEffect(() => {
    const handler = () => setNodePickerOpen(v => !v)
    window.addEventListener('cortex:toggle-node-picker', handler)
    return () => window.removeEventListener('cortex:toggle-node-picker', handler)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cx-bg min-w-0">
      {/* Breadcrumb bar */}
      <Breadcrumb vault={vault} graph={graph} graphs={graphsList} onGraphSelect={setActiveGraph}
                  isDirty={isDirty} onSave={saveGraph}
                  onExport={() => {
                    if (!graph) return
                    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `${graph.name.replace(/\s+/g, '_')}.json`
                    a.click()
                    URL.revokeObjectURL(a.href)
                  }} />

      {/* Canvas / empty state */}
      {!graph ? (
        <CanvasEmptyState />
      ) : (
        <div className="flex-1 relative overflow-hidden"
          tabIndex={-1}
          onKeyDown={e => {
            if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              setNodePickerOpen(v => !v)
            }
          }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES}
            snapToGrid={snapSetting} snapGrid={GRAPH_DEFAULTS.snapGrid}
            minZoom={GRAPH_DEFAULTS.minZoom} maxZoom={GRAPH_DEFAULTS.maxZoom}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            onNodeClick={(_, node) => {
              const d = node.data as { graphNode: { nodeId: string } }
              selectNode(d.graphNode.nodeId)
            }}
            onPaneClick={() => { selectNode(null); setNodePickerOpen(false) }}
            onMoveEnd={(_, viewport) => setViewport(viewport)}
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            className="cortex-canvas"
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
          >
            {canvasBackground !== 'none' && (
              <Background
                variant={canvasBackground === 'dots' ? BackgroundVariant.Dots : canvasBackground === 'lines' ? BackgroundVariant.Lines : BackgroundVariant.Cross}
                gap={28} size={1} color="#1c1c35" />
            )}
            {showControls && <Controls showInteractive={false} />}
            {showMinimap && <MiniMap
              nodeColor={(rfNode) => {
                const d = rfNode.data as { node?: { category?: string; color?: string } }
                const color = d.node?.color ?? CATEGORY_COLORS[d.node?.category ?? ''] ?? CATEGORY_COLORS.default
                return color + '99'
              }}
              maskColor="rgba(7,7,15,0.75)"
              style={{ background: 'rgba(7,7,15,0.9)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
            />}

            {/* Canvas tool palette */}
            <CanvasTools />
          </ReactFlow>

          {/* Node picker — Tab to open/close */}
          {nodePickerOpen && <NodePicker onClose={() => setNodePickerOpen(false)} />}
        </div>
      )}
    </div>
  )
}

/* ── Breadcrumb bar ──────────────────────────────────────── */

function Breadcrumb({ vault, graph, graphs, onGraphSelect, isDirty, onSave, onExport }: {
  vault: any; graph: any; graphs: any[];
  onGraphSelect: (id: string) => void;
  isDirty: boolean; onSave: () => void; onExport: () => void;
}) {
  return (
    <div className="h-8 flex items-center gap-1.5 px-3 border-b border-cx-border flex-shrink-0
                    bg-cx-surface/50 backdrop-blur-xs"
         style={{ boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.02)' }}>
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1 text-[11px] text-cx-text-muted flex-1 min-w-0">
        {vault && (
          <>
            <BreadcrumbItem active={false}>{vault.name}</BreadcrumbItem>
            <ChevronSep />
          </>
        )}
        {graph ? (
          <>
            <BreadcrumbItem active={false}>{graph.name}</BreadcrumbItem>
            <ChevronSep />
            <BreadcrumbItem active>
              {graph.description ?? 'Untitled'}
            </BreadcrumbItem>
          </>
        ) : (
          <span className="text-cx-text-muted">No graph selected</span>
        )}
      </div>

      {/* Save status */}
      {graph && (
        <button
          onClick={onSave}
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-colors',
            isDirty
              ? 'text-cx-warning hover:bg-cx-warning/10'
              : 'text-cx-success/70 hover:bg-cx-elevated'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', isDirty ? 'bg-cx-warning' : 'bg-cx-success')} />
          {isDirty ? 'Unsaved' : 'Saved'}
        </button>
      )}

      {/* Export */}
      {graph && (
        <button onClick={onExport}
          title="Export graph as JSON"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px]
                     text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated transition-colors flex-shrink-0">
          <ExportIcon />
        </button>
      )}

      {/* Graph switcher chips */}
      {graphs.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px]"
             style={{ scrollbarWidth: 'none' }}>
          {graphs.map(g => {
            const active = g.id === graph?.id
            return (
              <button key={g.id} onClick={() => onGraphSelect(g.id)}
                className={cn(
                  'flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all',
                  active
                    ? 'bg-cx-accent/20 text-cx-accent border border-cx-accent/40'
                    : 'bg-cx-elevated text-cx-text-muted border border-cx-border hover:text-cx-text'
                )}>
                {g.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BreadcrumbItem({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span className={cn('truncate', active ? 'text-cx-text font-medium' : 'hover:text-cx-text cursor-pointer')}>
      {children}
    </span>
  )
}

function ChevronSep() {
  return <span className="text-cx-border flex-shrink-0 mx-0.5">›</span>
}

/* ── Canvas tool palette ─────────────────────────────────── */

function CanvasTools() {
  const [activeTool, setActiveTool] = useState<string>('select')

  const tools = [
    { id: 'select', title: 'Select (V)', icon: <SelectIcon /> },
    { id: 'pan',    title: 'Pan (H)',    icon: <PanIcon /> },
    { id: 'grid',   title: 'Grid',       icon: <GridIcon /> },
    { id: 'fit',    title: 'Fit view',   icon: <FitIcon /> },
  ]

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-0.5
                    bg-cx-elevated/90 backdrop-blur border border-cx-border rounded-xl p-1
                    shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {tools.map(t => (
        <button
          key={t.id}
          title={t.title}
          onClick={() => setActiveTool(t.id)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg text-[11px] transition-all',
            activeTool === t.id
              ? 'bg-cx-accent/20 text-cx-accent'
              : 'text-cx-text-muted hover:bg-cx-overlay hover:text-cx-text'
          )}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────── */

function CanvasEmptyState() {
  const { activeVaultId } = useVaultStore()
  const { createGraph } = useGraphStore()
  const { openCommandPalette } = useUiStore()
  const [creating, setCreating] = useState(false)

  const handleNewGraph = async () => {
    if (!activeVaultId) return
    const name = prompt('Graph name:')
    if (!name?.trim()) return
    setCreating(true)
    try { await createGraph({ vaultId: activeVaultId, name: name.trim(), description: '', tags: [] }) }
    finally { setCreating(false) }
  }

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 canvas-grid" />
      <div className="absolute inset-0"
           style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(123,111,255,0.07) 0%, transparent 70%)' }} />
      <div className="absolute" style={{ animation: 'hexDrift 18s ease-in-out infinite' }}>
        <HexRing size={360} opacity={0.025} />
      </div>
      <div className="absolute" style={{ animation: 'hexDrift 26s ease-in-out infinite reverse' }}>
        <HexRing size={220} opacity={0.05} />
      </div>

      <div className="relative flex flex-col items-center gap-5 text-center">
        <div style={{ animation: 'float 6s ease-in-out infinite' }}>
          <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
            <path d="M40 6 L70 22 L70 58 L40 74 L10 58 L10 22 Z" stroke="rgba(123,111,255,0.25)" strokeWidth="1" fill="rgba(123,111,255,0.04)"/>
            <path d="M40 19 L59 29 L59 51 L40 61 L21 51 L21 29 Z" stroke="rgba(123,111,255,0.12)" strokeWidth="1" fill="rgba(123,111,255,0.03)"/>
            <path d="M40 32 L50 37.5 L50 48.5 L40 54 L30 48.5 L30 37.5 Z" stroke="rgba(123,111,255,0.5)" strokeWidth="1.5" fill="rgba(123,111,255,0.08)"/>
          </svg>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-[15px] font-semibold text-cx-text">No graph open</h2>
          <p className="text-[11px] text-cx-text-muted max-w-[200px] leading-relaxed">
            Create a graph to start building your knowledge network
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleNewGraph}
            disabled={creating || !activeVaultId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cx-accent/90 hover:bg-cx-accent
                       text-white text-[12px] font-semibold transition-all shadow-glow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '…' : '+ New Graph'}
          </button>
          <button onClick={openCommandPalette}
                  className="flex items-center gap-1.5 text-cx-text-muted text-[11px] hover:text-cx-text transition-colors">
            <kbd className="px-1.5 py-0.5 rounded bg-cx-elevated border border-cx-border text-cx-text-dim text-[10px] font-mono">⌘K</kbd>
            <span>command palette</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function HexRing({ size, opacity }: { size: number; opacity: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.44
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <polygon points={pts} stroke={`rgba(123,111,255,${opacity})`} strokeWidth="1" fill="none"/>
    </svg>
  )
}

/* Icons */
function ExportIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 1v6M3 4.5l2.5 2.5 2.5-2.5"/>
    <path d="M1.5 8.5v1h8v-1"/>
  </svg>
}
function SelectIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2 L11 6.5 L7 7.5 L5 11 Z"/></svg> }
function PanIcon()    { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="6.5" r="2.5"/><path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2"/></svg> }
function GridIcon()   { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="1.5" width="4" height="4" rx="0.5"/><rect x="7.5" y="1.5" width="4" height="4" rx="0.5"/><rect x="1.5" y="7.5" width="4" height="4" rx="0.5"/><rect x="7.5" y="7.5" width="4" height="4" rx="0.5"/></svg> }
function FitIcon()    { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 5V2h3M11 5V2H8M2 8v3h3M11 8v3H8"/></svg> }
