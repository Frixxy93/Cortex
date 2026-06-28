import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings.store'
import { useAiStore } from '@/stores/ai.store'
import { useUiStore } from '@/stores/ui.store'
import { useNodeStore } from '@/stores/node.store'
import { useAdminStore } from '@/stores/admin.store'
import { NodeService } from '@/services/node.service'
import { cn } from '@/utils/cn'
import type { AiProvider } from '@/types'

type Section = 'appearance' | 'canvas' | 'general' | 'ai' | 'data' | 'shortcuts'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'canvas',     label: 'Canvas',     icon: '🖼' },
  { id: 'general',    label: 'General',    icon: '⚙️' },
  { id: 'ai',         label: 'AI',         icon: '🧠' },
  { id: 'data',       label: 'Data',       icon: '🗄️' },
  { id: 'shortcuts',  label: 'Shortcuts',  icon: '⌨️' },
]

const ACCENT_PRESETS = [
  '#7b6fff', '#34d399', '#f59e0b', '#60a5fa',
  '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf',
]

const AI_PROVIDERS: { id: AiProvider; label: string; models: string[] }[] = [
  { id: 'anthropic', label: 'Anthropic', models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',    label: 'OpenAI',    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'ollama',    label: 'Ollama (local)', models: ['llama3', 'mistral', 'mixtral', 'codellama'] },
]

const SHORTCUTS = [
  { keys: ['⌘', 'K'],        label: 'Command palette' },
  { keys: ['⌘', 'S'],        label: 'Save graph' },
  { keys: ['⌘', 'Z'],        label: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'],   label: 'Redo' },
  { keys: ['⌘', 'D'],        label: 'Duplicate node' },
  { keys: ['Esc'],            label: 'Close panel / palette' },
  { keys: ['Del'],            label: 'Delete selected node' },
  { keys: ['Shift', 'Click'], label: 'Multi-select nodes' },
]

interface Props { onClose: () => void }

export function SettingsPanel({ onClose }: Props) {
  const [section, setSection] = useState<Section>('appearance')
  const s = useSettingsStore()
  const { provider, apiKey, model, setProvider } = useAiStore()
  const { addToast, rightPanelOpen, toggleRightPanel } = useUiStore()
  const { getAllNodes } = useNodeStore()

  const { isAdmin } = useAdminStore()

  const [aiKey, setAiKey] = useState(apiKey ?? '')
  const [aiModel, setAiModel] = useState(model ?? '')
  const [reseeding,       setReseeding]       = useState(false)
  const [clearingAll,     setClearingAll]     = useState(false)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [resetConfirm,    setResetConfirm]    = useState(false)

const nodeCount = getAllNodes().length

  const handleAccent = (color: string) => {
    s.set({ accentColor: color })
    document.documentElement.style.setProperty('--cx-accent', color)
    // derive dim variant (darken ~20%)
    document.documentElement.style.setProperty('--cx-accent-dim', color + 'cc')
  }

  const handleReseed = async () => {
    setReseeding(true)
    try {
      const count = await NodeService.reseedAll()
      await useNodeStore.getState().loadNodes()
      addToast(`Re-seeded ${count.toLocaleString()} nodes`, { variant: 'success' })
    } catch (err) {
      addToast(`Re-seed failed: ${String(err)}`, { variant: 'error' })
    } finally {
      setReseeding(false)
    }
  }

  const handleClearAll = async () => {
    setClearingAll(true)
    try {
      const count = await NodeService.clearAll()
      // Clear in-memory store too
      useNodeStore.getState().clearAll?.()
      addToast(`Removed ${count.toLocaleString()} nodes from all vaults`, { variant: 'success' })
    } catch (err) {
      addToast(`Clear failed: ${String(err)}`, { variant: 'error' })
    } finally {
      setClearingAll(false)
      setClearAllConfirm(false)
    }
  }

  const handleReset = () => {
    s.reset()
    document.documentElement.style.removeProperty('--cx-accent')
    document.documentElement.style.removeProperty('--cx-accent-dim')
    addToast('Settings reset to defaults', { variant: 'default' })
    setResetConfirm(false)
  }

  const saveAi = () => {
    setProvider(provider, aiKey.trim() || undefined, aiModel || undefined)
    addToast('AI settings saved', { variant: 'success' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[680px] max-h-[80vh] bg-cx-surface border border-cx-border rounded-2xl shadow-2xl flex overflow-hidden">

        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-cx-border bg-cx-bg flex flex-col py-3">
          <div className="px-4 mb-3">
            <div className="text-[13px] font-bold text-cx-text">Settings</div>
          </div>
          {SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => setSection(sec.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-left text-[12px] transition-colors',
                section === sec.id
                  ? 'bg-cx-accent/10 text-cx-accent font-medium border-r-2 border-cx-accent'
                  : 'text-cx-text-dim hover:text-cx-text hover:bg-cx-elevated'
              )}>
              <span className="text-[13px]">{sec.icon}</span>
              {sec.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={onClose}
            className="mx-3 mb-2 py-1.5 rounded-lg border border-cx-border text-[11px] text-cx-text-muted hover:text-cx-text transition-colors">
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Appearance ── */}
          {section === 'appearance' && (
            <>
              <SettingGroup label="Accent Color">
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENT_PRESETS.map(color => (
                    <button key={color} onClick={() => handleAccent(color)}
                      title={color}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-all',
                        s.accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ background: color }} />
                  ))}
                  <input type="color" value={s.accentColor}
                    onChange={e => handleAccent(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Custom color" />
                </div>
              </SettingGroup>

              <SettingGroup label="Node Card Size">
                <SegmentedControl
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'normal',  label: 'Normal' },
                    { value: 'large',   label: 'Large' },
                  ]}
                  value={s.nodeCardSize}
                  onChange={(v) => s.set({ nodeCardSize: v as any })}
                />
              </SettingGroup>
            </>
          )}

          {/* ── Canvas ── */}
          {section === 'canvas' && (
            <>
              <SettingGroup label="Canvas Background">
                <SegmentedControl
                  options={[
                    { value: 'dots',  label: 'Dots' },
                    { value: 'lines', label: 'Lines' },
                    { value: 'cross', label: 'Cross' },
                    { value: 'none',  label: 'None' },
                  ]}
                  value={s.canvasBackground}
                  onChange={(v) => s.set({ canvasBackground: v as any })}
                />
              </SettingGroup>

              <SettingGroup label="Edge Style">
                <SegmentedControl
                  options={[
                    { value: 'bezier',   label: 'Bezier' },
                    { value: 'straight', label: 'Straight' },
                    { value: 'step',     label: 'Step' },
                  ]}
                  value={s.edgeStyle}
                  onChange={(v) => s.set({ edgeStyle: v as any })}
                />
              </SettingGroup>

              <SettingRow label="Show Minimap" description="Thumbnail overview in the canvas corner">
                <Toggle value={s.showMinimap} onChange={(v) => s.set({ showMinimap: v })} />
              </SettingRow>

              <SettingRow label="Show Grid" description="Dot grid background on the canvas">
                <Toggle value={s.showGrid} onChange={(v) => s.set({ showGrid: v })} />
              </SettingRow>

              <SettingRow label="Snap to Grid" description="Nodes snap to the nearest grid point when moved">
                <Toggle value={s.snapToGrid} onChange={(v) => s.set({ snapToGrid: v })} />
              </SettingRow>

              <SettingRow label="Show Controls" description="Zoom + fit controls in bottom-left of canvas">
                <Toggle value={s.showControls} onChange={(v) => s.set({ showControls: v })} />
              </SettingRow>
            </>
          )}

          {/* ── General ── */}
          {section === 'general' && (
            <>
              <SettingRow label="Auto Save" description="Automatically save graph changes as you work">
                <Toggle value={s.autoSave} onChange={(v) => s.set({ autoSave: v })} />
              </SettingRow>

              <SettingRow label="Right Panel" description="Show the inspector panel by default">
                <Toggle value={rightPanelOpen} onChange={() => toggleRightPanel()} />
              </SettingRow>

              <SettingRow label="Confirm Deletes" description="Ask for confirmation before deleting items">
                <Toggle value={s.confirmDeletes} onChange={(v) => s.set({ confirmDeletes: v })} />
              </SettingRow>

              <SettingGroup label="Seed Batch Size">
                <div className="flex items-center gap-3">
                  <input type="range" min={10} max={200} step={10}
                    value={s.chunkSize}
                    onChange={e => s.set({ chunkSize: Number(e.target.value) })}
                    className="flex-1 accent-[var(--cx-accent)]" />
                  <span className="text-[12px] text-cx-text w-8 text-right">{s.chunkSize}</span>
                </div>
                <p className="text-[10px] text-cx-text-muted mt-1">
                  Nodes per IPC batch when seeding. Lower = safer, higher = faster.
                </p>
              </SettingGroup>

              <div className="pt-2 border-t border-cx-border">
                {resetConfirm ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-[11px] text-cx-text-muted flex-1">Reset all settings to defaults?</span>
                    <button onClick={handleReset}
                      className="px-3 py-1 rounded-lg bg-cx-error/20 text-cx-error text-[11px] hover:bg-cx-error/30">
                      Reset
                    </button>
                    <button onClick={() => setResetConfirm(false)}
                      className="px-3 py-1 rounded-lg border border-cx-border text-[11px] text-cx-text-muted">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setResetConfirm(true)}
                    className="text-[11px] text-cx-text-muted hover:text-cx-error transition-colors">
                    Reset to Defaults
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── AI ── */}
          {section === 'ai' && (
            <>
              <SettingGroup label="Provider">
                <div className="flex gap-1.5">
                  {AI_PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => { setProvider(p.id); setAiModel('') }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                        provider === p.id
                          ? 'bg-cx-accent text-white'
                          : 'bg-cx-elevated text-cx-text-muted hover:text-cx-text border border-cx-border'
                      )}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </SettingGroup>

              <SettingGroup label="Model">
                <select value={aiModel} onChange={e => setAiModel(e.target.value)}
                  className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                             text-[12px] text-cx-text focus:outline-none focus:border-cx-accent/50">
                  <option value="">Default</option>
                  {(AI_PROVIDERS.find(p => p.id === provider)?.models ?? []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </SettingGroup>

              {provider !== 'ollama' && (
                <SettingGroup label="API Key">
                  <input type="password" value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder="Paste your API key…"
                    className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                               text-[12px] text-cx-text placeholder-cx-text-muted
                               focus:outline-none focus:border-cx-accent/50" />
                </SettingGroup>
              )}

              <button onClick={saveAi}
                className="px-4 py-2 rounded-lg bg-cx-accent text-white text-[12px] font-medium
                           hover:opacity-90 transition-opacity">
                Save AI Settings
              </button>
            </>
          )}

          {/* ── Data ── */}
          {section === 'data' && (
            <>
              <SettingGroup label="Node Library">
                <div className="bg-cx-elevated border border-cx-border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-cx-text font-medium">{nodeCount.toLocaleString()} nodes</div>
                    <div className="text-[10px] text-cx-text-muted mt-0.5">
                      Global library · 3,273 in seed
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={handleReseed} disabled={reseeding}
                      className="px-3 py-1.5 rounded-lg bg-cx-elevated border border-cx-border text-[11px]
                                 text-cx-text-muted hover:text-cx-text disabled:opacity-50 transition-colors">
                      {reseeding ? 'Seeding…' : 'Re-seed Nodes'}
                    </button>
                  )}
                </div>
              </SettingGroup>

              {isAdmin && (
              <SettingGroup label="Danger Zone">
                <p className="text-[11px] text-cx-text-muted mb-3">
                  Permanently remove all nodes from every vault. This cannot be undone.
                </p>
                {clearAllConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-cx-error">Remove all nodes?</span>
                    <button onClick={handleClearAll} disabled={clearingAll}
                      className="px-3 py-1.5 rounded-lg bg-cx-error/20 border border-cx-error/40 text-[11px]
                                 text-cx-error hover:bg-cx-error/30 disabled:opacity-50 transition-colors">
                      {clearingAll ? 'Clearing…' : 'Yes, remove all'}
                    </button>
                    <button onClick={() => setClearAllConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-cx-border text-[11px]
                                 text-cx-text-muted hover:text-cx-text transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setClearAllConfirm(true)}
                    className="px-3 py-1.5 rounded-lg border border-cx-error/40 text-[11px]
                               text-cx-error hover:bg-cx-error/10 transition-colors">
                    Remove All Nodes
                  </button>
                )}
              </SettingGroup>
              )}

              <SettingGroup label="Export Vault Data">
                <p className="text-[11px] text-cx-text-muted mb-2">
                  Download all graphs in the current vault as JSON.
                </p>
                <button
                  onClick={() => addToast('Export coming soon', { variant: 'info' })}
                  className="px-4 py-1.5 rounded-lg border border-cx-border text-[12px] text-cx-text-muted
                             hover:text-cx-text hover:bg-cx-elevated transition-colors">
                  Export Vault
                </button>
              </SettingGroup>

              <SettingGroup label="Danger Zone">
                <div className="border border-cx-error/30 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] text-cx-text-muted leading-relaxed">
                    These actions are permanent and cannot be undone.
                  </div>
                  <button
                    onClick={() => addToast('Select a vault to delete it from the sidebar', { variant: 'warning' })}
                    className="w-full py-1.5 rounded-lg border border-cx-error/30 text-[11px] text-cx-error
                               hover:bg-cx-error/10 transition-colors">
                    Delete Vault
                  </button>
                </div>
              </SettingGroup>
            </>
          )}

          {/* ── Shortcuts ── */}
          {section === 'shortcuts' && (
            <div className="space-y-1">
              {SHORTCUTS.map((sc, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-cx-border last:border-0">
                  <span className="text-[12px] text-cx-text">{sc.label}</span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((k, j) => (
                      <kbd key={j}
                        className="px-1.5 py-0.5 bg-cx-elevated border border-cx-border rounded text-[10px]
                                   text-cx-text-muted font-mono min-w-[1.5rem] text-center">
                        {k}
                      </kbd>
                    ))}
                  </div>
                     </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">{label}</div>
      {children}
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cx-border last:border-0">
      <div>
        <div className="text-[12px] text-cx-text">{label}</div>
        {description && <div className="text-[10px] text-cx-text-muted mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
        value ? 'bg-cx-accent' : 'bg-cx-elevated border border-cx-border'
      )}>
      <span className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-4' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex bg-cx-elevated border border-cx-border rounded-lg p-0.5 gap-0.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 py-1 rounded-md text-[11px] font-medium transition-all',
            o.value === value
              ? 'bg-cx-surface text-cx-text'
              : 'text-cx-text-muted hover:text-cx-text'
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
