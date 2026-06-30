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
  softDelete: (id: string) => call<void>('soft_delete_node', { id }),
  restore: (id: string) => call<void>('restore_node', { id }),
  listTrashed: (vaultId: string) => call<CortexNode[]>('list_trashed_nodes', { vaultId }),
  emptyTrash: (vaultId: string) => call<number>('empty_trash', { vaultId }),
  reseedAll: () => call<number>('reseed_nodes', {}),
  generateSeed: () => call<string>('generate_node_seed', {}),
}
