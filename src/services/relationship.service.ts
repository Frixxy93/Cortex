import { call } from '@/utils/tauri'
import type { Relationship, CreateRelationshipInput } from '@/types'

export const RelationshipService = {
  getForObject: (objectId: string) => call<Relationship[]>('get_relationships', { objectId }),
  create: (input: CreateRelationshipInput) => call<Relationship>('create_relationship', { input }),
  delete: (id: string) => call<void>('delete_relationship', { id }),
}
