import { useState } from 'react'
import { useAiStore } from '@/stores/ai.store'
import { cn } from '@/utils/cn'
import type { AiProvider } from '@/types'

const PROVIDERS: { id: AiProvider; label: string; models: string[] }[] = [
  { id: 'anthropic', label: 'Anthropic', models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',    label: 'OpenAI',    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'ollama',    label: 'Ollama',    models: ['llama3', 'mistral', 'mixtral'] },
]

export function AiSettings() {
  const { provider, apiKey, model, setProvider } = useAiStore()
  const [key, setKey] = useState(apiKey ?? '')
  const [selectedModel, setSelectedModel] = useState(model ?? '')
  const [saved, setSaved] = useState(false)

  const current = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0]

  const handleSave = () => {
    setProvider(provider, key.trim() || undefined, selectedModel || undefined)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="block text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1.5">
          Provider
        </label>
        <div className="flex gap-1.5">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => { setProvider(p.id); setSelectedModel('') }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                provider === p.id
                  ? 'bg-cx-accent text-white'
                  : 'bg-cx-elevated text-cx-text-muted hover:text-cx-text border border-cx-border'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1.5">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                     text-[12px] text-cx-text focus:outline-none focus:border-cx-accent/50"
        >
          <option value="">Default</option>
          {current.models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {provider !== 'ollama' && (
        <div>
          <label className="block text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                       text-[12px] text-cx-text placeholder-cx-text-muted
                       focus:outline-none focus:border-cx-accent/50"
          />
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-1.5 rounded-lg bg-cx-accent text-white text-[12px] font-medium
                   hover:opacity-90 transition-opacity"
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  )
}
