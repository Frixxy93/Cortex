import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { BridgeService, DetectedSoftware, ConnectedClient } from '@/services/bridge.service'
import { useNodeStore } from '@/stores/node.store'

interface BridgeState {
  serverRunning:    boolean
  serverPort:       number | null
  detected:         DetectedSoftware[]
  clients:          ConnectedClient[]
  importedCount:    number
  isDetecting:      boolean
  isImporting:      boolean
  error:            string | null

  startServer:      () => Promise<void>
  stopServer:       () => Promise<void>
  detectSoftware:   () => Promise<void>
  refreshClients:   () => Promise<void>
  importNodes:      () => Promise<number>
}

export const useBridgeStore = create<BridgeState>()(
  immer((set, _get) => ({
    serverRunning:  false,
    serverPort:     null,
    detected:       [],
    clients:        [],
    importedCount:  0,
    isDetecting:    false,
    isImporting:    false,
    error:          null,

    startServer: async () => {
      try {
        const port = await BridgeService.start()
        set(s => { s.serverRunning = true; s.serverPort = port; s.error = null })
      } catch (e) {
        set(s => { s.error = String(e) })
      }
    },

    stopServer: async () => {
      try {
        await BridgeService.stop()
        set(s => { s.serverRunning = false; s.serverPort = null; s.clients = [] })
      } catch (e) {
        set(s => { s.error = String(e) })
      }
    },

    detectSoftware: async () => {
      set(s => { s.isDetecting = true; s.error = null })
      try {
        const detected = await BridgeService.detect()
        set(s => { s.detected = detected; s.isDetecting = false })
      } catch (e) {
        set(s => { s.isDetecting = false; s.error = String(e) })
      }
    },

    refreshClients: async () => {
      try {
        const clients = await BridgeService.connectedClients()
        set(s => { s.clients = clients })
        // Also update isConnected on detected list
        set(s => {
          for (const sw of s.detected) {
            sw.isConnected = clients.some(c =>
              c.software.toLowerCase().includes(sw.kind.toLowerCase())
            )
          }
        })
      } catch {}
    },

    importNodes: async () => {
      set(s => { s.isImporting = true; s.error = null })
      try {
        const count = await BridgeService.drainNodes()
        set(s => { s.importedCount = count; s.isImporting = false })
        if (count > 0) {
          // Reload the node store so the new nodes appear immediately
          await useNodeStore.getState().loadNodes()
        }
        return count
      } catch (e) {
        set(s => { s.isImporting = false; s.error = String(e) })
        return 0
      }
    },
  }))
)
