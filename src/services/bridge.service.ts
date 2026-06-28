import { call } from '@/utils/tauri'
import { listen } from '@tauri-apps/api/event'

export interface DetectedSoftware {
  id:          string
  kind:        string
  displayName: string
  version:     string
  installPath: string
  executable:  string
  category:    string
  isConnected: boolean
  isInstalled: boolean
}

export interface ConnectedClient {
  clientId:    string
  software:    string
  version:     string
  connectedAt: string
}

export const BridgeService = {
  detect:           ()                        => call<DetectedSoftware[]>('bridge_detect_software', {}),
  start:            ()                        => call<number>('bridge_start', {}),
  stop:             ()                        => call<void>('bridge_stop', {}),
  connectedClients: ()                        => call<ConnectedClient[]>('bridge_connected_clients', {}),
  drainNodes:       ()                        => call<number>('bridge_drain_nodes', {}),
  getScript:        (softwareId: string)      => call<string>('bridge_get_script', { softwareId }),
  getExecCmd:       (softwareId: string)      => call<string>('bridge_get_exec_cmd', { softwareId }),
  installAuto:      (softwareId: string)      => call<void>('bridge_install_auto', { softwareId }),
  uninstallAuto:    (softwareId: string)      => call<void>('bridge_uninstall_auto', { softwareId }),
  isInstalled:      (softwareId: string)      => call<boolean>('bridge_is_installed', { softwareId }),

  /** Listen for auto-drain event (Rust emits when DCC sends nodes) */
  onNodesReady: (cb: (count: number) => void) =>
    listen<number>('bridge:nodes-ready', e => cb(e.payload)),
}
