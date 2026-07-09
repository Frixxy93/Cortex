import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Profile {
  id: string
  name: string
  color: string
}

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

  // Shortcuts (id -> key combo override)
  customShortcuts: Record<string, string>

  // Bridge
  bridgeAutoDetect: boolean
  bridgePreviewImport: boolean

  // Trash
  trashAutoEmpty: boolean
  trashRetentionDays: 7 | 14 | 30 | 90

  // Profiles
  profiles: Profile[]
  activeProfileId: string
  hasCompletedProfileSetup: boolean
  // Legacy single-profile fields (derived from active profile, kept for compat)
  profileName: string
  profileColor: string

  titleBarStyle: 'custom' | 'system' | 'minimal'
  cmdKey: 'auto' | 'meta' | 'ctrl'
  windowControlsPosition: 'left' | 'right'

  // Actions
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset' | 'addProfile' | 'removeProfile' | 'updateProfile' | 'switchProfile'>>) => void
  reset: () => void
  addProfile: (name: string, color: string) => void
  removeProfile: (id: string) => void
  updateProfile: (id: string, patch: Partial<Pick<Profile, 'name' | 'color'>>) => void
  switchProfile: (id: string) => void
}

const DEFAULT_PROFILE: Profile = { id: 'default', name: 'Artist', color: '#7b6fff' }

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
  customShortcuts: {} as Record<string, string>,
  bridgeAutoDetect: true,
  bridgePreviewImport: true,
  trashAutoEmpty: false,
  trashRetentionDays: 30 as const,
  profiles: [DEFAULT_PROFILE] as Profile[],
  activeProfileId: 'default',
  hasCompletedProfileSetup: false,
  profileName: 'Artist',
  profileColor: '#7b6fff',
  titleBarStyle: 'custom' as const,
  cmdKey: 'auto' as const,
  windowControlsPosition: 'left' as const,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),

      addProfile: (name, color) => {
        const id = `profile_${Date.now()}`
        const newProfile: Profile = { id, name, color }
        const profiles = [...get().profiles, newProfile]
        set({ profiles, activeProfileId: id, profileName: name, profileColor: color, hasCompletedProfileSetup: true })
      },

      removeProfile: (id) => {
        const profiles = get().profiles.filter(p => p.id !== id)
        if (profiles.length === 0) return // always keep at least one
        let activeProfileId = get().activeProfileId
        if (activeProfileId === id) {
          activeProfileId = profiles[0].id
        }
        const active = profiles.find(p => p.id === activeProfileId)!
        set({ profiles, activeProfileId, profileName: active.name, profileColor: active.color })
      },

      updateProfile: (id, patch) => {
        const profiles = get().profiles.map(p => p.id === id ? { ...p, ...patch } : p)
        const updates: Partial<SettingsState> = { profiles }
        if (get().activeProfileId === id) {
          if (patch.name !== undefined) updates.profileName = patch.name
          if (patch.color !== undefined) updates.profileColor = patch.color
        }
        set(updates)
      },

      switchProfile: (id) => {
        const profile = get().profiles.find(p => p.id === id)
        if (!profile) return
        set({ activeProfileId: id, profileName: profile.name, profileColor: profile.color })
      },
    }),
    { name: 'cortex-settings' }
  )
)
