import { useEffect, useRef, useState } from 'react'
import { useBridgeStore } from '@/stores/bridge.store'
import { useUiStore } from '@/stores/ui.store'
import { BridgeService } from '@/services/bridge.service'

const SW_COLORS: Record<string, string> = {
  houdini:        '#FF6B35',
  blender:        '#E87D0D',
  maya:           '#00AEEF',
  nuke:           '#B5C918',
  davinci_resolve:'#CE2626',
  unreal_engine:  '#2F80ED',
  cinema4d:       '#011A6A',
  katana:         '#C084FC',
  substance:      '#F9A825',
  unknown:        '#7b6fff',
}

const SW_ICONS: Record<string, React.ReactNode> = {
  houdini:  <HoudiniIcon />,
  blender:  <BlenderIcon />,
  maya:     <MayaIcon />,
  nuke:     <NukeIcon />,
}

interface Props { onClose: () => void }

const DCC_CONSOLE: Record<string, string> = {
  houdini: 'Windows → Python Shell',
  blender: 'Scripting workspace → Run Script',
  maya:    'Script Editor (Python tab)',
  nuke:    'Script Editor → Python',
}

export function BridgePanel({ onClose }: Props) {
  const {
    serverRunning, serverPort, detected, clients,
    importedCount, lastImportedAt, isDetecting, isImporting, error,
    detectSoftware, refreshClients, importNodes, startServer,
  } = useBridgeStore()
  const { addToast } = useUiStore()
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const [copying, setCopying]     = useState<string | null>(null)
  const [execCmds, setExecCmds]   = useState<Record<string, string>>({})

  useEffect(() => {
    startServer()
    detectSoftware()
    importNodes()
    pollRef.current = setInterval(refreshClients, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Pre-fetch exec commands for all supported DCCs once detected
  useEffect(() => {
    if (!detected.length) return
    const supported = ['houdini','blender','maya','nuke']
    detected.filter(sw => supported.includes(sw.kind.toLowerCase())).forEach(sw => {
      if (execCmds[sw.id]) return
      BridgeService.getExecCmd(sw.id).then(cmd => {
        setExecCmds(prev => ({ ...prev, [sw.id]: cmd }))
      }).catch(() => {})
    })
  }, [detected])

  const handleCopyCmd = async (id: string, name: string) => {
    const cmd = execCmds[id]
    if (!cmd) return
    setCopying(id)
    try {
      await navigator.clipboard.writeText(cmd)
      addToast(`Command copied — paste in ${name}'s Python console`, { variant: 'success' })
    } catch {
      addToast('Could not copy', { variant: 'error' })
    } finally {
      setTimeout(() => setCopying(null), 2000)
    }
  }

  const handleManualImport = async () => {
    const count = await importNodes()
    if (count > 0) addToast(`Imported ${count} nodes`, { variant: 'success' })
    else addToast('No nodes buffered — run the script in your DCC first', { variant: 'default' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(2,2,10,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-h-[82vh] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, rgba(13,13,30,0.99) 0%, rgba(9,9,24,0.99) 100%)',
          border: '1px solid rgba(36,36,80,0.8)',
          borderRadius: '20px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(123,111,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none rounded-t-[20px]"
             style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(123,111,255,0.12) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
             style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.25)', boxShadow: '0 0 16px rgba(123,111,255,0.15)' }}>
              <BridgePlugIcon />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'rgba(220,220,240,0.95)' }}>
                Auto-Bridge
              </div>
              <div className="text-[10px]" style={{ color: 'rgba(100,100,150,0.7)' }}>
                CORTEX ↔ DCC software — automatic sync
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Server status pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                 style={serverRunning
                   ? { background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                   : { background: 'rgba(100,100,150,0.08)', color: 'rgba(100,100,150,0.6)', border: '1px solid rgba(36,36,80,0.5)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: serverRunning ? '#34d399' : '#44447a', boxShadow: serverRunning ? '0 0 6px #34d399' : 'none' }} />
              {serverRunning ? `ws://127.0.0.1:${serverPort ?? 7878}` : 'Server off'}
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(100,100,150,0.7)' }}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Stats row */}
        {(clients.length > 0 || importedCount > 0) && (
          <div className="flex items-center gap-3 px-6 py-2.5 flex-shrink-0"
               style={{ borderBottom: '1px solid rgba(24,24,58,0.5)', background: 'rgba(14,14,34,0.4)' }}>
            {clients.length > 0 && (
              <StatPill icon={<ConnIcon />} label={`${clients.length} connected`} color="#34d399" />
            )}
            {importedCount > 0 && (
              <StatPill icon={<NodeIcon />} label={`${importedCount.toLocaleString()} nodes synced`} color="#7b6fff" />
            )}
            {lastImportedAt && (
              <span className="ml-auto text-[9px]" style={{ color: 'rgba(60,60,100,0.7)' }}>
                last sync {new Date(lastImportedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-lg text-[11px]"
               style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Detected software list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
          {isDetecting ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: 'rgba(123,111,255,0.4)', borderTopColor: 'transparent' }} />
              <span className="text-[11px]" style={{ color: 'rgba(100,100,150,0.6)' }}>Scanning for software…</span>
            </div>
          ) : detected.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="text-[28px] opacity-30">🔌</div>
              <span className="text-[12px]" style={{ color: 'rgba(100,100,150,0.6)' }}>No DCC software detected</span>
              <button onClick={() => detectSoftware()}
                className="mt-2 text-[10px] px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)', color: 'rgba(160,155,255,0.8)' }}>
                Scan again
              </button>
            </div>
          ) : (
            detected.map(sw => {
              const color     = SW_COLORS[sw.kind.toLowerCase()] ?? '#7b6fff'
              const client    = clients.find(c => c.software.toLowerCase().includes(sw.kind.toLowerCase()))
              const supported = ['houdini','blender','maya','nuke'].includes(sw.kind.toLowerCase())
              const consoleTip = DCC_CONSOLE[sw.kind.toLowerCase()] ?? 'Python console'

              return (
                <div key={sw.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: client
                      ? `linear-gradient(135deg, ${color}10 0%, rgba(14,14,34,0.8) 100%)`
                      : 'rgba(14,14,34,0.6)',
                    border: client
                      ? `1px solid ${color}35`
                      : '1px solid rgba(24,24,58,0.6)',
                    boxShadow: client ? `0 0 20px ${color}10` : 'none',
                  }}>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[20px]"
                       style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}>
                    {SW_ICONS[sw.kind.toLowerCase()] ?? '⬡'}
                  </div>

                  {/* Info + inline exec command */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'rgba(220,220,240,0.95)' }}>
                        {sw.displayName}
                      </span>
                      {client && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                          LIVE
                        </span>
                      )}
                    </div>

                    {supported && !client && execCmds[sw.id] ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <code className="flex-1 min-w-0 text-[9px] px-2 py-1 rounded truncate"
                              style={{ background: 'rgba(0,0,0,0.5)', color: `${color}dd`, border: `1px solid ${color}20`, fontFamily: 'monospace' }}>
                          {execCmds[sw.id]}
                        </code>
                        <button onClick={() => handleCopyCmd(sw.id, sw.displayName)}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold"
                          style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                          {copying === sw.id ? <CheckCopyIcon /> : <CopyScriptIcon />}
                          {copying === sw.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : supported && !client ? (
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(100,100,150,0.6)' }}>{consoleTip}</div>
                    ) : client ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px]" style={{ color: 'rgba(100,100,150,0.7)' }}>
                          Connected · {client.version}
                        </span>
                        <button
                          onClick={handleManualImport}
                          disabled={isImporting}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                          style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
                          {isImporting
                            ? <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                            : <ImportIcon />
                          }
                          {isImporting ? 'Importing…' : 'Import Nodes'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(100,100,150,0.6)' }}>v{sw.version}</div>
                    )}
                  </div>

                  {!supported && (
                    <span className="text-[9px] px-2 py-1 rounded-lg flex-shrink-0"
                          style={{ background: 'rgba(14,14,34,0.8)', color: 'rgba(60,60,100,0.6)', border: '1px solid rgba(24,24,58,0.5)' }}>
                      coming soon
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
             style={{ borderTop: '1px solid rgba(24,24,58,0.7)', background: 'rgba(5,5,14,0.5)' }}>
          <button onClick={() => detectSoftware()}
            disabled={isDetecting}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(24,24,58,0.7)', color: 'rgba(100,100,150,0.7)' }}>
            <ScanIcon />
            {isDetecting ? 'Scanning…' : 'Re-scan'}
          </button>
          <button onClick={handleManualImport}
            disabled={isImporting}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(24,24,58,0.7)', color: 'rgba(100,100,150,0.7)' }}>
            <DownloadIcon />
            {isImporting ? 'Importing…' : 'Force import'}
          </button>
          <div className="ml-auto text-[10px]" style={{ color: 'rgba(60,60,100,0.7)' }}>
            Port 7878 · copy script · paste in DCC
          </div>
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
         style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}>
      {icon}<span>{label}</span>
    </div>
  )
}

function BridgePlugIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(160,155,255,0.8)' }}>
    <path d="M1 9 Q4 5 8 5 Q12 5 15 9"/><line x1="4" y1="9" x2="4" y2="13"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="1" y1="13" x2="15" y2="13"/>
  </svg>
}
function CloseIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="3" x2="10" y2="10"/><line x1="10" y1="3" x2="3" y2="10"/>
  </svg>
}
function CopyScriptIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="6" height="6" rx="1"/>
    <path d="M3.5 7.5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1v1.5"/>
  </svg>
}
function CheckCopyIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 5.5l3 3 5-5"/>
  </svg>
}
function ScanIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="5" cy="5" r="3.5"/><line x1="8" y1="8" x2="10" y2="10"/>
  </svg>
}
function DownloadIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 1v5.5"/><path d="M3 5l2.5 2.5L8 5"/><line x1="1.5" y1="9.5" x2="9.5" y2="9.5"/>
  </svg>
}
function ConnIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="5" cy="5" r="2"/><path d="M5 1v1M5 8v1M1 5h1M8 5h1"/>
  </svg>
}
function NodeIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 1L9 3.5V6.5L5 9L1 6.5V3.5Z"/>
  </svg>
}
function HoudiniIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 2L20 7V15L11 20L2 15V7Z" stroke="#FF6B35" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M7 9V13M11 7V15M15 9V13" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
}
function BlenderIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="13" cy="11" r="5" stroke="#E87D0D" strokeWidth="1.5"/>
    <circle cx="13" cy="11" r="2" stroke="#E87D0D" strokeWidth="1"/>
    <path d="M4 9H13M6 7L4 9L6 11" stroke="#E87D0D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}
function MayaIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M4 17V5L11 11L18 5V17" stroke="#00AEEF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}
function NukeIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="8" stroke="#B5C918" strokeWidth="1.5"/>
    <path d="M7 11h8M11 7v8" stroke="#B5C918" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="11" cy="11" r="2" fill="#B5C918" fillOpacity="0.3" stroke="#B5C918" strokeWidth="1"/>
  </svg>
}
