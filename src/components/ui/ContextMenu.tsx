import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* ── Types ───────────────────────────────────────────────── */
export type MenuItemDef =
  | { kind: 'item';      label: string; icon?: ReactNode; shortcut?: string; danger?: boolean; onClick: () => void }
  | { kind: 'separator' }

/* ── Hook ────────────────────────────────────────────────── */
interface MenuState { x: number; y: number; items: MenuItemDef[] }

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const open = useCallback((e: React.MouseEvent, items: MenuItemDef[]) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  return { menu, open, close }
}

/* ── Menu portal ─────────────────────────────────────────── */
interface Props {
  x: number
  y: number
  items: MenuItemDef[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Adjust position so menu never overflows viewport
  const [pos, setPos] = useState({ x, y })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      x: x + width  > window.innerWidth  ? x - width  : x,
      y: y + height > window.innerHeight ? y - height : y,
    })
  }, [x, y])

  // Close on outside click / Escape
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    // use capture so it fires before other handlers
    document.addEventListener('mousedown', down, true)
    document.addEventListener('keydown',   key,  true)
    return () => {
      document.removeEventListener('mousedown', down, true)
      document.removeEventListener('keydown',   key,  true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      style={{
        position:   'fixed',
        left:       pos.x,
        top:        pos.y,
        zIndex:     99999,
        minWidth:   180,
        background: 'rgba(10,10,24,0.96)',
        border:     '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        boxShadow:  '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        padding:    '4px',
        animation:  'ctx-in 0.12s cubic-bezier(0.16,1,0.3,1) forwards',
      }}
      // prevent the outside-click handler from immediately closing
      onMouseDown={e => e.stopPropagation()}
    >
      <style>{`
        @keyframes ctx-in {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return (
            <div key={i} style={{
              height: 1, margin: '3px 8px',
              background: 'rgba(255,255,255,0.06)',
            }} />
          )
        }
        return (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose() }}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         8,
              width:       '100%',
              padding:     '7px 10px',
              borderRadius: 8,
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              color:       item.danger ? 'rgba(239,68,68,0.9)' : 'rgba(234,234,248,0.85)',
              fontSize:    12,
              fontWeight:  500,
              textAlign:   'left',
              transition:  'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = item.danger
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(123,111,255,0.1)'
              e.currentTarget.style.color = item.danger
                ? 'rgba(239,68,68,1)'
                : 'rgba(234,234,248,1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = item.danger
                ? 'rgba(239,68,68,0.9)'
                : 'rgba(234,234,248,0.85)'
            }}
          >
            {item.icon && (
              <span style={{ opacity: 0.7, flexShrink: 0, display: 'flex' }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 10, opacity: 0.4, fontFamily: 'monospace', flexShrink: 0 }}>
                {item.shortcut}
              </span>
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
