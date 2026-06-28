import { useEffect, useState, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStore } from '@/stores/admin.store'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'
import { LeftSidebar } from '@/components/panels/LeftSidebar'
import { ContentPanel } from '@/components/panels/ContentPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { TitleBar } from '@/components/panels/TitleBar'
import { CommandPalette } from '@/components/panels/CommandPalette'
import { GraphCanvas } from '@/components/canvas/GraphCanvas'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { useBridgeStore } from '@/stores/bridge.store'
import { HomeDashboard } from '@/features/home/HomeDashboard'
import { ToastContainer } from '@/components/ui/Toast'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { BridgePanel } from '@/components/panels/BridgePanel'
import { SplashScreen } from '@/components/SplashScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ShortcutsPanel } from '@/components/panels/ShortcutsPanel'
import { OnboardingFlow } from '@/components/OnboardingFlow'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// ── Admin password modal ──────────────────────────────────────────────────────

function AdminPasswordModal({ onClose, onUnlock }: {
  onClose: () => void
  onUnlock: (pw: string) => boolean
}) {
  const [pw,  setPw]  = useState('')
  const [err, setErr] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = () => {
    if (onUnlock(pw)) {
      onClose()
    } else {
      setErr(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col gap-4 rounded-2xl px-7 py-6 animate-modal-in"
        style={{
          width: 340,
          background: 'rgba(10,10,22,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#7b6fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="9" height="6.5" rx="1.5"/>
              <path d="M4.5 6V4a2.5 2.5 0 015 0v2"/>
              <circle cx="7" cy="9.5" r="1" fill="#7b6fff" stroke="none"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-cx-text">Admin Access</div>
            <div className="text-[11px] text-cx-text-muted mt-0.5">Enter passphrase to unlock</div>
          </div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Passphrase"
          className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-cx-text outline-none"
          style={{
            border: err ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            transition: 'border-color 0.15s',
          }}
        />

        {err && (
          <div className="text-[11px] text-red-400 -mt-2">Incorrect passphrase — try again</div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-[12px] text-cx-text-muted transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg,#7b6fff,#6058dd)',
              boxShadow: '0 2px 12px rgba(123,111,255,0.35)',
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────

function CortexApp() {
  useAutoUpdate()
  const [splash,         setSplash]        = useState(true)
  const [settingsOpen,   setSettingsOpen]  = useState(false)
  const [bridgeOpen,     setBridgeOpen]    = useState(false)
  const [adminPrompt,    setAdminPrompt]   = useState(false)
  const [shortcutsOpen,  setShortcutsOpen] = useState(false)
  const [onboarding,     setOnboarding]    = useState(false)
  const { isAdmin, unlock, lock } = useAdminStore()
  const { loadVaults, activeVaultId, vaults } = useVaultStore()
  const { loadNodes } = useNodeStore()
  const { loadGraphs, setActiveGraph, saveGraph, undo, redo, activeGraph, addNode, activeGraphId } = useGraphStore()
  const { openCommandPalette, closeCommandPalette, setActiveNav, activeNavId, rightPanelOpen } = useUiStore()
  const { init: initBridge } = useBridgeStore()

  // Ctrl+Shift+Alt+A → show password prompt (or lock if already admin)
  const handleAdminKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'A') {
      e.preventDefault()
      if (isAdmin) { lock() }
      else { setAdminPrompt(true) }
    }
  }, [isAdmin, lock])

  useEffect(() => {
    window.addEventListener('keydown', handleAdminKey)
    return () => window.removeEventListener('keydown', handleAdminKey)
  }, [handleAdminKey])

  // VFX bridge listener — auto-reloads nodes and shows toast when DCC imports
  useEffect(() => {
    const cleanup = initBridge()
    return cleanup
  }, [])

  // Load vaults + global node library on startup
  useEffect(() => {
    loadVaults().then(() => {
      const { activeVaultId: vid } = useVaultStore.getState()
      loadNodes()
      if (!vid) setActiveNav('home')
    })
  }, [])

  // Show onboarding the first time a vault is created
  const prevVaultCount = useRef(0)
  useEffect(() => {
    const count = vaults.length
    if (prevVaultCount.current === 0 && count === 1 && !localStorage.getItem('cortex:onboarded')) {
      setOnboarding(true)
    }
    prevVaultCount.current = count
  }, [vaults.length])

  // When active vault changes, load its graphs (nodes stay global)
  useEffect(() => {
    if (!activeVaultId) return
    setActiveGraph(null)
    loadGraphs(activeVaultId)
  }, [activeVaultId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') { e.preventDefault(); openCommandPalette(); return }
      if (meta && e.key === 's') { e.preventDefault(); saveGraph(); return }
      if (meta && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); return }
      if (meta && e.key === 'z') { e.preventDefault(); undo(); return }
      if (meta && e.key === 'd') {
        e.preventDefault()
        const graph = activeGraph()
        if (!graph || !activeGraphId) return
        import('nanoid').then(({ nanoid }) => {
          graph.nodes.slice(-1).forEach(gn => {
            addNode({ ...gn, id: nanoid(), position: { x: gn.position.x + 40, y: gn.position.y + 40 } })
          })
        })
        return
      }
      if (e.key === 'Escape') {
        closeCommandPalette()
        if (useUiStore.getState().activeNavId !== 'home') setActiveNav(null)
      }
      if (e.key === 'Tab' && !meta && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('cortex:toggle-node-picker'))
      }
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setShortcutsOpen(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openCommandPalette, closeCommandPalette, saveGraph, undo, redo, activeGraph, addNode, activeGraphId, setActiveNav])

  const isHome = activeNavId === 'home'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cx-bg text-cx-text">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <LeftSidebar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenBridge={() => setBridgeOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
        {isHome ? (
          <ErrorBoundary label="Home Dashboard">
            <div key="home" className="flex-1 min-w-0 h-full flex flex-col animate-page-in">
              <HomeDashboard />
            </div>
          </ErrorBoundary>
        ) : (
          <>
            <ErrorBoundary label="Content Panel">
              <div className="animate-slide-left-p h-full">
                <ContentPanel />
              </div>
            </ErrorBoundary>
            <ErrorBoundary label="Graph Canvas">
              <GraphCanvas />
            </ErrorBoundary>
            {rightPanelOpen && (
              <ErrorBoundary label="Node Inspector">
                <div className="animate-slide-right h-full">
                  <RightPanel />
                </div>
              </ErrorBoundary>
            )}
          </>
        )}
      </div>
      <CommandPalette />
      <ToastContainer />
      {settingsOpen  && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {bridgeOpen    && <BridgePanel   onClose={() => setBridgeOpen(false)} />}
      {adminPrompt   && (
        <AdminPasswordModal
          onClose={() => setAdminPrompt(false)}
          onUnlock={(pw) => unlock(pw)}
        />
      )}
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}
      {onboarding    && <OnboardingFlow onDone={() => setOnboarding(false)} />}
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary label="CORTEX">
      <QueryClientProvider client={queryClient}>
        <CortexApp />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
