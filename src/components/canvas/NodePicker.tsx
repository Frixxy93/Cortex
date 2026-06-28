import { useState, useEffect, useRef, useCallback } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { CATEGORY_COLORS } from '@/utils/constants'
import { nanoid } from 'nanoid'
import { cn } from '@/utils/cn'
import type { CortexNode } from '@/types'

interface Props {
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  sop: 'SOP', dop: 'DOP', vop: 'VOP', chop: 'CHOP', lop: 'LOP',
  rop: 'ROP', top: 'TOP', cop: 'COP', object: 'OBJ', color: 'Color',
  filter: 'Filter', geometry: 'Geo', shader: 'Shader', utility: 'Util',
  math: 'Math', logic: 'Logic', custom: 'Custom', other: 'Other',
}

export function NodePicker({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const getAllNodes = useNodeStore(s => s.getAllNodes)
  const { activeGraphId, addNode, activeGraph } = useGraphStore()
  const viewport = activeGraph()?.viewport

  const allNodes = getAllNodes()

  const results = query.trim().length === 0
    ? allNodes.slice(0, 12)
    : allNodes.filter(n =>
        n.displayName.toLowerCase().includes(query.toLowerCase()) ||
        n.name.toLowerCase().includes(query.toLowerCase()) ||
        (n.category as string).includes(query.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 12)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelected(0) }, [query])

  const placeNode = useCallback((node: CortexNode) => {
    if (!activeGraphId) return
    // Derive flow-space center from stored viewport: flowPos = (screenPos - pan) / zoom
    const vp = viewport ?? { x: 0, y: 0, zoom: 1 }
    const cx = (window.innerWidth / 2 - vp.x) / vp.zoom
    const cy = (window.innerHeight / 2 - vp.y) / vp.zoom
    addNode({
      id: nanoid(),
      nodeId: node.id,
      graphId: activeGraphId,
      position: { x: cx + Math.random() * 60 - 30, y: cy + Math.random() * 60 - 30 },
      isCollapsed: false,
      zIndex: 0,
    })
    onClose()
  }, [activeGraphId, viewport, addNode, onClose])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) { placeNode(results[selected]) }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'Tab') { e.preventDefault(); onClose() }
  }

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40" onClick={onClose} />

      {/* Picker */}
      <div className="absolute z-50 left-1/2 top-24 -translate-x-1/2 w-[420px]
                      bg-cx-surface border border-cx-border rounded-2xl shadow-2xl overflow-hidden
                      flex flex-col"
           style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>

        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-cx-border">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search nodes…"
            className="flex-1 bg-transparent text-[13px] text-cx-text placeholder-cx-text-muted
                       outline-none caret-cx-accent"
          />
          <kbd className="px-1.5 py-0.5 bg-cx-elevated border border-cx-border rounded text-[10px]
                          text-cx-text-muted font-mono">Tab</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[320px] py-1">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-cx-text-muted">
              No nodes match "{query}"
            </div>
          ) : results.map((node, i) => {
            const cat = (node.category as string).toLowerCase()
            const color = node.color ?? CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
            return (
              <button key={node.id} onClick={() => placeNode(node)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === selected ? 'bg-cx-accent/10' : 'hover:bg-cx-elevated'
                )}>
                {/* Color dot */}
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color }} />

                {/* Name */}
                <span className="flex-1 text-[13px] text-cx-text truncate">
                  {node.displayName}
                </span>

                {/* Category badge */}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded
                                 bg-cx-elevated border border-cx-border text-cx-text-muted flex-shrink-0">
                  {CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-cx-border px-4 py-2 flex items-center gap-3 text-[10px] text-cx-text-muted">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> place node</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto">{allNodes.length.toLocaleString()} nodes available</span>
        </div>
      </div>
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" className="text-cx-text-muted flex-shrink-0">
      <circle cx="6" cy="6" r="4.5"/>
      <path d="M9.5 9.5 L13 13"/>
    </svg>
  )
}
