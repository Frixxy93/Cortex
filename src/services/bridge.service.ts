import { call } from '@/utils/tauri'

export interface DetectedSoftware {
  id:          string
  kind:        string
  displayName: string
  version:     string
  installPath: string
  executable:  string
  category:    string
  isConnected: boolean
}

export interface ConnectedClient {
  clientId:    string
  software:    string
  version:     string
  connectedAt: string
}

export const BridgeService = {
  detect:           ()                          => call<DetectedSoftware[]>('bridge_detect_software', {}),
  start:            ()                          => call<number>('bridge_start', {}),
  stop:             ()                          => call<void>('bridge_stop', {}),
  connectedClients: ()                          => call<ConnectedClient[]>('bridge_connected_clients', {}),
  drainNodes:       ()                           => call<number>('bridge_drain_nodes', {}),
}
