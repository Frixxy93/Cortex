import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

const STAGES = [
  'Initialising database…',
  'Loading node library…',
  'Preparing workspace…',
]

export function SplashScreen({ onDone }: Props) {
  const [stage,   setStage]   = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Cycle through stages
    const t1 = setTimeout(() => setStage(1), 600)
    const t2 = setTimeout(() => setStage(2), 1200)
    // Start fade-out at 1800ms, call onDone after fade completes
    const t3 = setTimeout(() => setExiting(true), 1800)
    const t4 = setTimeout(() => onDone(), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onDone])

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          9999,
        background:      '#05050c',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             0,
        opacity:         exiting ? 0 : 1,
        transition:      'opacity 0.5s ease',
        userSelect:      'none',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(123,111,255,0.08) 0%, transparent 70%)',
      }} />

      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(123,111,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(123,111,255,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Logo mark */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {/* Outer ring pulse */}
        <div style={{
          position: 'absolute', inset: -16,
          borderRadius: '50%',
          border: '1px solid rgba(123,111,255,0.15)',
          animation: 'cortex-pulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: -28,
          borderRadius: '50%',
          border: '1px solid rgba(123,111,255,0.07)',
          animation: 'cortex-pulse 2s ease-in-out infinite 0.3s',
        }} />

        {/* Hexagon logo */}
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <path
            d="M36 4 L64 20 L64 52 L36 68 L8 52 L8 20 Z"
            stroke="rgba(123,111,255,0.6)"
            strokeWidth="1.5"
            fill="rgba(123,111,255,0.06)"
          />
          <path
            d="M36 16 L54 26 L54 46 L36 56 L18 46 L18 26 Z"
            stroke="rgba(123,111,255,0.3)"
            strokeWidth="1"
            fill="rgba(123,111,255,0.04)"
          />
          {/* C letterform */}
          <path
            d="M42 27 Q36 23 30 27 Q24 31 24 36 Q24 41 30 45 Q36 49 42 45"
            stroke="#7b6fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Node dots */}
          <circle cx="36" cy="20" r="2" fill="rgba(123,111,255,0.5)" />
          <circle cx="52" cy="29" r="2" fill="rgba(123,111,255,0.5)" />
          <circle cx="52" cy="43" r="2" fill="rgba(123,111,255,0.5)" />
          <circle cx="36" cy="52" r="2" fill="rgba(123,111,255,0.5)" />
          <circle cx="20" cy="43" r="2" fill="rgba(123,111,255,0.5)" />
          <circle cx="20" cy="29" r="2" fill="rgba(123,111,255,0.5)" />
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{
        fontFamily:    '"Inter", system-ui, sans-serif',
        fontSize:      28,
        fontWeight:    700,
        letterSpacing: '0.25em',
        color:         '#e2e2f0',
        marginBottom:  6,
      }}>
        CORTEX
      </div>

      <div style={{
        fontSize:      11,
        letterSpacing: '0.15em',
        color:         'rgba(136,136,184,0.6)',
        marginBottom:  48,
        textTransform: 'uppercase',
      }}>
        Node Intelligence
      </div>

      {/* Progress bar */}
      <div style={{
        width:        200,
        height:       1,
        background:   'rgba(255,255,255,0.06)',
        borderRadius: 1,
        overflow:     'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          height:     '100%',
          background: 'linear-gradient(90deg, #7b6fff, #a78bfa)',
          borderRadius: 1,
          width:      `${((stage + 1) / STAGES.length) * 100}%`,
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow:  '0 0 8px rgba(123,111,255,0.8)',
        }} />
      </div>

      {/* Stage text */}
      <div style={{
        fontSize:      11,
        color:         'rgba(136,136,184,0.5)',
        letterSpacing: '0.05em',
        height:        16,
        transition:    'opacity 0.3s ease',
      }}>
        {STAGES[stage]}
      </div>

      {/* Version */}
      <div style={{
        position:      'absolute',
        bottom:        24,
        fontSize:      10,
        color:         'rgba(136,136,184,0.25)',
        letterSpacing: '0.08em',
      }}>
        v0.3.1
      </div>

      <style>{`
        @keyframes cortex-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
