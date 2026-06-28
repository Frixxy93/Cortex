import { useState } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
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
  
  const [vaultsExpanded, setVaultsExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(true)

  const [confirmVaultId, setConfirmVaultId] = useState<string | null>(null)
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null)
  const [editVaultName, setEditVaultName] = useState('')
  const startVaultRename = (id: string, name: string) => {
    setEditingVaultId(id)
    setEditVaultName(name)
  }
  const commitVaultRename = async () => {
    if (!editingVaultId || !editVaultName.trim()) { setEditingVaultId(null); return }
    await updateVault({ id: editingVaultId, name: editVaultName.trim() })
    addToast('Vault renamed', { variant: 'success' })
    setEditingVaultId(null)
  }

  const NAV_PANEL_IDS = new Set(['home', 'graph', 'nodes', 'search', 'analytics', 'import', 'ai', 'recipes', 'templates', 'media', 'bookmarks', 'trash'])

  return (
    <div className="w-[184px] flex-shrink-0 flex flex-col h-full bg-cx-surface border-r border-cx-border overflow-hidden"
         style={{ boxShadow: '1px 0 0 rgba(255,255,255,0.02)' }}>

      {/* + New button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={openCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                     bg-cx-accent/90 hover:bg-cx-accent text-white text-[12px] font-semibold
                     transition-all shadow-glow-sm"
        >
          <span className="text-lg leading-none">+</span>
          <span>New</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 flex-shrink-0">
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

      <div className="mx-3 my-2 h-px bg-cx-border flex-shrink-0" />

      {/* Scrollable lower section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {/* Vaults */}
        <SectionHeader
          label="Vaults"
          expanded={vaultsExpanded}
          onToggle={() => setVaultsExpanded(v => !v)}
        />
        {vaultsExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {vaults.map(vault => {
              const sw = vault.settings?.defaultSoftware
              const color = sw ? SOFTWARE_COLORS[sw] ?? '#7b6fff' : vault.color ?? '#7b6fff'
              const meta = sw ? SOFTWARE_META[sw] : null
              const isActive = vault.id === activeVaultId

              return (
                <div
                  key={vault.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg',
                    isActive ? 'bg-cx-accent/10' : 'hover:bg-cx-elevated'
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
                      className="flex-1 mx-1 my-0.5 bg-cx-elevated border border-cx-accent rounded px-2 py-1
                                 text-[11px] text-cx-text focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setActiveVault(vault.id)}
                      onDoubleClick={() => startVaultRename(vault.id, vault.name)}
                      className="flex items-center gap-2.5 px-2 py-1.5 flex-1 min-w-0 text-left transition-all duration-100 text-[12px]"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: color + '33', color, border: `1px solid ${color}44` }}
                      >
                        {vault.icon ?? meta?.short ?? vault.name[0].toUpperCase()}
                      </span>
                      <span className={cn('truncate flex-1', isActive ? 'text-cx-text' : 'text-cx-text-dim')}>
                        {vault.name}
                      </span>
                    </button>
                  )}
                  {editingVaultId !== vault.id && (
                    confirmVaultId === vault.id ? (
                      <div className="flex items-center gap-0.5 pr-1 flex-shrink-0">
                        <button
                          onClick={async () => {
                            await deleteVault(vault.id)
                            addToast('Vault deleted', { variant: 'default' })
                            setConfirmVaultId(null)
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-cx-error/20 text-cx-error hover:bg-cx-error/30 transition-colors"
                        >Del</button>
                        <button
                          onClick={() => setConfirmVaultId(null)}
                          className="text-[9px] px-1 py-0.5 rounded text-cx-text-muted hover:bg-cx-elevated transition-colors"
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmVaultId(vault.id)}
                        className="flex-shrink-0 w-5 h-5 mr-1 flex items-center justify-center rounded
                                   text-cx-text-muted hover:text-cx-error hover:bg-cx-error/10
                                   opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
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
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left
                         text-[11px] text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated
                         transition-colors"
            >
              <span className="w-5 h-5 rounded-md border border-dashed border-cx-border flex items-center justify-center
                               text-cx-text-muted text-sm flex-shrink-0">
                +
              </span>
              <span>Add Vault</span>
            </button>
          </div>
        )}

        <div className="my-2 h-px bg-cx-border" />

        {/* Tags */}
        <SectionHeader
          label="Tags"
          expanded={tagsExpanded}
          onToggle={() => setTagsExpanded(v => !v)}
        />
        {tagsExpanded && (() => {
          const nodes = activeVaultId ? getVaultNodes(activeVaultId) : []
          const uniqueTags = [...new Set(nodes.flatMap(n => n.tags))].sort()
          if (uniqueTags.length === 0) return (
            <p className="text-[10px] text-cx-text-muted px-1 mt-1">No tags yet</p>
          )
          return (
            <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
              {uniqueTags.map((tag, i) => {
                const isActive = activeTagFilter === tag
                return (
                  <button key={tag}
                    onClick={() => { setTagFilter(tag); toggleNav('nodes' as any) }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                               transition-all hover:opacity-90 cursor-pointer"
                    style={{
                      backgroundColor: TAG_COLORS[i % TAG_COLORS.length] + (isActive ? '33' : '18'),
                      color: TAG_COLORS[i % TAG_COLORS.length],
                      border: `1px solid ${TAG_COLORS[i % TAG_COLORS.length] + (isActive ? '77' : '44')}`,
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
      <div className="flex-shrink-0 border-t border-cx-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <button onClick={onOpenBridge}
            title="VFX Software Bridge"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-cx-text-muted
                       hover:bg-cx-elevated hover:text-cx-text transition-colors flex-shrink-0 text-[14px]">
            🔌
          </button>
          <button onClick={onOpenSettings}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-cx-text-muted
                       hover:bg-cx-elevated hover:text-cx-text transition-colors flex-shrink-0">
            <SettingsSmIcon />
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-cx-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-cx-success flex-shrink-0" />
            <span>Auto Save: On</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function NavItem({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[12px] transition-all duration-100',
        active
          ? 'bg-cx-accent/10 text-cx-accent font-medium'
          : 'text-cx-text-dim hover:bg-cx-elevated hover:text-cx-text'
      )}
    >
      <span className={cn('flex-shrink-0', active ? 'text-cx-accent' : 'text-cx-text-muted')}>
        {icon}
      </span>
      {children}
    </button>
  )
}

function SectionHeader({ label, expanded, onToggle }: {
  label: string; expanded: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-1 py-1 group"
    >
      <span className="text-[9px] text-cx-text-muted transition-transform duration-150"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      <span className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">
        {label}
      </span>
    </button>
  )
}


/* ── Icons ──────────────────────────────────────────────── */
function HomeIcon()      { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6.5 L7 1.5 L13 6.5"/><path d="M2.5 5.5 V12 H5.5 V8.5 H8.5 V12 H11.5 V5.5"/></svg> }
function GraphIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="2.5" cy="7" r="1.5"/><circle cx="11.5" cy="3" r="1.5"/><circle cx="11.5" cy="11" r="1.5"/><line x1="4" y1="6.3" x2="10" y2="3.7"/><line x1="4" y1="7.7" x2="10" y2="10.3"/></svg> }
function NodesIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 L12 4 L12 10 L7 13 L2 10 L2 4 Z"/></svg> }
function RecipesIcon()   { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="5" y1="4.5" x2="9" y2="4.5"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="5" y1="9.5" x2="7.5" y2="9.5"/></svg> }
function TemplatesIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="7.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="7.5" width="5" height="5" rx="1"/><rect x="7.5" y="7.5" width="5" height="5" rx="1"/></svg> }
function MediaIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1.5"/><path d="M5.5 5.5 L9.5 7 L5.5 8.5 Z" fill="currentColor" stroke="none"/></svg> }
function BookmarkIcon()  { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1.5 H11 V12.5 L7 9.5 L3 12.5 Z"/></svg> }
function TrashIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h10"/><path d="M5 4V2.5h4V4"/><rect x="3" y="4" width="8" height="8" rx="1"/><line x1="5.5" y1="6.5" x2="5.5" y2="9.5"/><line x1="8.5" y1="6.5" x2="8.5" y2="9.5"/></svg> }
function SearchNavIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="4"/><line x1="9" y1="9" x2="12.5" y2="12.5"/></svg> }
function AnalyticsIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 11 L5 7 L8 9 L12 3"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/></svg> }
function ImportIcon()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 L7 9"/><path d="M4 6.5 L7 9.5 L10 6.5"/><path d="M2 11 H12"/></svg> }
function AiIcon()        { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2 C4 2 2 4 2 7 S4 12 7 12 S12 10 12 7"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/><path d="M9.5 9.5 L11.5 11.5"/></svg> }
function SettingsSmIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="2"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1"/></svg> }
