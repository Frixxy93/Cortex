import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps, useConnection } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { CATEGORY_COLORS, NODE_OBJECT_TYPE_ICONS } from '@/utils/constants'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { PORT_COLORS, inferPortType } from '@/utils/portTypes'
import { nanoid } from 'nanoid'
import type { CortexNode, GraphNode, NodePort } from '@/types'

interface NodeData {
  graphNode: GraphNode
  node?: CortexNode
}

/* ── Port handle component ───────────────────────────────────── */
function PortHandle({
  port,
  kind,
}: {
  port: NodePort
  kind: 'input' | 'output'
}) {
  const connection = useConnection()
  const portType = inferPortType(port.dataType || port.name)
  const color = PORT_COLORS[portType]
  const isTarget = kind === 'input'

  // Highlight when a compatible connection is being dragged
  const isConnecting = connection.inProgress
  const isSource = !isTarget && connection.fromHandle?.id === port.id

  return (
    <div
      className={cn(
        'relative flex items-center gap-1.5 py-[3px]',
        isTarget ? 'flex-row' : 'flex-row-reverse',
      )}
      style={{ paddingLeft: isTarget ? 0 : undefined, paddingRight: !isTarget ? 0 : undefined }}
    >
      <Handle
        id={port.id}
        type={isTarget ? 'target' : 'source'}
        position={isTarget ? Position.Left : Position.Right}
        className="!relative !transform-none !top-auto !left-auto !right-auto !translate-y-0"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isSource ? color : `${color}33`,
          border: `1.5px solid ${color}`,
          boxShadow: isConnecting || isSource ? `0 0 8px ${color}88` : 'none',
          flexShrink: 0,
          position: 'relative',
          transition: 'box-shadow 0.15s, background 0.15s',
        }}
      />
      <span
        className="text-[9px] truncate max-w-[80px]"
        style={{ color: `${color}bb`, lineHeight: 1.2 }}
        title={`${port.name} (${portType})`}
      >
        {port.name}
      </span>
      {port.required && (
        <span style={{ color: '#f87171', fontSize: 8, lineHeight: 1 }}>*</span>
      )}
    </div>
  )
}

/* ── Main node card ──────────────────────────────────────────── */
export const CortexNodeCard = memo(function CortexNodeCard({ data, selected }: NodeProps) {
  const { graphNode, node } = data as unknown as NodeData
  const [menuOpen, setMenuOpen]       = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { removeNode, addNode, activeGraphId } = useGraphStore()
  const { selectNode } = useNodeStore()
  const { toggleNav } = useUiStore()

  const accent  = node?.color ?? CATEGORY_COLORS[node?.category ?? ''] ?? CATEGORY_COLORS.default
  const icon    = node ? NODE_OBJECT_TYPE_ICONS[node.objectType] ?? '⬡' : '⬡'
  const label   = node?.displayName ?? graphNode.label ?? 'Unknown Node'
  const sublabel = node?.category

  const inputs  = node?.inputs  ?? []
  const outputs = node?.outputs ?? []
  const params  = node?.parameters ?? []
  const hasParams = params.length > 0

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

  // Fallback single handle when node has no typed ports
  const hasTypedPorts = inputs.length > 0 || outputs.length > 0

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-visible transition-all duration-150 cursor-default group',
        selected
          ? 'shadow-node-selected ring-1 ring-cx-accent/80'
          : 'shadow-node hover:ring-1 hover:ring-cx-accent/30',
      )}
      style={{
        minWidth: 170,
        maxWidth: 230,
        background: 'linear-gradient(180deg, #111127 0%, #0d0d20 100%)',
        border: `1px solid ${selected ? 'rgba(123,111,255,0.5)' : 'rgba(28,28,53,0.8)'}`,
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}44 100%)` }}
      />

      {/* Fallback single-target handle (no typed ports) */}
      {!hasTypedPorts && (
        <Handle type="target" position={Position.Left}
          style={{ top: '50%', left: -6, width: 10, height: 10, borderRadius: '50%',
            background: '#07070f', border: `1.5px solid ${accent}88`,
            boxShadow: `0 0 6px ${accent}44` }} />
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="pl-3 pr-2 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[13px] flex-shrink-0"
               style={{ background: `${accent}22`, border: `1px solid ${accent}33` }}>
            {icon}
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-cx-text leading-tight truncate">{label}</div>
            {sublabel && (
              <div className="text-[9px] uppercase tracking-[0.08em] mt-0.5 truncate"
                   style={{ color: `${accent}cc` }}>{sublabel}</div>
            )}
          </div>

          {/* Expand toggle */}
          {(hasParams) && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              className="w-5 h-5 flex items-center justify-center rounded text-cx-text-muted
                         hover:bg-cx-elevated hover:text-cx-text transition-all opacity-0 group-hover:opacity-60"
              title={expanded ? 'Collapse' : 'Expand parameters'}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                {expanded
                  ? <path d="M1 5l3-3 3 3"/>
                  : <path d="M1 3l3 3 3-3"/>
                }
              </svg>
            </button>
          )}

          {/* ⋯ context menu */}
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
                <MenuItem icon="⊕" label="Duplicate"           onClick={handleDuplicate} />
                <MenuItem icon="⬡" label="Select in Library"   onClick={handleSelectInLibrary} />
                <div className="h-px bg-cx-border my-1" />
                <MenuItem icon="✕" label="Remove from canvas"  onClick={handleRemove} danger />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ports ──────────────────────────────────────────── */}
      {hasTypedPorts && (
        <div
          className="relative flex justify-between gap-3 px-2 pb-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          {/* Inputs */}
          <div className="flex flex-col" style={{ marginLeft: -10 }}>
            {inputs.map((port) => (
              <PortHandle key={port.id} port={port} kind="input" />
            ))}
          </div>

          {/* Outputs */}
          <div className="flex flex-col items-end" style={{ marginRight: -10 }}>
            {outputs.map((port) => (
              <PortHandle key={port.id} port={port} kind="output" />
            ))}
          </div>
        </div>
      )}

      {/* ── Parameters (expanded) ──────────────────────────── */}
      {expanded && params.length > 0 && (
        <div
          className="px-3 pb-2.5 space-y-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-[8px] uppercase tracking-[0.1em] pt-1.5 mb-1"
               style={{ color: 'rgba(255,255,255,0.2)' }}>
            Parameters
          </div>
          {params.slice(0, 8).map(p => (
            <div key={p.id ?? p.name} className="flex items-center justify-between gap-2">
              <span className="text-[9px] truncate" style={{ color: 'rgba(180,180,220,0.55)' }}>{p.displayName ?? p.name}</span>
              <span className="text-[9px] font-mono truncate max-w-[70px]"
                    style={{ color: 'rgba(180,180,220,0.35)' }}>
                {String(p.defaultValue ?? '—')}
              </span>
            </div>
          ))}
          {params.length > 8 && (
            <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
              +{params.length - 8} more…
            </div>
          )}
        </div>
      )}

      {/* Fallback single-source handle (no typed ports) */}
      {!hasTypedPorts && (
        <Handle type="source" position={Position.Right}
          style={{ top: '50%', right: -6, width: 10, height: 10, borderRadius: '50%',
            background: '#07070f', border: '1.5px solid rgba(52,211,153,0.5)',
            boxShadow: '0 0 6px rgba(52,211,153,0.2)' }} />
      )}
    </div>
  )
})

/* ── helpers ─────────────────────────────────────────────────── */
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
