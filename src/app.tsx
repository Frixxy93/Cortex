import { useEffect, useState } from 'react'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { HomeDashboard } from '@/features/home/HomeDashboard'
import { ToastContainer } from '@/components/ui/Toast'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { BridgePanel } from '@/components/panels/BridgePanel'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function CortexApp() {
  useAutoUpdate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bridgeOpen,   setBridgeOpen]   = useState(false)
  const { loadVaults, activeVaultId } = useVaultStore()
  const { loadNodes } = useNodeStore()
  const { loadGraphs, setActiveGraph, saveGraph, undo, redo, activeGraph, addNode, activeGraphId } = useGraphStore()
  const { openCommandPalette, closeCommandPalette, setActiveNav, activeNavId, rightPanelOpen } = useUiStore()

  // Load vaults + global node library on startup
  useEffect(() => {
    loadVaults().then(() => {
      const { activeVaultId: vid } = useVaultStore.getState()
      loadNodes()
      if (!vid) setActiveNav('home')
    })
  }, [])

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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openCommandPalette, closeCommandPalette, saveGraph, undo, redo, activeGraph, addNode, activeGraphId, setActiveNav])

  const isHome = activeNavId === 'home'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cx-bg text-cx-text">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <LeftSidebar onOpenSettings={() => setSettingsOpen(true)} onOpenBridge={() => setBridgeOpen(true)} />
        {isHome ? (
          <HomeDashboard />
        ) : (
          <>
            <ContentPanel />
            <GraphCanvas />
            {rightPanelOpen && <RightPanel />}
          </>
        )}
      </div>
      <CommandPalette />
      <ToastContainer />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {bridgeOpen   && <BridgePanel   onClose={() => setBridgeOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CortexApp />
    </QueryClientProvider>
  )
}
