import { call } from '@/utils/tauri'
import type { SearchQuery, SearchResult } from '@/types'

export const SearchService = {
  search: (query: SearchQuery) => call<SearchResult>('search', { query }),
}
