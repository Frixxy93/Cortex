import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { AiMessage, AiProvider } from '@/types'

/* ── Context builder ─────────────────────────────────────── */
// Imported lazily to avoid circular deps — called at runtime, not module load
let _getVaultState: (() => any) | null = null
let _getGraphState: (() => any) | null = null

async function loadStoreGetters() {
  if (!_getVaultState) {
    const { useVaultStore } = await import('@/stores/vault.store')
    _getVaultState = () => useVaultStore.getState()
  }
  if (!_getGraphState) {
    const { useGraphStore } = await import('@/stores/graph.store')
    _getGraphState = () => useGraphStore.getState()
  }
}

async function buildSystemPrompt(): Promise<string> {
  try {
    await loadStoreGetters()
  } catch {
    return ''
  }

  let vaultContext = ''
  let graphContext = ''

  try {
    const vs = _getVaultState!()
    const vault = vs.vaults.find((v: any) => v.id === vs.activeVaultId)
    if (vault) {
      vaultContext = `\nActive vault: "${vault.name}" (${vault.nodeCount ?? 0} nodes in library)`
    }
  } catch { /* ignore */ }

  try {
    const gs = _getGraphState!()
    const graph = gs.activeGraph?.()
    if (graph) {
      const nodeCount = graph.nodes?.length ?? 0
      const edgeCount = graph.edges?.length ?? 0
      graphContext = `\nActive graph: "${graph.name}" — ${nodeCount} placed nodes, ${edgeCount} edges`
      if (graph.tags?.length) graphContext += ` (tags: ${graph.tags.join(', ')})`
      if (graph.description) graphContext += `\nGraph description: ${graph.description}`
    }
  } catch { /* ignore */ }

  if (!vaultContext && !graphContext) return ''
  return `[CORTEX WORKSPACE CONTEXT${vaultContext}${graphContext}]\n\n`
}

interface AiStore {
  messages: AiMessage[]
  isStreaming: boolean
  error: string | null
  provider: AiProvider
  apiKey: string | null
  model: string | null

  setProvider: (p: AiProvider, apiKey?: string, model?: string) => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

export const useAiStore = create<AiStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isStreaming: false,
      error: null,
      provider: 'anthropic',
      apiKey: null,
      model: null,

      setProvider: (provider, apiKey, model) =>
        set({ provider, apiKey: apiKey ?? null, model: model ?? null }),

      sendMessage: async (content) => {
        const { messages, provider, apiKey, model } = get()
        const userMsg: AiMessage = { role: 'user', content }
        const newMessages = [...messages, userMsg]

        // Add user message + placeholder assistant message
        const assistantPlaceholder: AiMessage = { role: 'assistant', content: '' }
        set({ messages: [...newMessages, assistantPlaceholder], isStreaming: true, error: null })

        let tokenUnlisten: UnlistenFn | null = null
        let doneUnlisten: UnlistenFn | null = null

        const cleanup = () => {
          tokenUnlisten?.()
          doneUnlisten?.()
        }

        try {
          // Listen for token events — append to last message
          tokenUnlisten = await listen<string>('cortex:ai-token', ({ payload }) => {
            set(s => {
              const msgs = [...s.messages]
              const last = msgs[msgs.length - 1]
              if (last?.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + payload }
              }
              return { messages: msgs }
            })
          })

          // Listen for done event
          doneUnlisten = await listen('cortex:ai-done', () => {
            set({ isStreaming: false })
            cleanup()
          })

          // Build context-aware system prompt
          const ctxPrefix = await buildSystemPrompt()

          // Fire the streaming command (returns immediately; tokens come via events)
          await invoke('ai_stream', {
            request: {
              messages: newMessages,
              model: model ?? undefined,
              system: ctxPrefix || undefined,
            },
            provider,
            apiKey: apiKey ?? undefined,
          })
        } catch (e) {
          cleanup()
          set({ isStreaming: false, error: String(e) })
        }
      },

      clearMessages: () => set({ messages: [], error: null }),
    }),
    {
      name: 'cortex-ai',
      partialize: (s) => ({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
      }),
    }
  )
)
