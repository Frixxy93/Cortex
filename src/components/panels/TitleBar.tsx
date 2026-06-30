import { useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useUiStore } from '@/stores/ui.store'
import { useVaultStore } from '@/stores/vault.store'
import { useAdminStore } from '@/stores/admin.store'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { cn } from '@/utils/cn'

const appWindow = getCurrentWindow()

const NAV_LABELS: Record<string, string> = {
  home:      'Home',
  graph:     'Graph',
  nodes:     'Nodes',
  search:    'Search',
  analytics: 'Analytics',
  import:    'Bridge',
  ai:        'AI Copilot',
  recipes:   'Recipes',
  templates: 'Templates',
  media:     'Media',
  bookmarks: 'Bookmarks',
  trash:     'Trash',
}

interface Props {
  onOpenSettings?: () => void
}

export function TitleBar({ onOpenSettings }: Props) {
  const { openCommandPalette, toggleRightPanel, rightPanelOpen, activeNavId } = useUiStore()
  const { activeVault } = useVaultStore()
  const { isAdmin } = useAdminStore()
  const [searchHovered, setSearchHovered] = useState(false)

  const vault    = activeVault()
  const navLabel = activeNavId ? (NAV_LABELS[activeNavId] ?? activeNavId) : null

  return (
    <div
      className="drag flex items-center h-11 flex-shrink-0 px-4 gap-3 select-none relative z-30"
      style={{
        background:   'linear-gradient(180deg, rgba(13,13,28,0.98) 0%, rgba(9,9,26,0.95) 100%)',
        borderBottom: '1px solid rgba(24,24,58,0.8)',
        boxShadow:    '0 1px 0 rgba(255,255,255,0.025), 0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* macOS window controls */}
      <div className="no-drag flex items-center gap-1.5 flex-shrink-0">
        <WinBtn color="#ff5f57" title="Close"    onClick={() => appWindow.close()}>
          <CloseX />
        </WinBtn>
        <WinBtn color="#febc2e" title="Minimize" onClick={() => appWindow.minimize()}>
          <MinusLine />
        </WinBtn>
        <WinBtn color="#28c840" title="Maximize" onClick={() => appWindow.toggleMaximize()}>
          <MaxArrows />
        </WinBtn>
      </div>

      {/* Brand + breadcrumb */}
      <div className="no-drag flex items-center gap-2 flex-shrink-0 pl-1">
        <CortexLogo size="sm" showWordmark={false} />

        {/* Breadcrumb: vault > section */}
        <div className="flex items-center gap-1.5">
          {vault ? (
            <>
              <span
                className="text-[12px] font-semibold truncate max-w-[120px]"
                style={{ color: 'rgba(234,234,248,0.75)' }}
                title={vault.name}
              >
                {vault.name}
              </span>
              {navLabel && navLabel !== 'Home' && (
                <>
                  <ChevronRight />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: 'rgba(123,111,255,0.85)' }}
                  >
                    {navLabel}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-[12px] font-semibold" style={{ color: 'rgba(234,234,248,0.5)' }}>
              CORTEX
            </span>
          )}
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border:     '1px solid rgba(239,68,68,0.25)',
              color:      'rgba(239,68,68,0.8)',
            }}
          >
            ADMIN
          </div>
        )}
      </div>

      {/* Center search */}
      <div className="drag flex-1 flex justify-center px-4">
        <button
          className={cn(
            'no-drag w-full max-w-[520px] flex items-center gap-2.5 px-4 py-2 rounded-xl text-left',
            'border transition-all duration-200',
            searchHovered
              ? 'border-cx-accent/30 bg-cx-elevated shadow-[0_0_0_3px_rgba(123,111,255,0.08)]'
              : 'border-cx-border bg-cx-elevated/50 hover:bg-cx-elevated/80 hover:border-cx-border-bright'
          )}
          onClick={() => openCommandPalette()}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
        >
          <SearchIcon hovered={searchHovered} />
          <span className={cn(
            'text-[12px] flex-1 transition-colors duration-200',
            searchHovered ? 'text-cx-text-dim' : 'text-cx-text-muted'
          )}>
            Search nodes, parameters, tags…
          </span>
          <kbd className="text-[10px] text-cx-text-muted font-mono bg-cx-bg px-1.5 py-0.5
                          rounded border border-cx-border leading-none flex-shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="no-drag flex items-center gap-0.5 flex-shrink-0">
        <IconBtn title="Inspector panel" active={rightPanelOpen} onClick={toggleRightPanel}>
          <InspectorIcon />
        </IconBtn>
        <IconBtn title="Settings" onClick={onOpenSettings}>
          <SettingsIcon />
        </IconBtn>
        <IconBtn title="Notifications">
          <BellIcon />
        </IconBtn>

        {/* Avatar */}
        <button
          className="no-drag ml-1.5 w-7 h-7 rounded-full flex items-center justify-center
                     text-[10px] font-bold text-white transition-all duration-200
                     hover:scale-105 hover:shadow-[0_0_12px_rgba(123,111,255,0.4)]"
          style={{
            background: 'linear-gradient(135deg, #7b6fff 0%, #5a53cc 100%)',
            boxShadow:  '0 0 0 1px rgba(123,111,255,0.3), 0 2px 8px rgba(0,0,0,0.4)',
          }}
          title="Account"
        >
          FX
        </button>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */
function WinBtn({ color, title, onClick, children }: {
  color: string; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="group w-3 h-3 rounded-full flex items-center justify-center
                 transition-all duration-150 hover:scale-110 active:scale-95"
      style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}50` }}
    >
      <span className="opacity-0 group-hover:opacity-80 transition-opacity duration-100">
        {children}
      </span>
    </button>
  )
}

function IconBtn({ onClick, title, active, children }: {
  onClick?: () => void; title?: string; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150',
        active
          ? 'bg-cx-accent/15 text-cx-accent shadow-[0_0_8px_rgba(123,111,255,0.15)]'
          : 'text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated'
      )}
    >
      {children}
    </button>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
function ChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
         stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3.5 2l3 3-3 3"/>
    </svg>
  )
}
function CloseX() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.3" strokeLinecap="round">
    <line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/>
  </svg>
}
function MinusLine() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.3" strokeLinecap="round">
    <line x1="2" y1="4" x2="6" y2="4"/>
  </svg>
}
function MaxArrows() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.3" strokeLinecap="round">
    <path d="M2 5 L2 2 L5 2"/><path d="M6 3 L6 6 L3 6"/>
  </svg>
}
function SearchIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
         className={hovered ? 'text-cx-accent/60 flex-shrink-0' : 'text-cx-text-muted flex-shrink-0'}>
      <circle cx="5.5" cy="5.5" r="4"/>
      <line x1="9" y1="9" x2="12" y2="12"/>
    </svg>
  )
}
function InspectorIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="1" y="1" width="13" height="13" rx="2.5"/><line x1="9.5" y1="1.5" x2="9.5" y2="13.5"/>
  </svg>
}
function SettingsIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="7.5" cy="7.5" r="2.5"/>
    <path d="M7.5 1v1.5M7.5 12v1.5M1 7.5h1.5M12.5 7.5H14"/>
    <path d="M2.9 2.9l1.1 1.1M11 11l1.1 1.1M11 4L12.1 2.9M3 11l1.1-1.1"/>
  </svg>
}
function BellIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 1.5a4 4 0 0 1 4 4v3.5l1 1.5H3l1-1.5V5.5a4 4 0 0 1 3.5-4z"/>
    <path d="M6 12a1.5 1.5 0 0 0 3 0"/>
  </svg>
}
