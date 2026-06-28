import { create } from 'zustand'
import { SearchService } from '@/services/search.service'
import type { SearchResult, SearchFilters } from '@/types'

interface SearchStore {
  query: string
  filters: SearchFilters
  results: SearchResult | null
  isSearching: boolean
  error: string | null

  setQuery: (q: string) => void
  setFilters: (f: Partial<SearchFilters>) => void
  search: (vaultId: string) => Promise<void>
  clearResults: () => void
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  filters: {},
  results: null,
  isSearching: false,
  error: null,

  setQuery: (q) => set({ query: q }),
  setFilters: (f) => set(s => ({ filters: { ...s.filters, ...f } })),
  clearResults: () => set({ results: null, query: '' }),

  search: async (vaultId) => {
    const { query, filters } = get()
    if (!query.trim()) {
      set({ results: null })
      return
    }

    set({ isSearching: true, error: null })
    try {
      const results = await SearchService.search({ query, vaultId, filters })
      set({ results, isSearching: false })
    } catch (e) {
      set({ isSearching: false, error: String(e) })
    }
  },
}))
