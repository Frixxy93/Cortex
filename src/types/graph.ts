export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type EdgeType = 'data' | 'reference' | 'depends' | 'custom'

export interface GraphNode {
  id: string
  nodeId: string
  graphId: string
  position: Position
  size?: Size
  color?: string
  label?: string
  isCollapsed: boolean
  zIndex: number
}

export interface GraphEdge {
  id: string
  sourceNodeId: string
  sourcePortId?: string
  targetNodeId: string
  targetPortId?: string
  label?: string
  color?: string
  edgeType: EdgeType
}

export interface GraphFrame {
  id: string
  graphId: string
  label: string
  color?: string
  position: Position
  size: Size
  nodeIds: string[]
  zIndex: number
}

export interface GraphComment {
  id: string
  graphId: string
  text: string
  position: Position
  color?: string
  fontSize?: number
}

export interface CortexGraph {
  id: string
  vaultId: string
  name: string
  description?: string
  tags: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  frames: GraphFrame[]
  comments: GraphComment[]
  viewport: Viewport
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
}

export interface CreateGraphInput {
  vaultId: string
  name: string
  description?: string
  tags?: string[]
}

export interface UpdateGraphInput {
  id: string
  name?: string
  description?: string
  tags?: string[]
  nodes?: GraphNode[]
  edges?: GraphEdge[]
  frames?: GraphFrame[]
  comments?: GraphComment[]
  viewport?: Viewport
}
