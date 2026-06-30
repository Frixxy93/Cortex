import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export interface ConnectedClient { id: string; software: string; version: string }
export interface DetectedSoftware { id: string; name: string; version: string; kind: string }
export interface VfxImportedEvent { software: string; count: number }

function call<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  return invoke<T>(cmd, args)
}

export interface ImportResult {
  nodesImported: number
  edgesImported: number
  parametersImported: number
  warnings: string[]
}

export const BridgeService = {
  port:    ()             => call<number>('bridge_start'),
  stop:    ()             => call<void>('bridge_stop'),
  clients: ()             => call<ConnectedClient[]>('bridge_clients'),
  detect:  ()             => call<DetectedSoftware[]>('bridge_detect'),
  execCmd: (kind: string) => call<string>('bridge_exec_cmd', { kind }),

  importFile: (path: string) => call<ImportResult>('import_file', { path }),
  onImported: (cb: (e: VfxImportedEvent) => void) =>
    listen<VfxImportedEvent>('vfx:imported', e => cb(e.payload)),
}
