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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={closeCommandPalette} />
      <div className="fixed left-1/2 top-[18vh] -translate-x-1/2 z-50 w-[560px] max-w-[92vw]">
        <div className="bg-cx-elevated border border-cx-border rounded-2xl overflow-hidden"
             style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(123,111,255,0.12)' }}>

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-cx-border">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
              onKeyDown={onKey}
              placeholder="Search commands, graphs, nodes…"
              className="flex-1 bg-transparent text-[13px] text-cx-text outline-none placeholder:text-cx-text-muted"
            />
            {busy && <span className="text-[11px] text-cx-accent animate-pulse">…</span>}
            <kbd className="text-[10px] text-cx-text-muted bg-cx-surface border border-cx-border px-1.5 py-0.5 rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto py-1">
            {flat.length === 0 ? (
              <div className="px-4 py-8 text-[12px] text-cx-text-muted text-center">
                No results for "{query}"
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">
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
                        className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left ${
                          active ? 'bg-cx-accent/10' : 'hover:bg-cx-surface'
                        }`}
                      >
                        <span className={active ? 'text-cx-accent' : 'text-cx-text-muted'}>
                          {cmd.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] font-medium ${active ? 'text-cx-accent' : 'text-cx-text'}`}>
                            {cmd.label}
                          </div>
                          {cmd.description && (
                            <div className="text-[11px] text-cx-text-muted truncate">{cmd.description}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] text-cx-text-muted bg-cx-surface border border-cx-border px-1.5 py-0.5 rounded flex-shrink-0 font-mono">{cmd.shortcut}</kbd>
                        )}
                        {active && <span className="text-[10px] text-cx-text-muted flex-shrink-0">↵</span>}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-cx-border px-4 py-2 flex items-center gap-4 text-[10px] text-cx-text-muted">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> run</span>
            <span><kbd className="font-mono">ESC</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  )
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
    strokeWidth="1.4" strokeLinecap="round" className="text-cx-text-muted flex-shrink-0">
    <circle cx="5.5" cy="5.5" r="3.5"/><line x1="8.5" y1="8.5" x2="12" y2="12"/>
  </svg>
}
function VaultIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="2" width="11" height="10" rx="1.5"/>
    <circle cx="7" cy="7" r="1.5"/>
    <line x1="7" y1="5.5" x2="7" y2="3.5"/><line x1="7" y1="8.5" x2="7" y2="10.5"/>
    <line x1="5.5" y1="7" x2="3.5" y2="7"/><line x1="8.5" y1="7" x2="10.5" y2="7"/>
  </svg>
}
function GraphIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round">
    <circle cx="2.5" cy="7" r="1.5"/><circle cx="11.5" cy="2.5" r="1.5"/><circle cx="11.5" cy="11.5" r="1.5"/>
    <line x1="4" y1="6.3" x2="10" y2="3.2"/><line x1="4" y1="7.7" x2="10" y2="10.8"/>
  </svg>
}
function NodeIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
    strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1 L12 4 L12 10 L7 13 L2 10 L2 4 Z"/>
  </svg>
}
