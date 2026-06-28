import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { NodeService } from '@/services/node.service'
import type { CortexNode, CreateNodeInput, UpdateNodeInput } from '@/types'

// Nodes are global — shared across all vaults.
// Vaults only contain graphs.

interface NodeStore {
  nodes: Record<string, CortexNode>
  selectedNodeId: string | null
  isLoading: boolean
  error: string | null
  getNode: (id: string) => CortexNode | undefined
  getAllNodes: () => CortexNode[]
  /** @deprecated vaultId is ignored — nodes are global. Use getAllNodes(). */
  getVaultNodes: (_vaultId: string) => CortexNode[]
  selectedNode: () => CortexNode | null
  /** Load all nodes globally. */
  loadNodes: () => Promise<void>
  clearAll: () => void
  selectNode: (id: string | null) => void
  createNode: (input: CreateNodeInput) => Promise<CortexNode>
  updateNode: (input: UpdateNodeInput) => Promise<CortexNode>
  deleteNode: (id: string) => Promise<void>
  seedHoudiniNodes: () => Promise<void>
}

export const useNodeStore = create<NodeStore>()(
  immer((set, get) => ({
    nodes: {},
    selectedNodeId: null,
    isLoading: false,
    error: null,

    getNode: (id) => get().nodes[id],

    getAllNodes: () => Object.values(get().nodes),

    // vaultId param kept for API compatibility — ignored
    getVaultNodes: (_vaultId: string) => Object.values(get().nodes),

    selectedNode: () => {
      const { nodes, selectedNodeId } = get()
      return selectedNodeId ? nodes[selectedNodeId] ?? null : null
    },

    clearAll: () => {
      set(s => { s.nodes = {}; s.selectedNodeId = null })
    },

    loadNodes: async () => {
      set(s => { s.isLoading = true; s.error = null })
      try {
        const nodes = await NodeService.listAll()
        set(s => {
          // Full replace so bridge-imported nodes properly displace seed nodes
          s.nodes = {}
          for (const node of nodes) s.nodes[node.id] = node
          s.isLoading = false
        })

      } catch (e) {
        console.error('[Cortex] loadNodes failed:', e)
        set(s => { s.isLoading = false; s.error = String(e) })
      }
    },

    selectNode: (id) => set(s => { s.selectedNodeId = id }),

    createNode: async (input) => {
      const node = await NodeService.create(input)
      set(s => { s.nodes[node.id] = node })
      return node
    },

    updateNode: async (input) => {
      const updated = await NodeService.update(input)
      set(s => { s.nodes[updated.id] = updated })
      return updated
    },

    deleteNode: async (id) => {
      await NodeService.delete(id)
      set(s => {
        delete s.nodes[id]
        if (s.selectedNodeId === id) s.selectedNodeId = null
      })
    },

    seedHoudiniNodes: async () => {
      // Delegates to Rust — clears DB and re-runs the embedded SQL seed
      await NodeService.reseedAll()
      await useNodeStore.getState().loadNodes()
    },
  }))
)
