import { useState, useEffect, useRef, useCallback } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { CATEGORY_COLORS } from '@/utils/constants'
import { nanoid } from 'nanoid'
import type { CortexNode } from '@/types'

interface Props { onClose: () => void }

const CATEGORY_LABELS: Record<string, string> = {
  sop: 'SOP', dop: 'DOP', vop: 'VOP', chop: 'CHOP', lop: 'LOP',
  rop: 'ROP', top: 'TOP', cop: 'COP', object: 'OBJ', color: 'Color',
  filter: 'Filter', geometry: 'Geo', shader: 'Shader', utility: 'Util',
  math: 'Math', logic: 'Logic', custom: 'Custom', other: 'Other',
}

export function NodePicker({ onClose }: Props) {
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40" onClick={onClose} />

      {/* Picker */}
      <div
        className="absolute z-50 left-1/2 top-20 -translate-x-1/2 w-[440px] flex flex-col overflow-hidden"
        style={{
          background: 'rgba(7,7,18,0.96)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: 'palette-in 0.18s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search nodes to place…"
            className="flex-1 bg-transparent text-[13px] text-cx-text placeholder-cx-text-muted
                       outline-none caret-cx-accent"
          />
          <Kbd>Tab</Kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 340 }}>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div style={{ color: 'rgba(234,234,248,0.2)', fontSize: 12 }}>
                No nodes match
              </div>
              <div
                className="px-3 py-1 rounded-full text-[11px]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(234,234,248,0.4)',
                }}
              >
                &ldquo;{query}&rdquo;
              </div>
            </div>
          ) : (
            <div className="py-1.5">
              {results.map((node, i) => {
                const cat   = (node.category as string).toLowerCase()
                const color = node.color ?? CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
                const isSelected = i === selected

                return (
                  <button
                    key={node.id}
                    onClick={() => placeNode(node)}
                    className="relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-100"
                    style={{
                      background: isSelected ? color + '12' : 'transparent',
                    }}
                    onMouseEnter={() => setSelected(i)}
                  >
                    {/* Left color bar */}
                    <span
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
                      style={{
                        background: isSelected ? color : 'transparent',
                        boxShadow:  isSelected ? '0 0 6px ' + color : 'none',
                        transition: 'background 0.1s, box-shadow 0.1s',
                      }}
                    />

                    {/* Color swatch */}
                    <span
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: color + '18',
                        border: '1px solid ' + color + (isSelected ? '40' : '20'),
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: color, boxShadow: isSelected ? '0 0 6px ' + color + 'aa' : 'none' }}
                      />
                    </span>

                    {/* Name */}
                    <span
                      className="flex-1 text-[13px] truncate font-medium transition-colors"
                      style={{ color: isSelected ? 'rgba(234,234,248,0.95)' : 'rgba(234,234,248,0.7)' }}
                    >
                      {node.displayName}
                    </span>

                    {/* Category badge */}
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0"
                      style={{
                        background: isSelected ? color + '1a' : 'rgba(255,255,255,0.04)',
                        color:      isSelected ? color        : 'rgba(234,234,248,0.25)',
                        border:     '1px solid ' + (isSelected ? color + '30' : 'rgba(255,255,255,0.06)'),
                      }}
                    >
                      {CATEGORY_LABELS[cat] ?? cat.toUpperCase()}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="place" />
          <FooterHint keys={['Esc']} label="close" />
          <span className="ml-auto text-[10px]" style={{ color: 'rgba(234,234,248,0.2)' }}>
            {allNodes.length.toLocaleString()} nodes
          </span>
        </div>
      </div>
    </>
  )
}

/* ── Sub-components ───────────────────────────────────────── */

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map(k => <Kbd key={k}>{k}</Kbd>)}
      <span className="text-[10px] ml-0.5" style={{ color: 'rgba(234,234,248,0.25)' }}>{label}</span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono leading-none"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '2px solid rgba(255,255,255,0.08)',
        color: 'rgba(234,234,248,0.4)',
      }}
    >
      {children}
    </kbd>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0"
         style={{ color: 'rgba(234,234,248,0.2)' }}>
      <circle cx="6.5" cy="6.5" r="4.5"/>
      <path d="M10.5 10.5 L14 14"/>
    </svg>
  )
}
