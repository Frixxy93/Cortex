import { CSSProperties } from 'react'

/* ── Base shimmer block ───────────────────────────────────── */
interface SkeletonProps {
  width?:   string | number
  height?:  string | number
  radius?:  number
  className?: string
  style?:   CSSProperties
}

export function Skeleton({ width = '100%', height = 12, radius = 6, className, style }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        background:   'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 80%)',
        backgroundSize: '200% 100%',
        animation:    'skeleton-shimmer 1.6s ease-in-out infinite',
        flexShrink:   0,
        ...style,
      }}
    />
  )
}

/* ── Preset skeletons ─────────────────────────────────────── */

/** Sidebar node row: icon block + two text lines */
export function NodeRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <Skeleton width={28} height={28} radius={8} />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton height={10} width="55%" />
        <Skeleton height={8}  width="35%" />
      </div>
    </div>
  )
}

/** Sidebar graph row: icon + one text line + small badge */
export function GraphRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Skeleton width={24} height={24} radius={6} />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton height={10} width="60%" />
      </div>
      <Skeleton width={28} height={8} radius={4} />
    </div>
  )
}

/** Home vault card */
export function VaultCardSkeleton() {
  return (
    <div
      className="flex flex-col p-4 rounded-2xl"
      style={{ background: 'rgba(13,13,24,0.5)', border: '1px solid rgba(24,24,58,0.6)' }}
    >
      <Skeleton width={40} height={40} radius={12} style={{ marginBottom: 12 }} />
      <Skeleton height={11} width="70%" style={{ marginBottom: 6 }} />
      <Skeleton height={9}  width="45%" style={{ marginBottom: 16 }} />
      <div style={{ borderTop: '1px solid rgba(24,24,58,0.8)', paddingTop: 12 }}>
        <Skeleton height={9} width="30%" />
      </div>
    </div>
  )
}

/* ── Keyframe injected once ───────────────────────────────── */
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes skeleton-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
    `}</style>
  )
}
