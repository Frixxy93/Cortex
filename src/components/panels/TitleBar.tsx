import { useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useUiStore } from '@/stores/ui.store'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { cn } from '@/utils/cn'
const appWindow = getCurrentWindow()
export function TitleBar() {
  const { openCommandPalette, toggleRightPanel, rightPanelOpen } = useUiStore()
  const [searchFocused, setSearchFocused] = useState(false)
  return (
    <div
      className="drag flex items-center h-10 flex-shrink-0 px-3 gap-3 select-none relative z-30
                 bg-cx-surface border-b border-cx-border"
      style={{ boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.03)' }}
    >
      {/* macOS-style window controls */}
      <div className="no-drag flex items-center gap-1.5 flex-shrink-0 mr-1">
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
      {/* Brand */}
      <div className="drag flex-shrink-0">
        <CortexLogo size="sm" />
      </div>
      {/* Center search */}
      <div className="drag flex-1 flex justify-center px-4 max-w-xl mx-auto">
        <button
          className={cn(
            'no-drag w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg',
            'border transition-all duration-150 text-left',
            searchFocused
              ? 'border-cx-accent/60 bg-cx-elevated shadow-[0_0_0_3px_rgba(123,111,255,0.1)]'
              : 'border-cx-border bg-cx-elevated/60 hover:bg-cx-elevated hover:border-cx-border-bright'
          )}
          onClick={() => openCommandPalette()}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        >
          <SearchIcon />
          <span className="text-[12px] text-cx-text-muted flex-1">
            Search nodes, parameters, tags…
          </span>
          <kbd className="text-[10px] text-cx-text-muted font-mono bg-cx-bg/80 px-1.5 py-0.5
                          rounded border border-cx-border flex-shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>
      {/* Right actions */}
      <div className="no-drag flex items-center gap-0.5 flex-shrink-0">
        <IconBtn title="Inspector" active={rightPanelOpen} onClick={toggleRightPanel}>
          <InspectorIcon />
        </IconBtn>
        <IconBtn title="Settings">
          <SettingsIcon />
        </IconBtn>
        <IconBtn title="Notifications">
          <BellIcon />
        </IconBtn>
        {/* Avatar */}
        <button
          className="no-drag ml-1 w-7 h-7 rounded-full bg-cx-accent/20 border border-cx-accent/30
                     flex items-center justify-center text-[10px] font-semibold text-cx-accent
                     hover:bg-cx-accent/30 transition-colors"
          title="Account"
        >
          FX
        </button>
      </div>
    </div>
  )
}
/* ── Sub-components ─────────────────────────────────────── */
function WinBtn({ color, title, onClick, children }: {
  color: string; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="group w-3 h-3 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{ backgroundColor: color }}
    >
      <span className="opacity-0 group-hover:opacity-70 transition-opacity">{children}</span>
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
          ? 'bg-cx-accent/15 text-cx-accent'
          : 'text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated'
      )}
    >
      {children}
    </button>
  )
}
/* Icons */
function CloseX() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round">
    <line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/>
  </svg>
}
function MinusLine() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round">
    <line x1="2" y1="4" x2="6" y2="4"/>
  </svg>
}
function MaxArrows() {
  return <svg viewBox="0 0 8 8" width="6" height="6" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round">
    <path d="M2 5 L2 2 L5 2"/><path d="M6 3 L6 6 L3 6"/>
  </svg>
}
function SearchIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-cx-text-muted flex-shrink-0">
    <circle cx="5.5" cy="5.5" r="4"/><line x1="9" y1="9" x2="12" y2="12"/>
  </svg>
}
function InspectorIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <rect x="1" y="1" width="13" height="13" rx="2"/><line x1="9.5" y1="1" x2="9.5" y2="14"/>
  </svg>
}
function SettingsIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3 3l1.5 1.5M10.5 10.5 L12 12M12 3l-1.5 1.5M4.5 10.5 L3 12"/>
  </svg>
}
function BellIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 1.5a4 4 0 0 1 4 4v3.5l1 1.5H3l1-1.5V5.5a4 4 0 0 1 3.5-4z"/><path d="M6 12a1.5 1.5 0 0 0 3 0"/>
  </svg>
}
