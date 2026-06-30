import { useState } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'
import { useGraphStore } from '@/stores/graph.store'
import { cn } from '@/utils/cn'
import { SOFTWARE_COLORS } from '@/utils/constants'

type NavId = 'home' | 'graph' | 'nodes' | 'search' | 'analytics' | 'import' | 'ai' | 'recipes' | 'templates' | 'media' | 'bookmarks' | 'trash'

interface NavDef { id: NavId; label: string; color: string; shortcut?: string; icon: React.ReactNode; soon?: boolean }

const NAV_GROUPS: { id: string; label?: string; items: NavDef[] }[] = [
  {
    id: 'core',
    items: [
      { id: 'home',   label: 'Home',   color: '#7b6fff', icon: <HomeIcon /> },
      { id: 'graph',  label: 'Graph',  color: '#60a5fa', shortcut: 'G', icon: <GraphIcon /> },
      { id: 'nodes',  label: 'Nodes',  color: '#a78bfa', shortcut: 'N', icon: <NodesIcon /> },
      { id: 'search', label: 'Search', color: '#34d399', shortcut: '/', icon: <SearchNavIcon /> },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { id: 'analytics', label: 'Analytics', color: '#f59e0b', icon: <AnalyticsIcon /> },
      { id: 'recipes',   label: 'Recipes',   color: '#f472b6', icon: <RecipesIcon />,   soon: true },
      { id: 'templates', label: 'Templates', color: '#818cf8', icon: <TemplatesIcon /> },
      { id: 'media',     label: 'Media',     color: '#4ade80', icon: <MediaIcon />,     soon: true },
      { id: 'bookmarks', label: 'Bookmarks', color: '#facc15', icon: <BookmarkIcon />, soon: true },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'ai',     label: 'AI',     color: '#22d3ee', icon: <AiIcon /> },
      { id: 'import', label: 'Bridge', color: '#fb923c', icon: <ImportIcon /> },
      { id: 'trash',  label: 'Trash',  color: '#f87171', icon: <TrashIcon />,  soon: true },
    ],
  },
]

const TAG_COLORS = ['#4FC3F7','#EF9A9A','#FF6B35','#FFE082','#CE93D8','#80CBC4','#A5D6A7','#FFAB91']

const SOFTWARE_META: Record<string, { label: string; short: string }> = {
  houdini:   { label: 'Houdini',      short: 'H' },
  nuke:      { label: 'Nuke',         short: 'N' },
  blender:   { label: 'Blender',      short: 'B' },
  unreal:    { label: 'Unreal Engine',short: 'U' },
  substance: { label: 'Substance 3D', short: 'S' },
}

export function LeftSidebar({ onOpenSettings, onOpenBridge, onOpenShortcuts }: { onOpenSettings?: () => void; onOpenBridge?: () => void; onOpenShortcuts?: () => void }) {
  const { vaults, activeVaultId, setActiveVault, deleteVault, updateVault } = useVaultStore()
  const getVaultNodes = useNodeStore(s => s.getVaultNodes)
  const { openCommandPalette, toggleNav, setActiveNav, activeNavId, addToast, setTagFilter, activeTagFilter } = useUiStore()
  const { isAdmin } = useAdminStore()
  const byVault = useGraphStore(s => s.byVault)

  const [vaultsExpanded, setVaultsExpanded] = useState(true)
  const [tagsExpanded,   setTagsExpanded]   = useState(true)
  const [confirmVaultId, setConfirmVaultId] = useState<string | null>(null)
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null)
  const [editVaultName,  setEditVaultName]  = useState('')

  const startVaultRename = (id: string, name: string) => { setEditingVaultId(id); setEditVaultName(name) }
  const commitVaultRename = async () => {
    if (!editingVaultId || !editVaultName.trim()) { setEditingVaultId(null); return }
    await updateVault({ id: editingVaultId, name: editVaultName.trim() })
    addToast('Vault renamed', { variant: 'success' })
    setEditingVaultId(null)
  }

  const NAV_PANEL_IDS = new Set(['home','graph','nodes','search','analytics','import','ai','recipes','templates','media','bookmarks','trash'])

  const graphCount = activeVaultId ? (byVault[activeVaultId]?.length ?? 0) : 0
  const nodeCount  = activeVaultId ? getVaultNodes(activeVaultId).length : 0

  const getBadge = (id: NavId): number | undefined => {
    if (id === 'graph') return graphCount > 0 ? graphCount : undefined
    if (id === 'nodes') return nodeCount  > 0 ? nodeCount  : undefined
    return undefined
  }

  const handleNavClick = (id: NavId) => {
    if (id === 'home') setActiveNav('home')
    else if (NAV_PANEL_IDS.has(id)) toggleNav(id as any)
  }

  return (
    <div
      className="w-[192px] flex-shrink-0 flex flex-col h-full overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, rgba(9,9,26,0.98) 0%, rgba(7,7,20,0.98) 100%)',
        borderRight: '1px solid rgba(24,24,58,0.7)',
        boxShadow: '1px 0 0 rgba(255,255,255,0.02), 4px 0 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Ambient top glow */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at 40% 0%, rgba(123,111,255,0.07) 0%, transparent 70%)' }} />

      {/* + New button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 relative">
        <button
          onClick={openCommandPalette}
          className="w-full flex items-center gap-2 px-3.5 py-[9px] rounded-xl text-[12px] font-semibold
                     text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7b6fff 0%, #6058dd 100%)',
            boxShadow: '0 2px 14px rgba(123,111,255,0.28), 0 0 0 1px rgba(123,111,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <span className="w-4 h-4 rounded-md bg-white/15 flex items-center justify-center text-[13px] leading-none font-light flex-shrink-0">+</span>
          <span>New</span>
          <span className="ml-auto text-[9px] text-white/45 font-mono">⌘K</span>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="px-2 pb-1 flex-shrink-0">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.id}>
            {gi > 0 && (
              <div className="mx-1 my-2" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(24,24,58,0.9) 20%, rgba(24,24,58,0.9) 80%, transparent)' }} />
            )}
            {group.label && (
              <div className="px-2.5 mb-1 mt-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(234,234,248,0.2)' }}>
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(def => (
                <NavItem
                  key={def.id}
                  def={def}
                  active={activeNavId === def.id}
                  onClick={() => handleNavClick(def.id)}
                  badge={getBadge(def.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2 flex-shrink-0" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(24,24,58,0.8) 30%, rgba(24,24,58,0.8) 70%, transparent)' }} />

      {/* Scrollable lower section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">

        {/* Vaults */}
        <SectionHeader label="Vaults" expanded={vaultsExpanded} onToggle={() => setVaultsExpanded(v => !v)} />
        {vaultsExpanded && (
          <div className="mt-1 space-y-0.5">
            {vaults.map(vault => {
              const sw = vault.settings?.defaultSoftware
              const color = sw ? SOFTWARE_COLORS[sw] ?? '#7b6fff' : vault.color ?? '#7b6fff'
              const meta = sw ? SOFTWARE_META[sw] : null
              const isActive = vault.id === activeVaultId
              const vGraphs = byVault[vault.id]?.length ?? 0
              const vNodes  = getVaultNodes(vault.id).length

              return (
                <div
                  key={vault.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg transition-all duration-150',
                    isActive ? 'bg-cx-accent/8' : 'hover:bg-cx-elevated/60'
                  )}
                >
                  {editingVaultId === vault.id ? (
                    <input
                      autoFocus
                      value={editVaultName}
                      onChange={e => setEditVaultName(e.target.value)}
                      onBlur={commitVaultRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitVaultRename()
                        if (e.key === 'Escape') setEditingVaultId(null)
                      }}
                      className="flex-1 mx-1 my-0.5 bg-cx-elevated border border-cx-accent/50 rounded-lg px-2 py-1
                                 text-[11px] text-cx-text focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setActiveVault(vault.id)}
                      onDoubleClick={() => startVaultRename(vault.id, vault.name)}
                      className="flex items-center gap-2.5 px-2 py-1.5 flex-1 min-w-0 text-left"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all duration-150"
                        style={{
                          backgroundColor: color + '28',
                          color,
                          border: `1px solid ${color}40`,
                          boxShadow: isActive ? `0 0 8px ${color}30` : 'none',
                        }}
                      >
                        {vault.icon ?? meta?.short ?? vault.name[0].toUpperCase()}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn('text-[12px] truncate transition-colors', isActive ? 'text-cx-text' : 'text-cx-text-dim')}>
                          {vault.name}
                        </span>
                        <span className="text-[9px]" style={{ color: 'rgba(234,234,248,0.22)' }}>
                          {vGraphs}g &middot; {vNodes}n
                        </span>
                      </div>
                      {isActive && (
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                      )}
                    </button>
                  )}
                  {editingVaultId !== vault.id && (
                    confirmVaultId === vault.id ? (
                      <div className="flex items-center gap-0.5 pr-1 flex-shrink-0">
                        <button
                          onClick={async () => { await deleteVault(vault.id); addToast('Vault deleted', { variant: 'default' }); setConfirmVaultId(null) }}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-cx-error/15 text-cx-error hover:bg-cx-error/25 transition-colors"
                        >Del</button>
                        <button onClick={() => setConfirmVaultId(null)}
                          className="text-[9px] px-1 py-0.5 rounded text-cx-text-muted hover:bg-cx-elevated"
                        >&#x2715;</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmVaultId(vault.id)}
                        className="flex-shrink-0 w-5 h-5 mr-1 flex items-center justify-center rounded
                                   text-cx-text-muted hover:text-cx-error hover:bg-cx-error/10
                                   opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 2.5h7M3.5 2.5V1.5h3v1M2.5 2.5l.5 6h4l.5-6"/>
                        </svg>
                      </button>
                    )
                  )}
                </div>
              )
            })}

            {/* Add Vault */}
            <button
              onClick={openCommandPalette}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left group
                         text-[11px] text-cx-text-muted hover:text-cx-text-dim hover:bg-cx-elevated/50
                         transition-all duration-150"
            >
              <span className="w-5 h-5 rounded-md border border-dashed border-cx-border-bright/60 flex items-center justify-center
                               text-[13px] flex-shrink-0 group-hover:border-cx-accent/30 group-hover:text-cx-accent/50 transition-colors">
                +
              </span>
              <span>Add Vault</span>
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="my-2.5" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(24,24,58,0.7) 30%, rgba(24,24,58,0.7) 70%, transparent)' }} />

        {/* Tags */}
        <SectionHeader label="Tags" expanded={tagsExpanded} onToggle={() => setTagsExpanded(v => !v)} />
        {tagsExpanded && (() => {
          const nodes = activeVaultId ? getVaultNodes(activeVaultId) : []
          const uniqueTags = [...new Set(nodes.flatMap(n => n.tags))].sort()
          if (uniqueTags.length === 0) return (
            <p className="text-[10px] text-cx-text-muted px-1 mt-1.5">No tags yet</p>
          )
          return (
            <div className="mt-1.5 flex flex-wrap gap-1 px-1">
              {uniqueTags.map((tag, i) => {
                const color = TAG_COLORS[i % TAG_COLORS.length]
                const isActive = activeTagFilter === tag
                return (
                  <button key={tag}
                    onClick={() => { setTagFilter(tag); toggleNav('nodes' as any) }}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium
                               transition-all duration-150 hover:opacity-90"
                    style={{
                      backgroundColor: color + (isActive ? '28' : '14'),
                      color,
                      border: `1px solid ${color}${isActive ? '55' : '30'}`,
                      boxShadow: isActive ? `0 0 8px ${color}25` : 'none',
                    }}
                  >
                    #{tag}
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(24,24,58,0.7)', background: 'rgba(5,5,12,0.6)' }}>
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          {isAdmin && (
            <button onClick={onOpenBridge} title="VFX Import (Admin)"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
                         text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated/80 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 9 Q3.5 5 7 5 Q10.5 5 13 9"/>
                <line x1="3" y1="9" x2="3" y2="12"/><line x1="11" y1="9" x2="11" y2="12"/>
                <line x1="1" y1="12" x2="13" y2="12"/>
              </svg>
            </button>
          )}
          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
                       text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated/80 flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5.5"/>
              <path d="M5.5 5.5a1.5 1.5 0 012.5 1c0 1-1.5 1.5-1.5 2.5"/>
              <circle cx="7" cy="10.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button onClick={onOpenSettings} title="Settings"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
                       text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated/80 flex-shrink-0">
            <SettingsSmIcon />
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-cx-text-muted ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-cx-success flex-shrink-0"
                  style={{ boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />
            <span>Auto Save</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── NavItem ──────────────────────────────────────────────── */

function NavItem({ def, active, onClick, badge }: {
  def: NavDef
  active: boolean
  onClick: () => void
  badge?: number
}) {
  if (def.soon) return (
    <div
      className="relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left text-[12px] cursor-default"
      style={{ color: 'rgba(234,234,248,0.18)' }}
      title={`${def.label} — coming soon`}
    >
      <span className="flex-shrink-0" style={{ color: def.color + '35' }}>{def.icon}</span>
      <span className="flex-1 truncate">{def.label}</span>
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(234,234,248,0.22)', border: '1px solid rgba(255,255,255,0.06)' }}>
        soon
      </span>
    </div>
  )
  const [hovered, setHovered] = useState(false)
  const c = def.color

  const iconColor = active ? c : hovered ? (c + 'bb') : 'rgba(234,234,248,0.28)'
  const textColor = active ? 'rgba(234,234,248,0.95)' : hovered ? 'rgba(234,234,248,0.7)' : 'rgba(234,234,248,0.4)'

  const bgStyle: React.CSSProperties = active
    ? { background: `linear-gradient(90deg, ${c}18 0%, ${c}06 100%)`, boxShadow: `inset 0 0 0 1px ${c}14` }
    : hovered
    ? { background: `${c}0a` }
    : {}

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left text-[12px] transition-all duration-150"
      style={{ color: textColor, ...bgStyle }}
    >
      {/* Active left accent bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
          style={{ background: c, boxShadow: `0 0 8px ${c}cc` }}
        />
      )}

      {/* Icon */}
      <span className="flex-shrink-0 transition-colors duration-150" style={{ color: iconColor }}>
        {def.icon}
      </span>

      {/* Label */}
      <span className={cn('flex-1 truncate', active && 'font-medium')}>
        {def.label}
      </span>

      {/* Shortcut hint on hover */}
      {def.shortcut && hovered && !active && (
        <kbd
          className="text-[9px] font-mono px-1.5 py-0.5 rounded leading-none flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${c}25`,
            color: `${c}90`,
          }}
        >
          {def.shortcut}
        </kbd>
      )}

      {/* Count badge */}
      {badge != null && !(hovered && def.shortcut && !active) && (
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 transition-all duration-150"
          style={{
            background: active ? `${c}22` : 'rgba(255,255,255,0.05)',
            color: active ? c : 'rgba(234,234,248,0.25)',
            border: `1px solid ${active ? c + '28' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

/* ── SectionHeader ───────────────────────────────────────── */

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-1.5 px-1 py-1 group mb-0.5">
      <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor"
           className="text-cx-text-muted transition-transform duration-200 flex-shrink-0"
           style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
        <path d="M2 1.5 L6 4 L2 6.5Z"/>
      </svg>
      <span className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.12em] group-hover:text-cx-text-dim transition-colors">
        {label}
      </span>
    </button>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
function HomeIcon()      { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6.5 L7 1.5 L13 6.5"/><path d="M2.5 5.5 V12 H5.5 V8.5 H8.5 V12 H11.5 V5.5"/></svg> }
function GraphIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="2.5" cy="7" r="1.5"/><circle cx="11.5" cy="3" r="1.5"/><circle cx="11.5" cy="11" r="1.5"/><line x1="4" y1="6.3" x2="10" y2="3.7"/><line x1="4" y1="7.7" x2="10" y2="10.3"/></svg> }
function NodesIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 L12 4 L12 10 L7 13 L2 10 L2 4 Z"/></svg> }
function RecipesIcon()   { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="5" y1="4.5" x2="9" y2="4.5"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="5" y1="9.5" x2="7.5" y2="9.5"/></svg> }
function TemplatesIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="5" height="5" rx="1.2"/><rect x="7.5" y="1.5" width="5" height="5" rx="1.2"/><rect x="1.5" y="7.5" width="5" height="5" rx="1.2"/><rect x="7.5" y="7.5" width="5" height="5" rx="1.2"/></svg> }
function MediaIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1.5"/><path d="M5.5 5.5 L9.5 7 L5.5 8.5 Z" fill="currentColor" stroke="none"/></svg> }
function BookmarkIcon()  { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1.5 H11 V12.5 L7 9.5 L3 12.5 Z"/></svg> }
function TrashIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h10"/><path d="M5 4V2.5h4V4"/><rect x="3" y="4" width="8" height="8" rx="1.2"/><line x1="5.5" y1="6.5" x2="5.5" y2="9.5"/><line x1="8.5" y1="6.5" x2="8.5" y2="9.5"/></svg> }
function SearchNavIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><line x1="9" y1="9" x2="12.5" y2="12.5"/></svg> }
function AnalyticsIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 11 L5 7 L8 9 L12 3"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/></svg> }
function ImportIcon()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5 L7 9.5"/><path d="M4 7 L7 10 L10 7"/><path d="M2 12 H12"/></svg> }
function AiIcon()        { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5h4M7 2.5v2M3.5 4.5h7l1 6H2.5l1-6zM5.5 7.5h3M7 7.5v1.5"/></svg> }
function SettingsSmIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="2.2"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13"/><path d="M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1"/></svg> }
