import { useState } from 'react'
import { useGraphStore } from '@/stores/graph.store'

export function CanvasToolbar() {
  const { activeGraph, isDirty, saveGraph } = useGraphStore()
  const graph = activeGraph()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await saveGraph()
    setTimeout(() => setSaving(false), 600)
  }

  if (!graph) return null

  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0"
      style={{
        background: 'rgba(7,7,18,0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '0 2px',
        height: 34,
      }}
    >
      {/* Graph name */}
      <div
        className="flex items-center gap-2 px-3.5"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <GraphDotIcon />
        <span
          className="text-[12px] font-semibold truncate max-w-[140px]"
          style={{ color: 'rgba(234,234,248,0.85)' }}
        >
          {graph.name}
        </span>
      </div>

      {/* Save state */}
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 h-full transition-all duration-150 group"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        title={isDirty ? 'Unsaved changes — click to save (⌘S)' : 'All changes saved'}
      >
        {/* Animated status dot */}
        <span
          className="flex-shrink-0 relative"
          style={{ width: 6, height: 6 }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: isDirty ? '#f59e0b' : '#34d399',
              boxShadow: isDirty
                ? '0 0 6px rgba(245,158,11,0.8)'
                : '0 0 6px rgba(52,211,153,0.7)',
              animation: isDirty ? 'save-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          />
        </span>
        <span
          className="text-[11px] font-medium transition-colors duration-150"
          style={{
            color: isDirty
              ? 'rgba(245,158,11,0.85)'
              : saving
              ? 'rgba(52,211,153,0.7)'
              : 'rgba(234,234,248,0.3)',
          }}
        >
          {saving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved'}
        </span>
      </button>

      {/* Stats */}
      <div className="flex items-center gap-1.5 px-3">
        {/* Node count chip */}
        <StatChip value={nodeCount} label="nodes" color="#60a5fa" />
        <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: 10 }}>·</span>
        {/* Edge count chip */}
        <StatChip value={edgeCount} label="edges" color="#a78bfa" />
      </div>
    </div>
  )
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}20`,
      }}
    >
      <span className="text-[11px] font-semibold leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px] leading-none" style={{ color: `${color}80` }}>
        {label}
      </span>
    </div>
  )
}

function GraphDotIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="2" fill="rgba(96,165,250,0.7)" />
      <circle cx="6" cy="6" r="4.5" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    </svg>
  )
}
