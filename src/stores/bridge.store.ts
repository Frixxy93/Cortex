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
  lastImportedAt:   string | null
  isDetecting:      boolean
  isImporting:      boolean
  installingId:     string | null   // which softwareId is being installed
  error:            string | null

  startServer:      () => Promise<void>
  stopServer:       () => Promise<void>
  detectSoftware:   () => Promise<void>
  refreshClients:   () => Promise<void>
  importNodes:      () => Promise<number>
  installAuto:      (softwareId: string) => Promise<void>
  uninstallAuto:    (softwareId: string) => Promise<void>
  checkInstalled:   (softwareId: string) => Promise<boolean>
  initAutoListener: () => () => void   // returns unlisten fn
}

export const useBridgeStore = create<BridgeState>()(
  immer((set, get) => ({
    serverRunning:  false,
    serverPort:     null,
    detected:       [],
    clients:        [],
    importedCount:  0,
    lastImportedAt: null,
    isDetecting:    false,
    isImporting:    false,
    installingId:   null,
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
        // Check install status for each detected app
        const withInstall = await Promise.all(
          detected.map(async sw => ({
            ...sw,
            isInstalled: await BridgeService.isInstalled(sw.id).catch(() => false),
          }))
        )
        set(s => { s.detected = withInstall; s.isDetecting = false })
      } catch (e) {
        set(s => { s.isDetecting = false; s.error = String(e) })
      }
    },

    refreshClients: async () => {
      try {
        const clients = await BridgeService.connectedClients()
        set(s => {
          s.clients = clients
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
        set(s => {
          s.importedCount  = count
          s.isImporting    = false
          s.lastImportedAt = count > 0 ? new Date().toISOString() : s.lastImportedAt
        })
        if (count > 0) {
          await useNodeStore.getState().loadNodes()
        }
        return count
      } catch (e) {
        set(s => { s.isImporting = false; s.error = String(e) })
        return 0
      }
    },

    installAuto: async (softwareId) => {
      set(s => { s.installingId = softwareId; s.error = null })
      try {
        await BridgeService.installAuto(softwareId)
        set(s => {
          s.installingId = null
          const sw = s.detected.find(d => d.id === softwareId)
          if (sw) sw.isInstalled = true
        })
      } catch (e) {
        set(s => { s.installingId = null; s.error = String(e) })
      }
    },

    uninstallAuto: async (softwareId) => {
      set(s => { s.installingId = softwareId })
      try {
        await BridgeService.uninstallAuto(softwareId)
        set(s => {
          s.installingId = null
          const sw = s.detected.find(d => d.id === softwareId)
          if (sw) sw.isInstalled = false
        })
      } catch (e) {
        set(s => { s.installingId = null; s.error = String(e) })
      }
    },

    checkInstalled: async (softwareId) => {
      try { return await BridgeService.isInstalled(softwareId) }
      catch { return false }
    },

    initAutoListener: () => {
      let unlisten: (() => void) | undefined
      BridgeService.onNodesReady(async (_count) => {
        await get().importNodes()
        await get().refreshClients()
      }).then(fn => { unlisten = fn as unknown as () => void })
      return () => { unlisten?.() }
    },
  }))
)
