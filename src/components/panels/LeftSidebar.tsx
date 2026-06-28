import { useState } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'
import { cn } from '@/utils/cn'
import { SOFTWARE_COLORS } from '@/utils/constants'

type NavId = 'home' | 'graph' | 'nodes' | 'search' | 'analytics' | 'import' | 'ai' | 'recipes' | 'templates' | 'media' | 'bookmarks' | 'trash'

const NAV_ITEMS: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: 'home',      label: 'Home',      icon: <HomeIcon /> },
  { id: 'graph',     label: 'Graph',     icon: <GraphIcon /> },
  { id: 'nodes',     label: 'Nodes',     icon: <NodesIcon /> },
  { id: 'search',    label: 'Search',    icon: <SearchNavIcon /> },
  { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  { id: 'import',    label: 'Import',    icon: <ImportIcon /> },
  { id: 'ai',        label: 'AI',        icon: <AiIcon /> },
  { id: 'recipes',   label: 'Recipes',   icon: <RecipesIcon /> },
  { id: 'templates', label: 'Templates', icon: <TemplatesIcon /> },
  { id: 'media',     label: 'Media',     icon: <MediaIcon /> },
  { id: 'bookmarks', label: 'Bookmarks', icon: <BookmarkIcon /> },
  { id: 'trash',     label: 'Trash',     icon: <TrashIcon /> },
]

const TAG_COLORS = ['#4FC3F7','#EF9A9A','#FF6B35','#FFE082','#CE93D8','#80CBC4','#A5D6A7','#FFAB91']

const SOFTWARE_META: Record<string, { label: string; short: string }> = {
  houdini:   { label: 'Houdini',      short: 'H' },
  nuke:      { label: 'Nuke',         short: 'N' },
  blender:   { label: 'Blender',      short: 'B' },
  unreal:    { label: 'Unreal Engine',short: 'U' },
  substance: { label: 'Substance 3D', short: 'S' },
}

export function LeftSidebar({ onOpenSettings, onOpenBridge }: { onOpenSettings?: () => void; onOpenBridge?: () => void }) {
  const { vaults, activeVaultId, setActiveVault, deleteVault, updateVault } = useVaultStore()
  const getVaultNodes = useNodeStore(s => s.getVaultNodes)
  const { openCommandPalette, toggleNav, setActiveNav, activeNavId, addToast, setTagFilter, activeTagFilter } = useUiStore()
  const { isAdmin } = useAdminStore()

  const [vaultsExpanded, setVaultsExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(true)
  const [confirmVaultId, setConfirmVaultId] = useState<string | null>(null)
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null)
  const [editVaultName, setEditVaultName] = useState('')

  const startVaultRename = (id: string, name: string) => { setEditingVaultId(id); setEditVaultName(name) }
  const commitVaultRename = async () => {
    if (!editingVaultId || !editVaultName.trim()) { setEditingVaultId(null); return }
    await updateVault({ id: editingVaultId, name: editVaultName.trim() })
    addToast('Vault renamed', { variant: 'success' })
    setEditingVaultId(null)
  }

  const NAV_PANEL_IDS = new Set(['home','graph','nodes','search','analytics','import','ai','recipes','templates','media','bookmarks','trash'])

  return (
    <div
      className="w-[192px] flex-shrink-0 flex flex-col h-full overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, rgba(9,9,26,0.98) 0%, rgba(7,7,20,0.98) 100%)',
        borderRight: '1px solid rgba(24,24,58,0.7)',
        boxShadow: '1px 0 0 rgba(255,255,255,0.02), 4px 0 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(123,111,255,0.06) 0%, transparent 70%)' }} />

      {/* + New button */}
      <div className="px-3 pt-3 pb-2.5 flex-shrink-0 relative">
        <button
          onClick={openCommandPalette}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold
                     text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7b6fff 0%, #6058dd 100%)',
            boxShadow: '0 2px 12px rgba(123,111,255,0.3), 0 0 0 1px rgba(123,111,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-[16px] leading-none font-light">+</span>
          <span>New</span>
          <span className="ml-auto text-[9px] text-white/50 font-mono">⌘K</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 flex-shrink-0 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            active={activeNavId === item.id}
            onClick={() => {
              if (item.id === 'home') setActiveNav('home')
              else if (NAV_PANEL_IDS.has(item.id)) toggleNav(item.id as any)
            }}
            icon={item.icon}
          >
            {item.label}
          </NavItem>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2.5 flex-shrink-0" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(24,24,58,0.8) 30%, rgba(24,24,58,0.8) 70%, transparent)' }} />

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
                      className="flex items-center gap-2.5 px-2 py-1.5 flex-1 min-w-0 text-left text-[12px]"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: color + '28', color, border: `1px solid ${color}40`, boxShadow: isActive ? `0 0 6px ${color}30` : 'none' }}
                      >
                        {vault.icon ?? meta?.short ?? vault.name[0].toUpperCase()}
                      </span>
                      <span className={cn('truncate flex-1 transition-colors', isActive ? 'text-cx-text' : 'text-cx-text-dim')}>
                        {vault.name}
                      </span>
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
                        >✕</button>
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

/* ── Sub-components ──────────────────────────────────────── */

function NavItem({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left text-[12px] transition-all duration-150',
        active
          ? 'text-cx-accent font-medium'
          : 'text-cx-text-dim hover:text-cx-text hover:bg-cx-elevated/60'
      )}
      style={active ? {
        background: 'linear-gradient(90deg, rgba(123,111,255,0.12) 0%, rgba(123,111,255,0.04) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(123,111,255,0.1)',
      } : undefined}
    >
      {/* Active left accent bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
              style={{ background: 'var(--cx-accent)', boxShadow: '0 0 6px rgba(123,111,255,0.7)' }} />
      )}
      <span className={cn('flex-shrink-0', active ? 'text-cx-accent' : 'text-cx-text-muted')}>
        {icon}
      </span>
      {children}
    </button>
  )
}

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
