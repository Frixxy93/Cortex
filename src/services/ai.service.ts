import { call } from '@/utils/tauri'
import type { AiRequest, AiResponse, AiProvider } from '@/types'

export const AiService = {
  chat: (request: AiRequest, provider?: AiProvider, apiKey?: string) =>
    call<AiResponse>('ai_chat', { request, provider, apiKey }),
}
