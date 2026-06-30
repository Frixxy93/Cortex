import { useState, useEffect } from 'react'
import { EmptyState, EmptyIcons } from '@/components/ui/EmptyState'
import { GraphRowSkeleton } from '@/components/ui/Skeleton'
import { useUiStore } from '@/stores/ui.store'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { LibraryPanel } from '@/components/sidebar/LibraryPanel'
import { SearchPanel } from '@/components/sidebar/SearchPanel'
import { AICopilot } from '@/components/ai/AICopilot'
import { AiSettings } from '@/features/ai/AiSettings'
import { AnalyticsDashboard } from '@/features/analytics/AnalyticsDashboard'
import { ImportPanel } from '@/features/import/ImportPanel'
import { GraphTemplates } from '@/features/graph/GraphTemplates'
import { GraphExport } from '@/features/graph/GraphExport'
import { cn } from '@/utils/cn'

export function ContentPanel() {
  const { activeNavId, setActiveNav } = useUiStore()
  // 'home' is handled by HomeDashboard in app.tsx — not a side panel
  if (!activeNavId || activeNavId === 'home') return null

  const titles: Record<string, string> = {
    graph: 'Graphs', nodes: 'Nodes', search: 'Search',
    analytics: 'Analytics', import: 'Import', ai: 'AI Assistant',
    recipes: 'Recipes', templates: 'Templates', media: 'Media',
    bookmarks: 'Bookmarks', trash: 'Trash',
  }

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-cx-border bg-cx-bg"
         style={{ boxShadow: '1px 0 0 rgba(255,255,255,0.02)' }}>
      <div className="h-8 flex items-center justify-between px-3 border-b border-cx-border flex-shrink-0">
        <span className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">
          {titles[activeNavId] ?? activeNavId}
        </span>
        <button onClick={() => setActiveNav(null)}
          className="w-5 h-5 flex items-center justify-center rounded text-cx-text-muted
                     hover:bg-cx-elevated hover:text-cx-text transition-colors">
          <XIcon />
        </button>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {activeNavId === 'graph'     && <GraphListPanel />}
        {activeNavId === 'nodes'     && <LibraryPanel />}
        {activeNavId === 'search'    && <SearchPanel />}
        {activeNavId === 'analytics' && <AnalyticsDashboard />}
        {activeNavId === 'import'    && <ImportPanel />}
        {activeNavId === 'ai'        && <AiPanel />}
        {activeNavId === 'templates' && <GraphTemplates />}
        {['recipes','media','bookmarks','trash'].includes(activeNavId) && (
          <ComingSoon label={titles[activeNavId]} />
        )}
      </div>
    </div>
  )
}

/* ── Graph list ─────────────────────────────────────────── */
function GraphListPanel() {
  const { activeVaultId } = useVaultStore()
  const { graphs, byVault, activeGraphId, setActiveGraph, createGraph, deleteGraph, renameGraph, isLoading: graphsLoading } = useGraphStore()
  const { addToast } = useUiStore()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const list = activeVaultId
    ? (byVault[activeVaultId] ?? []).map(id => graphs[id]).filter(Boolean)
    : []

  const handleCreate = async () => {
    if (!activeVaultId) return
    const name = prompt('Graph name:')
    if (!name?.trim()) return
    await createGraph({ vaultId: activeVaultId, name: name.trim(), description: '', tags: [] })
    addToast(`Graph "${name.trim()}" created`, { variant: 'success' })
  }

  const handleDelete = async (id: string, name: string) => {
    await deleteGraph(id)
    addToast(`Graph "${name}" deleted`, { variant: 'default' })
    setConfirmId(null)
  }

  const startRename = (g: { id: string; name: string }) => {
    setEditingId(g.id)
    setEditName(g.name)
  }

  const commitRename = async () => {
    if (!editingId || !editName.trim()) { setEditingId(null); return }
    await renameGraph(editingId, editName.trim())
    addToast('Graph renamed', { variant: 'success' })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-cx-border flex-shrink-0">
        <button onClick={handleCreate}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px]
                     text-cx-text-muted hover:text-cx-text hover:bg-cx-elevated
                     border border-dashed border-cx-border transition-all">
          <span className="text-cx-accent font-semibold text-base leading-none">+</span>
          New Graph
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {graphsLoading ? (
          <div className="py-1">
            {Array.from({ length: 5 }).map((_, i) => <GraphRowSkeleton key={i} />)}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<EmptyIcons.Graph />}
            title="No graphs yet"
            body="Create a graph to start building your node network"
            action={{ label: '+ New Graph', onClick: handleCreate }}
          />
        ) : list.map(g => {
          const active = g.id === activeGraphId
          const confirming = confirmId === g.id
          const editing = editingId === g.id
          return (
            <div key={g.id}
              className={cn('group flex items-center gap-1 px-2 transition-all',
                active ? 'bg-cx-accent/10' : 'hover:bg-cx-elevated')}>
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 bg-cx-elevated border border-cx-accent rounded px-2 py-1
                             text-[12px] text-cx-text focus:outline-none my-1"
                />
              ) : (
                <button onClick={() => setActiveGraph(g.id)} onDoubleClick={() => startRename(g)}
                  className="flex items-start gap-2 flex-1 py-2 min-w-0 text-left">
                  <GraphDotIcon className={cn('mt-0.5 flex-shrink-0', active ? 'text-cx-accent' : 'text-cx-text-muted')} />
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[12px] font-medium truncate',
                      active ? 'text-cx-accent' : 'text-cx-text')}>{g.name}</div>
                    <div className="text-[10px] text-cx-text-muted">
                      {g.nodes.length} nodes · {g.edges.length} edges
                    </div>
                  </div>
                </button>
              )}
              {!editing && (
                confirming ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleDelete(g.id, g.name)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cx-error/20 text-cx-error
                                 hover:bg-cx-error/30 transition-colors">Del</button>
                    <button onClick={() => setConfirmId(null)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-cx-text-muted
                                 hover:bg-cx-elevated transition-colors">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(g.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
                               text-cx-text-muted hover:text-cx-error hover:bg-cx-error/10
                               opacity-0 group-hover:opacity-100 transition-all">
                    <TrashIcon />
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>
      {/* Active graph detail editor */}
      {activeGraphId && graphs[activeGraphId] && (
        <GraphDetailEditor graph={graphs[activeGraphId]} addToast={addToast} />
      )}
      {activeGraphId && (
        <div className="border-t border-cx-border flex-shrink-0">
          <GraphExport />
        </div>
      )}
    </div>
  )
}

function GraphDetailEditor({ graph, addToast }: {
  graph: import('@/types').CortexGraph
  addToast: (msg: string, opts?: { variant?: import('@/types').ToastVariant }) => void
}) {
  const [desc, setDesc] = useState(graph.description ?? '')
  const [tags, setTags] = useState((graph.tags ?? []).join(', '))

  useEffect(() => {
    setDesc(graph.description ?? '')
    setTags((graph.tags ?? []).join(', '))
  }, [graph.id])

  const save = async (patch: { description?: string; tags?: string[] }) => {
    const { GraphService } = await import('@/services/graph.service')
    await GraphService.save({ id: graph.id, ...patch })
    addToast('Graph updated', { variant: 'success' })
  }

  return (
    <div className="border-t border-cx-border p-3 space-y-2">
      <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">
        About
      </div>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onBlur={() => save({ description: desc })}
        rows={3}
        placeholder="Graph description…"
        className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-2
                   text-[11px] text-cx-text placeholder-cx-text-muted resize-none
                   focus:outline-none focus:border-cx-accent/50 transition-colors"
      />
      <input
        value={tags}
        onChange={e => setTags(e.target.value)}
        onBlur={() => save({ tags: tags.split(',').map(t => t.trim()).filter(Boolean) })}
        placeholder="Tags (comma separated)"
        className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                   text-[11px] text-cx-text placeholder-cx-text-muted
                   focus:outline-none focus:border-cx-accent/50 transition-colors"
      />
    </div>
  )
}

/* ── Stat Card ─────────────────────────────────────────────── */
/* ── AI Panel ───────────────────────────────────────────────── */
function AiPanel() {
  const [tab, setTab] = useState<'chat' | 'settings'>('chat')
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-cx-border flex-shrink-0">
        {(['chat', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-1.5 text-[11px] font-medium transition-colors capitalize',
              tab === t ? 'text-cx-accent border-b border-cx-accent' : 'text-cx-text-muted hover:text-cx-text'
            )}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {tab === 'chat'     && <AICopilot />}
        {tab === 'settings' && <div className="overflow-y-auto h-full"><AiSettings /></div>}
      </div>
    </div>
  )
}

/* ── Coming Soon ────────────────────────────────────────────── */
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-cx-text-muted">
      <div className="text-[11px]">{label}</div>
      <div className="text-[10px] opacity-60">Coming soon</div>
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function GraphDotIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <circle cx="6" cy="6" r="2" fill="currentColor"/>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3H4z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
