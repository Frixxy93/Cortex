import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  useReactFlow,
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
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { isCompatible, inferPortType } from '@/utils/portTypes'

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
import type { GraphEdge } from '@/types'

const NODE_TYPES: NodeTypes = { cortexNode: CortexNodeCard }
const EDGE_TYPES: EdgeTypes = { cortexEdge: CortexEdge }

export function GraphCanvas() {
  const { showMinimap, showGrid: _showGrid, showControls, snapToGrid: snapSetting, canvasBackground, autoSave, confirmDeletes } = useSettingsStore()
  const { activeGraph, graphs, byVault, setActiveGraph, updateNode, removeNode,
          addEdge: storeAddEdge, removeEdge, setViewport, saveGraph, isDirty, addNode: storeAddNode } = useGraphStore()
  const { getNode, selectNode } = useNodeStore()
  const addToastFromDrop = useUiStore(s => s.addToast)
  const openCommandPalette = useUiStore(s => s.openCommandPalette)
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
  const [isDragOver, setIsDragOver] = useState(false)
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setNodes(rfNodes) }, [graph?.nodes])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEdges(rfEdges) }, [graph?.edges])

  const isValidConnection: IsValidConnection = useCallback((connection) => {
    // Allow connections where port types are compatible
    const { sourceHandle, targetHandle } = connection
    if (!sourceHandle || !targetHandle) return true // no port info → allow
    const fromType = inferPortType(sourceHandle.split('__')[0] ?? sourceHandle)
    const toType   = inferPortType(targetHandle.split('__')[0] ?? targetHandle)
    return isCompatible(fromType, toType)
  }, [])

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
    if (autoSave) saveTimer.current = setTimeout(() => saveGraph(), 5000)
    return () => clearTimeout(saveTimer.current)
  }, [graph?.nodes, graph?.edges, saveGraph, autoSave])

  // Listen for Tab key event dispatched from app.tsx
  useEffect(() => {
    const handler = () => setNodePickerOpen(v => !v)
    window.addEventListener('cortex:toggle-node-picker', handler)
    return () => window.removeEventListener('cortex:toggle-node-picker', handler)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('cortex/node-id')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the canvas wrapper itself (not a child)
    if (!canvasWrapRef.current?.contains(e.relatedTarget as Element)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const nodeId = e.dataTransfer.getData('cortex/node-id')
    const g = activeGraph()
    if (!nodeId || !g || !canvasWrapRef.current) return

    const bounds = canvasWrapRef.current.getBoundingClientRect()
    const vp = g.viewport ?? { x: 0, y: 0, zoom: 1 }
    const x = (e.clientX - bounds.left - vp.x) / vp.zoom
    const y = (e.clientY - bounds.top  - vp.y) / vp.zoom

    storeAddNode({
      id: nanoid(), nodeId, graphId: g.id,
      position: { x, y },
      isCollapsed: false, zIndex: 0,
    })
    const node = getNode(nodeId)
    if (node) addToastFromDrop(`Added "${node.displayName}" to canvas`, { variant: 'success' })
  }


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
        <div
          ref={canvasWrapRef}
          className="flex-1 relative overflow-hidden"
          tabIndex={-1}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
            isValidConnection={isValidConnection}
            nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES}
            snapToGrid={snapSetting} snapGrid={GRAPH_DEFAULTS.snapGrid}
            minZoom={GRAPH_DEFAULTS.minZoom} maxZoom={GRAPH_DEFAULTS.maxZoom}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            onNodeClick={(_, node) => {
              const d = node.data as { graphNode: { nodeId: string } }
              selectNode(d.graphNode.nodeId)
            }}
            onPaneClick={() => { selectNode(null); setNodePickerOpen(false); setPaneMenu(null) }}
            onPaneContextMenu={(e) => { e.preventDefault(); setPaneMenu({ x: e.clientX, y: e.clientY, flowX: e.clientX, flowY: e.clientY }) }}
            onMoveEnd={(_, viewport) => setViewport(viewport)}
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            className="cortex-canvas"
            deleteKeyCode={confirmDeletes ? null : "Delete"}
            onNodesDelete={confirmDeletes ? (nodes) => { if (window.confirm(`Delete ${nodes.length} node${nodes.length > 1 ? 's' : ''}?`)) nodes.forEach(n => { const d = n.data as { graphNode?: { id: string } }; if (d.graphNode?.id) removeNode(d.graphNode.id) }) } : undefined}
            multiSelectionKeyCode="Shift"
            panOnDrag={[1, 2]}
            selectionOnDrag={true}
          >
            <FitViewListener />
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

          {/* Canvas right-click context menu */}
          {paneMenu && (
            <div
              className="absolute z-[200] py-1 rounded-xl overflow-hidden"
              style={{
                left: paneMenu.x,
                top: paneMenu.y,
                minWidth: 180,
                background: 'rgba(10,10,24,0.97)',
                border: '1px solid rgba(36,36,80,0.9)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px)',
              }}
              onMouseLeave={() => setPaneMenu(null)}
            >
              {[
                { label: 'New Node', icon: '＋', action: () => { setNodePickerOpen(true); setPaneMenu(null) } },
                { label: 'Command Palette', icon: '⌘', action: () => { openCommandPalette(); setPaneMenu(null) } },
                null,
                { label: 'Fit View', icon: '⊡', action: () => { window.dispatchEvent(new CustomEvent('cortex:fit-view')); setPaneMenu(null) } },
                { label: 'Save Graph', icon: '↓', action: () => { saveGraph(); setPaneMenu(null) } },
              ].map((item, i) =>
                item === null
                  ? <div key={i} className="my-1 mx-2" style={{ height: 1, background: 'rgba(36,36,80,0.7)' }} />
                  : (
                    <button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-[12px] transition-colors"
                      style={{ color: 'rgba(200,200,240,0.8)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.1)'; e.currentTarget.style.color = 'rgba(220,218,255,0.95)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(200,200,240,0.8)' }}
                    >
                      <span className="w-4 text-center text-[11px]" style={{ color: 'rgba(123,111,255,0.7)' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  )
              )}
            </div>
          )}

          {/* Graph node empty state overlay */}
          {graph.nodes.length === 0 && !isDragOver && (
            <GraphNodeEmptyState onOpenPicker={() => setNodePickerOpen(true)} />
          )}

          {/* Drop zone overlay */}
          {isDragOver && (
            <div className="absolute inset-0 pointer-events-none z-50"
                 style={{
                   border: '2px dashed rgba(123,111,255,0.6)',
                   borderRadius: 8,
                   background: 'rgba(123,111,255,0.04)',
                   boxShadow: 'inset 0 0 40px rgba(123,111,255,0.06)',
                   animation: 'dropZonePulse 1s ease-in-out infinite',
                 }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div style={{
                  background: 'rgba(10,10,22,0.85)',
                  border: '1px solid rgba(123,111,255,0.4)',
                  borderRadius: 12,
                  padding: '10px 20px',
                  color: 'rgba(123,111,255,0.9)',
                  fontSize: 12,
                  fontWeight: 600,
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                }}>
                  Drop to add node
                </div>
              </div>
            </div>
          )}
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
    <div
      className="h-10 flex items-center gap-2 px-3.5 flex-shrink-0 relative"
      style={{
        background: 'linear-gradient(180deg, rgba(9,9,26,0.98) 0%, rgba(7,7,20,0.95) 100%)',
        borderBottom: '1px solid rgba(24,24,58,0.8)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1 text-[11px] flex-1 min-w-0 overflow-hidden">
        {vault && (
          <>
            <span className="truncate max-w-[80px] flex-shrink-0" style={{ color: 'rgba(234,234,248,0.35)' }}>
              {vault.name}
            </span>
            <ChevronSep />
          </>
        )}
        {graph ? (
          <span className="font-semibold truncate" style={{ color: 'rgba(234,234,248,0.8)' }}>
            {graph.name}
          </span>
        ) : (
          <span style={{ color: 'rgba(234,234,248,0.25)' }}>No graph selected</span>
        )}
      </div>

      {/* Center: stat chips */}
      {graph && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatChip value={graph.nodes.length} label="nodes" color="#60a5fa" />
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
          <StatChip value={graph.edges.length} label="edges" color="#a78bfa" />
        </div>
      )}

      {/* Right: graph switcher + save + export */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">

        {/* Graph switcher chips */}
        {graphs.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto max-w-[180px]"
               style={{ scrollbarWidth: 'none' }}>
            {graphs.map(g => {
              const isActive = g.id === graph?.id
              return (
                <button key={g.id} onClick={() => onGraphSelect(g.id)}
                  className="flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-150"
                  style={isActive ? {
                    background: 'rgba(96,165,250,0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(96,165,250,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(234,234,248,0.35)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {g.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Save status */}
        {graph && (
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-150"
            style={{
              background: isDirty ? 'rgba(245,158,11,0.08)' : 'transparent',
              color: isDirty ? 'rgba(245,158,11,0.85)' : 'rgba(234,234,248,0.25)',
              border: isDirty ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
            }}
            title={isDirty ? 'Unsaved changes — click to save (⌘S)' : 'All changes saved'}
          >
            <span
              style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0, display: 'block',
                background: isDirty ? '#f59e0b' : '#34d399',
                boxShadow: isDirty ? '0 0 5px rgba(245,158,11,0.9)' : '0 0 4px rgba(52,211,153,0.7)',
                animation: isDirty ? 'save-pulse 1.4s ease-in-out infinite' : 'none',
              }}
            />
            {isDirty ? 'Unsaved' : 'Saved'}
          </button>
        )}

        {/* Export */}
        {graph && (
          <button
            onClick={onExport}
            title="Export graph as JSON"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: 'rgba(234,234,248,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(234,234,248,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(234,234,248,0.25)' }}
          >
            <ExportIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{
        background: color + '10',
        border: '1px solid ' + color + '1a',
      }}
    >
      <span className="text-[11px] font-semibold leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px] leading-none" style={{ color: color + '70' }}>
        {label}
      </span>
    </div>
  )
}


function ChevronSep() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="flex-shrink-0 mx-0.5" style={{ color: 'rgba(255,255,255,0.15)' }}>
      <path d="M3 2l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[12px] font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
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

/* ── Graph Node Empty State ─────────────────────────────── */
function GraphNodeEmptyState({ onOpenPicker }: { onOpenPicker: () => void }) {
  const { openCommandPalette } = useUiStore()

  const hints: {
    icon: React.ReactNode
    title: string
    desc: string
    accent: string
    action?: () => void
    kbd?: string[]
  }[] = [
    {
      icon: <DragHintIcon />,
      title: 'Drag from Library',
      desc: 'Open the Nodes panel and drag any node here',
      accent: '#7b6fff',
    },
    {
      icon: <TabHintIcon />,
      title: 'Tab key',
      desc: 'Open the node picker at your cursor position',
      accent: '#34d399',
      action: onOpenPicker,
      kbd: ['Tab'],
    },
    {
      icon: <PaletteHintIcon />,
      title: 'Command palette',
      desc: 'Search every node and jump to it instantly',
      accent: '#60a5fa',
      action: openCommandPalette,
      kbd: ['⌘', 'K'],
    },
  ]

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      {/* Subtle center glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 50%, rgba(123,111,255,0.05) 0%, transparent 70%)' }} />

      <div className="flex flex-col items-center gap-6 pointer-events-none select-none"
           style={{ animation: 'fadeIn 0.35s ease forwards' }}>

        {/* Animated hex icon */}
        <div style={{ animation: 'hexDrift 7s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(123,111,255,0.25))' }}>
          <svg viewBox="0 0 72 72" width="68" height="68" fill="none">
            <path d="M36 4 L62 19 L62 53 L36 68 L10 53 L10 19 Z"
                  stroke="rgba(123,111,255,0.08)" strokeWidth="1" fill="rgba(123,111,255,0.015)"/>
            <path d="M36 17 L53 26.5 L53 45.5 L36 55 L19 45.5 L19 26.5 Z"
                  stroke="rgba(123,111,255,0.15)" strokeWidth="1" fill="rgba(123,111,255,0.025)"/>
            <path d="M36 30 L44 34.6 L44 43.8 L36 48.4 L28 43.8 L28 34.6 Z"
                  stroke="rgba(123,111,255,0.5)" strokeWidth="1.5" fill="rgba(123,111,255,0.07)"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(123,111,255,0.4))' }}/>
            <line x1="36" y1="35.5" x2="36" y2="43.5"
                  stroke="rgba(123,111,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="32" y1="39.5" x2="40" y2="39.5"
                  stroke="rgba(123,111,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <p className="text-[14px] font-semibold"
             style={{ color: 'rgba(200,200,240,0.72)' }}>
            Canvas is empty
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(70,70,120,0.8)' }}>
            Add your first node using any of these methods
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onOpenPicker}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[12px] font-semibold transition-all active:scale-[0.97] hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(123,111,255,0.9) 0%, rgba(96,88,220,0.9) 100%)',
            boxShadow: '0 4px 18px rgba(123,111,255,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
            border: '1px solid rgba(123,111,255,0.4)',
          }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round">
            <line x1="5.5" y1="1" x2="5.5" y2="10"/>
            <line x1="1" y1="5.5" x2="10" y2="5.5"/>
          </svg>
          Add Node
        </button>

        {/* Hint cards */}
        <div className="flex items-stretch gap-2.5 pointer-events-auto">
          {hints.map((h, i) => (
            <HintCard key={i} hint={h} delay={i * 60} />
          ))}
        </div>

        {/* Shortcut strip */}
        <div className="flex items-center gap-5 pointer-events-none"
             style={{ opacity: 0.5 }}>
          {[
            { keys: ['Tab'],    label: 'picker' },
            { keys: ['⌘', 'K'], label: 'search' },
            { keys: ['drag'],   label: 'from library' },
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1" style={{ color: 'rgba(60,60,100,1)' }}>
              <span className="flex items-center gap-0.5">
                {item.keys.map((k, j) => (
                  <kbd key={j}
                    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{
                      background: 'rgba(8,8,20,0.9)',
                      border: '1px solid rgba(28,28,60,0.9)',
                      color: 'rgba(90,90,150,0.9)',
                      boxShadow: '0 1px 0 rgba(0,0,0,0.6)',
                    }}>
                    {k}
                  </kbd>
                ))}
              </span>
              <span className="text-[9.5px]">{item.label}</span>
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}

/* ── Hint card sub-component ─────────────────────────────── */
function HintCard({ hint, delay }: {
  hint: { icon: React.ReactNode; title: string; desc: string; accent: string; action?: () => void; kbd?: string[] }
  delay: number
}) {
  const [hovered, setHovered] = useState(false)
  const active = hovered && Boolean(hint.action)

  const btnStyle: React.CSSProperties = {
    width: 120,
    animation: 'fadeIn 0.35s ease both',
    animationDelay: delay + 'ms',
    background: active ? hint.accent + '12' : 'rgba(10,10,24,0.65)',
    border: '1px solid ' + (active ? hint.accent + '35' : 'rgba(20,20,50,0.9)'),
    backdropFilter: 'blur(14px)',
    cursor: hint.action ? 'pointer' : 'default',
    transform: active ? 'translateY(-1px)' : 'none',
    boxShadow: active
      ? '0 8px 24px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.18s ease',
  }

  const iconStyle: React.CSSProperties = {
    color: hint.accent,
    filter: active ? 'drop-shadow(0 0 8px ' + hint.accent + '80)' : 'none',
    transform: active ? 'scale(1.1)' : 'scale(1)',
    display: 'block',
    transition: 'transform 0.2s, filter 0.2s',
  }

  const titleColor = active ? 'rgba(210,207,255,0.95)' : 'rgba(170,170,210,0.75)'
  const kbdBorder = '1px solid ' + hint.accent + '30'

  return (
    <button
      onClick={hint.action}
      disabled={!hint.action}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-center gap-2 px-3.5 py-3 rounded-2xl text-center"
      style={btnStyle}>
      <span style={iconStyle}>
        {hint.icon}
      </span>
      <div>
        <div className="text-[11px] font-semibold mb-1" style={{ color: titleColor }}>
          {hint.title}
          {hint.kbd && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              {hint.kbd.map((k, i) => (
                <kbd key={i}
                  className="px-1 py-px rounded text-[8px] font-mono"
                  style={{ background: 'rgba(8,8,20,0.8)', border: kbdBorder, color: hint.accent }}>
                  {k}
                </kbd>
              ))}
            </span>
          )}
        </div>
        <div className="text-[9.5px] leading-snug" style={{ color: 'rgba(70,70,120,0.85)' }}>
          {hint.desc}
        </div>
      </div>
    </button>
  )
}

function DragHintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {/* Node box */}
      <rect x="1" y="4" width="12" height="8" rx="2"/>
      <line x1="3.5" y1="7" x2="8" y2="7" opacity="0.5"/>
      <line x1="3.5" y1="9.5" x2="6.5" y2="9.5" opacity="0.5"/>
      {/* Arrow */}
      <path d="M14 8h3.5M17.5 8l-2-2M17.5 8l-2 2" opacity="0.7"/>
      {/* Target canvas */}
      <rect x="15" y="13" width="6" height="6" rx="1.5" strokeDasharray="1.5 1.5" opacity="0.5"/>
    </svg>
  )
}
function TabHintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="4" width="19" height="14" rx="2.5"/>
      <path d="M6 10l4 3-4 3"/>
      <line x1="12" y1="16" x2="16.5" y2="16"/>
    </svg>
  )
}
function PaletteHintIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round">
      <circle cx="9.5" cy="9.5" r="6.5"/>
      <line x1="14.5" y1="14.5" x2="20" y2="20"/>
      <line x1="7" y1="9.5" x2="12" y2="9.5" opacity="0.6"/>
      <line x1="9.5" y1="7" x2="9.5" y2="12" opacity="0.6"/>
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
/* ── FitViewListener ─────────────────────────────────────── */
function FitViewListener() {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const handler = () => fitView({ padding: 0.2, duration: 400 })
    window.addEventListener('cortex:fit-view', handler)
    return () => window.removeEventListener('cortex:fit-view', handler)
  }, [fitView])
  return null
}

function FitIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1.5 4.5V1.5H4.5"/><path d="M8.5 1.5H11.5V4.5"/><path d="M11.5 8.5V11.5H8.5"/><path d="M4.5 11.5H1.5V8.5"/></svg>
}
