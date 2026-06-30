import { useEffect, useRef, useState, useCallback } from 'react'
import { useUiStore } from '@/stores/ui.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'
import { nanoid } from 'nanoid'
import type { GraphNode } from '@/types'

/* ── Types ───────────────────────────────────────────────── */
interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  group: string
  groupOrder: number
  icon: React.ReactNode
  action: () => void | Promise<void>
  /** Extra action for Tab key (e.g. add node to canvas) */
  tabAction?: () => void | Promise<void>
}

const GROUP_META: Record<string, { color: string; order: number }> = {
  Recent:  { color: '#a78bfa', order: 0 },
  Create:  { color: '#34d399', order: 1 },
  Graphs:  { color: '#60a5fa', order: 2 },
  Nodes:   { color: '#7b6fff', order: 3 },
  Vaults:  { color: '#f59e0b', order: 4 },
}

/* ── Match highlight ─────────────────────────────────────── */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(123,111,255,0.3)', color: 'rgba(200,197,255,1)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

/* ── Component ───────────────────────────────────────────── */
export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, recentCommandIds, addRecentCommand, addToast } = useUiStore()
  const { vaults, activeVaultId, setActiveVault, createVault } = useVaultStore()
  const { createGraph, setActiveGraph, graphs, byVault, addNode: addToGraph, activeGraphId } = useGraphStore()
  const { getVaultNodes, selectNode } = useNodeStore()

  const [query, setQuery]     = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [busy, setBusy]       = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const itemRefs  = useRef<Map<number, HTMLButtonElement>>(new Map())

  /* ── Focus + reset on open ──────────────────────────────── */
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [commandPaletteOpen])

  /* ── Escape close ───────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCommandPalette() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeCommandPalette])

  /* ── Scroll active into view ────────────────────────────── */
  useEffect(() => {
    const el = itemRefs.current.get(activeIdx)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx])

  /* ── Run command ────────────────────────────────────────── */
  const run = useCallback(async (cmd: Command) => {
    setBusy(true)
    addRecentCommand(cmd.id)
    try { await cmd.action() } finally { setBusy(false) }
    closeCommandPalette()
  }, [closeCommandPalette, addRecentCommand])

  const runTab = useCallback(async (cmd: Command) => {
    if (!cmd.tabAction) return
    setBusy(true)
    addRecentCommand(cmd.id)
    try { await cmd.tabAction() } finally { setBusy(false) }
    closeCommandPalette()
  }, [closeCommandPalette, addRecentCommand])

  if (!commandPaletteOpen) return null

  /* ── Build all commands ─────────────────────────────────── */
  const allCmds: Command[] = []

  // Create — vault
  allCmds.push({
    id: 'new-vault', label: 'New Vault', group: 'Create', groupOrder: 1,
    description: 'Create a new knowledge vault',
    icon: <VaultIcon />,
    action: async () => {
      const name = prompt('Vault name:')
      if (!name?.trim()) return
      const vault = await createVault({ name: name.trim(), path: name.trim().toLowerCase().replace(/\s+/g, '-') })
      setActiveVault(vault.id)
    },
  })

  if (activeVaultId) {
    allCmds.push({
      id: 'new-graph', label: 'New Graph', group: 'Create', groupOrder: 1,
      description: 'Create a new graph in this vault',
      shortcut: '⌘G', icon: <GraphIcon />,
      action: async () => {
        const name = prompt('Graph name:')
        if (!name?.trim()) return
        await createGraph({ vaultId: activeVaultId, name: name.trim(), description: '', tags: [] })
      },
    })
  }

  // Vaults
  vaults.forEach(v => {
    if (v.id !== activeVaultId)
      allCmds.push({
        id: `vault-${v.id}`, label: v.name, group: 'Vaults', groupOrder: 4,
        description: 'Switch to this vault', icon: <VaultIcon />,
        action: () => setActiveVault(v.id),
      })
  })

  // Graphs — all vaults
  vaults.forEach(v => {
    ;(byVault[v.id] ?? []).forEach(gid => {
      const g = graphs[gid]
      if (!g) return
      const isOtherVault = v.id !== activeVaultId
      allCmds.push({
        id: `graph-${gid}`, label: g.name, group: 'Graphs', groupOrder: 2,
        description: isOtherVault
          ? `${v.name} · ${g.nodes.length} nodes · ${g.edges.length} edges`
          : `${g.nodes.length} nodes · ${g.edges.length} edges`,
        icon: <GraphIcon />,
        action: () => { if (isOtherVault) setActiveVault(v.id); setActiveGraph(gid) },
      })
    })
  })

  if (activeVaultId) {
    // Nodes
    getVaultNodes(activeVaultId).slice(0, 30).forEach(n => {
      allCmds.push({
        id: `node-${n.id}`, label: n.displayName, group: 'Nodes', groupOrder: 3,
        description: `${n.category} · ${n.objectType.replace(/_/g, ' ')}`,
        icon: <NodeIcon />,
        action: () => selectNode(n.id),
        tabAction: () => {
          if (!activeGraphId) { addToast('No graph open', { variant: 'warning' }); return }
          const gn: GraphNode = {
            id: nanoid(), nodeId: n.id, graphId: activeGraphId,
            position: { x: 120 + Math.random() * 300, y: 80 + Math.random() * 200 },
            isCollapsed: false, zIndex: 0,
          }
          addToGraph(gn)
          addToast(`"${n.displayName}" added to canvas`, { variant: 'success' })
        },
      })
    })
  }

  /* ── Filter ─────────────────────────────────────────────── */
  const q = query.trim().toLowerCase()
  const filtered = q
    ? allCmds.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      )
    : allCmds

  /* ── Inject Recent group (empty query only) ─────────────── */
  const withRecent: Command[] = []
  if (!q && recentCommandIds.length > 0) {
    recentCommandIds
      .map(rid => allCmds.find(c => c.id === rid))
      .filter((c): c is Command => Boolean(c))
      .forEach(c => withRecent.push({ ...c, group: 'Recent', groupOrder: 0 }))
  }
  const displayCmds = q ? filtered : [...withRecent, ...filtered.filter(c => !withRecent.find(r => r.id === c.id))]

  /* ── Group ──────────────────────────────────────────────── */
  const grouped = displayCmds.reduce<Record<string, Command[]>>((acc, c) => {
    ;(acc[c.group] ??= []).push(c)
    return acc
  }, {})
  const groupOrder = (g: string) => GROUP_META[g]?.order ?? 99
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => groupOrder(a) - groupOrder(b))
  const flat = sortedGroups.flatMap(([, items]) => items)

  /* ── Key handling ───────────────────────────────────────── */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flat[activeIdx]) {
      e.preventDefault()
      run(flat[activeIdx])
    } else if (e.key === 'Tab' && flat[activeIdx]?.tabAction) {
      e.preventDefault()
      runTab(flat[activeIdx])
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(3,3,10,0.78)', backdropFilter: 'blur(10px)' }}
        onClick={closeCommandPalette}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 w-[600px] max-w-[94vw]"
           style={{ animation: 'palette-in 0.18s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <div style={{
          background: 'linear-gradient(160deg, rgba(15,15,36,0.99) 0%, rgba(10,10,26,0.99) 100%)',
          border: '1px solid rgba(40,40,90,0.8)',
          borderRadius: '20px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(123,111,255,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(123,111,255,0.12) 0%, transparent 65%)' }} />

          {/* Search row */}
          <div className="relative flex items-center gap-3 px-5 py-4"
               style={{ borderBottom: '1px solid rgba(24,24,58,0.9)' }}>
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
              onKeyDown={onKey}
              placeholder="Search nodes, graphs, commands…"
              className="flex-1 bg-transparent text-[14px] text-cx-text outline-none placeholder:text-cx-text-muted"
            />
            {busy && (
              <span className="text-[11px] text-cx-accent"
                    style={{ animation: 'pulse 1s ease-in-out infinite' }}>
                running…
              </span>
            )}
            <kbd className="text-[10px] text-cx-text-muted bg-cx-bg border border-cx-border px-1.5 py-0.5
                            rounded-md font-mono flex-shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {flat.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
                     style={{ color: 'rgba(100,100,160,0.3)' }}>
                  <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="21" y1="21" x2="28" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'rgba(140,140,180,0.7)' }}>
                    No results for <span style={{ color: 'rgba(180,175,255,0.8)' }}>"{query}"</span>
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'rgba(80,80,130,0.7)' }}>
                    Try searching by name, category, or command
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-1.5">
                {sortedGroups.map(([group, items]) => {
                  const meta = GROUP_META[group] ?? { color: '#888', order: 99 }
                  return (
                    <div key={group}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}80` }} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em]"
                              style={{ color: 'rgba(110,110,160,0.8)' }}>
                          {group}
                        </span>
                        <span className="text-[10px] ml-0.5"
                              style={{ color: 'rgba(70,70,120,0.7)' }}>
                          {items.length}
                        </span>
                      </div>

                      {/* Items */}
                      {items.map(cmd => {
                        const idx = flat.indexOf(cmd)
                        const active = idx === activeIdx
                        const hasTab = Boolean(cmd.tabAction)
                        return (
                          <button
                            key={cmd.id}
                            ref={el => { if (el) itemRefs.current.set(idx, el); else itemRefs.current.delete(idx) }}
                            onClick={() => run(cmd)}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className="relative w-full flex items-center gap-3.5 text-left transition-all"
                            style={{
                              margin: '1px 6px',
                              width: 'calc(100% - 12px)',
                              padding: '8px 12px',
                              borderRadius: 12,
                              background: active
                                ? `linear-gradient(90deg, ${meta.color}14 0%, ${meta.color}06 100%)`
                                : 'transparent',
                              boxShadow: active ? `inset 0 0 0 1px ${meta.color}22` : 'none',
                            }}
                          >
                            {/* Left accent bar */}
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full transition-all"
                                  style={{
                                    height: active ? 18 : 0,
                                    background: meta.color,
                                    boxShadow: active ? `0 0 8px ${meta.color}80` : 'none',
                                    opacity: active ? 1 : 0,
                                  }} />

                            {/* Icon */}
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{
                                    background: active ? `${meta.color}20` : 'rgba(20,20,48,0.7)',
                                    color: active ? meta.color : 'rgba(90,90,140,0.8)',
                                    border: `1px solid ${active ? meta.color + '30' : 'rgba(24,24,58,0.7)'}`,
                                  }}>
                              {cmd.icon}
                            </span>

                            {/* Label + description */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[12.5px] font-medium leading-tight"
                                   style={{ color: active ? 'rgba(210,207,255,0.95)' : 'rgba(210,210,235,0.82)' }}>
                                <Highlight text={cmd.label} query={q} />
                              </div>
                              {cmd.description && (
                                <div className="text-[11px] truncate mt-0.5"
                                     style={{ color: 'rgba(90,90,140,0.8)' }}>
                                  <Highlight text={cmd.description} query={q} />
                                </div>
                              )}
                            </div>

                            {/* Right side: shortcut / tab hint / enter */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {cmd.shortcut && (
                                <kbd className="text-[10px] bg-cx-bg border border-cx-border px-1.5 py-0.5
                                                rounded-md font-mono"
                                     style={{ color: 'rgba(100,100,150,0.8)' }}>
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {active && hasTab && (
                                <kbd className="text-[9px] px-1.5 py-0.5 rounded-md font-mono border flex items-center gap-0.5"
                                     style={{
                                       background: `${meta.color}10`,
                                       borderColor: `${meta.color}30`,
                                       color: meta.color,
                                     }}
                                     title="Tab: add to canvas">
                                  TAB
                                </kbd>
                              )}
                              {active && (
                                <span className="text-[12px]" style={{ color: `${meta.color}80` }}>
                                  ↵
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(18,18,46,0.9)', background: 'rgba(5,5,14,0.6)' }}
               className="px-5 py-2.5 flex items-center gap-4">
            <FooterHint keys="↑↓" label="navigate" />
            <FooterHint keys="↵" label="run" />
            <FooterHint keys="Tab" label="add to canvas" />
            <FooterHint keys="Esc" label="close" />
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'rgba(55,55,95,0.9)' }}>
              {flat.length} {flat.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Footer hint ─────────────────────────────────────────── */
function FooterHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: 'rgba(70,70,120,0.9)' }}>
      <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border"
           style={{ borderColor: 'rgba(30,30,70,0.8)', background: 'rgba(8,8,22,0.7)', color: 'rgba(110,110,170,0.8)' }}>
        {keys}
      </kbd>
      <span className="text-[10px]">{label}</span>
    </span>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0"
         style={{ color: 'rgba(90,90,150,0.7)' }}>
      <circle cx="5.5" cy="5.5" r="3.5"/>
      <line x1="8.5" y1="8.5" x2="12" y2="12"/>
    </svg>
  )
}
function VaultIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="11" height="10" rx="1.5"/>
      <circle cx="7" cy="7" r="1.5"/>
      <line x1="7" y1="5.5" x2="7" y2="3.5"/>
      <line x1="7" y1="8.5" x2="7" y2="10.5"/>
      <line x1="5.5" y1="7" x2="3.5" y2="7"/>
      <line x1="8.5" y1="7" x2="10.5" y2="7"/>
    </svg>
  )
}
function GraphIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round">
      <circle cx="2.5" cy="7" r="1.5"/>
      <circle cx="11.5" cy="2.5" r="1.5"/>
      <circle cx="11.5" cy="11.5" r="1.5"/>
      <line x1="4" y1="6.3" x2="10" y2="3.2"/>
      <line x1="4" y1="7.7" x2="10" y2="10.8"/>
    </svg>
  )
}
function NodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1 L12 4 L12 10 L7 13 L2 10 L2 4 Z"/>
    </svg>
  )
}
