export interface SearchFilters {
  objectTypes?: string[]
  software?: string[]
  tags?: string[]
  categories?: string[]
  dateFrom?: string
  dateTo?: string
}

export interface SearchQuery {
  query: string
  vaultId: string
  filters?: SearchFilters
  limit?: number
  offset?: number
}

export interface Highlight {
  field: string
  fragments: string[]
}

export interface SearchHit {
  id: string
  objectType: string
  name: string
  description?: string
  score: number
  highlights: Highlight[]
  metadata: Record<string, unknown>
}

export interface SearchResult {
  total: number
  items: SearchHit[]
  tookMs: number
}
