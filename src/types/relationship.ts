export type RelationshipType =
  | 'uses'
  | 'depends_on'
  | 'consumes'
  | 'creates'
  | 'references'
  | 'connected_to'
  | 'similar_to'
  | 'alternative_to'
  | 'parent'
  | 'child'
  | 'replaced_by'
  | 'deprecated_by'
  | 'part_of'
  | 'contains'
  | 'triggers'
  | 'custom'

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  uses: 'Uses',
  depends_on: 'Depends On',
  consumes: 'Consumes',
  creates: 'Creates',
  references: 'References',
  connected_to: 'Connected To',
  similar_to: 'Similar To',
  alternative_to: 'Alternative To',
  parent: 'Parent',
  child: 'Child',
  replaced_by: 'Replaced By',
  deprecated_by: 'Deprecated By',
  part_of: 'Part Of',
  contains: 'Contains',
  triggers: 'Triggers',
  custom: 'Related To',
}

export interface Relationship {
  id: string
  vaultId: string
  sourceId: string
  targetId: string
  relationshipType: RelationshipType
  label?: string
  strength: number
  description?: string
  bidirectional: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface CreateRelationshipInput {
  vaultId: string
  sourceId: string
  targetId: string
  relationshipType: RelationshipType
  label?: string
  strength?: number
  description?: string
  bidirectional?: boolean
  metadata?: Record<string, unknown>
}
