import { cn } from '@/utils/cn'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  className?: string
  glow?: boolean
}

const SIZE_MAP = {
  sm: { icon: 22, fontSize: '12px', tracking: '0.18em', gap: 'gap-2',   fw: '800' },
  md: { icon: 30, fontSize: '15px', tracking: '0.20em', gap: 'gap-2.5', fw: '900' },
  lg: { icon: 42, fontSize: '21px', tracking: '0.22em', gap: 'gap-3',   fw: '900' },
  xl: { icon: 56, fontSize: '28px', tracking: '0.25em', gap: 'gap-4',   fw: '900' },
}

/* Single unified SVG mark — flat-filled hex with gradient + C letterform */
export function CortexLogo({ size = 'md', showWordmark = true, className, glow = false }: Props) {
  const s = SIZE_MAP[size]
  const dim = s.icon
  const id = `cxg-${size}`   // unique gradient id per size

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
        <svg viewBox="0 0 48 48" width={dim} height={dim} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={id} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#6d5cdb"/>
            </linearGradient>
          </defs>

          {/* Solid filled hex */}
          <path d="M24 3 L41 12.5 L41 31.5 L24 41 L7 31.5 L7 12.5 Z"
            fill={`url(#${id})`}
            strokeLinejoin="round"/>

          {/* Dark inset hex for depth */}
          <path d="M24 9 L36.5 16 L36.5 30 L24 37 L11.5 30 L11.5 16 Z"
            fill="rgba(0,0,0,0.22)"
            strokeLinejoin="round"/>

          {/* "C" arc letterform — bold white */}
          <path d="M30 18 A8 8 0 1 0 30 30"
            stroke="white"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"/>

          {/* Center dot */}
          <circle cx="24" cy="24" r="2" fill="white" opacity="0.7"/>
        </svg>

        {glow && (
          <div className="absolute inset-0 pointer-events-none"
               style={{ boxShadow: '0 0 20px 4px rgba(123,111,255,0.55)', borderRadius: '30%' }} />
        )}
      </div>

      {showWordmark && (
        <span
          className="select-none tracking-widest text-cx-text"
          style={{
            fontSize: s.fontSize,
            letterSpacing: s.tracking,
            fontWeight: s.fw,
            textShadow: glow ? '0 0 28px rgba(123,111,255,0.5)' : undefined,
          }}>
          CORTEX
        </span>
      )}
    </div>
  )
}
