import { useState, useEffect } from 'react'
import { ContextMenu, useContextMenu, MenuItemDef } from '@/components/ui/ContextMenu'
import { EmptyState, EmptyIcons } from '@/components/ui/EmptyState'
import { NodeRowSkeleton } from '@/components/ui/Skeleton'
import { useNodeStore } from '@/stores/node.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { NodeCreateModal } from '@/components/panels/NodeCreateModal'
import { cn } from '@/utils/cn'
import { CATEGORY_COLORS, NODE_OBJECT_TYPE_ICONS } from '@/utils/constants'
import { nanoid } from 'nanoid'
import type { CortexNode, GraphNode } from '@/types'
import { NodeDetail } from '@/features/node/NodeDetail'
import { NodeBulkActions } from '@/features/node/NodeBulkActions'

export function LibraryPanel() {
  const { } = useVaultStore()
  const { getAllNodes, selectNode, selectedNodeId, deleteNode, isLoading, error: nodeError, loadNodes } = useNodeStore()
  const { activeGraphId, addNode: addToGraph } = useGraphStore()
  const { addToast, activeTagFilter, setTagFilter } = useUiStore()
  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu()

  const [filter, setFilter] = useState('')

  // Sync tag filter from sidebar
  useEffect(() => {
    if (activeTagFilter) setFilter(activeTagFilter)
  }, [activeTagFilter])
  const [showCreate, setShowCreate] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)

  const nodes = getAllNodes()
  const filtered = nodes.filter(n => {
    const q = filter.toLowerCase()
    if (q && !n.displayName.toLowerCase().includes(q) && !n.name.toLowerCase().includes(q) && !n.tags.some(t => t.toLowerCase().includes(q))) return false
    if (activeTagFilter && !n.tags.includes(activeTagFilter)) return false
    return true
  })
  const groups = filtered.reduce<Record<string, CortexNode[]>>((acc, node) => {
    ;(acc[node.category] ??= []).push(node)
    return acc
  }, {})

  const handleAddToCanvas = (node: CortexNode) => {
    if (!activeGraphId) {
      addToast('No graph open — create a graph first', { variant: 'warning' })
      return
    }
    const graphNode: GraphNode = {
      id: nanoid(),
      nodeId: node.id,
      graphId: activeGraphId,
      position: { x: 80 + Math.random() * 400, y: 80 + Math.random() * 300 },
      isCollapsed: false,
      zIndex: 0,
    }
    addToGraph(graphNode)
    addToast(`Added "${node.displayName}" to canvas`, { variant: 'success' })
  }

  const handleDelete = async (node: CortexNode) => {
    await deleteNode(node.id)
    addToast(`"${node.displayName}" deleted`, { variant: 'default' })
    setConfirmId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-2 space-y-2 border-b border-cx-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter nodes…"
            className="flex-1 bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                       text-[11px] text-cx-text placeholder:text-cx-text-muted
                       focus:outline-none focus:border-cx-accent transition-colors min-w-0"
          />
          <button onClick={() => setShowCreate(true)} title="Create node"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                       bg-cx-accent/90 hover:bg-cx-accent text-white transition-colors">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] text-cx-text-muted">{filtered.length} / {nodes.length} nodes</span>
          {(activeTagFilter || filter) && (
            <button onClick={() => { setFilter(''); setTagFilter(null) }}
              className="text-[10px] text-cx-accent hover:text-cx-text transition-colors">
              Clear ✕
            </button>
          )}
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto">
        {nodes.length === 0 ? (
          isLoading ? (
            <div className="py-1">
              {Array.from({ length: 8 }).map((_, i) => <NodeRowSkeleton key={i} />)}
            </div>
          ) : nodeError ? (
            <EmptyState
              size="sm"
              icon={<EmptyIcons.Nodes />}
              title="Failed to load nodes"
              body={nodeError}
              action={{ label: 'Retry', onClick: () => loadNodes() }}
            />
          ) : (
            <EmptyState
              size="sm"
              icon={<EmptyIcons.Nodes />}
              title="No nodes yet"
              body="Import from your DCC or create nodes manually"
              action={{ label: '+ Create Node', onClick: () => setShowCreate(true) }}
            />
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<EmptyIcons.Filter />}
            title="No matches"
            body={`Nothing matched "${filter}"`}
          />
        ) : (
          Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).map(([cat, catNodes]) => {
            const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
            return (
              <div key={cat}>
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color }}>{cat}</span>
                  <span className="text-[9px] text-cx-text-muted">{catNodes.length}</span>
                </div>
                {catNodes.map(node => {
                  const isSelected = node.id === selectedNodeId
                  const confirming = confirmId === node.id
                  return (
                    <div key={node.id}
                      draggable
                      onDragStart={e => {
                        setDragNodeId(node.id)
                        e.dataTransfer.setData('cortex/node-id', node.id)
                        e.dataTransfer.effectAllowed = 'copy'
                        // Ghost image
                        const ghost = document.createElement('div')
                        ghost.textContent = node.displayName
                        ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:600;color:#eaeaf8;background:rgba(123,111,255,0.9);border:1px solid rgba(123,111,255,0.6);pointer-events:none'
                        document.body.appendChild(ghost)
                        e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
                        setTimeout(() => document.body.removeChild(ghost), 0)
                      }}
                      onDragEnd={() => setDragNodeId(null)}
                      className={cn('group flex items-center gap-1 px-2 transition-colors cursor-grab active:cursor-grabbing',
                        dragNodeId === node.id ? 'opacity-50 bg-cx-accent/10 ring-1 ring-cx-accent/30' :
                        isSelected ? 'bg-cx-accent/10' : 'hover:bg-cx-elevated')}
                      onClick={() => selectNode(node.id)}
                      onContextMenu={e => { e.stopPropagation(); openCtx(e, [
                        { kind: 'item', label: 'Select',         icon: <SelectIcon />,  onClick: () => selectNode(node.id) },
                        { kind: 'item', label: 'Add to Canvas',  icon: <AddIcon />,     onClick: () => handleAddToCanvas(node) },
                        { kind: 'separator' },
                        { kind: 'item', label: 'Delete',         icon: <DeleteIcon />,  danger: true, onClick: () => handleDelete(node) },
                      ] satisfies MenuItemDef[]) }}>
                      <div className="flex items-center gap-2 flex-1 py-1.5 min-w-0">
                        <span className="text-[13px] flex-shrink-0 opacity-70">
                          {NODE_OBJECT_TYPE_ICONS[node.objectType] ?? '⬡'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-[11px] font-medium truncate',
                            isSelected ? 'text-cx-accent' : 'text-cx-text')}>
                            {node.displayName}
                          </div>
                          {node.description && (
                            <div className="text-[10px] text-cx-text-muted truncate">{node.description}</div>
                          )}
                        </div>
                      </div>
                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {confirming ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleDelete(node) }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-cx-error/20 text-cx-error hover:bg-cx-error/30 transition-colors">
                              Del
                            </button>
                            <button onClick={e => { e.stopPropagation(); setConfirmId(null) }}
                              className="text-[10px] px-1 py-0.5 rounded text-cx-text-muted hover:bg-cx-elevated transition-colors">
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Add to canvas */}
                            <button onClick={e => { e.stopPropagation(); handleAddToCanvas(node) }}
                              title="Add to canvas"
                              className="w-5 h-5 flex items-center justify-center rounded
                                         text-cx-text-muted hover:text-cx-accent hover:bg-cx-accent/10 transition-all">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/>
                              </svg>
                            </button>
                            {/* Delete */}
                            <button onClick={e => { e.stopPropagation(); setConfirmId(node.id) }}
                              title="Delete node"
                              className="w-5 h-5 flex items-center justify-center rounded
                                         text-cx-text-muted hover:text-cx-error hover:bg-cx-error/10 transition-all">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1.5 2.5h7M3.5 2.5V1.5h3v1M2.5 2.5l.5 6h4l.5-6"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* Selected node detail */}
      {selectedNodeId && (() => {
        const n = nodes.find(nd => nd.id === selectedNodeId)
        return n ? (
          <div className="border-t border-cx-border flex-shrink-0 max-h-[40%] overflow-y-auto">
            <NodeDetail node={n} />
          </div>
        ) : null
      })()}

      <NodeBulkActions />

      {ctxMenu && <ContextMenu {...ctxMenu} onClose={closeCtx} />}
      {showCreate && <NodeCreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

/* ── Context menu icons ──────────────────────────────────── */
function SelectIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2l3 8 1.5-3L10 5.5 2 2z"/>
  </svg>
}
function AddIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/>
  </svg>
}
function DeleteIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 2.5h9M4 2.5V1.5h4v1M3 2.5l.5 8h5l.5-8"/>
  </svg>
}
