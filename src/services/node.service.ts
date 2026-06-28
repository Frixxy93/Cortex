import { call } from '@/utils/tauri'
import type { CortexNode, CreateNodeInput, UpdateNodeInput } from '@/types'

export const NodeService = {
  list: (vaultId: string) => call<CortexNode[]>('list_nodes', { vaultId }),
  listAll: () => call<CortexNode[]>('list_all_nodes', {}),
  get: (id: string) => call<CortexNode>('get_node', { id }),
  create: (input: CreateNodeInput) => call<CortexNode>('create_node', { input }),
  update: (input: UpdateNodeInput) => call<CortexNode>('update_node', { input }),
  delete: (id: string) => call<void>('delete_node', { id }),
  batchCreate: (inputs: CreateNodeInput[]) => call<CortexNode[]>('batch_create_nodes', { inputs }),
  clearVault: (vaultId: string) => call<number>('clear_vault_nodes', { vaultId }),
  clearAll: () => call<number>('clear_all_nodes', {}),
  reseedAll: () => call<number>('reseed_nodes', {}),
}
