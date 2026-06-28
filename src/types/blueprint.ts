import type { CortexGraph } from './graph'

export interface Blueprint {
  id: string
  vaultId: string
  name: string
  description?: string
  version: string
  tags: string[]
  software?: string
  graph: CortexGraph
  thumbnailId?: string
  mediaIds: string[]
  author?: string
  isPublished: boolean
  instanceCount: number
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
}

export interface BlueprintInstance {
  id: string
  blueprintId: string
  graphId: string
  vaultId: string
  name?: string
  overrides: Record<string, unknown>
  syncedAt?: string
  isDetached: boolean
  createdAt: string
}

export interface CreateBlueprintInput {
  vaultId: string
  name: string
  description?: string
  tags?: string[]
  software?: string
  graphId: string
}
