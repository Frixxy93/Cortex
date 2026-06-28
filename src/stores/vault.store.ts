import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { VaultService } from '@/services/vault.service'
import type { Vault, CreateVaultInput, UpdateVaultInput } from '@/types'

interface VaultStore {
  vaults: Vault[]
  activeVaultId: string | null
  isLoading: boolean
  error: string | null

  // Computed
  activeVault: () => Vault | null

  // Actions
  loadVaults: () => Promise<void>
  setActiveVault: (id: string) => void
  createVault: (input: CreateVaultInput) => Promise<Vault>
  updateVault: (input: UpdateVaultInput) => Promise<Vault>
  deleteVault: (id: string) => Promise<void>
}

export const useVaultStore = create<VaultStore>()(
  immer((set, get) => ({
    vaults: [],
    activeVaultId: null,
    isLoading: false,
    error: null,

    activeVault: () => {
      const { vaults, activeVaultId } = get()
      return vaults.find(v => v.id === activeVaultId) ?? null
    },

    loadVaults: async () => {
      set(s => { s.isLoading = true; s.error = null })
      try {
        const vaults = await VaultService.list()
        set(s => {
          s.vaults = vaults
          s.isLoading = false
          // Auto-select first vault if none active
          if (!s.activeVaultId && vaults.length > 0) {
            s.activeVaultId = vaults[0].id
          }
        })
      } catch (e) {
        set(s => { s.isLoading = false; s.error = String(e) })
      }
    },

    setActiveVault: (id) => {
      set(s => { s.activeVaultId = id })
    },

    createVault: async (input) => {
      const vault = await VaultService.create(input)
      set(s => {
        s.vaults.push(vault)
        s.activeVaultId = vault.id
      })
      return vault
    },

    updateVault: async (input) => {
      const updated = await VaultService.update(input)
      set(s => {
        const idx = s.vaults.findIndex(v => v.id === updated.id)
        if (idx !== -1) s.vaults[idx] = updated
      })
      return updated
    },

    deleteVault: async (id) => {
      await VaultService.delete(id)
      set(s => {
        s.vaults = s.vaults.filter(v => v.id !== id)
        if (s.activeVaultId === id) {
          s.activeVaultId = s.vaults[0]?.id ?? null
        }
      })
    },
  }))
)
