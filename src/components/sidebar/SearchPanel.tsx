import { useRef } from 'react'
import { useSearchStore } from '@/stores/search.store'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { NODE_OBJECT_TYPE_ICONS } from '@/utils/constants'
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants'

export function SearchPanel() {
  const { query, results, isSearching, setQuery, search, clearResults } = useSearchStore()
  const { activeVaultId } = useVaultStore()
  const { selectNode } = useNodeStore()
  const { toggleNav } = useUiStore()

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { clearResults(); return }
    debounceRef.current = setTimeout(() => {
      if (activeVaultId) search(activeVaultId)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 border-b border-cx-border">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cx-text-muted text-xs">⌕</span>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search nodes, recipes, blueprints…"
            className="w-full bg-cx-elevated border border-cx-border rounded-lg pl-7 pr-3 py-2
                       text-xs text-cx-text placeholder:text-cx-text-muted
                       focus:outline-none focus:border-cx-accent transition-colors"
            autoFocus
          />
          {isSearching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-cx-accent animate-pulse">
              ⟳
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results ? (
          <>
            <div className="px-3 py-2 text-[10px] text-cx-text-muted border-b border-cx-border">
              {results.total} results · {results.tookMs}ms
            </div>
            {results.items.length === 0 ? (
              <div className="p-4 text-center text-xs text-cx-text-muted">
                No results for "{query}"
              </div>
            ) : (
              <ul className="divide-y divide-cx-border/30">
                {results.items.map(hit => (
                  <li
                    key={hit.id}
                    onClick={() => { selectNode(hit.id); toggleNav('nodes' as any) }}
                    className="group/item flex items-start gap-2.5 px-3 py-2.5 hover:bg-cx-elevated cursor-pointer transition-colors"
                  >
                    <span className="text-sm mt-0.5 opacity-60">
                      {NODE_OBJECT_TYPE_ICONS[hit.objectType] ?? '⬡'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-cx-text font-medium truncate">
                        {hit.name}
                      </div>
                      {hit.description && (
                        <div className="text-[11px] text-cx-text-muted truncate mt-0.5">
                          {hit.description}
                        </div>
                      )}
                      <div className="text-[10px] text-cx-text-muted mt-0.5 uppercase tracking-wide">
                        {hit.objectType.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-cx-text-muted">{(hit.score * 100).toFixed(0)}%</span>
                      <span className="text-[9px] text-cx-accent opacity-0 group-hover/item:opacity-100 transition-opacity">→</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs text-cx-text-muted">
              Search across nodes, parameters, documentation, and notes.
            </p>
            <p className="text-[11px] text-cx-text-muted mt-2 opacity-60">
              Under 50ms · Powered by SQLite FTS5
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
