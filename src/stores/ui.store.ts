import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { PanelId, Toast, ToastVariant } from '@/types'

type NavId = 'home' | 'graph' | 'nodes' | 'search' | 'analytics' | 'import' | 'ai' | 'recipes' | 'templates' | 'media' | 'bookmarks' | 'trash'

interface UiStore {
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  activePanelId: PanelId
  activeNavId: NavId | null   // which nav item is open in the content panel
  commandPaletteOpen: boolean
  toasts: Toast[]

  // Actions
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setActivePanel: (id: PanelId) => void
  setActiveNav: (id: NavId | null) => void
  toggleNav: (id: NavId) => void          // opens if closed, closes if already open
  openCommandPalette: () => void
  closeCommandPalette: () => void

  activeTagFilter: string | null
  setTagFilter: (tag: string | null) => void

  bookmarks: string[]  // node IDs
  toggleBookmark: (nodeId: string) => void
  isBookmarked: (nodeId: string) => boolean

  addToast: (title: string, opts?: { description?: string; variant?: ToastVariant; duration?: number }) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiStore>((set, get) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: false,
  activePanelId: 'library',
  activeNavId: null,
  commandPaletteOpen: false,
  toasts: [],
  activeTagFilter: null,
  bookmarks: [],

  toggleLeftPanel: () => set(s => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setActivePanel: (id) => set({ activePanelId: id }),
  setActiveNav: (id) => set({ activeNavId: id }),
  toggleNav: (id) => set(s => ({ activeNavId: s.activeNavId === id ? null : id })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  addToast: (title, opts = {}) => {
    const toast: Toast = {
      id: nanoid(),
      title,
      description: opts.description,
      variant: opts.variant ?? 'default',
      duration: opts.duration ?? 4000,
    }
    set(s => ({ toasts: [...s.toasts, toast] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== toast.id) }))
    }, toast.duration)
  },

  setTagFilter: (tag) => set(s => ({ activeTagFilter: s.activeTagFilter === tag ? null : tag })),
  toggleBookmark: (nodeId) => set(s => ({
    bookmarks: s.bookmarks.includes(nodeId)
      ? s.bookmarks.filter(id => id !== nodeId)
      : [...s.bookmarks, nodeId]
  })),
  isBookmarked: (nodeId) => get().bookmarks.includes(nodeId),
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
