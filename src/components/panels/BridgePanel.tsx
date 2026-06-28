import { useEffect, useRef, useState } from 'react'
import { useBridgeStore } from '@/stores/bridge.store'
import { useUiStore } from '@/stores/ui.store'

// ── DCC config ────────────────────────────────────────────────────────────────

const SUPPORTED = ['houdini', 'blender']

const DCC_COLOR: Record<string, string> = {
  houdini:        '#FF6B35',
  blender:        '#E87D0D',
  maya:           '#00AEEF',
  nuke:           '#B5C918',
  unreal:         '#2F80ED',
  davinci_resolve:'#CE2626',
}

const DCC_CONSOLE: Record<string, string> = {
  houdini: 'Windows → Python Shell',
  blender: 'Scripting workspace → Run Script',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export function BridgePanel({ onClose }: Props) {
  const {
    port, detected, clients, importedCount, isImporting, execCmds,
    detect, refreshClients, importNodes, fetchExecCmd,
  } = useBridgeStore()
  const { addToast } = useUiStore()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  useEffect(() => {
    detect()
    refreshClients()
    pollRef.current = setInterval(refreshClients, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Pre-fetch exec commands for supported DCCs once detected
  useEffect(() => {
    detected
      .filter(sw => SUPPORTED.includes(sw.kind))
      .forEach(sw => fetchExecCmd(sw.kind))
  }, [detected])

  const handleCopy = async (kind: string, name: string) => {
    const cmd = execCmds[kind]
    if (!cmd) return
    setCopying(kind)
    try {
      await navigator.clipboard.writeText(cmd)
      addToast(`Copied — paste into ${name}'s Python console`, { variant: 'success' })
    } catch {
      addToast('Could not copy to clipboard', { variant: 'error' })
    }
    setTimeout(() => setCopying(null), 2000)
  }

  const handleImport = async () => {
    const count = await importNodes()
    if (count > 0)
      addToast(`Imported ${count.toLocaleString()} nodes`, { variant: 'success' })
    else if (importedCount > 0)
      addToast(`Already synced — ${importedCount.toLocaleString()} nodes in library`, { variant: 'default' })
    else
      addToast('No nodes yet — wait a moment after connecting', { variant: 'default' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(2,2,10,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[500px] max-h-[80vh] flex flex-col"
        style={{
          background:   'linear-gradient(160deg, rgba(13,13,30,0.99) 0%, rgba(9,9,24,0.99) 100%)',
          border:       '1px solid rgba(36,36,80,0.8)',
          borderRadius: '18px',
          boxShadow:    '0 40px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
             style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.25)' }}>
              <BridgeIcon />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'rgba(220,220,240,0.95)' }}>
                Auto-Bridge
              </div>
              <div className="text-[10px]" style={{ color: 'rgba(100,100,150,0.6)' }}>
                CORTEX ↔ DCC software — automatic sync
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Server pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                 style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
              ws://127.0.0.1:{port ?? 7878}
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: 'rgba(100,100,150,0.6)' }}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Stats */}
        {(clients.length > 0 || importedCount > 0) && (
          <div className="flex items-center gap-3 px-5 py-2.5"
               style={{ borderBottom: '1px solid rgba(24,24,58,0.5)', background: 'rgba(14,14,34,0.4)' }}>
            {clients.length > 0 && (
              <Pill icon="●" label={`${clients.length} connected`} color="#34d399" />
            )}
            {importedCount > 0 && (
              <Pill icon="⬡" label={`${importedCount.toLocaleString()} nodes`} color="#7b6fff" />
            )}
          </div>
        )}

        {/* DCC list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0">
          {detected.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="text-[28px] opacity-20">🔌</div>
              <span className="text-[12px]" style={{ color: 'rgba(100,100,150,0.5)' }}>
                No DCC software detected
              </span>
              <button onClick={detect}
                className="mt-2 text-[10px] px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)', color: '#9d96ff' }}>
                Scan again
              </button>
            </div>
          ) : (
            detected.map(sw => {
              const color     = DCC_COLOR[sw.kind] ?? '#7b6fff'
              const client    = clients.find(c =>
                c.software.toLowerCase().includes(sw.kind.replace('_', ' '))
              )
              const supported = SUPPORTED.includes(sw.kind)
              const cmd       = execCmds[sw.kind]
              const live      = !!client

              return (
                <div key={sw.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{
                    background: live
                      ? `linear-gradient(135deg, ${color}10 0%, rgba(14,14,34,0.8) 100%)`
                      : 'rgba(14,14,34,0.6)',
                    border: live
                      ? `1px solid ${color}35`
                      : '1px solid rgba(24,24,58,0.6)',
                    boxShadow: live ? `0 0 20px ${color}0a` : 'none',
                  }}>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
                       style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}>
                    <DccIcon kind={sw.kind} color={color} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold"
                            style={{ color: 'rgba(220,220,240,0.95)' }}>
                        {sw.name}
                      </span>
                      {live && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                          LIVE
                        </span>
                      )}
                    </div>

                    {live ? (
                      // Connected state
                      <div className="flex items-center gap-2 mt-1.5">
                        {importedCount > 0 ? (
                          <>
                            <span className="text-[10px]" style={{ color: 'rgba(100,100,150,0.7)' }}>
                              {importedCount.toLocaleString()} nodes synced
                            </span>
                            <button onClick={handleImport} disabled={isImporting}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                              style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
                              {isImporting
                                ? <Spinner />
                                : <CheckIcon />
                              }
                              {isImporting ? 'Syncing…' : 'Re-sync'}
                            </button>
                          </>
                        ) : (
                          <>
                            <Spinner color={color} />
                            <span className="text-[10px]" style={{ color: `${color}aa` }}>
                              Building catalogue…
                            </span>
                          </>
                        )}
                      </div>
                    ) : supported && cmd ? (
                      // Ready to connect: show exec command
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <code className="flex-1 min-w-0 text-[9px] px-2 py-1 rounded truncate"
                              style={{ background: 'rgba(0,0,0,0.5)', color: `${color}cc`,
                                       border: `1px solid ${color}18`, fontFamily: 'monospace' }}>
                          {cmd}
                        </code>
                        <button onClick={() => handleCopy(sw.kind, sw.name)}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold"
                          style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                          {copying === sw.kind ? <CheckIcon /> : <CopyIcon />}
                          {copying === sw.kind ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : supported && !cmd ? (
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(100,100,150,0.5)' }}>
                        {DCC_CONSOLE[sw.kind] ?? 'Python console'}
                      </div>
                    ) : (
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(60,60,100,0.5)' }}>
                        v{sw.version}
                      </div>
                    )}
                  </div>

                  {!supported && (
                    <span className="text-[9px] px-2 py-1 rounded flex-shrink-0"
                          style={{ background: 'rgba(14,14,34,0.8)', color: 'rgba(60,60,100,0.5)',
                                   border: '1px solid rgba(24,24,58,0.5)' }}>
                      coming soon
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3.5"
             style={{ borderTop: '1px solid rgba(24,24,58,0.7)', background: 'rgba(5,5,14,0.5)' }}>
          <button onClick={detect}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(36,36,80,0.5)',
                     color: 'rgba(140,135,200,0.7)' }}>
            <ScanIcon /> Re-scan
          </button>
          <button onClick={handleImport} disabled={isImporting}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(36,36,80,0.5)',
                     color: 'rgba(140,135,200,0.7)' }}>
            {isImporting ? <Spinner /> : <DownloadIcon />}
            {isImporting ? 'Importing…' : 'Force import'}
          </button>
          <span className="ml-auto text-[9px]" style={{ color: 'rgba(60,60,100,0.5)' }}>
            Port 7878 · copy script · paste in DCC
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Small components ──────────────────────────────────────────────────────────

function Pill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
         style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}>
      <span className="text-[8px]">{icon}</span><span>{label}</span>
    </div>
  )
}

function Spinner({ color = 'currentColor' }: { color?: string }) {
  return (
    <span className="w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin flex-shrink-0"
          style={{ borderColor: `${color}60`, borderTopColor: 'transparent' }} />
  )
}

function DccIcon({ kind, color }: { kind: string; color: string }) {
  const s = { stroke: color, fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'houdini') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...{ fill: 'none' }}>
      <path d="M11 2L20 7V15L11 20L2 15V7Z" {...s}/>
      <path d="M7 9V13M11 7V15M15 9V13" {...s} strokeWidth={1.3}/>
    </svg>
  )
  if (kind === 'blender') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...{ fill: 'none' }}>
      <circle cx="13" cy="11" r="5" {...s}/><circle cx="13" cy="11" r="2" {...s} strokeWidth={1}/>
      <path d="M4 9H13M6 7L4 9L6 11" {...s} strokeWidth={1.4}/>
    </svg>
  )
  if (kind === 'maya') return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...{ fill: 'none' }}>
      <path d="M4 17V5L11 11L18 5V17" {...s}/>
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" {...{ fill: 'none' }}>
      <path d="M11 3L19 7.5V14.5L11 19L3 14.5V7.5Z" {...s}/>
    </svg>
  )
}

function BridgeIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(160,155,255,0.8)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 9 Q4 5 8 5 Q12 5 15 9"/>
    <line x1="4" y1="9" x2="4" y2="13"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="1" y1="13" x2="15" y2="13"/>
  </svg>
}
function CloseIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="3" x2="10" y2="10"/><line x1="10" y1="3" x2="3" y2="10"/>
  </svg>
}
function CopyIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="6" height="6" rx="1"/>
    <path d="M3.5 7.5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1v1.5"/>
  </svg>
}
function CheckIcon() {
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
