import { useEffect, useRef } from 'react'
import { useBridgeStore } from '@/stores/bridge.store'
import { useUiStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'

const SOFTWARE_ICONS: Record<string, string> = {
  Houdini:        '🌀',
  Blender:        '🟠',
  Maya:           '🔵',
  Nuke:           '🎥',
  DaVinciResolve: '🎬',
  UnrealEngine:   '⚡',
  Cinema4D:       '🔴',
  Katana:         '🟣',
  Substance:      '🟤',
  Unknown:        '📦',
}

interface Props { onClose: () => void }

export function BridgePanel({ onClose }: Props) {
  const {
    serverRunning, serverPort, detected, clients,
    importedCount, isDetecting, isImporting, error,
    startServer, stopServer, detectSoftware, refreshClients, importNodes,
  } = useBridgeStore()
  const { addToast } = useUiStore()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-detect on open
  useEffect(() => {
    detectSoftware()
    if (serverRunning) {
      pollRef.current = setInterval(refreshClients, 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Start polling when server starts
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (serverRunning) {
      pollRef.current = setInterval(refreshClients, 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [serverRunning])

  const handleToggleServer = async () => {
    if (serverRunning) {
      await stopServer()
      addToast('Bridge stopped', { variant: 'default' })
    } else {
      await startServer()
      addToast('Bridge server started on port 7878', { variant: 'success' })
    }
  }

  const handleImport = async () => {
    const count = await importNodes()
    if (count > 0) {
      addToast(`Imported ${count.toLocaleString()} nodes from connected apps`, { variant: 'success' })
    } else {
      addToast('No new nodes to import — connect an app first', { variant: 'warning' })
    }
  }

  const connectedIds = new Set(clients.map(c => c.software.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[700px] max-h-[85vh] bg-cx-surface border border-cx-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cx-border">
          <div>
            <h2 className="text-[15px] font-bold text-cx-text">VFX Software Bridge</h2>
            <p className="text-[12px] text-cx-text-muted mt-0.5">
              Auto-detect, connect, and import nodes from your DCC apps
            </p>
          </div>
          <button onClick={onClose} className="text-cx-text-muted hover:text-cx-text text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Server status bar */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-cx-bg border border-cx-border">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full flex-shrink-0',
              serverRunning ? 'bg-green-400 animate-pulse' : 'bg-cx-text-muted'
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-cx-text">
                {serverRunning
                  ? `Bridge server running — ws://127.0.0.1:${serverPort}`
                  : 'Bridge server stopped'}
              </div>
              <div className="text-[11px] text-cx-text-muted mt-0.5">
                {serverRunning
                  ? `${clients.length} app${clients.length !== 1 ? 's' : ''} connected`
                  : 'Start the server, then run the plugin inside your DCC app'}
              </div>
            </div>
            <button
              onClick={handleToggleServer}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                serverRunning
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-cx-accent text-white hover:opacity-90'
              )}
            >
              {serverRunning ? 'Stop' : 'Start Bridge'}
            </button>
          </div>

          {/* Connected clients */}
          {clients.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-cx-text-muted uppercase tracking-wider mb-2">
                Connected
              </div>
              <div className="space-y-2">
                {clients.map(c => (
                  <div key={c.clientId} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[13px] font-medium text-cx-text">{c.software} {c.version}</span>
                    <span className="ml-auto text-[11px] text-cx-text-muted">
                      {new Date(c.connectedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          {serverRunning && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full py-3 rounded-xl bg-cx-accent text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isImporting
                ? 'Importing…'
                : importedCount > 0
                  ? `Re-import from Connected Apps  (${importedCount.toLocaleString()} nodes last sync)`
                  : 'Import Nodes from Connected Apps'}
            </button>
          )}

          {/* Detected software */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-cx-text-muted uppercase tracking-wider">
                Installed Software
              </div>
              <button
                onClick={detectSoftware}
                disabled={isDetecting}
                className="text-[11px] text-cx-accent hover:underline disabled:opacity-50"
              >
                {isDetecting ? 'Scanning…' : 'Refresh'}
              </button>
            </div>

            {isDetecting ? (
              <div className="text-[13px] text-cx-text-muted text-center py-8">
                Scanning for installed VFX software…
              </div>
            ) : detected.length === 0 ? (
              <div className="text-[13px] text-cx-text-muted text-center py-8">
                No VFX software detected on this machine.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {detected.map(sw => {
                  const icon = SOFTWARE_ICONS[sw.kind] ?? '📦'
                  const isConn = connectedIds.has(sw.kind.toLowerCase()) || sw.isConnected
                  return (
                    <div
                      key={sw.id}
                      className={cn(
                        'p-3 rounded-xl border transition-colors',
                        isConn
                          ? 'border-green-500/40 bg-green-500/5'
                          : 'border-cx-border bg-cx-bg'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{icon}</span>
                        <span className="text-[13px] font-semibold text-cx-text truncate">{sw.displayName}</span>
                        {isConn && (
                          <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-cx-text-muted truncate">{sw.installPath}</div>
                      <div className="text-[10px] text-cx-text-muted mt-1 opacity-60">{sw.category}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Plugin instructions */}
          <div className="rounded-xl border border-cx-border bg-cx-bg p-4">
            <div className="text-[12px] font-semibold text-cx-text mb-3">Plugin Setup</div>
            <div className="space-y-2 text-[12px] text-cx-text-muted">
              <p>1. Start the Bridge server above</p>
              <p>2. Inside your DCC app, run the plugin script:</p>
              <div className="mt-2 space-y-1.5">
                {[
                  { app: 'Houdini',  file: 'cortex_bridge_houdini.py',  how: 'Python Shell → exec(open(r"...").read())' },
                  { app: 'Blender',  file: 'cortex_bridge_blender.py',  how: 'Scripting tab → Run Script' },
                  { app: 'Maya',     file: 'cortex_bridge_maya.py',     how: 'Script Editor (Python) → run' },
                  { app: 'Nuke',     file: 'cortex_bridge_nuke.py',     how: 'Script Editor → run' },
                ].map(({ app, file, how }) => (
                  <div key={app} className="flex items-start gap-2">
                    <span className="text-cx-accent font-mono">{app}</span>
                    <span className="opacity-60">— {file} — {how}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] opacity-50">
                Scripts are in: D:\FRIXXY\APP\cortex\bridge-plugins\
              </p>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
