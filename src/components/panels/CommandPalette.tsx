import { useEffect, useRef, useState, useCallback } from 'react'
import { useUiStore } from '@/stores/ui.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useNodeStore } from '@/stores/node.store'

interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  group: string
  icon: React.ReactNode
  action: () => void | Promise<void>
}

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUiStore()
  const { vaults, activeVaultId, setActiveVault, createVault } = useVaultStore()
  const { createGraph, setActiveGraph, graphs, byVault } = useGraphStore()
  const { getVaultNodes, selectNode } = useNodeStore()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCommandPalette() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [closeCommandPalette])

  const run = useCallback(async (cmd: Command) => {
    setBusy(true)
    try { await cmd.action() } finally { setBusy(false) }
    closeCommandPalette()
  }, [closeCommandPalette])

  if (!commandPaletteOpen) return null

  /* ── Build command list ─────────────────────────────────── */
  const cmds: Command[] = []

  // Create — vault
  cmds.push({
    id: 'new-vault', label: 'New Vault', group: 'Create',
    description: 'Create a new knowledge vault',
    icon: <VaultIcon />,
    action: async () => {
      const name = prompt('Vault name:')
      if (!name?.trim()) return
      const vault = await createVault({
        name: name.trim(),
        path: name.trim().toLowerCase().replace(/\s+/g, '-'),
      })
      setActiveVault(vault.id)
    },
  })

  // Create — graph (only if vault active)
  if (activeVaultId) {
    cmds.push({
      id: 'new-graph', label: 'New Graph', group: 'Create',
      description: 'Create a new graph in this vault',
      shortcut: '⌘G',
      icon: <GraphIcon />,
      action: async () => {
        const name = prompt('Graph name:')
        if (!name?.trim()) return
        await createGraph({ vaultId: activeVaultId, name: name.trim(), description: '', tags: [] })
      },
    })
  }

  // Switch vault
  vaults.forEach(v => {
    if (v.id !== activeVaultId)
      cmds.push({
        id: `vault-${v.id}`, label: v.name, group: 'Vaults',
        description: 'Switch to this vault',
        icon: <VaultIcon />,
        action: () => setActiveVault(v.id),
      })
  })

  // Open graphs in active vault
  if (activeVaultId) {
    ;(byVault[activeVaultId] ?? []).forEach(gid => {
      const g = graphs[gid]
      if (!g) return
      cmds.push({
        id: `graph-${gid}`, label: g.name, group: 'Graphs',
        description: `${g.nodes.length} nodes · ${g.edges.length} edges`,
        icon: <GraphIcon />,
        action: () => setActiveGraph(gid),
      })
    })

    // Node quick-jump
    getVaultNodes(activeVaultId).slice(0, 30).forEach(n => {
      cmds.push({
        id: `node-${n.id}`, label: n.displayName, group: 'Nodes',
        description: `${n.category} · ${n.objectType.replace(/_/g, ' ')}`,
        icon: <NodeIcon />,
        action: () => selectNode(n.id),
      })
    })
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? cmds.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      )
    : cmds

  const groups = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    ;(acc[c.group] ??= []).push(c)
    return acc
  }, {})
  const flat = Object.values(groups).flat()

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[activeIdx]) run(flat[activeIdx])
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(3,3,10,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={closeCommandPalette}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[16vh] -translate-x-1/2 z-50 w-[580px] max-w-[94vw] animate-fade-in">
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(15,15,36,0.98) 0%, rgba(10,10,28,0.98) 100%)',
            border: '1px solid rgba(36,36,80,0.8)',
            borderRadius: '18px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(123,111,255,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Inner top glow */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(123,111,255,0.1) 0%, transparent 70%)' }} />

          {/* Search input */}
          <div className="relative flex items-center gap-3 px-5 py-4"
               style={{ borderBottom: '1px solid rgba(24,24,58,0.8)' }}>
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
              onKeyDown={onKey}
              placeholder="Search nodes, graphs, commands…"
              className="flex-1 bg-transparent text-[13.5px] text-cx-text outline-none placeholder:text-cx-text-muted"
            />
            {busy && <span className="text-[11px] text-cx-accent animate-pulse">Loading…</span>}
            <kbd className="text-[10px] text-cx-text-muted bg-cx-bg border border-cx-border px-1.5 py-0.5 rounded-md font-mono flex-shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto py-1.5">
            {flat.length === 0 ? (
              <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-cx-text-muted/40">
                  <circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="19" y1="19" x2="25" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[12px] text-cx-text-muted">No results for "<span className="text-cx-text-dim">{query}</span>"</span>
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <div className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                       style={{ color: 'rgba(120,120,160,0.7)' }}>
                    {group}
                  </div>
                  {items.map(cmd => {
                    const idx = flat.indexOf(cmd)
                    const active = idx === activeIdx
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => run(cmd)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className="relative w-full flex items-center gap-3.5 px-4 py-2.5 transition-all text-left mx-1"
                        style={{
                          width: 'calc(100% - 8px)',
                          borderRadius: '10px',
                          background: active
                            ? 'linear-gradient(90deg, rgba(123,111,255,0.12) 0%, rgba(123,111,255,0.05) 100%)'
                            : 'transparent',
                          boxShadow: active ? 'inset 0 0 0 1px rgba(123,111,255,0.15)' : 'none',
                        }}
                      >
                        {/* Active left bar */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                style={{ background: 'var(--cx-accent)', boxShadow: '0 0 6px rgba(123,111,255,0.6)' }} />
                        )}

                        {/* Icon */}
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            background: active ? 'rgba(123,111,255,0.15)' : 'rgba(24,24,58,0.6)',
                            color: active ? 'rgba(180,175,255,0.9)' : 'rgba(100,100,150,0.8)',
                          }}
                        >
                          {cmd.icon}
                        </span>

                        {/* Label + desc */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium leading-tight"
                               style={{ color: active ? 'rgba(200,197,255,0.95)' : 'rgba(226,226,240,0.85)' }}>
                            {cmd.label}
                          </div>
                          {cmd.description && (
                            <div className="text-[11px] truncate mt-0.5"
                                 style={{ color: 'rgba(100,100,150,0.8)' }}>
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] bg-cx-bg border border-cx-border px-1.5 py-0.5 rounded-md flex-shrink-0 font-mono"
                               style={{ color: 'rgba(100,100,150,0.8)' }}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {active && (
                          <span className="text-[10px] flex-shrink-0"
                                style={{ color: 'rgba(123,111,255,0.6)' }}>&#8629;</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(24,24,58,0.7)', background: 'rgba(5,5,14,0.5)' }}
               className="px-5 py-2.5 flex items-center gap-5">
            <FooterHint keys="&#8593;&#8595;" label="navigate" />
            <FooterHint keys="&#8629;" label="run" />
            <FooterHint keys="Tab" label="place node" />
            <FooterHint keys="Esc" label="close" />
            <span className="ml-auto text-[10px]" style={{ color: 'rgba(60,60,100,0.8)' }}>
              {flat.length} {flat.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

function FooterHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1" style={{ color: 'rgba(80,80,130,0.8)' }}>
      <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border"
           style={{ borderColor: 'rgba(36,36,80,0.8)', background: 'rgba(10,10,24,0.6)', color: 'rgba(120,120,180,0.7)' }}>
        {keys}
      </kbd>
      <span className="text-[10px]">{label}</span>
    </span>
  )
}
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0"
         style={{ color: 'rgba(100,100,160,0.7)' }}>
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
