export interface Vault {
  id: string
  name: string
  description: string | null
  path: string
  color: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
  lastOpenedAt: string | null
  settings: VaultSettings
  stats: VaultStats
}

export interface VaultSettings {
  defaultSoftware: string | null
  autoSave: boolean
  autoSaveIntervalSeconds: number
  aiEnabled: boolean
  aiProvider: AiProvider | null
  theme: string | null
}

export type AiProvider = 'openai' | 'anthropic' | 'ollama'

export interface VaultStats {
  nodeCount: number
  graphCount: number
  recipeCount: number
  blueprintCount: number
  assetCount: number
  relationshipCount: number
}

export interface CreateVaultInput {
  name: string
  description?: string
  path: string
  color?: string
  icon?: string
}

export interface UpdateVaultInput {
  id: string
  name?: string
  description?: string
  color?: string
  icon?: string
  settings?: Partial<VaultSettings>
}
