import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { CATEGORY_COLORS, NODE_OBJECT_TYPE_ICONS } from '@/utils/constants'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { nanoid } from 'nanoid'
import type { CortexNode, GraphNode } from '@/types'

interface NodeData {
  graphNode: GraphNode
  node?: CortexNode
}

export const CortexNodeCard = memo(function CortexNodeCard({ data, selected }: NodeProps) {
  const { graphNode, node } = data as unknown as NodeData
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { removeNode, addNode, activeGraphId } = useGraphStore()
  const { selectNode } = useNodeStore()
  const { toggleNav } = useUiStore()

  const accent = node?.color
    ?? CATEGORY_COLORS[node?.category ?? '']
    ?? CATEGORY_COLORS.default

  const icon = node ? NODE_OBJECT_TYPE_ICONS[node.objectType] ?? '⬡' : '⬡'
  const label = node?.displayName ?? graphNode.label ?? 'Unknown Node'
  const sublabel = node?.category

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeNode(graphNode.id)
    setMenuOpen(false)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeGraphId) return
    addNode({
      id: nanoid(),
      nodeId: graphNode.nodeId,
      graphId: activeGraphId,
      position: { x: graphNode.position.x + 40, y: graphNode.position.y + 40 },
      isCollapsed: false,
      zIndex: 0,
    })
    setMenuOpen(false)
  }

  const handleSelectInLibrary = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(graphNode.nodeId)
    toggleNav('nodes' as any)
    setMenuOpen(false)
  }

  return (
    <div
      className={cn(
        'relative min-w-[160px] max-w-[210px] rounded-xl overflow-visible',
        'transition-all duration-150 cursor-default group',
        selected
          ? 'shadow-node-selected ring-1 ring-cx-accent/80'
          : 'shadow-node hover:ring-1 hover:ring-cx-accent/30',
      )}
      style={{
        background: 'linear-gradient(180deg, #111127 0%, #0d0d20 100%)',
        border: `1px solid ${selected ? 'rgba(123,111,255,0.5)' : 'rgba(28,28,53,0.8)'}`,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}66 100%)` }}
      />

      {/* Target handle */}
      <Handle type="target" position={Position.Left}
        className="!w-2.5 !h-2.5 !-left-1.5 !border-2 !rounded-full transition-all"
        style={{ background: '#07070f', borderColor: accent + '80', boxShadow: `0 0 6px ${accent}44` }} />

      {/* Content */}
      <div className="pl-3 pr-2.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[13px] flex-shrink-0"
               style={{ background: accent + '22', border: `1px solid ${accent}33` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-cx-text leading-tight truncate">{label}</div>
            {sublabel && (
              <div className="text-[9px] uppercase tracking-[0.08em] mt-0.5 truncate"
                   style={{ color: accent + 'cc' }}>{sublabel}</div>
            )}
          </div>

          {/* ⋯ context menu button */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className={cn(
                'w-5 h-5 flex items-center justify-center rounded text-cx-text-muted',
                'hover:bg-cx-elevated hover:text-cx-text transition-all',
                menuOpen ? 'opacity-100 bg-cx-elevated text-cx-text' : 'opacity-0 group-hover:opacity-100'
              )}>
              <DotsIcon />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 w-44 py-1 rounded-lg
                              bg-cx-elevated border border-cx-border
                              shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                <MenuItem icon="⊕" label="Duplicate" onClick={handleDuplicate} />
                <MenuItem icon="⬡" label="Select in Library" onClick={handleSelectInLibrary} />
                <div className="h-px bg-cx-border my-1" />
                <MenuItem icon="✕" label="Remove from canvas" onClick={handleRemove} danger />
              </div>
            )}
          </div>
        </div>

        {/* Port rows */}
        {node && (node.inputs.length > 0 || node.outputs.length > 0) && (
          <div className="mt-2 pt-2 border-t border-cx-border/50 flex justify-between gap-2">
            <div className="flex flex-col gap-0.5 flex-1">
              {node.inputs.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: accent + '80' }} />
                  <span className="text-[9px] text-cx-text-muted truncate">{p.name}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5 items-end flex-1">
              {node.outputs.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <span className="text-[9px] text-cx-text-muted truncate">{p.name}</span>
                  <span className="w-1 h-1 rounded-full flex-shrink-0 bg-cx-success/60" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Source handle */}
      <Handle type="source" position={Position.Right}
        className="!w-2.5 !h-2.5 !-right-1.5 !border-2 !rounded-full transition-all"
        style={{ background: '#07070f', borderColor: 'rgba(52,211,153,0.5)', boxShadow: '0 0 6px rgba(52,211,153,0.2)' }} />
    </div>
  )
})

function MenuItem({ icon, label, onClick, danger }: {
  icon: string; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-colors text-left',
        danger
          ? 'text-cx-error hover:bg-cx-error/10'
          : 'text-cx-text-dim hover:bg-cx-overlay hover:text-cx-text'
      )}>
      <span className="text-[12px] w-4 text-center flex-shrink-0 opacity-70">{icon}</span>
      {label}
    </button>
  )
}

function DotsIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <circle cx="2" cy="5" r="1" /><circle cx="5" cy="5" r="1" /><circle cx="8" cy="5" r="1" />
    </svg>
  )
}
