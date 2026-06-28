import { call } from '@/utils/tauri'
import type { CortexGraph, CreateGraphInput, UpdateGraphInput } from '@/types'

export const GraphService = {
  list: (vaultId: string) => call<CortexGraph[]>('list_graphs', { vaultId }),
  get: (id: string) => call<CortexGraph>('get_graph', { id }),
  create: (input: CreateGraphInput) => call<CortexGraph>('create_graph', { input }),
  save: (input: UpdateGraphInput) => call<CortexGraph>('save_graph', { input }),
  delete: (id: string) => call<void>('delete_graph', { id }),
}
