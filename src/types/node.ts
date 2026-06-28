import type { Parameter } from './parameter'

export type NodeCategory =
  | 'sop' | 'dop' | 'cop' | 'vop' | 'lop' | 'rop' | 'chop' | 'top' | 'object'
  | 'color' | 'filter' | 'merge' | 'transform' | 'channel' | 'draw' | 'deep'
  | 'geometry' | 'shader' | 'compositor'
  | 'blueprint' | 'material' | 'animation'
  | 'utility' | 'math' | 'logic' | 'custom' | 'other'

export type NodeObjectType =
  | 'software_node'
  | 'recipe'
  | 'blueprint'
  | 'documentation'
  | 'asset'
  | 'project'
  | 'template'
  | 'reference'
  | 'learning_topic'
  | 'external_link'
  | 'note'
  | 'custom'

export interface NodePort {
  id: string
  name: string
  dataType: string
  required: boolean
  multi: boolean
  description?: string
}

export interface CortexNode {
  id: string
  vaultId?: string
  softwareId?: string
  name: string
  displayName: string
  category: NodeCategory
  objectType: NodeObjectType
  description?: string
  version?: string
  color?: string
  icon?: string
  tags: string[]
  inputs: NodePort[]
  outputs: NodePort[]
  parameters: Parameter[]
  documentation?: string
  notes?: string
  productionTips: string[]
  mediaIds: string[]
  isDeprecated: boolean
  deprecatedBy?: string
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
}

export interface Software {
  id: string
  name: string
  displayName: string
  version?: string
  icon?: string
  color?: string
  description?: string
  website?: string
  createdAt: string
}

export interface CreateNodeInput {
  vaultId?: string
  softwareId?: string
  name: string
  displayName: string
  category: NodeCategory
  objectType: NodeObjectType
  description?: string
  version?: string
  color?: string
  icon?: string
  tags?: string[]
  inputs?: NodePort[]
  outputs?: NodePort[]
  parameters?: Parameter[]
  documentation?: string
  notes?: string
  productionTips?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateNodeInput {
  id: string
  name?: string
  displayName?: string
  description?: string
  color?: string
  icon?: string
  tags?: string[]
  parameters?: Parameter[]
  documentation?: string
  notes?: string
  productionTips?: string[]
  metadata?: Record<string, unknown>
  category?: NodeCategory
  objectType?: NodeObjectType
  inputs?: NodePort[]
  outputs?: NodePort[]
}
