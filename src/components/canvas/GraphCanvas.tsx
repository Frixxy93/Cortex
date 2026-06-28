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
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-0.5 p-1 rounded-xl"
         style={{
           background: 'rgba(10,10,26,0.85)',
           border: '1px solid rgba(24,24,58,0.8)',
           boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
           backdropFilter: 'blur(12px)',
         }}>
      {tools.map(t => (
        <button
          key={t.id}
          title={t.title}
          onClick={() => setActiveTool(t.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
          style={activeTool === t.id ? {
            background: 'rgba(123,111,255,0.18)',
            color: 'rgba(180,175,255,0.9)',
            boxShadow: 'inset 0 0 0 1px rgba(123,111,255,0.25)',
          } : {
            color: 'rgba(100,100,150,0.7)',
          }}
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
    <div className="flex-1 flex items-center justify-center relative overflow-hidden"
         style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(9,9,30,1) 30%, rgba(5,5,12,1) 100%)' }}>
      {/* Grid */}
      <div className="absolute inset-0 canvas-grid opacity-60" />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 52%, rgba(123,111,255,0.08) 0%, transparent 70%)' }} />

      {/* Outer hex ring - slow rotation */}
      <div className="absolute pointer-events-none"
           style={{ animation: 'spin 80s linear infinite' }}>
        <HexRing size={440} opacity={0.04} />
      </div>
      {/* Mid hex ring - counter */}
      <div className="absolute pointer-events-none"
           style={{ animation: 'spin 50s linear infinite reverse' }}>
        <HexRing size={300} opacity={0.06} />
      </div>
      {/* Inner hex - float */}
      <div className="absolute pointer-events-none"
           style={{ animation: 'hexDrift 8s ease-in-out infinite' }}>
        <HexRing size={170} opacity={0.10} />
      </div>

      {/* Corner accents */}
      <div className="absolute top-6 left-6 w-24 h-24 pointer-events-none opacity-20"
           style={{ background: 'radial-gradient(circle, rgba(123,111,255,0.3) 0%, transparent 70%)' }} />
      <div className="absolute bottom-6 right-6 w-24 h-24 pointer-events-none opacity-20"
           style={{ background: 'radial-gradient(circle, rgba(123,111,255,0.3) 0%, transparent 70%)' }} />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-6 text-center animate-fade-in">
        {/* Logo mark */}
        <div style={{ animation: 'hexDrift 6s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(123,111,255,0.3))' }}>
          <svg viewBox="0 0 88 88" width="88" height="88" fill="none">
            {/* Outer */}
            <path d="M44 4 L78 23 L78 65 L44 84 L10 65 L10 23 Z"
                  stroke="rgba(123,111,255,0.15)" strokeWidth="1" fill="rgba(123,111,255,0.03)"/>
            {/* Mid */}
            <path d="M44 18 L66 30 L66 58 L44 70 L22 58 L22 30 Z"
                  stroke="rgba(123,111,255,0.22)" strokeWidth="1" fill="rgba(123,111,255,0.04)"/>
            {/* Inner glow hex */}
            <path d="M44 32 L56 38.9 L56 52.9 L44 59.8 L32 52.9 L32 38.9 Z"
                  stroke="rgba(123,111,255,0.6)" strokeWidth="1.5" fill="rgba(123,111,255,0.10)"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(123,111,255,0.4))' }}/>
            {/* Center dot */}
            <circle cx="44" cy="46" r="3" fill="rgba(123,111,255,0.8)"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(123,111,255,0.8))' }}/>
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'rgba(226,226,240,0.9)' }}>
            No graph open
          </h2>
          <p className="text-[11.5px] leading-relaxed max-w-[190px]" style={{ color: 'rgba(100,100,150,0.8)' }}>
            Create a graph to start building your VFX node network
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={handleNewGraph}
            disabled={creating || !activeVaultId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[12px] font-semibold
                       transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #7b6fff 0%, #6058dd 100%)',
              boxShadow: '0 4px 16px rgba(123,111,255,0.35), 0 0 0 1px rgba(123,111,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-[14px] leading-none">+</span>
            <span>{creating ? 'Creating…' : 'New Graph'}</span>
          </button>

          <button
            onClick={openCommandPalette}
            className="flex items-center gap-1.5 text-[11px] transition-all group"
            style={{ color: 'rgba(100,100,150,0.7)' }}
          >
            <kbd className="px-1.5 py-0.5 rounded-md font-mono text-[10px]"
                 style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(36,36,80,0.7)', color: 'rgba(140,140,200,0.7)' }}>
              &#8984;K
            </kbd>
            <span className="group-hover:opacity-100 opacity-70 transition-opacity">command palette</span>
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

function ExportIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 1v6M3 4.5l2.5 2.5 2.5-2.5"/>
      <path d="M1.5 8.5v1h8v-1"/>
    </svg>
  )
}
function SelectIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2 L11 6.5 L7 7.5 L5 11 Z"/></svg>
}
function PanIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="6.5" r="2.5"/><path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2"/></svg>
}
function GridIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="1.5" width="4" height="4" rx="0.5"/><rect x="7.5" y="1.5" width="4" height="4" rx="0.5"/><rect x="1.5" y="7.5" width="4" height="4" rx="0.5"/><rect x="7.5" y="7.5" width="4" height="4" rx="0.5"/></svg>
}
function FitIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1.5 4.5V1.5H4.5"/><path d="M8.5 1.5H11.5V4.5"/><path d="M11.5 8.5V11.5H8.5"/><path d="M4.5 11.5H1.5V8.5"/></svg>
}
