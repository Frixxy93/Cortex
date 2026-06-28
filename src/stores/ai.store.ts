import { create } from 'zustand'
import { AiService } from '@/services/ai.service'
import type { AiMessage, AiProvider } from '@/types'

interface AiStore {
  messages: AiMessage[]
  isStreaming: boolean
  error: string | null
  provider: AiProvider
  apiKey: string | null
  model: string | null

  // Actions
  setProvider: (p: AiProvider, apiKey?: string, model?: string) => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

export const useAiStore = create<AiStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,
  provider: 'anthropic',
  apiKey: null,
  model: null,

  setProvider: (provider, apiKey, model) => set({ provider, apiKey: apiKey ?? null, model: model ?? null }),

  sendMessage: async (content) => {
    const { messages, provider, apiKey, model } = get()
    const userMsg: AiMessage = { role: 'user', content }
    const newMessages = [...messages, userMsg]

    set({ messages: newMessages, isStreaming: true, error: null })

    try {
      const response = await AiService.chat(
        { messages: newMessages, model: model ?? undefined },
        provider,
        apiKey ?? undefined,
      )

      const assistantMsg: AiMessage = { role: 'assistant', content: response.content }
      set(s => ({ messages: [...s.messages, assistantMsg], isStreaming: false }))
    } catch (e) {
      set({ isStreaming: false, error: String(e) })
    }
  },

  clearMessages: () => set({ messages: [], error: null }),
}))
