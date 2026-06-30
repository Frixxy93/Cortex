import { useState } from 'react'
import { useUiStore } from '@/stores/ui.store'
import type { Toast } from '@/types'

/* ── Variant config ──────────────────────────────────────── */
const V = {
  success: { color: '#22c55e', glow: 'rgba(34,197,94,0.10)'   },
  error:   { color: '#ef4444', glow: 'rgba(239,68,68,0.10)'   },
  warning: { color: '#f59e0b', glow: 'rgba(245,158,11,0.10)'  },
  info:    { color: '#7b6fff', glow: 'rgba(123,111,255,0.10)' },
  default: { color: 'rgba(255,255,255,0.18)', glow: 'transparent' },
} as const

/* ── Icons ───────────────────────────────────────────────── */
function SuccessIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6.5" strokeOpacity="0.4"/>
      <path d="M4.5 7.5l2 2 4-4"/>
    </svg>
  )
}
function ErrorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="6.5" strokeOpacity="0.4"/>
      <line x1="5" y1="5" x2="10" y2="10"/>
      <line x1="10" y1="5" x2="5" y2="10"/>
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5z" strokeOpacity="0.4"/>
      <line x1="7.5" y1="6" x2="7.5" y2="9"/>
      <circle cx="7.5" cy="11" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="6.5" strokeOpacity="0.4"/>
      <line x1="7.5" y1="7" x2="7.5" y2="11"/>
      <circle cx="7.5" cy="4.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function DefaultIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="2" strokeOpacity="0.6"/>
      <circle cx="7.5" cy="7.5" r="5.5" strokeOpacity="0.2"/>
    </svg>
  )
}

/* ── Single toast ────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const cfg = V[toast.variant as keyof typeof V] ?? V.default

  const dismiss = () => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 230)
  }

  const icon = {
    success: <SuccessIcon />,
    error:   <ErrorIcon />,
    warning: <WarnIcon />,
    info:    <InfoIcon />,
    default: <DefaultIcon />,
  }[toast.variant] ?? <DefaultIcon />

  return (
    <div
      style={{
        animation: exiting
          ? 'toast-out 0.23s cubic-bezier(0.4,0,1,1) forwards'
          : 'toast-in  0.28s cubic-bezier(0.16,1,0.3,1) forwards',
        background:     'rgba(8,8,20,0.88)',
        backdropFilter: 'blur(24px)',
        border:         '1px solid rgba(255,255,255,0.06)',
        borderLeft:     `3px solid ${cfg.color}`,
        borderRadius:   14,
        boxShadow:      '0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding:        '11px 14px 11px 13px',
        minWidth:       270,
        maxWidth:       360,
        display:        'flex',
        alignItems:     'flex-start',
        gap:            10,
        position:       'relative' as const,
        overflow:       'hidden',
      }}
    >
      {/* radial glow matching variant */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 14,
        background: `radial-gradient(ellipse 60% 60% at 0% 50%, ${cfg.glow}, transparent)`,
      }} />

      {/* icon */}
      <div style={{ color: cfg.color, marginTop: 1, flexShrink: 0, position: 'relative' }}>
        {icon}
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'rgba(234,234,248,0.95)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {toast.title}
        </div>
        {toast.description && (
          <div style={{
            fontSize: 11,
            color: 'rgba(234,234,248,0.45)',
            marginTop: 3, lineHeight: 1.5,
          }}>
            {toast.description}
          </div>
        )}
      </div>

      {/* dismiss button */}
      <button
        onClick={dismiss}
        style={{
          flexShrink: 0, marginTop: 2, padding: 3, borderRadius: 5,
          color: 'rgba(234,234,248,0.25)',
          transition: 'color 0.15s',
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.25)')}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="1.5" y1="1.5" x2="7.5" y2="7.5"/>
          <line x1="7.5" y1="1.5" x2="1.5" y2="7.5"/>
        </svg>
      </button>
    </div>
  )
}

/* ── Container ───────────────────────────────────────────── */
export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()
  const visible = toasts.slice(-4)
  if (visible.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {visible.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  )
}
