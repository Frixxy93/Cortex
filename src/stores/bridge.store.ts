import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { BridgeService, DetectedSoftware, ConnectedClient } from '@/services/bridge.service'
import { useNodeStore } from '@/stores/node.store'

interface BridgeState {
  port:          number | null
  detected:      DetectedSoftware[]
  clients:       ConnectedClient[]
  importedCount: number
  isImporting:   boolean
  execCmds:      Record<string, string>   // kind → exec one-liner

  detect:         () => Promise<void>
  refreshClients: () => Promise<void>
  importNodes:    () => Promise<number>
  fetchExecCmd:   (kind: string) => Promise<void>

  /** Call once in App.tsx. Returns unlisten cleanup. */
  initListener:   () => () => void
}

export const useBridgeStore = create<BridgeState>()(
  immer((set, get) => ({
    port:          7878,
    detected:      [],
    clients:       [],
    importedCount: 0,
    isImporting:   false,
    execCmds:      {},

    detect: async () => {
      try {
        const detected = await BridgeService.detect()
        set(s => { s.detected = detected })
      } catch {}
    },

    refreshClients: async () => {
      try {
        const clients = await BridgeService.clients()
        set(s => { s.clients = clients })
      } catch {}
    },

    importNodes: async () => {
      set(s => { s.isImporting = true })
      try {
        const count = await BridgeService.drain()
        set(s => {
          s.importedCount = count > 0 ? count : s.importedCount
          s.isImporting   = false
        })
        if (count > 0) {
          await useNodeStore.getState().loadNodes()
        }
        return count
      } catch {
        set(s => { s.isImporting = false })
        return 0
      }
    },

    fetchExecCmd: async (kind: string) => {
      if (get().execCmds[kind]) return
      try {
        const cmd = await BridgeService.execCmd(kind)
        set(s => { s.execCmds[kind] = cmd })
      } catch {}
    },

    initListener: () => {
      let unlisten: (() => void) | undefined

      BridgeService.onReady(async (count) => {
        if (count === 0) return
        await get().refreshClients()
        const imported = await get().importNodes()
        if (imported > 0) {
          try {
            const { addToast } = (await import('@/stores/ui.store')).useUiStore.getState()
            addToast(`Bridge: ${imported.toLocaleString()} nodes imported`, { variant: 'success' })
          } catch {}
        }
      }).then(fn => { unlisten = fn as unknown as () => void })

      return () => { unlisten?.() }
    },
  }))
)
