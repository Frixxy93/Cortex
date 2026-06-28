import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { GraphService } from '@/services/graph.service'
import type {
  CortexGraph, CreateGraphInput, UpdateGraphInput,
  GraphNode, GraphEdge, GraphFrame, GraphComment, Viewport,
} from '@/types'

interface GraphStore {
  graphs: Record<string, CortexGraph>
  byVault: Record<string, string[]>
  activeGraphId: string | null
  isDirty: boolean
  isLoading: boolean
  error: string | null

  // Computed
  activeGraph: () => CortexGraph | null

  // Actions
  loadGraphs: (vaultId: string) => Promise<void>
  loadGraph: (id: string) => Promise<void>
  setActiveGraph: (id: string | null) => void
  createGraph: (input: CreateGraphInput) => Promise<CortexGraph>
  saveGraph: () => Promise<void>
  deleteGraph: (id: string) => Promise<void>
  renameGraph: (id: string, name: string) => Promise<void>

  // Undo/redo (internal)
  _history: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>
  _historyIndex: number
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  // Canvas mutations (local, pending save)
  addNode: (node: GraphNode) => void
  updateNode: (node: GraphNode) => void
  removeNode: (nodeId: string) => void
  addEdge: (edge: GraphEdge) => void
  removeEdge: (edgeId: string) => void
  addFrame: (frame: GraphFrame) => void
  updateFrame: (frame: GraphFrame) => void
  removeFrame: (frameId: string) => void
  addComment: (comment: GraphComment) => void
  removeComment: (commentId: string) => void
  setViewport: (viewport: Viewport) => void
}

export const useGraphStore = create<GraphStore>()(
  immer((set, get) => ({
    graphs: {},
    byVault: {},
    activeGraphId: null,
    isDirty: false,
    isLoading: false,
    error: null,
    _history: [] as Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>,
    _historyIndex: -1,
    canUndo: false,
    canRedo: false,

    activeGraph: () => {
      const { graphs, activeGraphId } = get()
      return activeGraphId ? graphs[activeGraphId] ?? null : null
    },

    loadGraphs: async (vaultId) => {
      set(s => { s.isLoading = true })
      try {
        const graphs = await GraphService.list(vaultId)
        set(s => {
          for (const g of graphs) s.graphs[g.id] = g
          s.byVault[vaultId] = graphs.map(g => g.id)
          s.isLoading = false
          // Auto-select first graph if none is currently active
          if (!s.activeGraphId && graphs.length > 0) {
            s.activeGraphId = graphs[0].id
          }
        })
      } catch (e) {
        set(s => { s.isLoading = false; s.error = String(e) })
      }
    },

    loadGraph: async (id) => {
      const graph = await GraphService.get(id)
      set(s => { s.graphs[id] = graph })
    },

    setActiveGraph: (id) => set(s => { s.activeGraphId = id ?? null; s.isDirty = false }),

    createGraph: async (input) => {
      const graph = await GraphService.create(input)
      set(s => {
        s.graphs[graph.id] = graph
        const list = s.byVault[input.vaultId] ?? []
        list.push(graph.id)
        s.byVault[input.vaultId] = list
        s.activeGraphId = graph.id
      })
      // Refresh vault stats so home dashboard graphCount stays current
      const { loadVaults } = await import('@/stores/vault.store').then(m => m.useVaultStore.getState())
      loadVaults()
      return graph
    },

    saveGraph: async () => {
      const graph = get().activeGraph()
      if (!graph || !get().isDirty) return
      const input: UpdateGraphInput = {
        id: graph.id,
        nodes: graph.nodes,
        edges: graph.edges,
        frames: graph.frames,
        comments: graph.comments,
        viewport: graph.viewport,
      }
      const saved = await GraphService.save(input)
      set(s => { s.graphs[saved.id] = saved; s.isDirty = false })
    },

    // ── Undo/redo ─────────────────────────────────────────
    undo: () => set(s => {
      if (s._historyIndex <= 0) return
      s._historyIndex -= 1
      const snap = s._history[s._historyIndex]
      const g = s.graphs[s.activeGraphId!]
      if (g && snap) { g.nodes = snap.nodes; g.edges = snap.edges; s.isDirty = true }
      s.canUndo = s._historyIndex > 0
      s.canRedo = s._historyIndex < s._history.length - 1
    }),

    redo: () => set(s => {
      if (s._historyIndex >= s._history.length - 1) return
      s._historyIndex += 1
      const snap = s._history[s._historyIndex]
      const g = s.graphs[s.activeGraphId!]
      if (g && snap) { g.nodes = snap.nodes; g.edges = snap.edges; s.isDirty = true }
      s.canUndo = s._historyIndex > 0
      s.canRedo = s._historyIndex < s._history.length - 1
    }),

    // ── Canvas mutations ──────────────────────────────────
    addNode: (node) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.nodes.push(node);
      // push history
      const g2 = s.graphs[s.activeGraphId!]
      if (g2) {
        const snap = { nodes: JSON.parse(JSON.stringify(g2.nodes)), edges: JSON.parse(JSON.stringify(g2.edges)) }
        s._history = s._history.slice(0, s._historyIndex + 1).concat([snap]).slice(-30)
        s._historyIndex = s._history.length - 1
        s.canUndo = s._historyIndex > 0
        s.canRedo = false
      }
        s.isDirty = true }
    }),

    updateNode: (node) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) {
        const idx = g.nodes.findIndex(n => n.id === node.id)
        if (idx !== -1) { g.nodes[idx] = node; s.isDirty = true }
      }
    }),

    removeNode: (nodeId) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) {
        g.nodes = g.nodes.filter(n => n.id !== nodeId)
        g.edges = g.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId)

      // push history
      const g2 = s.graphs[s.activeGraphId!]
      if (g2) {
        const snap = { nodes: JSON.parse(JSON.stringify(g2.nodes)), edges: JSON.parse(JSON.stringify(g2.edges)) }
        s._history = s._history.slice(0, s._historyIndex + 1).concat([snap]).slice(-30)
        s._historyIndex = s._history.length - 1
        s.canUndo = s._historyIndex > 0
        s.canRedo = false
      }
        s.isDirty = true
      }
    }),

    addEdge: (edge) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.edges.push(edge);
      // push history
      const g2 = s.graphs[s.activeGraphId!]
      if (g2) {
        const snap = { nodes: JSON.parse(JSON.stringify(g2.nodes)), edges: JSON.parse(JSON.stringify(g2.edges)) }
        s._history = s._history.slice(0, s._historyIndex + 1).concat([snap]).slice(-30)
        s._historyIndex = s._history.length - 1
        s.canUndo = s._historyIndex > 0
        s.canRedo = false
      }
        s.isDirty = true }
    }),

    removeEdge: (edgeId) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.edges = g.edges.filter(e => e.id !== edgeId);
      // push history
      const g2 = s.graphs[s.activeGraphId!]
      if (g2) {
        const snap = { nodes: JSON.parse(JSON.stringify(g2.nodes)), edges: JSON.parse(JSON.stringify(g2.edges)) }
        s._history = s._history.slice(0, s._historyIndex + 1).concat([snap]).slice(-30)
        s._historyIndex = s._history.length - 1
        s.canUndo = s._historyIndex > 0
        s.canRedo = false
      }
        s.isDirty = true }
    }),

    addFrame: (frame) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.frames.push(frame); s.isDirty = true }
    }),

    updateFrame: (frame) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) {
        const idx = g.frames.findIndex(f => f.id === frame.id)
        if (idx !== -1) { g.frames[idx] = frame; s.isDirty = true }
      }
    }),

    removeFrame: (frameId) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.frames = g.frames.filter(f => f.id !== frameId); s.isDirty = true }
    }),

    addComment: (comment) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.comments.push(comment); s.isDirty = true }
    }),

    removeComment: (commentId) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.comments = g.comments.filter(c => c.id != commentId)
        s.isDirty = true
      }
    }),



    renameGraph: async (id, name) => {
      const saved = await GraphService.save({ id, name })
      set(s => { s.graphs[id] = saved })
    },

    deleteGraph: async (id) => {
      const { GraphService } = await import('@/services/graph.service')
      await GraphService.delete(id)
      set(s => {
        const g = s.graphs[id]
        if (g) {
          const vaultId = g.vaultId
          delete s.graphs[id]
          s.byVault[vaultId] = (s.byVault[vaultId] ?? []).filter(i => i !== id)
        }
        if (s.activeGraphId === id) s.activeGraphId = null
      })
      const { loadVaults } = await import('@/stores/vault.store').then(m => m.useVaultStore.getState())
      loadVaults()
    },

    setViewport: (viewport) => set(s => {
      const g = s.graphs[s.activeGraphId!]
      if (g) { g.viewport = viewport }
    }),
  }))
)