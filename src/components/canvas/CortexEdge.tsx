import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'

export const CortexEdge = memo(function CortexEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label, selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const gradientId = `edge-grad-${id}`

  return (
    <>
      {/* SVG defs for gradient stroke */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={selected ? '#60a5fa' : '#2a2a50'} stopOpacity={selected ? 0.9 : 0.7} />
          <stop offset="100%" stopColor={selected ? '#a78bfa' : '#1a1a3a'} stopOpacity={selected ? 0.9 : 0.5} />
        </linearGradient>
      </defs>

      {/* Glow layer (selected only) */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(123,111,255,0.25)"
          strokeWidth={6}
          strokeLinecap="round"
          style={{ filter: 'blur(3px)' }}
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth: selected ? 2 : 1.5,
          strokeLinecap: 'round',
          transition: 'stroke-width 0.15s',
        }}
      />

      {/* Label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(7,7,18,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(234,234,248,0.5)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {label as string}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
