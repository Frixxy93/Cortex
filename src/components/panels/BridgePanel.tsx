import { useEffect, useState, useCallback } from 'react'
import { useBridgeStore } from '@/stores/bridge.store'
import { useAdminStore } from '@/stores/admin.store'
import { NodeService } from '@/services/node.service'

interface Props { onClose: () => void }

const SOFTWARE_META: Record<string, { label: string; color: string; icon: string }> = {
  houdini: { label: 'Houdini', color: '#FF6B35', icon: '🌀' },
  nuke:    { label: 'Nuke',    color: '#8BC34A', icon: '🟢' },
  katana:  { label: 'Katana',  color: '#E8A020', icon: '🎨' },
}
const SUPPORTED = Object.keys(SOFTWARE_META)

export function BridgePanel({ onClose }: Props) {
  const { port, clients, detected, execCmds, imports, loading, scan, loadCmd } = useBridgeStore()
  const { isAdmin } = useAdminStore()
  const [copied, setCopied]   = useState<string | null>(null)
  const [cmdErr, setCmdErr]   = useState<Record<string, string>>({})
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

  // On open: scan for software + pre-load all exec commands
  useEffect(() => {
    scan()
    SUPPORTED.forEach(kind => {
      loadCmd(kind).catch(e => {
        setCmdErr(p => ({ ...p, [kind]: String(e) }))
      })
    })
  }, [])

  const exportSeed = useCallback(async () => {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const count = await NodeService.generateSeed()
      setSeedMsg(`✓ Seed written — ${count.toLocaleString()} nodes baked in. Rebuild to distribute.`)
    } catch (e) {
      setSeedMsg(`✗ ${String(e)}`)
    } finally {
      setSeeding(false)
    }
  }, [])

  const copy = useCallback(async (kind: string) => {
    const cmd = execCmds[kind]
    if (!cmd) return
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }, [execCmds])

  // Group detected by kind
  const detectedByKind: Record<string, typeof detected[0]> = {}
  for (const d of detected) {
    if (SUPPORTED.includes(d.kind) && !detectedByKind[d.kind]) {
      detectedByKind[d.kind] = d
    }
  }

  const connectedSoftware = new Set(clients.map(c => c.software.toLowerCase()))
  const lastImport = (kind: string) =>
    imports.find(i => i.software.toLowerCase() === kind)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.75)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative flex flex-col rounded-2xl overflow-hidden"
           style={{
             width: 540, maxHeight: '86vh',
             background: 'rgba(10,10,22,0.99)',
             border: '1px solid rgba(255,255,255,0.08)',
             boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
           }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1">
            <div className="text-sm font-semibold text-cx-text">VFX Node Import</div>
            <div className="text-[11px] text-cx-text-muted mt-0.5">
              ws://127.0.0.1:{port}
              {clients.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  {clients.length} live
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-cx-text-muted hover:text-cx-text"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Instruction strip ── */}
        <div className="px-5 py-2.5 text-[11px] text-cx-text-muted"
             style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          Copy the command → paste in your DCC's Python Shell → nodes import automatically with parameters.
        </div>

        {/* ── Software cards ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {SUPPORTED.map(kind => {
            const meta      = SOFTWARE_META[kind]
            const info      = detectedByKind[kind]
            const isLive    = connectedSoftware.has(kind) || connectedSoftware.has(meta.label.toLowerCase())
            const last      = lastImport(kind)
            const cmd       = execCmds[kind]
            const isCopied  = copied === kind
            const isLoading = !cmd && !cmdErr[kind]
            const rgb       = hexToRgb(meta.color)

            return (
              <div key={kind} className="rounded-xl overflow-hidden"
                   style={{
                     border: isLive
                       ? `1px solid rgba(${rgb},0.3)`
                       : info
                         ? `1px solid rgba(${rgb},0.15)`
                         : '1px solid rgba(255,255,255,0.05)',
                     background: isLive
                       ? `rgba(${rgb},0.07)`
                       : 'rgba(255,255,255,0.025)',
                   }}>

                {/* Card header row */}
                <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                       style={{ background: `rgba(${rgb},0.12)` }}>
                    {meta.icon}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-cx-text">{meta.label}</span>
                      {info && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          v{info.version}
                        </span>
                      )}
                      {isLive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                          ● LIVE
                        </span>
                      )}
                      {!info && !isLive && (
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          not detected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-cx-text-muted mt-0.5">
                      {last
                        ? `${last.count.toLocaleString()} nodes imported · ${new Date(last.at).toLocaleTimeString()}`
                        : isLive
                          ? 'Connected — waiting for catalogue…'
                          : 'Paste script in Python Shell to import'}
                    </div>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => copy(kind)}
                    disabled={!cmd || isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium flex-shrink-0 transition-all"
                    style={{
                      background: isCopied
                        ? 'rgba(34,197,94,0.2)'
                        : `rgba(${rgb},0.12)`,
                      color: isCopied ? '#22c55e' : meta.color,
                      border: isCopied
                        ? '1px solid rgba(34,197,94,0.4)'
                        : `1px solid rgba(${rgb},0.25)`,
                      opacity: (!cmd || isLoading) ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5"/>
                      </svg>
                    ) : isCopied ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 5l3 3 5-5"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="3" width="6" height="6" rx="1"/>
                        <path d="M3 3V2a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H7"/>
                      </svg>
                    )}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Command text box — always visible once loaded */}
                <div className="px-3.5 pb-3">
                  {cmd ? (
                    <div
                      onClick={() => copy(kind)}
                      className="px-3 py-2 rounded-lg cursor-pointer group transition-colors"
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
                      title="Click to copy"
                    >
                      <div className="text-[10px] font-mono overflow-hidden"
                           style={{ color: `rgba(${rgb},0.8)`, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {cmd}
                      </div>
                    </div>
                  ) : cmdErr[kind] ? (
                    <div className="px-3 py-2 rounded-lg text-[10px]"
                         style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {cmdErr[kind]}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-lg text-[10px] text-cx-text-muted"
                         style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      Loading command…
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col gap-2 px-5 py-3"
             style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <button onClick={scan} disabled={loading}
              className="flex items-center gap-1.5 text-[11px] text-cx-text-muted hover:text-cx-text transition-colors">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 5.5A4.5 4.5 0 111 5.5"/>
                <path d="M10 2v3.5H6.5"/>
              </svg>
              {loading ? 'Scanning…' : 'Re-scan'}
            </button>

            {isAdmin && (
              <button
                onClick={exportSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139,92,246,0.25)',
                  opacity: seeding ? 0.6 : 1,
                }}
                title="Write current DB nodes to nodes_seed.sql — rebuild app to distribute"
              >
                {seeding ? (
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 1v6M2 5l3 3 3-3M1 9h8"/>
                  </svg>
                )}
                {seeding ? 'Exporting…' : 'Export as Seed'}
              </button>
            )}

            <div className="text-[10px] text-cx-text-muted">Port {port}</div>
          </div>

          {seedMsg && (
            <div className="text-[10px] px-3 py-2 rounded-lg"
                 style={{
                   background: seedMsg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                   color: seedMsg.startsWith('✓') ? '#4ade80' : '#f87171',
                   border: `1px solid ${seedMsg.startsWith('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                 }}>
              {seedMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
