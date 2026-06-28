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
  chunkSize: number   // IPC batch size for seeding

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
