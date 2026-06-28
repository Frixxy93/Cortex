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

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#6c63ff' : '#2a2a4a',
          strokeWidth: selected ? 2 : 1.5,
          filter: selected ? 'drop-shadow(0 0 6px rgba(108,99,255,0.6))' : undefined,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span className="text-[10px] bg-cx-elevated border border-cx-border text-cx-text-dim px-1.5 py-0.5 rounded">
              {label as string}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
