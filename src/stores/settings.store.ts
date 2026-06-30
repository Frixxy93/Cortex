import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  // Appearance
  accentColor: string
  nodeCardSize: 'compact' | 'normal' | 'large'

  // Canvas
  showMinimap: boolean
  showGrid: boolean
  snapToGrid: boolean
  showControls: boolean
  edgeStyle: 'bezier' | 'straight' | 'step'
  canvasBackground: 'dots' | 'lines' | 'cross' | 'none'

  // General
  autoSave: boolean
  rightPanelDefault: boolean
  confirmDeletes: boolean
  chunkSize: number

  // Nodes
  nodeSortOrder: 'name' | 'type' | 'recent'
  nodeShowDescriptions: boolean

  // Search
  searchScope: 'global' | 'vault' | 'graph'
  searchResultLimit: number
  searchFuzzy: boolean
  searchSaveHistory: boolean

  // Analytics
  analyticsEnabled: boolean
  analyticsRetention: 7 | 14 | 30 | 90

  // Media
  mediaFolder: string

  // Trash
  trashAutoEmpty: boolean
  trashRetentionDays: 7 | 14 | 30 | 90

  // App Mode
  // Profile
  profileName: string
  profileColor: string

  titleBarStyle: 'custom' | 'system' | 'minimal'
  cmdKey: 'auto' | 'meta' | 'ctrl'
  windowControlsPosition: 'left' | 'right'

  // Actions
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void
  reset: () => void
}

const DEFAULTS = {
  accentColor: '#7b6fff',
  nodeCardSize: 'normal' as const,
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  showControls: true,
  edgeStyle: 'bezier' as const,
  canvasBackground: 'dots' as const,
  autoSave: true,
  rightPanelDefault: true,
  confirmDeletes: true,
  chunkSize: 50,
  nodeSortOrder: 'name' as const,
  nodeShowDescriptions: true,
  searchScope: 'global' as const,
  searchResultLimit: 50,
  searchFuzzy: true,
  searchSaveHistory: true,
  analyticsEnabled: true,
  analyticsRetention: 30 as const,
  mediaFolder: '',
  trashAutoEmpty: false,
  trashRetentionDays: 30 as const,
  profileName: 'Artist',
  profileColor: '#7b6fff',

  titleBarStyle: 'custom' as const,
  cmdKey: 'auto' as const,
  windowControlsPosition: 'left' as const,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'cortex-settings' }
  )
)
