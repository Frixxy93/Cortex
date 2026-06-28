export * from './vault'
export * from './node'
export * from './parameter'
export * from './graph'
export * from './relationship'
export * from './blueprint'
export * from './asset'
export * from './search'
export type { AiMessage, AiRequest, AiResponse, AiChatSession } from './ai'

// ── UI State Types ────────────────────────────────────────

export type PanelId = 'library' | 'search' | 'analytics' | 'ai' | 'timeline'

export interface UiState {
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  activePanelId: PanelId
  selectedNodeIds: string[]
  activeGraphId: string | null
  activeVaultId: string | null
  commandPaletteOpen: boolean
  theme: 'dark' | 'light'
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}
