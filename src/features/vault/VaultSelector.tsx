import { useState, useEffect, useRef } from 'react'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { useVaultStore } from '@/stores/vault.store'
import { SOFTWARE_COLORS } from '@/utils/constants'
import { cn } from '@/utils/cn'

const SOFTWARES = [
  { id: 'houdini',   label: 'Houdini',       short: 'H',   icon: '🌀', color: '#ff6b35' },
  { id: 'nuke',      label: 'Nuke',          short: 'N',   icon: '🎬', color: '#34d399' },
  { id: 'blender',   label: 'Blender',       short: 'B',   icon: '🫐', color: '#f472b6' },
  { id: 'unreal',    label: 'Unreal Engine', short: 'UE',  icon: '⚡', color: '#60a5fa' },
  { id: 'substance', label: 'Substance 3D',  short: 'SB',  icon: '🎨', color: '#a78bfa' },
]

/* ── Animated graph background ───────────────────────────── */
function GraphBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const NODE_COUNT = 38
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 2 + 1.5,
      pulse: Math.random() * Math.PI * 2,
    }))

    const CONNECT_DIST = 160

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // move
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.018
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      }

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.18
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(123,111,255,${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const glow = 0.4 + Math.sin(n.pulse) * 0.2
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(123,111,255,${glow})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

/* ── Main component ──────────────────────────────────────── */
export function VaultSelector() {
  const { vaults, createVault, setActiveVault } = useVaultStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [software, setSoftware] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    const vault = await createVault({
      name: name.trim(),
      path: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: desc.trim() || undefined,
      settings: software ? { defaultSoftware: software } : undefined,
    } as any)
    setActiveVault(vault.id)
    reset()
  }

  const reset = () => { setCreating(false); setName(''); setDesc(''); setSoftware('') }

  const hasVaults = vaults.length > 0

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-cx-bg relative overflow-hidden">

      {/* Animated graph background */}
      <GraphBg />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(123,111,255,0.09) 0%, transparent 70%)' }} />

      {/* Content */}
      <div className={cn(
        'relative z-10 w-full max-w-[480px] px-6 transition-all duration-700',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}>

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <CortexLogo size="xl" glow />
          </div>
          <p className="text-[12px] text-cx-text-muted tracking-[0.08em]">
            Think in Nodes.&nbsp; Build in Graphs.&nbsp; Remember Everything.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-cx-border overflow-hidden"
             style={{ background: 'rgba(13,13,24,0.85)', backdropFilter: 'blur(20px)' }}>

          {/* Existing vaults */}
          {hasVaults && !creating && (
            <div className="p-5">
              <div className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.12em] mb-3">
                Your Vaults
              </div>
              <ul className="space-y-2">
                {vaults.map(vault => {
                  const sw = vault.settings?.defaultSoftware
                  const swMeta = SOFTWARES.find(s => s.id === sw)
                  const color = swMeta?.color ?? (sw ? SOFTWARE_COLORS[sw] : undefined) ?? vault.color ?? '#7b6fff'
                  return (
                    <li key={vault.id}>
                      <button onClick={() => setActiveVault(vault.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-cx-border
                                   hover:border-cx-accent/40 transition-all text-left group
                                   hover:bg-cx-elevated/50">
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ background: color + '18', border: `1px solid ${color}30` }}>
                          {swMeta?.icon ?? vault.icon ?? vault.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-cx-text group-hover:text-cx-accent transition-colors">
                            {vault.name}
                          </div>
                          {vault.description && (
                            <div className="text-[11px] text-cx-text-muted truncate mt-0.5">{vault.description}</div>
                          )}
                          {swMeta && (
                            <div className="text-[10px] mt-0.5 font-medium" style={{ color: color + 'bb' }}>
                              {swMeta.label}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 pr-1">
                          <div className="text-[13px] font-semibold text-cx-text-dim">
                            {vault.stats?.nodeCount ?? 0}
                          </div>
                          <div className="text-[9px] text-cx-text-muted uppercase tracking-wide">nodes</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                             className="text-cx-text-muted group-hover:text-cx-accent transition-colors flex-shrink-0">
                          <path d="M5 3l4 4-4 4"/>
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Divider + new vault */}
              <div className="mt-4 pt-4 border-t border-cx-border">
                <button onClick={() => setCreating(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-cx-border
                             text-cx-text-muted text-[12px] hover:border-cx-accent/40 hover:text-cx-text
                             transition-all flex items-center justify-center gap-2">
                  <span className="text-lg leading-none">+</span>
                  New Vault
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasVaults && !creating && (
            <div className="px-8 py-10 text-center">
              {/* Grid icon */}
              <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                   style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(123,111,255,0.8)"
                     strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
              </div>
              <div className="text-[14px] font-semibold text-cx-text mb-1.5">No vaults yet</div>
              <div className="text-[12px] text-cx-text-muted mb-6 leading-relaxed">
                A vault stores your node library, graphs, and knowledge for a project or software.
              </div>
              <button onClick={() => setCreating(true)}
                className="w-full py-3 rounded-xl font-semibold text-[13px] text-white transition-all
                           hover:opacity-90 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #7b6fff, #5a53cc)' }}>
                Create your first vault
              </button>
            </div>
          )}

          {/* Create form */}
          {creating && (
            <div className="p-5 space-y-3.5">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={reset}
                  className="text-cx-text-muted hover:text-cx-text transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3L5 7l4 4"/>
                  </svg>
                </button>
                <div className="text-[12px] font-semibold text-cx-text">New Vault</div>
              </div>

              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Vault name (e.g. FX Knowledge)" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-cx-elevated border border-cx-border rounded-xl px-4 py-3
                           text-[13px] text-cx-text placeholder:text-cx-text-muted
                           focus:outline-none focus:border-cx-accent/60 transition-colors" />

              <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-cx-elevated border border-cx-border rounded-xl px-4 py-3
                           text-[13px] text-cx-text placeholder:text-cx-text-muted
                           focus:outline-none focus:border-cx-accent/60 transition-colors" />

              {/* Software picker */}
              <div>
                <p className="text-[10px] text-cx-text-muted uppercase tracking-[0.1em] mb-2.5">
                  Primary Software
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {SOFTWARES.map(s => {
                    const active = software === s.id
                    return (
                      <button key={s.id} onClick={() => setSoftware(active ? '' : s.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-center transition-all',
                          active ? 'scale-[1.04]' : 'border-cx-border bg-cx-elevated hover:bg-cx-surface'
                        )}
                        style={active ? { borderColor: s.color + '80', background: s.color + '14' } : {}}>
                        <span className="text-[18px] leading-none">{s.icon}</span>
                        <span className="text-[9px] font-bold tracking-wide"
                              style={{ color: active ? s.color : 'var(--cx-text-muted)' }}>
                          {s.short}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} disabled={!name.trim()}
                  className="flex-1 py-3 rounded-xl text-white text-[13px] font-semibold
                             transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-35"
                  style={{ background: 'linear-gradient(135deg, #7b6fff, #5a53cc)' }}>
                  Create Vault
                </button>
                <button onClick={reset}
                  className="px-5 py-3 rounded-xl border border-cx-border text-cx-text-muted text-[13px]
                             hover:bg-cx-elevated transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[10px] text-cx-text-muted tracking-wide opacity-50">
          CORTEX KOS · Node Knowledge Operating System
        </div>
      </div>
    </div>
  )
}
