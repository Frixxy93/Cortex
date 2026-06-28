import { } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { CATEGORY_COLORS } from '@/utils/constants'

interface StatBlock {
  label: string
  value: number
  color: string
}

export function AnalyticsDashboard() {
  const activeVaultId = useVaultStore(s => s.activeVaultId)
  const { getVaultNodes } = useNodeStore()
  const { graphs, byVault } = useGraphStore()

  const nodes  = activeVaultId ? getVaultNodes(activeVaultId) : []
  const graphIds = activeVaultId ? (byVault[activeVaultId] ?? []) : []
  const graphList = graphIds.map(id => graphs[id]).filter(Boolean)

  const totalCanvasNodes = graphList.reduce((s, g) => s + g.nodes.length, 0)
  const totalEdges       = graphList.reduce((s, g) => s + g.edges.length, 0)

  const stats: StatBlock[] = [
    { label: 'Library Nodes', value: nodes.length,       color: '#7b6fff' },
    { label: 'Graphs',        value: graphList.length,   color: '#34d399' },
    { label: 'Canvas Nodes',  value: totalCanvasNodes,   color: '#f59e0b' },
    { label: 'Connections',   value: totalEdges,         color: '#60a5fa' },
  ]

  // Category breakdown
  const catCount: Record<string, number> = {}
  for (const n of nodes) catCount[n.category] = (catCount[n.category] ?? 0) + 1
  const catEntries = Object.entries(catCount).sort((a, b) => b[1] - a[1])
  const maxCat = catEntries[0]?.[1] ?? 1

  // Top tags
  const tagCount: Record<string, number> = {}
  for (const n of nodes) for (const t of n.tags) tagCount[t] = (tagCount[t] ?? 0) + 1
  const topTags = Object.entries(tagCount)
    .filter(([t]) => t !== 'houdini')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto h-full">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-cx-elevated border border-cx-border rounded-xl p-3">
            <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-cx-text-muted uppercase tracking-[0.08em] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {catEntries.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
            Node Categories
          </div>
          <div className="space-y-1.5">
            {catEntries.map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
              const pct = Math.round((count / maxCat) * 100)
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[10px] text-cx-text-muted w-14 uppercase flex-shrink-0">{cat}</span>
                  <div className="flex-1 h-1 bg-cx-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[10px] text-cx-text-muted w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top tags */}
      {topTags.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
            Top Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => (
              <span key={tag}
                className="px-2 py-0.5 bg-cx-elevated border border-cx-border rounded-full text-[10px] text-cx-text-muted">
                {tag} <span className="text-cx-accent">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Graph activity */}
      {graphList.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
            Graphs by Size
          </div>
          <div className="space-y-1">
            {[...graphList].sort((a, b) => b.nodes.length - a.nodes.length).slice(0, 6).map(g => (
              <div key={g.id} className="flex items-center gap-2">
                <span className="text-[11px] text-cx-text flex-1 truncate">{g.name}</span>
                <span className="text-[10px] text-cx-text-muted">{g.nodes.length}n · {g.edges.length}e</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
