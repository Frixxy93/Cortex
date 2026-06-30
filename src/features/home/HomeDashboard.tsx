import { useState, useEffect, useRef, useCallback } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { CortexLogo } from '@/components/ui/CortexLogo'
import { VaultCardSkeleton } from '@/components/ui/Skeleton'
import { ContextMenu, useContextMenu, MenuItemDef } from '@/components/ui/ContextMenu'
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

function VaultCard({ vault, graphCount, nodeCount, onClick }: {
  vault: import('@/types/vault').Vault
  graphCount: number
  nodeCount: number
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
        <StatPill label="graphs" value={graphCount} color="#60a5fa" />
        <StatPill label="nodes" value={nodeCount} color={color} />
      </div>
    </button>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[15px] font-bold leading-none" style={{ color: color ?? 'rgba(234,234,248,0.85)' }}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: 'rgba(234,234,248,0.25)' }}>{label}</span>
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
  const { vaults, setActiveVault, activeVaultId, isLoading: vaultsLoading, deleteVault } = useVaultStore()
  const { graphs, byVault, setActiveGraph, activeGraphId } = useGraphStore()
  const getVaultNodes = useNodeStore(s => s.getVaultNodes)
  const { setActiveNav, openCommandPalette } = useUiStore()

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

  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu()

  const handleDeleteVault = async (id: string, name: string) => {
    if (!window.confirm(`Delete vault "${name}"? This cannot be undone.`)) return
    await deleteVault(id)
  }

  // all recent graphs across all vaults (capped at 6)
  const recentGraphs = vaults
    .flatMap(v => (byVault[v.id] ?? []).map(gid => ({ graph: graphs[gid], vaultId: v.id })))
    .filter(x => x.graph)
    .slice(0, 6)

  // totals
  const totalGraphs = vaults.reduce((s, v) => s + (v.stats?.graphCount ?? 0), 0)

  return (
    <div className="w-full h-full relative overflow-hidden bg-cx-bg flex flex-col">
      <GraphBg />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(123,111,255,0.07) 0%, transparent 70%)' }} />

      <div className={cn(
        'relative z-10 flex flex-col flex-1 min-h-0 transition-all duration-500',
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

        {/* Empty state — outside scroll container so flex-1 centering works */}
        {!creating && vaults.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="relative mb-7">
              <div className="absolute inset-0 blur-3xl opacity-20 rounded-full"
                   style={{ background: '#7b6fff', transform: 'scale(3)' }} />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                   style={{
                     background: 'linear-gradient(145deg, rgba(123,111,255,0.15), rgba(90,83,204,0.06))',
                     border: '1px solid rgba(123,111,255,0.2)',
                     boxShadow: '0 0 40px rgba(123,111,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
                   }}>
                <VaultIcon />
              </div>
            </div>

            <div className="text-[22px] font-semibold text-cx-text mb-2.5 tracking-tight">
              Your workspace is empty
            </div>
            <div className="text-[13px] leading-relaxed mb-8 max-w-[300px]"
                 style={{ color: 'rgba(234,234,248,0.45)' }}>
              Create a vault to organize your VFX node library, graphs, and pipeline knowledge.
            </div>

            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-white text-[13px] font-semibold
                         transition-all hover:opacity-90 active:scale-[0.98] mb-12"
              style={{
                background: 'linear-gradient(135deg, #7b6fff, #5a53cc)',
                boxShadow: '0 4px 28px rgba(123,111,255,0.35)',
              }}>
              <span className="text-[18px] leading-none">+</span>
              Create your first vault
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-center max-w-sm">
              {[
                { icon: '🌀', label: 'Houdini' },
                { icon: '🎬', label: 'Nuke' },
                { icon: '🎨', label: 'Katana' },
                { icon: '🔗', label: 'Graph editor' },
                { icon: '🤖', label: 'AI copilot' },
              ].map(f => (
                <div key={f.label}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                     style={{
                       background: 'rgba(255,255,255,0.03)',
                       border: '1px solid rgba(255,255,255,0.06)',
                       color: 'rgba(234,234,248,0.4)',
                     }}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content — only when creating or have vaults */}
        {(creating || vaultsLoading || vaults.length > 0) && (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-4xl mx-auto space-y-8 pt-2">

            {/* Create vault form */}
            {creating && (
              <div className="max-w-md pt-4">
                <NewVaultForm onCancel={() => setCreating(false)} onCreate={handleVaultCreated} />
              </div>
            )}

            {/* Vault grid */}
            {(vaultsLoading || vaults.length > 0) && (
              <section>
                <SectionLabel>Vaults</SectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {vaultsLoading
                    ? Array.from({ length: 4 }).map((_, i) => <VaultCardSkeleton key={i} />)
                    : vaults.map(vault => (
                        <div key={vault.id} onContextMenu={e => openCtx(e, [
                          { kind: 'item', label: 'Open',   icon: <VCOpenIcon />,  onClick: () => handleSelectVault(vault.id) },
                          { kind: 'separator' },
                          { kind: 'item', label: 'Delete', icon: <VCTrashIcon />, danger: true, onClick: () => handleDeleteVault(vault.id, vault.name) },
                        ] satisfies MenuItemDef[])}>
                          <VaultCard vault={vault} graphCount={byVault[vault.id]?.length ?? 0} nodeCount={getVaultNodes(vault.id).length} onClick={() => handleSelectVault(vault.id)} />
                        </div>
                      ))
                  }
                  {!creating && !vaultsLoading && (
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
                  <QuickAction icon={<QAGraphIcon />}    color="#60a5fa" label="Open Graph"   onClick={() => { if (activeGraphId) { setActiveNav('graph') } else { openCommandPalette() } }} />
                  <QuickAction icon={<QANodesIcon />}     color="#a78bfa" label="Browse Nodes" onClick={() => setActiveNav('nodes')} />
                  <QuickAction icon={<QASearchIcon />}    color="#34d399" label="Search"       onClick={() => setActiveNav('search')} />
                  <QuickAction icon={<QAAnalyticsIcon />} color="#f59e0b" label="Analytics"    onClick={() => setActiveNav('analytics')} />
                  <QuickAction icon={<QAAiIcon />}        color="#22d3ee" label="AI Copilot"   onClick={() => setActiveNav('ai')} />
                </div>
              </section>
            )}

          </div>
        </div>
        )}
      </div>
      {ctxMenu && <ContextMenu {...ctxMenu} onClose={closeCtx} />}
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(234,234,248,0.22)' }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
    </div>
  )
}

function QuickAction({ icon, color, label, onClick }: { icon: React.ReactNode; color: string; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-150"
      style={{
        background: hovered ? color + '12' : 'rgba(255,255,255,0.03)',
        border: '1px solid ' + (hovered ? color + '30' : 'rgba(255,255,255,0.07)'),
        color:  hovered ? 'rgba(234,234,248,0.85)' : 'rgba(234,234,248,0.4)',
      }}
    >
      <span style={{ color: hovered ? color : 'rgba(234,234,248,0.3)', transition: 'color 0.15s', display: 'flex' }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

/* ── Quick action icons ───────────────────────────────────── */
function QAGraphIcon()     { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="2.5" cy="6.5" r="1.5"/><circle cx="10.5" cy="2.5" r="1.5"/><circle cx="10.5" cy="10.5" r="1.5"/><line x1="4" y1="5.8" x2="9" y2="3.2"/><line x1="4" y1="7.2" x2="9" y2="9.8"/></svg> }
function QANodesIcon()     { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 1 L11 3.5 L11 8.5 L6.5 11 L2 8.5 L2 3.5 Z"/></svg> }
function QASearchIcon()    { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="4"/><line x1="8.5" y1="8.5" x2="12" y2="12"/></svg> }
function QAAnalyticsIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 10 L4 6.5 L7 8.5 L11 3"/><circle cx="11" cy="3" r="1" fill="currentColor" stroke="none"/></svg> }
function QABridgeIcon()    { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 1.5 L6.5 9"/><path d="M4 7 L6.5 9.5 L9 7"/><path d="M1.5 11 H11.5"/></svg> }
function QAAiIcon()        { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2h4M6.5 2v2M3 4.5h7l1 6H2l1-6zM5 7.5h3M6.5 7.5V9"/></svg> }

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

/* ── Vault card context menu icons ───────────────────────── */
function VCOpenIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"/>
    <path d="M8 1h3m0 0v3m0-3L6 6"/>
  </svg>
}
function VCTrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 2.5h9M4 2.5V1.5h4v1M3 2.5l.5 8h5l.5-8"/>
  </svg>
}
