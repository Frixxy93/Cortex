import { useRef, useEffect, useState } from 'react'
import { useAiStore } from '@/stores/ai.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { cn } from '@/utils/cn'

export function AICopilot() {
  const { messages, isStreaming, sendMessage, clearMessages } = useAiStore()
  const activeVault = useVaultStore(s => s.vaults.find(v => v.id === s.activeVaultId))
  const activeGraph = useGraphStore(s => s.activeGraph())
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-cx-border">
        <div className="flex items-center gap-2">
          <CortexLogo size="sm" />
          <span className="text-[10px] font-semibold text-cx-text-muted tracking-wide">AI</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-[10px] text-cx-text-muted hover:text-cx-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="pt-3">
            {/* Context badge */}
            {(activeVault || activeGraph) && (
              <div className="mb-3 rounded-lg px-2.5 py-2 text-[10px] leading-relaxed"
                style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.12)', color: 'rgba(180,170,255,0.6)' }}>
                <span style={{ color: 'rgba(180,170,255,0.9)', fontWeight: 600 }}>Context:</span>
                {activeVault && <span> {activeVault.name}</span>}
                {activeGraph && <span> · {activeGraph.name} ({activeGraph.nodes?.length ?? 0} nodes)</span>}
              </div>
            )}
            <div className="text-center mb-3">
              <div className="text-3xl opacity-20 mb-2">🧠</div>
              <p className="text-xs text-cx-text-muted">
                Ask me about any node, workflow, or technique.
              </p>
            </div>
            <div className="space-y-1.5">
              {(activeGraph?.tags?.includes('nuke') ? NUKE_SUGGESTIONS
                : activeGraph?.tags?.includes('simulation') ? SIM_SUGGESTIONS
                : activeGraph?.tags?.includes('rigging') ? RIG_SUGGESTIONS
                : SUGGESTIONS
              ).map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s) }}
                  className="block w-full text-left px-2.5 py-1.5 rounded bg-cx-elevated text-[11px]
                             text-cx-text-dim hover:bg-cx-elevated/80 hover:text-cx-text
                             border border-cx-border transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'text-right'
                  : '',
              )}
            >
              {msg.role === 'user' ? (
                <span className="inline-block bg-cx-accent/20 text-cx-text rounded-lg px-3 py-2 max-w-[85%] text-left">
                  {msg.content}
                </span>
              ) : (
                <div className="text-cx-text-dim whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          ))
        )}

        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-cx-text-muted">
            <span className="animate-pulse">⟳</span>
            <span>Thinking…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-cx-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about nodes, workflows, parameters…"
            rows={2}
            className="flex-1 bg-cx-elevated border border-cx-border rounded-lg px-3 py-2
                       text-xs text-cx-text placeholder:text-cx-text-muted resize-none
                       focus:outline-none focus:border-cx-accent transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'px-3 rounded-lg text-xs font-medium transition-colors self-end pb-2',
              input.trim() && !isStreaming
                ? 'bg-cx-accent text-white hover:bg-cx-accent-dim'
                : 'bg-cx-elevated text-cx-text-muted cursor-not-allowed'
            )}
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-cx-text-muted mt-1.5">
          ↵ Send · Shift+↵ New line
        </p>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'How do I create smoke in Houdini?',
  'What nodes are used for destruction effects?',
  'Explain the Pyro Solver parameters',
  'How do VOP wire nodes connect?',
]
const SIM_SUGGESTIONS = [
  'What are the key parameters on the Pyro Solver?',
  'How do I add a fuel source to my pyro sim?',
  'Explain the difference between density and heat',
  'How do I cache this simulation efficiently?',
]
const RIG_SUGGESTIONS = [
  'How does KineFX IK differ from the old rigging tools?',
  'What is the Blend Shapes node and when to use it?',
  'How do I set up a full-body IK rig in KineFX?',
  'What are control points in KineFX?',
]
const NUKE_SUGGESTIONS = [
  'What is the difference between Merge and KeyMix?',
  'How do I grade a shot to match another plate?',
  'Explain the Nuke crop vs reformat node',
  'What nodes handle motion blur in comp?',
]
