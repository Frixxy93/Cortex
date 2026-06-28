import { useState, useEffect, useRef, useCallback } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { cn } from '@/utils/cn'

/* ── Animated graph background ─────────────────────────── */
function GraphBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const N = 42
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.8 + 1.2,
      pulse: Math.random() * Math.PI * 2,
    }))

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.014
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 180) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(123,111,255,${(1 - d / 180) * 0.12})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }
      for (const n of nodes) {
        const a = 0.35 + Math.sin(n.pulse) * 0.18
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(123,111,255,${a})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

/* ── Vault card ────────────────────────────────────────── */
const SOFTWARES: Record<string, { icon: string; color: string }> = {
  houdini:   { icon: '🌀', color: '#ff6b35' },
  blender:   { icon: '🫐', color: '#f472b6' },
  nuke:      { icon: '🎬', color: '#34d399' },
  unreal:    { icon: '⚡', color: '#60a5fa' },
  substance: { icon: '🎨', color: '#a78bfa' },
  maya:      { icon: '🧊', color: '#fbbf24' },
}

function VaultCard({ vault, onClick }: {
  vault: import('@/types/vault').Vault
  onClick: () => void
}) {
  const sw    = vault.settings?.defaultSoftware
  const meta  = sw ? SOFTWARES[sw] : null
  const color = meta?.color ?? vault.color ?? '#7b6fff'

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 rounded-2xl border border-cx-border
                 hover:border-cx-accent/40 transition-all duration-200 text-left
                 hover:scale-[1.02] active:scale-[0.99]"
      style={{ background: 'rgba(13,13,24,0.7)' }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-[1px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
           style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 flex-shrink-0"
           style={{ background: color + '18', border: `1px solid ${color}30` }}>
        {meta?.icon ?? vault.icon ?? vault.name[0].toUpperCase()}
      </div>

      {/* Name */}
      <div className="text-[13px] font-semibold text-cx-text group-hover:text-cx-accent transition-colors truncate">
        {vault.name}
      </div>
      {vault.description && (
        <div className="text-[11px] text-cx-text-muted truncate mt-0.5">{vault.description}</div>
      )}
      {meta && (
        <div className="text-[10px] font-medium mt-1" style={{ color: color + 'cc' }}>
          {sw!.charAt(0).toUpperCase() + sw!.slice(1)}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-cx-border/60">
        <StatPill label="graphs" value={vault.stats?.graphCount ?? 0} />
      </div>
    </button>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[15px] font-bold text-cx-text leading-none">{value}</span>
      <span className="text-[9px] text-cx-text-muted uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  )
}

/* ── New Vault form ────────────────────────────────────── */
const SW_LIST = [
  { id: 'houdini',   icon: '🌀', label: 'H',  color: '#ff6b35' },
  { id: 'nuke',      icon: '🎬', label: 'N',  color: '#34d399' },
  { id: 'blender',   icon: '🫐', label: 'B',  color: '#f472b6' },
  { id: 'unreal',    icon: '⚡', label: 'UE', color: '#60a5fa' },
  { id: 'substance', icon: '🎨', label: 'SB', color: '#a78bfa' },
  { id: 'maya',      icon: '🧊', label: 'M',  color: '#fbbf24' },
]

function NewVaultForm({ onCancel, onCreate }: {
  onCancel: () => void
  onCreate: (id: string) => void
}) {
  const { createVault } = useVaultStore()
  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [sw, setSw]         = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim() || loading) return
    setLoading(true)
    try {
      const v = await createVault({
        name: name.trim(),
        path: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: desc.trim() || undefined,
        settings: sw ? { defaultSoftware: sw } as any : undefined,
      } as any)
      onCreate(v.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-cx-accent/30 p-5 space-y-3"
         style={{ background: 'rgba(123,111,255,0.06)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-semibold text-cx-text">New Vault</span>
        <button onClick={onCancel}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-cx-text-muted
                     hover:bg-cx-elevated hover:text-cx-text transition-colors">
          <XIcon />
        </button>
      </div>

      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Vault name (e.g. FX Knowledge)"
        className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3.5 py-2.5
                   text-[13px] text-cx-text placeholder:text-cx-text-muted
                   focus:outline-none focus:border-cx-accent/60 transition-colors" />

      <input value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3.5 py-2.5
                   text-[13px] text-cx-text placeholder:text-cx-text-muted
                   focus:outline-none focus:border-cx-accent/60 transition-colors" />

      <div>
        <p className="text-[10px] text-cx-text-muted uppercase tracking-[0.1em] mb-2">Software</p>
        <div className="flex gap-2">
          {SW_LIST.map(s => {
            const active = sw === s.id
            return (
              <button key={s.id} onClick={() => setSw(active ? '' : s.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-2 rounded-xl border text-center transition-all flex-1',
                  active ? 'scale-[1.06]' : 'border-cx-border bg-cx-elevated hover:bg-cx-surface'
                )}
                style={active ? { borderColor: s.color + '80', background: s.color + '14' } : {}}>
                <span className="text-base leading-none">{s.icon}</span>
                <span className="text-[9px] font-bold"
                      style={{ color: active ? s.color : 'var(--cx-text-muted)' }}>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={!name.trim() || loading}
          className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold
                     transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-35"
          style={{ background: 'linear-gradient(135deg, #7b6fff, #5a53cc)' }}>
          {loading ? 'Creating…' : 'Create Vault'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-cx-border text-cx-text-muted text-[13px]
                     hover:bg-cx-elevated transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Recent graph row ──────────────────────────────────── */
function RecentGraphRow({ graph, active, onClick }: {
  graph: import('@/types').CortexGraph
  active: boolean
  onClick: () => void
}) {
  const updated = graph.updatedAt
    ? new Date(graph.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''
  return (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left group',
        active
          ? 'border-cx-accent/40 bg-cx-accent/8'
          : 'border-cx-border hover:border-cx-accent/20 hover:bg-cx-elevated/60'
      )}>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                         active ? 'bg-cx-accent/20' : 'bg-cx-elevated')}>
        <GraphNodeIcon className={active ? 'text-cx-accent' : 'text-cx-text-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-[12px] font-medium truncate',
                           active ? 'text-cx-accent' : 'text-cx-text group-hover:text-cx-accent transition-colors')}>
          {graph.name}
        </div>
        <div className="text-[10px] text-cx-text-muted">
          {graph.nodes.length} nodes · {graph.edges.length} edges
        </div>
      </div>
      <div className="text-[10px] text-cx-text-muted flex-shrink-0">{updated}</div>
    </button>
  )
}

/* ── Main dashboard ────────────────────────────────────── */
export function HomeDashboard() {
  const { vaults, setActiveVault } = useVaultStore()
  const { graphs, byVault, setActiveGraph, activeGraphId } = useGraphStore()
  const { setActiveNav } = useUiStore()

  const [creating,  setCreating]  = useState(false)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 40) }, [])

  const handleSelectVault = useCallback((id: string) => {
    setActiveVault(id)
    setActiveNav('graph')
  }, [setActiveVault, setActiveNav])

  const handleVaultCreated = useCallback((id: string) => {
    setCreating(false)
    setActiveVault(id)
    setActiveNav('graph')
  }, [setActiveVault, setActiveNav])

  // all recent graphs across all vaults (capped at 6)
  const recentGraphs = vaults
    .flatMap(v => (byVault[v.id] ?? []).map(gid => ({ graph: graphs[gid], vaultId: v.id })))
    .filter(x => x.graph)
    .slice(0, 6)

  // totals
  const totalGraphs = vaults.reduce((s, v) => s + (v.stats?.graphCount ?? 0), 0)

  return (
    <div className="flex-1 relative overflow-hidden bg-cx-bg flex flex-col">
      <GraphBg />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(123,111,255,0.07) 0%, transparent 70%)' }} />

      <div className={cn(
        'relative z-10 flex flex-col h-full transition-all duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CortexLogo size="sm" showWordmark={false} />
            <div>
              <div className="text-[15px] font-semibold text-cx-text">Home</div>
              <div className="text-[11px] text-cx-text-muted">
                {vaults.length === 0
                  ? 'Create your first vault to get started'
                  : `${vaults.length} vault${vaults.length !== 1 ? 's' : ''} · ${totalGraphs} graph${totalGraphs !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {!creating && (
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold
                         text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7b6fff, #5a53cc)' }}>
              <span className="text-base leading-none">+</span>
              New Vault
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Create vault form */}
            {creating && (
              <div className="max-w-md">
                <NewVaultForm onCancel={() => setCreating(false)} onCreate={handleVaultCreated} />
              </div>
            )}

            {/* No vaults empty state */}
            {!creating && vaults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                     style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)' }}>
                  <VaultIcon />
                </div>
                <div className="text-[16px] font-semibold text-cx-text mb-2">No vaults yet</div>
                <div className="text-[12px] text-cx-text-muted max-w-xs leading-relaxed mb-6">
                  A vault stores your node library, graphs, and knowledge for a project or software pipeline.
                </div>
                <button onClick={() => setCreating(true)}
                  className="px-6 py-3 rounded-xl text-white text-[13px] font-semibold
                             transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #7b6fff, #5a53cc)' }}>
                  Create your first vault
                </button>
              </div>
            )}

            {/* Vault grid */}
            {vaults.length > 0 && (
              <section>
                <SectionLabel>Vaults</SectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {vaults.map(vault => (
                    <VaultCard key={vault.id} vault={vault} onClick={() => handleSelectVault(vault.id)} />
                  ))}
                  {!creating && (
                    <button onClick={() => setCreating(true)}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                                 border border-dashed border-cx-border hover:border-cx-accent/40
                                 text-cx-text-muted hover:text-cx-text transition-all hover:bg-cx-elevated/30
                                 min-h-[120px]">
                      <span className="text-2xl leading-none opacity-50">+</span>
                      <span className="text-[11px]">New Vault</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Recent graphs */}
            {recentGraphs.length > 0 && (
              <section>
                <SectionLabel>Recent Graphs</SectionLabel>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {recentGraphs.map(({ graph, vaultId }) => {
                    const vault = vaults.find(v => v.id === vaultId)
                    return (
                      <div key={graph.id} className="relative">
                        <RecentGraphRow
                          graph={graph}
                          active={graph.id === activeGraphId}
                          onClick={() => {
                            setActiveVault(vaultId)
                            setActiveGraph(graph.id)
                            setActiveNav('graph')
                          }}
                        />
                        {vault && (
                          <span className="absolute top-2 right-3 text-[9px] text-cx-text-muted opacity-60">
                            {vault.name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Quick actions */}
            {vaults.length > 0 && (
              <section>
                <SectionLabel>Quick Actions</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <QuickAction icon="🗂️" label="Browse Nodes" onClick={() => setActiveNav('nodes')} />
                  <QuickAction icon="🔍" label="Search"       onClick={() => setActiveNav('search')} />
                  <QuickAction icon="📊" label="Analytics"    onClick={() => setActiveNav('analytics')} />
                  <QuickAction icon="🔌" label="Bridge"       onClick={() => setActiveNav('import')} />
                  <QuickAction icon="✨" label="AI Copilot"   onClick={() => setActiveNav('ai')} />
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.12em] mb-3">
      {children}
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cx-border
                 text-[12px] text-cx-text-muted hover:text-cx-text hover:border-cx-accent/30
                 hover:bg-cx-elevated/60 transition-all">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function XIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
}

function GraphNodeIcon({ className }: { className?: string }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
    <circle cx="7" cy="7" r="2.5" fill="currentColor" opacity="0.8"/>
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
  </svg>
}

function VaultIcon() {
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(123,111,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="10" rx="2"/>
    <rect x="15" y="3" width="10" height="10" rx="2"/>
    <rect x="3" y="15" width="10" height="10" rx="2"/>
    <rect x="15" y="15" width="10" height="10" rx="2"/>
  </svg>
}
