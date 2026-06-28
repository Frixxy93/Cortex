export type AiProvider = 'anthropic' | 'openai' | 'ollama'

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiRequest {
  messages: AiMessage[]
  system?: string
  model?: string
  maxTokens?: number
}

export interface AiResponse {
  content: string
  model: string
  tokensUsed: number
}

export interface AiChatSession {
  id: string
  vaultId: string
  messages: AiMessage[]
  createdAt: string
  updatedAt: string
}
