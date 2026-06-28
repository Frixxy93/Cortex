import { useGraphStore } from "@/stores/graph.store"
import { cn } from '@/utils/cn'

export function CanvasToolbar() {
  const { activeGraph, isDirty, saveGraph } = useGraphStore()
  const graph = activeGraph()

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1
                    bg-cx-elevated/90 backdrop-blur border border-cx-border rounded-lg px-2 py-1.5
                    shadow-lg">
      {/* Graph name */}
      <span className="text-xs text-cx-text-dim px-2 border-r border-cx-border">
        {graph?.name ?? 'Untitled'}
      </span>

      {/* Save indicator */}
      <button
        onClick={() => saveGraph()}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
          isDirty
            ? 'text-cx-warning hover:bg-cx-warning/10'
            : 'text-cx-text-muted hover:bg-cx-border/30',
        )}
        title={isDirty ? 'Unsaved changes – click to save' : 'Saved'}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', isDirty ? 'bg-cx-warning' : 'bg-cx-success')} />
        {isDirty ? 'Unsaved' : 'Saved'}
      </button>

      <div className="w-px h-4 bg-cx-border mx-1" />

      {/* Node count */}
      <span className="text-xs text-cx-text-muted px-1">
        {graph?.nodes.length ?? 0} nodes
      </span>
      <span className="text-xs text-cx-text-muted px-1">
        {graph?.edges.length ?? 0} edges
      </span>
    </div>
  )
}
