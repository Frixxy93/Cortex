import { ReactNode } from 'react'

interface Props {
  icon:      ReactNode
  title:     string
  body?:     string
  action?:   { label: string; onClick: () => void; disabled?: boolean }
  secondary?: { label: string; onClick: () => void }
  size?:     'sm' | 'md'
}

export function EmptyState({ icon, title, body, action, secondary, size = 'md' }: Props) {
  const isSm = size === 'sm'

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full"
         style={{ padding: isSm ? '24px 16px' : '40px 24px', minHeight: isSm ? 120 : 200 }}>

      {/* Icon container */}
      <div
        className="flex items-center justify-center rounded-2xl mb-3 flex-shrink-0"
        style={{
          width:      isSm ? 40 : 52,
          height:     isSm ? 40 : 52,
          background: 'rgba(123,111,255,0.08)',
          border:     '1px solid rgba(123,111,255,0.15)',
          boxShadow:  '0 0 20px rgba(123,111,255,0.06)',
          color:      'rgba(123,111,255,0.7)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div
        className="font-semibold mb-1.5"
        style={{ fontSize: isSm ? 12 : 13, color: 'rgba(234,234,248,0.7)' }}
      >
        {title}
      </div>

      {body && (
        <div
          className="leading-relaxed mb-4"
          style={{
            fontSize: isSm ? 10 : 11,
            color:    'rgba(234,234,248,0.35)',
            maxWidth: 200,
          }}
        >
          {body}
        </div>
      )}

      {/* Actions */}
      {action && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold
                       transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40
                       disabled:cursor-not-allowed"
            style={{
              fontSize:   isSm ? 11 : 12,
              background: 'linear-gradient(135deg, #7b6fff, #5a53cc)',
              boxShadow:  '0 2px 16px rgba(123,111,255,0.3)',
            }}
          >
            {action.label}
          </button>

          {secondary && (
            <button
              onClick={secondary.onClick}
              className="text-[10px] transition-colors"
              style={{ color: 'rgba(234,234,248,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.3)')}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Preset icons ──────────────────────────────────────── */
export const EmptyIcons = {
  Graph: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="3"/>
      <circle cx="3.5" cy="5"  r="2"/>
      <circle cx="18.5" cy="5"  r="2"/>
      <circle cx="3.5" cy="17" r="2"/>
      <circle cx="18.5" cy="17" r="2"/>
      <line x1="5.2"  y1="6.2"  x2="8.5"  y2="9.2"/>
      <line x1="16.8" y1="6.2"  x2="13.5" y2="9.2"/>
      <line x1="5.2"  y1="15.8" x2="8.5"  y2="12.8"/>
      <line x1="16.8" y1="15.8" x2="13.5" y2="12.8"/>
    </svg>
  ),
  Nodes: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1"  y="8"  width="6" height="6" rx="1.5"/>
      <rect x="15" y="3"  width="6" height="5" rx="1.5"/>
      <rect x="15" y="14" width="6" height="5" rx="1.5"/>
      <line x1="7" y1="11" x2="15" y2="5.5"/>
      <line x1="7" y1="11" x2="15" y2="16.5"/>
    </svg>
  ),
  Search: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9.5" cy="9.5" r="6.5"/>
      <line x1="14.5" y1="14.5" x2="20" y2="20"/>
      <line x1="7" y1="9.5" x2="12" y2="9.5" strokeOpacity="0.5"/>
      <line x1="9.5" y1="7" x2="9.5" y2="12" strokeOpacity="0.5"/>
    </svg>
  ),
  Filter: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h18l-7 8v6l-4-2V12L2 4z"/>
    </svg>
  ),
  Bridge: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 11h3M17 11h3"/>
      <circle cx="7.5" cy="11" r="2.5"/>
      <circle cx="14.5" cy="11" r="2.5"/>
      <line x1="10" y1="11" x2="12" y2="11"/>
      <path d="M7.5 8.5V5M14.5 8.5V5M7.5 13.5V17M14.5 13.5V17"/>
    </svg>
  ),
}
