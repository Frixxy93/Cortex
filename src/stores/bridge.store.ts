import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { BridgeService, ConnectedClient, DetectedSoftware } from '@/services/bridge.service'

interface ImportRecord { software: string; count: number; at: string }

interface BridgeState {
  port:      number
  clients:   ConnectedClient[]
  detected:  DetectedSoftware[]
  execCmds:  Record<string, string>   // kind → exec one-liner
  imports:   ImportRecord[]           // history of successful imports
  loading:   boolean

  init:           () => () => void    // starts listener, returns cleanup
  refreshClients: () => Promise<void>
  scan:           () => Promise<void>
  loadCmd:        (kind: string) => Promise<string>
}

export const useBridgeStore = create<BridgeState>()(immer((set, get) => ({
  port:     7878,
  clients:  [],
  detected: [],
  execCmds: {},
  imports:  [],
  loading:  false,

  init: () => {
    // Get port
    BridgeService.port().then(p => set(s => { s.port = p })).catch(() => {})

    // Listen for imports — reload node library when nodes arrive
    const unlistenPromise = BridgeService.onImported(async ({ software, count }) => {
      set(s => {
        s.imports.unshift({ software, count, at: new Date().toISOString() })
      })
      await get().refreshClients()
      // Reload nodes in the node store
      const { useNodeStore } = await import('@/stores/node.store')
      useNodeStore.getState().loadNodes()
      // Toast
      const { useUiStore } = await import('@/stores/ui.store')
      useUiStore.getState().addToast(
        `${count.toLocaleString()} nodes imported from ${software}`,
        { variant: 'success' }
      )
    })

    return () => { unlistenPromise.then(fn => (fn as unknown as () => void)?.()) }
  },

  refreshClients: async () => {
    try {
      const clients = await BridgeService.clients()
      set(s => { s.clients = clients })
    } catch {}
  },

  scan: async () => {
    set(s => { s.loading = true })
    try {
      const detected = await BridgeService.detect()
      set(s => { s.detected = detected; s.loading = false })
    } catch {
      set(s => { s.loading = false })
    }
  },

  loadCmd: async (kind: string) => {
    const existing = get().execCmds[kind]
    if (existing) return existing
    try {
      const cmd = await BridgeService.execCmd(kind)
      set(s => { s.execCmds[kind] = cmd })
      return cmd
    } catch (e) {
      throw e
    }
  },
})))
