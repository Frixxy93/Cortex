import { call } from '@/utils/tauri'
import { listen } from '@tauri-apps/api/event'

export interface DetectedSoftware {
  id:      string
  name:    string
  version: string
  kind:    string
}

export interface ConnectedClient {
  id:       string
  software: string
  version:  string
}

export const BridgeService = {
  start:   ()             => call<number>('bridge_start',    {}),
  stop:    ()             => call<void>('bridge_stop',       {}),
  clients: ()             => call<ConnectedClient[]>('bridge_clients', {}),
  detect:  ()             => call<DetectedSoftware[]>('bridge_detect', {}),
  drain:   ()             => call<number>('bridge_drain',    {}),
  execCmd: (kind: string) => call<string>('bridge_exec_cmd', { kind }),

  /** Fires when a DCC sends its node catalogue. payload = buffered node count */
  onReady: (cb: (count: number) => void) =>
    listen<number>('bridge:ready', e => cb(e.payload)),
}
