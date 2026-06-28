import { call } from '@/utils/tauri'
import type { Vault, CreateVaultInput, UpdateVaultInput } from '@/types'

export const VaultService = {
  list: () => call<Vault[]>('list_vaults'),
  get: (id: string) => call<Vault>('get_vault', { id }),
  create: (input: CreateVaultInput) => call<Vault>('create_vault', { input }),
  update: (input: UpdateVaultInput) => call<Vault>('update_vault', { input }),
  delete: (id: string) => call<void>('delete_vault', { id }),
}
