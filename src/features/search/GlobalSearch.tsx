import { useEffect, useRef } from 'react'
import { useSearchStore } from '@/stores/search.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { useDebounce } from '@/hooks/useDebounce'

export function GlobalSearch() {
  const { query, setQuery, results, isSearching, search, clearResults } = useSearchStore()
  const { activeVaultId } = useVaultStore()
  const { setActiveGraph } = useGraphStore()
  const { selectNode } = useNodeStore()
  const { setActiveNav } = useUiStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQ = useDebounce(query, 250)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (activeVaultId && debouncedQ.trim()) search(activeVaultId)
    else if (!debouncedQ.trim()) clearResults()
  }, [debouncedQ, activeVaultId])

  const handleNodeResult = (nodeId: string) => {
    selectNode(nodeId)
    setActiveNav('nodes')
  }

  const handleGraphResult = (graphId: string) => {
    setActiveGraph(graphId)
    setActiveNav('graph')
  }

  const allItems = results?.items ?? []
  const allNodes = allItems.filter((i: any) => i.objectType === 'node')
  const allGraphs = allItems.filter((i: any) => i.objectType === 'graph')
  const total = allItems.length

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-cx-border">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search nodes, graphs, tags…"
          className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                     text-[12px] text-cx-text placeholder-cx-text-muted
                     focus:outline-none focus:border-cx-accent/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="p-4 text-center text-[11px] text-cx-text-muted animate-pulse">Searching…</div>
        ) : !query.trim() ? (
          <div className="p-4 text-center text-[11px] text-cx-text-muted opacity-60">
            Type to search across nodes and graphs
          </div>
        ) : total === 0 ? (
          <div className="p-4 text-center text-[11px] text-cx-text-muted">No results for "{query}"</div>
        ) : (
          <>
            {allNodes.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] bg-cx-bg sticky top-0">
                  Nodes · {allNodes.length}
                </div>
                {allNodes.slice(0, 20).map((n: any) => (
                  <button key={n.id} onClick={() => handleNodeResult(n.id)}
                    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-cx-elevated text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-cx-text truncate">{n.displayName}</div>
                      <div className="text-[10px] text-cx-text-muted">{n.category} · {n.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {allGraphs.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] bg-cx-bg sticky top-0">
                  Graphs · {allGraphs.length}
                </div>
                {allGraphs.map((g: any) => (
                  <button key={g.id} onClick={() => handleGraphResult(g.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cx-elevated text-left transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-cx-text truncate">{g.name}</div>
                      <div className="text-[10px] text-cx-text-muted">{g.nodes?.length ?? 0} nodes</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
