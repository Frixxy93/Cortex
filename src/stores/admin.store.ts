import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Change this to your own secret passphrase before shipping
const ADMIN_PASSPHRASE = 'cortex-fx-admin-2024'

interface AdminState {
  isAdmin: boolean
  unlock: (passphrase: string) => boolean
  lock: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAdmin: false,

      unlock: (passphrase: string) => {
        if (passphrase === ADMIN_PASSPHRASE) {
          set({ isAdmin: true })
          return true
        }
        return false
      },

      lock: () => set({ isAdmin: false }),
    }),
    {
      name: 'cortex-admin',
    }
  )
)
