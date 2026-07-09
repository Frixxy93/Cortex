import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { PORT_COLORS, inferPortType } from '@/utils/portTypes'

export const CortexEdge = memo(function CortexEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  sourceHandleId,
  label, selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  // Derive edge color from source port type
  const portType = inferPortType(sourceHandleId ?? '')
  const typeColor = PORT_COLORS[portType]

  const baseColor   = selected ? typeColor : `${typeColor}55`
  const glowColor   = selected ? `${typeColor}44` : 'transparent'
  const strokeWidth = selected ? 2 : 1.5
  const gradientId  = `edge-grad-${id}`

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={baseColor} stopOpacity={selected ? 0.95 : 0.6} />
          <stop offset="100%" stopColor={selected ? `${typeColor}bb` : `${typeColor}22`} stopOpacity={selected ? 0.9 : 0.4} />
        </linearGradient>
      </defs>

      {/* Glow */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={7}
          strokeLinecap="round"
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* Main line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeLinecap: 'round',
          transition: 'stroke-width 0.15s',
        }}
      />

      {/* Label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          >
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(7,7,18,0.9)',
                border: `1px solid ${typeColor}33`,
                color: `${typeColor}cc`,
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
