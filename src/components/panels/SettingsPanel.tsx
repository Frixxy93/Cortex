import { useState, useEffect } from 'react'
import { useSettingsStore, type Profile } from '@/stores/settings.store'
import { useAiStore } from '@/stores/ai.store'
import { useUiStore } from '@/stores/ui.store'
import { useNodeStore } from '@/stores/node.store'
import { useVaultStore } from '@/stores/vault.store'
import { useAdminStore } from '@/stores/admin.store'
import { useGraphStore } from '@/stores/graph.store'
import { NodeService } from '@/services/node.service'
import type { AiProvider } from '@/types'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getVersion } from '@tauri-apps/api/app'
import { check as checkForUpdate } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { OS, OS_LABELS, getModKey, isMac } from '@/utils/platform'

type Section =
  | 'profile' | 'appearance' | 'general' | 'shortcuts'
  | 'canvas' | 'nodes' | 'search'
  | 'ai'
  | 'analytics' | 'recipes' | 'templates' | 'media' | 'bookmarks'
  | 'bridge' | 'data' | 'trash'
  | 'appmode' | 'updates'

interface NavGroup {
  label: string
  items: { id: Section; label: string; icon: React.ReactNode; desc: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'App',
    items: [
      { id: 'profile',    label: 'Profile',    icon: <ProfileIcon />,    desc: 'Name, avatar color' },
      { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon />, desc: 'Colors, sizing, visual style' },
      { id: 'general',    label: 'General',    icon: <GeneralIcon />,    desc: 'Behaviour, auto-save' },
      { id: 'shortcuts',  label: 'Shortcuts',  icon: <ShortcutsIcon />,  desc: 'Keyboard bindings' },
      { id: 'appmode',    label: 'App Mode',   icon: <AppModeIcon />,    desc: 'Title bar, OS, window style' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'canvas', label: 'Canvas', icon: <CanvasIcon />,  desc: 'Grid, edges, minimap' },
      { id: 'nodes',  label: 'Nodes',  icon: <NodesIcon />,   desc: 'Library display, sort, cards' },
      { id: 'search', label: 'Search', icon: <SearchIcon />,  desc: 'Scope, results, fuzzy' },
    ],
  },
  {
    label: 'AI',
    items: [
      { id: 'ai', label: 'AI Copilot', icon: <AiIcon />, desc: 'Provider, model, API key' },
    ],
  },
  {
    label: 'Library',
    items: [
      { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />,  desc: 'Tracking, retention, privacy' },
      { id: 'recipes',   label: 'Recipes',   icon: <RecipesIcon />,    desc: 'Workflow automation' },
      { id: 'templates', label: 'Templates', icon: <TemplatesIcon />,  desc: 'Graph templates' },
      { id: 'media',     label: 'Media',     icon: <MediaIcon />,      desc: 'Media library, folder' },
      { id: 'bookmarks', label: 'Bookmarks', icon: <BookmarksIcon />,  desc: 'Saved nodes & graphs' },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'bridge', label: 'Bridge',  icon: <BridgeIcon />,  desc: 'Import settings' },
      { id: 'data',   label: 'Library', icon: <DataIcon />,    desc: 'Export, reseed, danger' },
      { id: 'trash',  label: 'Trash',   icon: <TrashIcon />,   desc: 'Auto-empty, retention' },
      { id: 'updates', label: 'Updates',  icon: <UpdatesIcon />, desc: 'Version, check for updates' },
    ],
  },
]

const ALL_SECTIONS = NAV_GROUPS.flatMap(g => g.items)

const ACCENT_PRESETS = [
  { hex: '#7b6fff', name: 'Violet' },
  { hex: '#34d399', name: 'Emerald' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#60a5fa', name: 'Blue' },
  { hex: '#f472b6', name: 'Pink' },
  { hex: '#a78bfa', name: 'Purple' },
  { hex: '#fb923c', name: 'Orange' },
  { hex: '#2dd4bf', name: 'Teal' },
]

const AI_PROVIDERS: { id: AiProvider; label: string; models: string[] }[] = [
  { id: 'anthropic', label: 'Anthropic', models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',    label: 'OpenAI',    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'ollama',    label: 'Ollama',    models: ['llama3', 'mistral', 'mixtral', 'codellama'] },
]

const SHORTCUTS = [
  { id: 'palette',   keys: ['⌘', 'K'],       label: 'Command palette',      category: 'Global', rebindable: true  },
  { id: 'save',      keys: ['⌘', 'S'],       label: 'Save graph',            category: 'Global', rebindable: true  },
  { id: 'undo',      keys: ['⌘', 'Z'],       label: 'Undo',                  category: 'Global', rebindable: false },
  { id: 'redo',      keys: ['⌘', '⇧', 'Z'],  label: 'Redo',                  category: 'Global', rebindable: false },
  { id: 'close',     keys: ['Esc'],           label: 'Close panel / palette', category: 'Global', rebindable: false },
  { id: 'settings',  keys: ['⌘', ','],        label: 'Open settings',         category: 'Global', rebindable: true  },
  { id: 'duplicate', keys: ['⌘', 'D'],        label: 'Duplicate node',        category: 'Canvas', rebindable: true  },
  { id: 'delete',    keys: ['Del'],            label: 'Delete selected node',  category: 'Canvas', rebindable: false },
  { id: 'multisel',  keys: ['⇧', 'Click'],    label: 'Multi-select nodes',    category: 'Canvas', rebindable: false },
  { id: 'pan',       keys: ['Space'],          label: 'Pan canvas',            category: 'Canvas', rebindable: false },
  { id: 'zoomin',    keys: ['⌘', '='],        label: 'Zoom in',               category: 'Canvas', rebindable: false },
  { id: 'zoomout',   keys: ['⌘', '-'],        label: 'Zoom out',              category: 'Canvas', rebindable: false },
  { id: 'fitview',   keys: ['⌘', '0'],        label: 'Fit to view',           category: 'Canvas', rebindable: true  },
  { id: 'search',    keys: ['⌘', 'F'],        label: 'Focus search',          category: 'Search', rebindable: true  },
  { id: 'newgraph',  keys: ['⌘', 'N'],        label: 'New graph',             category: 'Canvas', rebindable: true  },
]

interface Props { onClose: () => void }

export function SettingsPanel({ onClose }: Props) {
  const [section, setSection] = useState<Section>('appearance')
  const [appVersion, setAppVersion] = useState('...')
  useEffect(() => { getVersion().then(setAppVersion) }, [])
  const s = useSettingsStore()
  const { provider, apiKey, model, setProvider } = useAiStore()
  const { addToast, rightPanelOpen, toggleRightPanel } = useUiStore()
  const { activeVaultId, deleteVault } = useVaultStore()
  const { getAllNodes } = useNodeStore()
  const { graphs, byVault } = useGraphStore()
  const { isAdmin } = useAdminStore()

  const [aiKey,           setAiKey]           = useState(apiKey ?? '')
  const [aiModel,         setAiModel]         = useState(model ?? '')
  const [showKey,         setShowKey]         = useState(false)
  const [reseeding,       setReseeding]       = useState(false)
  const [clearingAll,     setClearingAll]     = useState(false)
  const [clearAllConfirm,    setClearAllConfirm]    = useState(false)
  const [deleteVaultConfirm, setDeleteVaultConfirm] = useState(false)
  const [deletingVault,      setDeletingVault]      = useState(false)
  const [resetConfirm,    setResetConfirm]    = useState(false)
  const [scSearch,        setScSearch]        = useState('')
  const [recording,       setRecording]       = useState<string | null>(null)
  const [mediaPath,       setMediaPath]       = useState(s.mediaFolder)
  const modKey = getModKey(s.cmdKey)

  const nodeCount = getAllNodes().length
  const activeSec = ALL_SECTIONS.find(x => x.id === section)!

  const handleAccent = (color: string) => {
    s.set({ accentColor: color })
    document.documentElement.style.setProperty('--cx-accent', color)
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
    } finally { setReseeding(false) }
  }

  const handleClearAll = async () => {
    setClearingAll(true)
    try {
      const count = await NodeService.clearAll()
      useNodeStore.getState().clearAll?.()
      addToast(`Removed ${count.toLocaleString()} nodes`, { variant: 'success' })
    } catch (err) {
      addToast(`Clear failed: ${String(err)}`, { variant: 'error' })
    } finally { setClearingAll(false); setClearAllConfirm(false) }
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

  const filteredShortcuts = SHORTCUTS.filter(sc =>
    !scSearch || sc.label.toLowerCase().includes(scSearch.toLowerCase()) ||
    sc.keys.join(' ').toLowerCase().includes(scSearch.toLowerCase())
  )
  const scCategories = [...new Set(filteredShortcuts.map(sc => sc.category))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,2,8,0.75)', backdropFilter: 'blur(12px)' }}>
      <div className="flex overflow-hidden animate-modal-in" style={{ width: 760, maxHeight: '86vh', background: 'linear-gradient(160deg, rgba(11,11,28,0.99) 0%, rgba(8,8,22,0.99) 100%)', border: '1px solid rgba(36,36,80,0.8)', borderRadius: 22, boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(123,111,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col py-3" style={{ width: 192, borderRight: '1px solid rgba(18,18,46,0.9)', background: 'rgba(5,5,14,0.6)', overflowY: 'auto' }}>
          <div className="px-4 pb-3 mb-1" style={{ borderBottom: '1px solid rgba(18,18,46,0.7)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'rgba(210,210,240,0.9)' }}>Settings</div>
          </div>

          <nav className="flex-1 px-2 py-1 space-y-3">
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <div className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(60,60,100,0.9)' }}>
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(sec => {
                    const active = section === sec.id
                    return (
                      <button key={sec.id} onClick={() => setSection(sec.id)} className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all" style={{ background: active ? 'rgba(123,111,255,0.1)' : 'transparent', boxShadow: active ? 'inset 0 0 0 1px rgba(123,111,255,0.18)' : 'none' }}>
                        <span style={{ color: active ? 'var(--cx-accent)' : 'rgba(90,90,140,0.8)' }} className="transition-colors group-hover:text-cx-text-dim flex-shrink-0">
                          {sec.icon}
                        </span>
                        <span className="text-[12px] font-medium transition-colors" style={{ color: active ? 'rgba(200,197,255,0.95)' : 'rgba(150,150,190,0.8)' }}>
                          {sec.label}
                        </span>
                        {active && (
                          <span className="ml-auto w-1 h-4 rounded-full flex-shrink-0" style={{ background: 'var(--cx-accent)', boxShadow: '0 0 8px rgba(123,111,255,0.6)' }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-3 pt-2 mt-1 space-y-2" style={{ borderTop: '1px solid rgba(18,18,46,0.7)' }}>
            <button onClick={onClose} className="w-full py-2 rounded-xl text-[11px] font-medium transition-all" style={{ background: 'rgba(14,14,34,0.7)', border: '1px solid rgba(24,24,58,0.8)', color: 'rgba(120,120,160,0.8)' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(180,180,220,0.9)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(120,120,160,0.8)' }}>
              Close
            </button>
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(90,90,140,0.5)' }}>CORTEX</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(123,111,255,0.08)', color: 'rgba(123,111,255,0.5)', border: '1px solid rgba(123,111,255,0.12)' }}>v{appVersion}</span>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(18,18,46,0.8)' }}>
            <span style={{ color: 'var(--cx-accent)' }}>{activeSec.icon}</span>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: 'rgba(220,220,248,0.95)' }}>{activeSec.label}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(90,90,140,0.8)' }}>{activeSec.desc}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

            {/* ── Profile ────────────────────────────────── */}
            {section === 'profile' && (
              <ProfileSection s={s} />
            )}

            {/* ── Appearance ──────────────────────────────── */}
            {section === 'appearance' && (
              <>
                <SettingGroup label="Accent Color">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_PRESETS.map(({ hex, name }) => {
                      const active = s.accentColor === hex
                      return (
                        <button key={hex} onClick={() => handleAccent(hex)} title={name} className="relative w-7 h-7 rounded-full flex-shrink-0 transition-all hover:scale-110" style={{ background: hex, boxShadow: active ? `0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3.5px ${hex}, 0 0 12px ${hex}60` : 'none', transform: active ? 'scale(1.15)' : undefined }}>
                          {active && (
                            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" className="absolute inset-0 m-auto" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 5l2.5 2.5L8 3"/>
                            </svg>
                          )}
                        </button>
                      )
                    })}
                    <label title="Custom color" className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105" style={{ background: 'rgba(24,24,58,0.8)', border: '1.5px dashed rgba(60,60,100,0.7)' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'rgba(120,120,180,0.7)' }}>
                        <path d="M5 1v8M1 5h8"/>
                      </svg>
                      <input type="color" value={s.accentColor} onChange={e => handleAccent(e.target.value)} className="sr-only" />
                    </label>
                    <span className="ml-1 text-[10px] font-mono" style={{ color: 'rgba(90,90,140,0.7)' }}>{s.accentColor}</span>
                  </div>
                </SettingGroup>

                <SettingGroup label="Node Card Size">
                  <SegmentedControl options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]} value={s.nodeCardSize} onChange={(v) => s.set({ nodeCardSize: v as any })} />
                </SettingGroup>
              </>
            )}

            {/* ── General ─────────────────────────────────── */}
            {section === 'general' && (
              <>
                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Auto Save" description="Save graph 5 seconds after any change">
                    <Toggle value={s.autoSave} onChange={(v) => s.set({ autoSave: v })} />
                  </SettingRow>
                  <SettingRow label="Inspector Panel" description="Show right panel by default">
                    <Toggle value={rightPanelOpen} onChange={() => toggleRightPanel()} />
                  </SettingRow>
                  <SettingRow label="Confirm Deletes" description="Ask before deleting graphs and canvas nodes">
                    <Toggle value={s.confirmDeletes} onChange={(v) => s.set({ confirmDeletes: v })} />
                  </SettingRow>
                </div>

                <SettingGroup label="Seed Batch Size">
                  <div className="flex items-center gap-3 mt-1">
                    <input type="range" min={10} max={200} step={10} value={s.chunkSize} onChange={e => s.set({ chunkSize: Number(e.target.value) })} style={{ accentColor: 'var(--cx-accent)' }} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer" />
                    <span className="text-[12px] font-mono font-semibold w-8 text-right flex-shrink-0" style={{ color: 'var(--cx-accent)' }}>{s.chunkSize}</span>
                  </div>
                  <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>Nodes per IPC batch when seeding. Lower = safer, higher = faster.</p>
                </SettingGroup>

                <div className="pt-1">
                  {resetConfirm ? (
                    <div className="flex gap-2 items-center p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <span className="text-[11px] flex-1" style={{ color: 'rgba(180,140,140,0.9)' }}>Reset all settings to defaults?</span>
                      <button onClick={handleReset} className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}>Reset</button>
                      <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 rounded-lg text-[11px] transition-colors" style={{ border: '1px solid rgba(24,24,58,0.8)', color: 'rgba(120,120,160,0.7)' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setResetConfirm(true)} className="text-[11px] transition-colors" style={{ color: 'rgba(100,100,150,0.7)' }} onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(100,100,150,0.7)' }}>
                      Reset to Defaults…
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Shortcuts ───────────────────────────────── */}
            {section === 'shortcuts' && (
              <>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'rgba(90,90,140,0.6)' }}>
                    <circle cx="5" cy="5" r="3.5"/><line x1="8" y1="8" x2="11" y2="11"/>
                  </svg>
                  <input value={scSearch} onChange={e => setScSearch(e.target.value)} placeholder="Search shortcuts…" className="cx-field w-full bg-cx-elevated border border-cx-border rounded-xl pl-9 pr-3 py-2 text-[12px] text-cx-text placeholder:text-cx-text-muted/50 focus:outline-none transition-colors" />
                </div>
                {scCategories.map(cat => (
                  <div key={cat} className="space-y-0.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] px-1 mb-2" style={{ color: 'rgba(80,80,130,0.7)' }}>{cat}</div>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                      {filteredShortcuts.filter(sc => sc.category === cat).map((sc, i, arr) => {
                        const custom = s.customShortcuts[sc.id]
                        const isRecording = recording === sc.id
                        const displayKeys = custom ? [custom] : sc.keys
                        return (
                          <div key={i}
                            className="flex items-center justify-between px-4 py-2.5 group"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(14,14,38,0.8)' : 'none', background: isRecording ? 'rgba(123,111,255,0.08)' : i % 2 === 0 ? 'rgba(14,14,34,0.3)' : 'rgba(8,8,22,0.3)' }}
                          >
                            <span className="text-[12px]" style={{ color: 'rgba(180,180,220,0.8)' }}>{sc.label}</span>
                            <div className="flex items-center gap-1.5">
                              {isRecording ? (
                                <span
                                  className="text-[10px] px-2 py-1 rounded-lg animate-pulse"
                                  style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.3)', color: 'rgba(180,170,255,0.9)' }}
                                  onKeyDown={e => {
                                    e.preventDefault(); e.stopPropagation()
                                    if (e.key === 'Escape') { setRecording(null); return }
                                    const parts: string[] = []
                                    if (e.metaKey || e.ctrlKey) parts.push(modKey)
                                    if (e.shiftKey) parts.push('⇧')
                                    if (e.altKey) parts.push('⌥')
                                    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
                                    if (!['Meta','Control','Shift','Alt'].includes(k)) parts.push(k)
                                    if (parts.length) {
                                      s.set({ customShortcuts: { ...s.customShortcuts, [sc.id]: parts.join('+') } })
                                      setRecording(null)
                                    }
                                  }}
                                  tabIndex={0}
                                  autoFocus
                                  onBlur={() => setRecording(null)}
                                >
                                  Press keys…
                                </span>
                              ) : (
                                <>
                                  {displayKeys.map((k, j) => {
                                    const display = k === '⌘' ? modKey : k
                                    return <kbd key={j} className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium min-w-[1.75rem]" style={{ background: 'rgba(14,14,34,0.9)', border: `1px solid ${custom ? 'rgba(123,111,255,0.4)' : 'rgba(40,40,80,0.9)'}`, boxShadow: '0 1px 0 rgba(0,0,0,0.5)', color: custom ? 'rgba(180,170,255,0.9)' : 'rgba(160,160,220,0.9)' }}>{display}</kbd>
                                  })}
                                  {sc.rebindable && (
                                    <button
                                      onClick={() => setRecording(sc.id)}
                                      className="opacity-0 group-hover:opacity-100 ml-1 text-[9px] px-1.5 py-0.5 rounded transition-all"
                                      style={{ background: 'rgba(123,111,255,0.1)', color: 'rgba(123,111,255,0.7)' }}
                                      title="Rebind"
                                    >✏️</button>
                                  )}
                                  {custom && (
                                    <button
                                      onClick={() => {
                                        const next = { ...s.customShortcuts }
                                        delete next[sc.id]
                                        s.set({ customShortcuts: next })
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded transition-all"
                                      style={{ background: 'rgba(248,113,113,0.1)', color: 'rgba(248,113,113,0.6)' }}
                                      title="Reset to default"
                                    >↩</button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {filteredShortcuts.length === 0 && (
                  <div className="py-8 text-center" style={{ color: 'rgba(80,80,130,0.7)' }}>
                    <div className="text-[12px]">No shortcuts match &ldquo;{scSearch}&rdquo;</div>
                  </div>
                )}
                <p className="text-[10px] text-center" style={{ color: 'rgba(80,80,130,0.5)' }}>
                  Hover a row and click ✏️ to rebind. Click ↩ to reset.
                </p>
              </>
            )}

            {/* ── Canvas ──────────────────────────────────── */}
            {section === 'canvas' && (
              <>
                <SettingGroup label="Canvas Background">
                  <SegmentedControl options={[{ value: 'dots', label: 'Dots' }, { value: 'lines', label: 'Lines' }, { value: 'cross', label: 'Cross' }, { value: 'none', label: 'None' }]} value={s.canvasBackground} onChange={(v) => s.set({ canvasBackground: v as any })} />
                </SettingGroup>

                <SettingGroup label="Edge Style">
                  <SegmentedControl options={[{ value: 'bezier', label: 'Bezier' }, { value: 'straight', label: 'Straight' }, { value: 'step', label: 'Step' }]} value={s.edgeStyle} onChange={(v) => s.set({ edgeStyle: v as any })} />
                </SettingGroup>

                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Show Minimap" description="Thumbnail overview in the corner">
                    <Toggle value={s.showMinimap} onChange={(v) => s.set({ showMinimap: v })} />
                  </SettingRow>
                  <SettingRow label="Show Grid" description="Dot grid on the canvas background">
                    <Toggle value={s.showGrid} onChange={(v) => s.set({ showGrid: v })} />
                  </SettingRow>
                  <SettingRow label="Snap to Grid" description="Nodes snap when moved">
                    <Toggle value={s.snapToGrid} onChange={(v) => s.set({ snapToGrid: v })} />
                  </SettingRow>
                  <SettingRow label="Show Controls" description="Zoom controls in the canvas">
                    <Toggle value={s.showControls} onChange={(v) => s.set({ showControls: v })} />
                  </SettingRow>
                </div>
              </>
            )}

            {/* ── Nodes ───────────────────────────────────── */}
            {section === 'nodes' && (
              <>
                <SettingGroup label="Default Sort Order">
                  <SegmentedControl options={[{ value: 'name', label: 'Name' }, { value: 'type', label: 'Type' }, { value: 'recent', label: 'Recent' }]} value={s.nodeSortOrder} onChange={(v) => s.set({ nodeSortOrder: v as any })} />
                </SettingGroup>

                <SettingGroup label="Card Size">
                  <SegmentedControl options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]} value={s.nodeCardSize} onChange={(v) => s.set({ nodeCardSize: v as any })} />
                </SettingGroup>

                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Show Descriptions" description="Show node description text in the library">
                    <Toggle value={s.nodeShowDescriptions} onChange={(v) => s.set({ nodeShowDescriptions: v })} />
                  </SettingRow>
                </div>

                <StatCard icon={<NodesIcon />} color="#a78bfa" title={`${nodeCount.toLocaleString()} nodes`} sub="in global library" />
              </>
            )}

            {/* ── Search ──────────────────────────────────── */}
            {section === 'search' && (
              <>
                <SettingGroup label="Search Scope">
                  <SegmentedControl options={[{ value: 'global', label: 'Global' }, { value: 'vault', label: 'Vault' }, { value: 'graph', label: 'Graph' }]} value={s.searchScope} onChange={(v) => s.set({ searchScope: v as any })} />
                  <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>Global searches all vaults. Vault and Graph narrow results to the active context.</p>
                </SettingGroup>

                <SettingGroup label="Result Limit">
                  <div className="flex items-center gap-3 mt-1">
                    <input type="range" min={10} max={200} step={10} value={s.searchResultLimit} onChange={e => s.set({ searchResultLimit: Number(e.target.value) })} style={{ accentColor: 'var(--cx-accent)' }} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer" />
                    <span className="text-[12px] font-mono font-semibold w-10 text-right flex-shrink-0" style={{ color: 'var(--cx-accent)' }}>{s.searchResultLimit}</span>
                  </div>
                </SettingGroup>

                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Fuzzy Matching" description="Match partial words and typos">
                    <Toggle value={s.searchFuzzy} onChange={(v) => s.set({ searchFuzzy: v })} />
                  </SettingRow>
                  <SettingRow label="Save History" description="Remember recent searches">
                    <Toggle value={s.searchSaveHistory} onChange={(v) => s.set({ searchSaveHistory: v })} />
                  </SettingRow>
                </div>
              </>
            )}

            {/* ── AI ──────────────────────────────────────── */}
            {section === 'ai' && (
              <>
                <SettingGroup label="Provider">
                  <div className="flex gap-1.5">
                    {AI_PROVIDERS.map(p => {
                      const active = provider === p.id
                      return (
                        <button key={p.id} onClick={() => { setProvider(p.id); setAiModel('') }} className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all" style={{ background: active ? 'rgba(123,111,255,0.15)' : 'rgba(14,14,34,0.7)', border: `1px solid ${active ? 'rgba(123,111,255,0.35)' : 'rgba(24,24,58,0.8)'}`, color: active ? 'rgba(200,197,255,0.95)' : 'rgba(110,110,160,0.7)', boxShadow: active ? '0 0 16px rgba(123,111,255,0.12)' : 'none' }}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </SettingGroup>

                <SettingGroup label="Model">
                  <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="cx-field w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2 text-[12px] text-cx-text focus:outline-none transition-colors">
                    <option value="">Default</option>
                    {(AI_PROVIDERS.find(p => p.id === provider)?.models ?? []).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </SettingGroup>

                {provider !== 'ollama' && (
                  <SettingGroup label="API Key">
                    <div className="relative">
                      <input type={showKey ? 'text' : 'password'} value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="Paste your API key…" className="cx-field w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2 pr-10 text-[12px] text-cx-text placeholder:text-cx-text-muted/50 focus:outline-none transition-colors font-mono" />
                      <button onClick={() => setShowKey(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cx-text-muted hover:text-cx-text-dim transition-colors">
                        {showKey ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    {aiKey && <p className="text-[10px] mt-1" style={{ color: 'rgba(80,80,130,0.7)' }}>Stored locally — never sent to Cortex servers.</p>}
                  </SettingGroup>
                )}

                <button onClick={saveAi} className="px-5 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, var(--cx-accent), var(--cx-accent-dim))', boxShadow: '0 2px 12px rgba(123,111,255,0.3)' }}>
                  Save AI Settings
                </button>
              </>
            )}

            {/* ── Analytics ───────────────────────────────── */}
            {section === 'analytics' && (
              <>
                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Enable Analytics" description="Track usage patterns to improve your workflow">
                    <Toggle value={s.analyticsEnabled} onChange={(v) => s.set({ analyticsEnabled: v })} />
                  </SettingRow>
                </div>

                <SettingGroup label="Data Retention">
                  <SegmentedControl options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} value={String(s.analyticsRetention)} onChange={(v) => s.set({ analyticsRetention: Number(v) as any })} />
                  <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>Activity data older than this is automatically removed. All data stays local.</p>
                </SettingGroup>

                <InsightsDashboard />
              </>
            )}

            {/* ── Recipes ─────────────────────────────────── */}
            {section === 'recipes' && (
              <>
                <SettingGroup label="Recipes">
                  <div className="rounded-xl px-3 py-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">🎬</span>
                      <div>
                        <div className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(234,234,248,0.8)' }}>Record node workflows as reusable Recipes</div>
                        <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(234,234,248,0.35)' }}>Capture a sequence of nodes once, replay it on any graph with one click or via the command palette.</div>
                      </div>
                    </div>
                    <div className="text-[9px] font-semibold px-2 py-1 rounded-full text-center" style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.15)', color: 'rgba(244,114,182,0.6)' }}>
                      Coming in v0.5
                    </div>
                  </div>
                </SettingGroup>
              </>
            )}

            {/* ── Templates ───────────────────────────────── */}
            {section === 'templates' && (
              <>
                <SettingGroup label="Template Library">
                  <div className="rounded-xl px-3 py-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { name: 'Pyro FX', icon: '🔥', tag: 'houdini' },
                      { name: 'Character Rig', icon: '🦴', tag: 'kinefx' },
                      { name: 'Procedural City', icon: '🏙️', tag: 'houdini' },
                      { name: 'VDB Workflow', icon: '🫧', tag: 'vdb' },
                      { name: 'Nuke Comp', icon: '🎬', tag: 'nuke' },
                      { name: 'Lookdev', icon: '💡', tag: 'shading' },
                      { name: 'Crowd Sim', icon: '🧑‍🤝‍🧑', tag: 'crowds' },
                      { name: 'Pipeline Handoff', icon: '🔗', tag: 'pipeline' },
                    ].map(t => (
                      <div key={t.name} className="flex items-center gap-2">
                        <span className="text-sm">{t.icon}</span>
                        <span className="text-[11px]" style={{ color: 'rgba(234,234,248,0.7)' }}>{t.name}</span>
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(123,111,255,0.1)', color: 'rgba(123,111,255,0.6)' }}>{t.tag}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>
                    Open via the Templates panel in the sidebar. Custom template sharing coming in v0.5.
                  </p>
                </SettingGroup>
              </>
            )}

            {/* ── Media ───────────────────────────────────── */}
            {section === 'media' && (
              <>
                <SettingGroup label="Media Folder">
                  <div className="flex gap-2">
                    <input value={mediaPath} onChange={e => setMediaPath(e.target.value)} placeholder="/path/to/media…" className="cx-field flex-1 bg-cx-elevated border border-cx-border rounded-xl px-3 py-2 text-[12px] text-cx-text placeholder:text-cx-text-muted/50 focus:outline-none transition-colors font-mono" />
                    <button onClick={() => { s.set({ mediaFolder: mediaPath }); addToast('Media folder saved', { variant: 'success' }) }} className="px-4 py-2 rounded-xl text-[11px] font-medium transition-all flex-shrink-0" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.2)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.12)' }}>Save</button>
                  </div>
                  <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>Local folder scanned for images, audio, and video files.</p>
                </SettingGroup>

                <ComingSoon label="Media Library" desc="Browse, tag, and attach media to nodes directly from the library panel." color="#4ade80" />
              </>
            )}

            {/* ── Bookmarks ───────────────────────────────── */}
            {section === 'bookmarks' && (
              <>
                <SettingGroup label="Bookmarks">
                  <div className="rounded-xl px-3 py-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">📌</span>
                      <div>
                        <div className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(234,234,248,0.8)' }}>Pin nodes and graphs you use every day</div>
                        <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(234,234,248,0.35)' }}>Bookmarks follow your profile — not the vault — so they travel with you across every project.</div>
                      </div>
                    </div>
                    <div className="text-[9px] font-semibold px-2 py-1 rounded-full text-center" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.6)' }}>
                      Coming in v0.5
                    </div>
                  </div>
                </SettingGroup>
              </>
            )}

            {/* ── Bridge ──────────────────────────────────── */}
            {section === 'bridge' && (
              <>
                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Auto-detect Format" description="Automatically detect JSON, CSV, and YAML on import">
                    <Toggle value={s.bridgeAutoDetect} onChange={v => s.set({ bridgeAutoDetect: v })} />
                  </SettingRow>
                  <SettingRow label="Preview Before Import" description="Show a diff preview before committing changes">
                    <Toggle value={s.bridgePreviewImport} onChange={v => s.set({ bridgePreviewImport: v })} />
                  </SettingRow>
                </div>

                <ComingSoon label="Bridge Connectors" desc="Import nodes from Notion, Obsidian, Figma, and other tools via native connectors." color="#fb923c" />
              </>
            )}

            {/* ── Data ────────────────────────────────────── */}
            {section === 'data' && (
              <>
                <SettingGroup label="Node Library">
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(14,14,34,0.6)', border: '1px solid rgba(24,24,58,0.8)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.2)' }}>
                        <DataIcon size={16} color="rgba(150,140,255,0.8)" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'rgba(200,200,240,0.9)' }}>
                          {nodeCount.toLocaleString()}
                          <span className="text-[11px] font-normal ml-1.5" style={{ color: 'rgba(100,100,150,0.7)' }}>nodes</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(80,80,130,0.7)' }}>Global library · 3,273 in seed</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={handleReseed} disabled={reseeding} className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40" style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(36,36,80,0.8)', color: 'rgba(140,140,190,0.8)' }} onMouseEnter={e => !reseeding && (e.currentTarget.style.color = 'rgba(200,197,255,0.9)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(140,140,190,0.8)')}>
                        {reseeding ? <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>Seeding…</span> : 'Re-seed'}
                      </button>
                    )}
                  </div>
                </SettingGroup>

                <SettingGroup label="Export">
                  <p className="text-[11px] mb-2.5 leading-relaxed" style={{ color: 'rgba(90,90,140,0.8)' }}>Download all graphs in the active vault as a single JSON archive.</p>
                  <button onClick={() => {
                    const vaultGraphIds = activeVaultId ? (byVault[activeVaultId] ?? []) : Object.keys(graphs)
                    const payload = { exportedAt: new Date().toISOString(), graphs: vaultGraphIds.map((id: string) => graphs[id]).filter(Boolean) }
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'cortex-vault-export.json'; a.click()
                    URL.revokeObjectURL(url)
                    addToast(`Exported ${payload.graphs.length} graph${payload.graphs.length !== 1 ? 's' : ''}`, { variant: 'success' })
                  }} className="px-4 py-2 rounded-xl text-[11px] font-medium transition-all" style={{ background: 'rgba(14,14,34,0.7)', border: '1px solid rgba(36,36,80,0.8)', color: 'rgba(140,140,190,0.8)' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(200,197,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(80,70,200,0.4)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(140,140,190,0.8)'; e.currentTarget.style.borderColor = 'rgba(36,36,80,0.8)' }}>
                    Export Vault JSON
                  </button>
                </SettingGroup>

                {isAdmin && (
                  <SettingGroup label="Danger Zone">
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.03)' }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(248,113,113,0.12)' }}>
                        <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(180,130,130,0.8)' }}>These actions are permanent and cannot be undone.</div>
                      </div>
                      <div className="p-3 space-y-2">
                        {clearAllConfirm ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] flex-1" style={{ color: '#f87171' }}>Remove all nodes from every vault?</span>
                            <button onClick={handleClearAll} disabled={clearingAll} className="px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-50 transition-colors" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                              {clearingAll ? 'Clearing…' : 'Yes, remove all'}
                            </button>
                            <button onClick={() => setClearAllConfirm(false)} className="px-3 py-1.5 rounded-lg text-[11px] transition-colors" style={{ border: '1px solid rgba(36,36,80,0.8)', color: 'rgba(120,120,160,0.7)' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setClearAllConfirm(true)} className="w-full py-2 rounded-lg text-[11px] font-medium transition-colors" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            Remove All Nodes
                          </button>
                        )}
                        {deleteVaultConfirm ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] flex-1" style={{ color: '#f87171' }}>Permanently delete this vault and all its graphs?</span>
                            <button onClick={async () => { if (!activeVaultId) return; setDeletingVault(true); try { await deleteVault(activeVaultId); addToast('Vault deleted', { variant: 'default' }); onClose() } catch(e) { addToast(`Delete failed: ${String(e)}`, { variant: 'error' }) } finally { setDeletingVault(false); setDeleteVaultConfirm(false) } }} disabled={deletingVault} className="px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-50 transition-colors" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                              {deletingVault ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button onClick={() => setDeleteVaultConfirm(false)} className="px-3 py-1.5 rounded-lg text-[11px] transition-colors" style={{ border: '1px solid rgba(36,36,80,0.8)', color: 'rgba(120,120,160,0.7)' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => activeVaultId ? setDeleteVaultConfirm(true) : addToast('No active vault', { variant: 'warning' })} className="w-full py-2 rounded-lg text-[11px] font-medium transition-colors" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            Delete Active Vault
                          </button>
                        )}
                      </div>
                    </div>
                  </SettingGroup>
                )}
              </>
            )}

            {/* ── App Mode ─────────────────────────────────── */}
            {section === 'appmode' && (
              <>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1" style={{ background: 'rgba(14,14,34,0.6)', border: '1px solid rgba(24,24,58,0.8)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.2)' }}>
                    <OSIcon os={OS} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: 'rgba(200,200,240,0.9)' }}>Detected: {OS_LABELS[OS]}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'rgba(80,80,130,0.7)' }}>Modifier key auto-set to <span style={{ color: 'var(--cx-accent)', fontWeight: 600 }}>{isMac ? '⌘ Command' : 'Ctrl'}</span></div>
                  </div>
                </div>

                <SettingGroup label="Title Bar Style">
                  <div className="space-y-1.5">
                    {([['custom', 'Custom', 'CORTEX styled title bar with colored controls'], ['minimal', 'Minimal', 'Thinner bar — more canvas space'], ['system', 'System Native', 'OS default window decorations']] as const).map(([val, lbl, desc]) => {
                      const active = s.titleBarStyle === val
                      return (
                        <button key={val} onClick={async () => { s.set({ titleBarStyle: val }); const win = getCurrentWindow(); if (val === 'system') { await win.setDecorations(true) } else { await win.setDecorations(false) } }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all" style={{ background: active ? 'rgba(123,111,255,0.1)' : 'rgba(14,14,34,0.5)', border: `1px solid ${active ? 'rgba(123,111,255,0.3)' : 'rgba(24,24,58,0.7)'}` }}>
                          <TitleBarPreview style={val} active={active} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium" style={{ color: active ? 'rgba(200,197,255,0.95)' : 'rgba(170,170,210,0.8)' }}>{lbl}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(80,80,130,0.7)' }}>{desc}</div>
                          </div>
                          {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--cx-accent)', boxShadow: '0 0 6px rgba(123,111,255,0.8)' }} />}
                        </button>
                      )
                    })}
                  </div>
                </SettingGroup>

                <SettingGroup label="Modifier Key">
                  <SegmentedControl options={[{ value: 'auto', label: `Auto (${isMac ? '⌘' : 'Ctrl'})` }, { value: 'meta', label: '⌘ Mac' }, { value: 'ctrl', label: 'Ctrl' }]} value={s.cmdKey} onChange={(v) => s.set({ cmdKey: v as any })} />
                  <p className="text-[10px] mt-1.5" style={{ color: 'rgba(80,80,130,0.7)' }}>Controls how keyboard shortcut hints are displayed throughout the app.</p>
                </SettingGroup>

                <SettingGroup label="Window Controls Position">
                  <SegmentedControl options={[{ value: 'left', label: 'Left (macOS)' }, { value: 'right', label: 'Right (Windows)' }]} value={s.windowControlsPosition} onChange={(v) => s.set({ windowControlsPosition: v as any })} />
                </SettingGroup>

                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Current Modifier" description="Preview of the active shortcut key">
                    <div className="flex items-center gap-1.5">
                      <kbd className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold" style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.3)', boxShadow: '0 2px 0 rgba(0,0,0,0.5)', color: 'rgba(200,197,255,0.95)' }}>{modKey}</kbd>
                      <span className="text-[11px]" style={{ color: 'rgba(100,100,160,0.7)' }}>+ K, S, Z…</span>
                    </div>
                  </SettingRow>
                </div>
              </>
            )}

            {/* ── Trash ───────────────────────────────────── */}
            {section === 'trash' && (
              <>
                <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(18,18,46,0.8)' }}>
                  <SettingRow label="Auto-empty Trash" description="Automatically delete items after retention period">
                    <Toggle value={s.trashAutoEmpty} onChange={(v) => s.set({ trashAutoEmpty: v })} />
                  </SettingRow>
                </div>

                {s.trashAutoEmpty && (
                  <SettingGroup label="Retention Period">
                    <SegmentedControl options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} value={String(s.trashRetentionDays)} onChange={(v) => s.set({ trashRetentionDays: Number(v) as any })} />
                    <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(80,80,130,0.7)' }}>Items in trash older than this will be permanently deleted.</p>
                  </SettingGroup>
                )}

                <div className="pt-1">
                  <button onClick={() => addToast('Trash emptied', { variant: 'success' })} className="px-4 py-2 rounded-xl text-[11px] font-medium transition-all" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    Empty Trash Now
                  </button>
                </div>
              </>
            )}


            {section === 'updates' && (
              <UpdatesSection />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared sub-components ───────────────────────────────── */
function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(80,80,130,0.7)' }}>{label}</div>
      {children}
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(14,14,40,0.6)' }}>
      <div>
        <div className="text-[12px] font-medium" style={{ color: 'rgba(190,190,230,0.85)' }}>{label}</div>
        {description && <div className="text-[10px] mt-0.5 leading-snug" style={{ color: 'rgba(80,80,130,0.7)' }}>{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled} className="relative flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ width: 36, height: 20, borderRadius: 999, background: value && !disabled ? 'var(--cx-accent)' : 'rgba(24,24,58,0.9)', border: `1px solid ${value && !disabled ? 'transparent' : 'rgba(36,36,80,0.8)'}`, boxShadow: value && !disabled ? '0 0 10px rgba(123,111,255,0.35)' : 'none', transition: 'background 0.2s, box-shadow 0.2s' }}>
      <span className="absolute top-0.5 rounded-full bg-white shadow-md" style={{ width: 16, height: 16, left: value ? 'calc(100% - 18px)' : 2, transition: 'left 0.18s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex p-0.5 gap-0.5 rounded-xl" style={{ background: 'rgba(8,8,20,0.8)', border: '1px solid rgba(20,20,50,0.9)' }}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button key={o.value} onClick={() => onChange(o.value)} className="flex-1 py-1.5 rounded-[10px] text-[11px] font-medium transition-all" style={{ background: active ? 'rgba(123,111,255,0.15)' : 'transparent', border: `1px solid ${active ? 'rgba(123,111,255,0.25)' : 'transparent'}`, color: active ? 'rgba(200,197,255,0.95)' : 'rgba(100,100,150,0.7)', boxShadow: active ? '0 0 12px rgba(123,111,255,0.1)' : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function StatCard({ icon, color, title, sub }: { icon: React.ReactNode; color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(14,14,34,0.6)', border: '1px solid rgba(24,24,58,0.8)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-semibold" style={{ color: 'rgba(200,200,240,0.9)' }}>{title}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(80,80,130,0.7)' }}>{sub}</div>
      </div>
    </div>
  )
}


/* ── Insights Dashboard ─────────────────────────────────── */
function InsightsDashboard() {
  const { getAllNodes } = useNodeStore()
  const { graphs, byVault } = useGraphStore()
  const { activeVaultId, vaults } = useVaultStore()

  const allNodes = getAllNodes()
  const vaultGraphIds = activeVaultId ? (byVault[activeVaultId] ?? []) : []
  const vaultGraphs = vaultGraphIds.map(id => graphs[id]).filter(Boolean)

  // Software breakdown from node tags
  const softwareCounts = allNodes.reduce<Record<string, number>>((acc, n) => {
    const tags: string[] = Array.isArray(n.tags) ? n.tags : []
    const sw = tags.find(t => ['houdini','nuke','katana','blender','unreal','maya'].includes(t.toLowerCase()))
    if (sw) acc[sw.toLowerCase()] = (acc[sw.toLowerCase()] ?? 0) + 1
    return acc
  }, {})
  const swEntries = Object.entries(softwareCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxSw = swEntries[0]?.[1] ?? 1

  // Category breakdown
  const catCounts = allNodes.reduce<Record<string, number>>((acc, n) => {
    const cat = typeof n.category === 'string' ? n.category : (n.category as any)?.type ?? 'other'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxCat = catEntries[0]?.[1] ?? 1

  // Graph size distribution
  const graphSizes = vaultGraphs.map(g => g.nodes?.length ?? 0)
  const avgNodes = graphSizes.length ? Math.round(graphSizes.reduce((a, b) => a + b, 0) / graphSizes.length) : 0
  const maxNodes = graphSizes.length ? Math.max(...graphSizes) : 0

  const SW_COLORS: Record<string, string> = {
    houdini: '#FF6B35', nuke: '#8BC34A', katana: '#E8A020',
    blender: '#f472b6', unreal: '#22d3ee', maya: '#a78bfa',
  }

  const stat = (label: string, value: string | number, sub?: string) => (
    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-[18px] font-bold" style={{ color: 'rgba(234,234,248,0.9)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'rgba(234,234,248,0.4)' }}>{label}</div>
      {sub && <div className="text-[9px]" style={{ color: 'rgba(234,234,248,0.25)' }}>{sub}</div>}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-2">
        {stat('Nodes in library', allNodes.length.toLocaleString())}
        {stat('Graphs', vaultGraphs.length, `in ${vaults.length} vault${vaults.length !== 1 ? 's' : ''}`)}
        {stat('Avg nodes/graph', avgNodes || '—', maxNodes ? `max ${maxNodes}` : '')}
      </div>

      {/* Software breakdown */}
      {swEntries.length > 0 && (
        <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(234,234,248,0.3)' }}>Software</div>
          <div className="space-y-2">
            {swEntries.map(([sw, count]) => (
              <div key={sw} className="flex items-center gap-2">
                <div className="text-[10px] w-14 capitalize flex-shrink-0" style={{ color: 'rgba(234,234,248,0.5)' }}>{sw}</div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((count / maxSw) * 100)}%`, background: SW_COLORS[sw] ?? 'var(--cx-accent)' }} />
                </div>
                <div className="text-[10px] w-6 text-right" style={{ color: 'rgba(234,234,248,0.35)' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {catEntries.length > 0 && (
        <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(234,234,248,0.3)' }}>Categories</div>
          <div className="space-y-2">
            {catEntries.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="text-[10px] w-20 capitalize flex-shrink-0 truncate" style={{ color: 'rgba(234,234,248,0.5)' }}>{cat.replace(/_/g, ' ')}</div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((count / maxCat) * 100)}%`, background: 'var(--cx-accent)' }} />
                </div>
                <div className="text-[10px] w-6 text-right" style={{ color: 'rgba(234,234,248,0.35)' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allNodes.length === 0 && (
        <div className="text-center py-4 text-[11px]" style={{ color: 'rgba(234,234,248,0.25)' }}>
          Import nodes to see insights
        </div>
      )}
    </div>
  )
}

function ComingSoon({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8"/>
          <path d="M10 6v4l3 3"/>
        </svg>
      </div>
      <div>
        <div className="text-[13px] font-semibold mb-1" style={{ color: 'rgba(200,200,240,0.85)' }}>{label}</div>
        <div className="text-[11px] leading-relaxed max-w-[280px]" style={{ color: 'rgba(90,90,140,0.8)' }}>{desc}</div>
      </div>
      <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: `${color}14`, border: `1px solid ${color}28`, color }}>
        Coming Soon
      </div>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────── */

/* ── Updates section ────────────────────────────────────── */
type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'error'

function UpdatesSection() {
  const [appVersion, setAppVersion] = useState('...')
  useEffect(() => { getVersion().then(setAppVersion) }, [])
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<{ version: string; date?: string; body?: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [updateObj, setUpdateObj] = useState<any>(null)

  const isDev = import.meta.env.DEV

  const handleCheck = async () => {
    if (isDev) {
      setStatus('error')
      setErrorMsg('Update checks are disabled in dev mode. Build a release to test updates.')
      return
    }
    setStatus('checking')
    setErrorMsg(null)
    setUpdateInfo(null)
    try {
      const update = await checkForUpdate()
      if (update?.available) {
        setUpdateObj(update)
        setUpdateInfo({ version: update.version, date: update.date, body: update.body ?? undefined })
        setStatus('available')
      } else {
        setStatus('up-to-date')
      }
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  const handleInstall = async () => {
    if (!updateObj) return
    setStatus('downloading')
    setProgress(0)
    try {
      let downloaded = 0
      let total = 0
      await updateObj.downloadAndInstall((evt: any) => {
        if (evt.event === 'Started') { total = evt.data.contentLength ?? 0 }
        if (evt.event === 'Progress') {
          downloaded += evt.data.chunkLength ?? 0
          setProgress(total > 0 ? Math.round((downloaded / total) * 100) : 50)
        }
      })
      await relaunch()
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Current version card */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: 'rgba(234,234,248,0.8)' }}>CORTEX</div>
          <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'rgba(234,234,248,0.35)' }}>v{appVersion}</div>
        </div>
        {status === 'up-to-date' && (
          <div className="text-[10px] px-2 py-1 rounded-full font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
            Up to date
          </div>
        )}
      </div>

      {/* Check / status */}
      {status === 'idle' || status === 'up-to-date' || status === 'error' ? (
        <button
          onClick={handleCheck}
          className="w-full py-2 rounded-xl text-[12px] font-medium transition-all"
          style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.25)', color: 'rgba(180,170,255,0.9)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.12)' }}
        >
          Check for Updates
        </button>
      ) : status === 'checking' ? (
        <div className="w-full py-2 rounded-xl text-[12px] text-center animate-pulse"
          style={{ background: 'rgba(123,111,255,0.07)', border: '1px solid rgba(123,111,255,0.15)', color: 'rgba(123,111,255,0.6)' }}>
          Checking…
        </div>
      ) : status === 'downloading' ? (
        <div className="space-y-2">
          <div className="w-full py-2 rounded-xl text-[12px] text-center"
            style={{ background: 'rgba(123,111,255,0.07)', border: '1px solid rgba(123,111,255,0.15)', color: 'rgba(123,111,255,0.6)' }}>
            Downloading… {progress}%
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--cx-accent)' }} />
          </div>
        </div>
      ) : null}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="text-[10px] px-3 py-2 rounded-lg leading-relaxed"
          style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          {errorMsg}
        </div>
      )}

      {/* Update available */}
      {status === 'available' && updateInfo && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold" style={{ color: '#34d399' }}>
                v{updateInfo.version} available
              </div>
              {updateInfo.date && (
                <div className="text-[10px]" style={{ color: 'rgba(234,234,248,0.3)' }}>
                  {new Date(updateInfo.date).toLocaleDateString()}
                </div>
              )}
            </div>
            {updateInfo.body && (
              <div className="text-[10px] leading-relaxed whitespace-pre-wrap"
                style={{ color: 'rgba(234,234,248,0.45)', maxHeight: 120, overflow: 'auto' }}>
                {updateInfo.body}
              </div>
            )}
          </div>
          <button
            onClick={handleInstall}
            className="w-full py-2 rounded-xl text-[12px] font-medium transition-all"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.15)' }}
          >
            Download & Install
          </button>
        </div>
      )}

      {/* Auto-update note */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(80,80,130,0.6)' }}>
        CORTEX checks for updates automatically on launch. Updates are signed and verified before install.
      </p>
    </div>
  )
}

function UpdatesIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v6M5 6l3-3 3 3"/>
      <path d="M3 11h10"/>
      <path d="M3 13.5h10" strokeOpacity="0.4"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5"/>
      <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"/>
    </svg>
  )
}
function AppearanceIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2"/><circle cx="7.5" cy="7.5" r="2.5" fill="currentColor" opacity="0.5"/></svg>
}
function GeneralIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.2 3.2l1.4 1.4M10.4 10.4l1.4 1.4M10.4 3.2l-1.4 1.4M4.6 10.4l-1.4 1.4"/></svg>
}
function ShortcutsIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="4" width="12" height="8" rx="1.5"/><path d="M4 7h1M6.5 7h1M9 7h1M4 9.5h7"/></svg>
}
function CanvasIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="12" height="12" rx="2"/><path d="M5 5h5M5 7.5h5M5 10h3"/></svg>
}
function NodesIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="3.5" cy="7.5" r="2"/><circle cx="11.5" cy="3.5" r="2"/><circle cx="11.5" cy="11.5" r="2"/><path d="M5.5 7.5h2.5M9.5 4.5L6 6.5M9.5 10.5L6 8.5"/></svg>
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="13.5" y2="13.5"/></svg>
}
function AiIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2C4.46 2 2 4.46 2 7.5S4.46 13 7.5 13 13 10.54 13 7.5 10.54 2 7.5 2z"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="10" cy="6" r="1" fill="currentColor"/><path d="M5 9.5c.8 1 3.2 1 4 0"/></svg>
}
function AnalyticsIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 13.5l4-5 3 2 4-6"/><circle cx="12.5" cy="4.5" r="1.5"/></svg>
}
function RecipesIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2v4a2.5 2.5 0 0 0 5 0V2"/><path d="M3 8h9"/><path d="M4 8v5h7V8"/></svg>
}
function TemplatesIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="12" height="12" rx="2"/><path d="M1.5 5.5h12"/><path d="M6 5.5v8"/></svg>
}
function MediaIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="12" height="9" rx="2"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M13.5 12L9.5 8l-3 3"/></svg>
}
function BookmarksIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h7a1 1 0 0 1 1 1v10l-4.5-3L3 13V3a1 1 0 0 1 1-1z"/></svg>
}
function BridgeIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 10.5 L5 5 L7.5 8 L10 5 L13.5 10.5"/><path d="M1.5 10.5 h12"/></svg>
}
function DataIcon({ size = 14, color }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke={color ?? 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="7.5" cy="4" rx="5" ry="2"/><path d="M2.5 4v3.5c0 1.1 2.24 2 5 2s5-.9 5-2V4"/><path d="M2.5 7.5V11c0 1.1 2.24 2 5 2s5-.9 5-2V7.5"/></svg>
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4.5h10M6 4.5V3h3v1.5"/><path d="M4 4.5l.7 8h5.6l.7-8"/><path d="M6.5 7v3M8.5 7v3"/></svg>
}
function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7c1.5-2.5 3.4-4 6-4s4.5 1.5 6 4c-1.5 2.5-3.4 4-6 4S2.5 9.5 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
}
function AppModeIcon() {
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2.5" width="13" height="10" rx="2"/><path d="M1 5.5h13"/><circle cx="3.5" cy="4" r="0.8" fill="currentColor"/><circle cx="5.5" cy="4" r="0.8" fill="currentColor"/><circle cx="7.5" cy="4" r="0.8" fill="currentColor"/></svg>
}
function OSIcon({ os }: { os: string }) {
  if (os === 'macos') return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 8 2"/><path d="M4 6.5C2.5 6.5 1.5 8 1.5 9.5S2 13 4 13c.8 0 1.5-.5 2-.5s1.2.5 2 .5c2 0 2.5-3.5 2.5-3.5a4 4 0 0 1-2-3.5"/></svg>
  if (os === 'windows') return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="0.5"/><rect x="8" y="1.5" width="5.5" height="5.5" rx="0.5"/><rect x="1.5" y="8" width="5.5" height="5.5" rx="0.5"/><rect x="8" y="8" width="5.5" height="5.5" rx="0.5"/></svg>
  return <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4.5v6M4.5 7.5h6"/></svg>
}
function TitleBarPreview({ style, active }: { style: string; active: boolean }) {
  const c = active ? 'rgba(123,111,255,0.6)' : 'rgba(50,50,90,0.6)'
  if (style === 'system') return (
    <div className="flex-shrink-0 w-20 h-8 rounded-md overflow-hidden flex flex-col" style={{ border: `1px solid ${c}`, background: 'rgba(8,8,20,0.8)' }}>
      <div className="flex items-center justify-between px-1.5 py-1" style={{ background: 'rgba(20,20,50,0.8)', borderBottom: `1px solid ${c}40` }}>
        <div className="text-[6px]" style={{ color: 'rgba(150,150,200,0.7)' }}>CORTEX</div>
        <div className="flex gap-0.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(60,60,100,0.6)' }} />
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(60,60,100,0.6)' }} />
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(60,60,100,0.6)' }} />
        </div>
      </div>
    </div>
  )
  if (style === 'minimal') return (
    <div className="flex-shrink-0 w-20 h-5 rounded-md overflow-hidden flex items-center px-1.5 gap-1" style={{ border: `1px solid ${c}`, background: 'rgba(8,8,20,0.8)' }}>
      <div className="flex gap-0.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff5f57' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#febc2e' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#28c840' }} />
      </div>
      <div className="flex-1 h-1.5 rounded-full mx-1" style={{ background: 'rgba(40,40,80,0.5)' }} />
    </div>
  )
  return (
    <div className="flex-shrink-0 w-20 h-8 rounded-md overflow-hidden flex items-center px-1.5 gap-1" style={{ border: `1px solid ${c}`, background: 'rgba(8,8,20,0.8)' }}>
      <div className="flex gap-0.5">
        <div className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }} />
        <div className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }} />
        <div className="w-2 h-2 rounded-full" style={{ background: '#28c840' }} />
      </div>
      <div className="flex-1 h-2 rounded-full mx-1" style={{ background: 'rgba(40,40,80,0.5)' }} />
    </div>
  )
}

function EyeOffIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l10 10M6.5 3.5C4.5 4 3 5.3 1.5 7c.8 1.4 2 2.7 3.5 3.3M8 10.5c1.3-.5 2.5-1.5 3.5-3-1-1.8-2.5-3-4.5-3.5"/></svg>
}

// ─── Profile Section ─────────────────────────────────────────────────────────
const PRESET_COLORS = ['#7b6fff','#34d399','#f59e0b','#60a5fa','#f472b6','#fb923c','#a78bfa','#ef4444']

function avatarInitials(name: string) {
  return (name || 'FX').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'FX'
}

function ProfileAvatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.32,
        background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`,
        boxShadow: `0 0 0 1px ${color}4d, 0 2px 8px rgba(0,0,0,0.4)`,
      }}
    >
      {avatarInitials(name)}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map(hex => (
        <button
          key={hex}
          onClick={() => onChange(hex)}
          className="w-6 h-6 rounded-full flex-shrink-0 transition-all hover:scale-110"
          style={{
            background: hex,
            boxShadow: value === hex
              ? `0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3.5px ${hex}, 0 0 10px ${hex}60`
              : 'none',
          }}
        >
          {value === hex && (
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" className="mx-auto" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5l2.5 2.5L8 3"/>
            </svg>
          )}
        </button>
      ))}
      <label className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all" style={{ background: 'rgba(24,24,58,0.8)', border: '1.5px dashed rgba(60,60,100,0.7)' }}>
        <span style={{ color: 'rgba(90,90,140,0.7)', fontSize: 13 }}>+</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="sr-only" />
      </label>
    </div>
  )
}

function ProfileCard({
  profile, isActive, onSwitch, onUpdate, onDelete, canDelete,
}: {
  profile: Profile
  isActive: boolean
  onSwitch: () => void
  onUpdate: (patch: Partial<Pick<Profile, 'name' | 'color'>>) => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(profile.name)
  const [draftColor, setDraftColor] = useState(profile.color)

  function saveEdit() {
    onUpdate({ name: draftName || profile.name, color: draftColor })
    setEditing(false)
  }

  function cancelEdit() {
    setDraftName(profile.name)
    setDraftColor(profile.color)
    setEditing(false)
  }

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: isActive ? 'rgba(123,111,255,0.08)' : 'rgba(255,255,255,0.025)',
        border: isActive ? '1px solid rgba(123,111,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ProfileAvatar name={draftName} color={draftColor} size={36} />
            <input
              autoFocus
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              maxLength={30}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: 'rgba(24,24,58,0.8)', border: '1px solid rgba(60,60,100,0.5)', color: 'var(--cx-text)', caretColor: 'var(--cx-accent)' }}
            />
          </div>
          <ColorPicker value={draftColor} onChange={setDraftColor} />
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(123,111,255,0.2)', border: '1px solid rgba(123,111,255,0.35)', color: '#a89fff' }}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(180,180,220,0.6)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <ProfileAvatar name={profile.name} color={profile.color} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--cx-text)' }}>{profile.name}</span>
              {isActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(123,111,255,0.15)', color: '#a89fff', border: '1px solid rgba(123,111,255,0.2)' }}>
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(90,90,140,0.6)' }}>
              {avatarInitials(profile.name)} · {profile.color}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isActive && (
              <button
                onClick={onSwitch}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.2)', color: '#a89fff' }}
              >
                Switch
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{ color: 'rgba(140,140,180,0.6)' }}
              title="Edit"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"/>
              </svg>
            </button>
            {canDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
                style={{ color: 'rgba(239,68,68,0.5)' }}
                title="Delete profile"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M2 2l7 7M9 2L2 9"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileSection({ s }: { s: import('@/stores/settings.store').SettingsState }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#7b6fff')

  function handleCreate() {
    if (!newName.trim()) return
    s.addProfile(newName.trim(), newColor)
    setNewName('')
    setNewColor('#7b6fff')
    setCreating(false)
  }

  return (
    <>
      <SettingGroup label="Profiles">
        <div className="space-y-2">
          {s.profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={profile.id === s.activeProfileId}
              onSwitch={() => s.switchProfile(profile.id)}
              onUpdate={(patch) => s.updateProfile(profile.id, patch)}
              onDelete={() => s.removeProfile(profile.id)}
              canDelete={s.profiles.length > 1}
            />
          ))}
        </div>

        {creating ? (
          <div className="mt-3 rounded-xl p-3 space-y-3" style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.2)' }}>
            <div className="flex items-center gap-3">
              <ProfileAvatar name={newName || 'New'} color={newColor} size={36} />
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Profile name"
                maxLength={30}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{ background: 'rgba(24,24,58,0.8)', border: '1px solid rgba(60,60,100,0.5)', color: 'var(--cx-text)', caretColor: 'var(--cx-accent)' }}
              />
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(123,111,255,0.2)', border: '1px solid rgba(123,111,255,0.35)', color: '#a89fff' }}
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(180,180,220,0.6)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
            style={{ background: 'rgba(123,111,255,0.06)', border: '1px dashed rgba(123,111,255,0.25)', color: 'rgba(123,111,255,0.7)' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5.5 1v9M1 5.5h9"/>
            </svg>
            New Profile
          </button>
        )}
      </SettingGroup>

      <SettingGroup label="Active Profile">
        <div className="flex items-center gap-3 py-1">
          <ProfileAvatar name={s.profileName} color={s.profileColor} size={44} />
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--cx-text)' }}>{s.profileName}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(90,90,140,0.6)' }}>Shown in title bar avatar</div>
          </div>
        </div>
      </SettingGroup>
    </>
  )
}
