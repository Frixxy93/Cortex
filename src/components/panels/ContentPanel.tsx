import { useState, useEffect, useRef } from 'react'
import { ContextMenu, useContextMenu, MenuItemDef } from '@/components/ui/ContextMenu'
import { EmptyState, EmptyIcons } from '@/components/ui/EmptyState'
import { GraphRowSkeleton } from '@/components/ui/Skeleton'
import { useUiStore } from '@/stores/ui.store'
import { NodeService } from '@/services/node.service'
import { useSettingsStore } from '@/stores/settings.store'
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

// Per-nav accent color (matches LeftSidebar palette)
const NAV_COLORS: Record<string, string> = {
  graph:     '#60a5fa',
  nodes:     '#a78bfa',
  search:    '#34d399',
  analytics: '#f59e0b',
  import:    '#fb923c',
  ai:        '#22d3ee',
  recipes:   '#f472b6',
  templates: '#818cf8',
  media:     '#4ade80',
  bookmarks: '#facc15',
  trash:     '#f87171',
}

const NAV_TITLES: Record<string, string> = {
  graph: 'Graphs', nodes: 'Nodes', search: 'Search',
  analytics: 'Analytics', import: 'Bridge', ai: 'AI',
  recipes: 'Recipes', templates: 'Templates', media: 'Media',
  bookmarks: 'Bookmarks', trash: 'Trash',
}

export function ContentPanel() {
  const { activeNavId, setActiveNav } = useUiStore()
  if (!activeNavId || activeNavId === 'home') return null

  const title = NAV_TITLES[activeNavId] ?? activeNavId
  const color = NAV_COLORS[activeNavId] ?? '#7b6fff'

  return (
    <div
      className="w-[240px] flex-shrink-0 flex flex-col h-full relative"
      style={{
        background: 'rgba(8,8,22,0.99)',
        borderRight: '1px solid rgba(24,24,58,0.7)',
        boxShadow: '1px 0 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* Colored top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
           style={{ background: `linear-gradient(90deg, ${color}60, ${color}20, transparent)` }} />

      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3.5 pt-3 pb-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'rgba(234,234,248,0.6)' }}
          >
            {title}
          </span>
        </div>
        <button
          onClick={() => setActiveNav(null)}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{ color: 'rgba(234,234,248,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(234,234,248,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(234,234,248,0.3)' }}
        >
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
        {activeNavId === 'recipes'   && <RecipesPreview />}
        {activeNavId === 'media'     && <MediaPreview />}
        {activeNavId === 'bookmarks' && <BookmarksPreview />}
        {activeNavId === 'trash' && <TrashPanel />}
      </div>
    </div>
  )
}

/* ── Graph list ─────────────────────────────────────────── */
function GraphListPanel() {
  const { activeVaultId } = useVaultStore()
  const { graphs, byVault, activeGraphId, setActiveGraph, createGraph, deleteGraph, renameGraph, isLoading: graphsLoading } = useGraphStore()
  const { addToast } = useUiStore()
  const { confirmDeletes } = useSettingsStore()
  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu()

  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editName,    setEditName]    = useState('')
  const [creating,    setCreating]    = useState(false)
  const [newName,     setNewName]     = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  const list = activeVaultId
    ? (byVault[activeVaultId] ?? []).map(id => graphs[id]).filter(Boolean)
    : []

  // Focus inline create input when it appears
  useEffect(() => {
    if (creating) setTimeout(() => newInputRef.current?.focus(), 20)
  }, [creating])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || !activeVaultId) return
    setNewName('')
    setCreating(false)
    await createGraph({ vaultId: activeVaultId, name, description: '', tags: [] })
    addToast(`Graph "${name}" created`, { variant: 'success' })
  }

  const handleDelete = async (id: string, name: string) => {
    await deleteGraph(id)
    addToast(`Graph "${name}" deleted`, { variant: 'default' })
    setConfirmId(null)
  }

  const startRename = (g: { id: string; name: string }) => { setEditingId(g.id); setEditName(g.name) }

  const commitRename = async () => {
    if (!editingId || !editName.trim()) { setEditingId(null); return }
    await renameGraph(editingId, editName.trim())
    addToast('Graph renamed', { variant: 'success' })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Create bar */}
      <div className="px-2.5 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(24,24,58,0.5)' }}>
        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={newInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              placeholder="Graph name…"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] text-cx-text placeholder-cx-text-muted
                         focus:outline-none transition-colors cx-field"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(123,111,255,0.35)',
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white
                         transition-all disabled:opacity-30"
              style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.3)' }}
            >
              <CheckIcon />
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'rgba(234,234,248,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <XIcon />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all duration-150"
            style={{
              color: 'rgba(96,165,250,0.7)',
              border: '1px dashed rgba(96,165,250,0.2)',
              background: 'rgba(96,165,250,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'rgba(96,165,250,1)'
              e.currentTarget.style.borderColor = 'rgba(96,165,250,0.35)'
              e.currentTarget.style.background = 'rgba(96,165,250,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(96,165,250,0.7)'
              e.currentTarget.style.borderColor = 'rgba(96,165,250,0.2)'
              e.currentTarget.style.background = 'rgba(96,165,250,0.04)'
            }}
          >
            <span className="text-sm leading-none font-semibold">+</span>
            New Graph
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
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
            action={{ label: '+ New Graph', onClick: () => setCreating(true) }}
          />
        ) : list.map(g => {
          const active     = g.id === activeGraphId
          const confirming = confirmId === g.id
          const editing    = editingId === g.id

          return (
            <div
              key={g.id}
              className={cn(
                'group relative flex items-center gap-1 pl-0 pr-2 mx-1.5 my-0.5 rounded-lg transition-all duration-150',
                active ? 'bg-cx-accent/8' : 'hover:bg-white/4'
              )}
              onContextMenu={e => openCtx(e, [
                { kind: 'item', label: 'Open',   icon: <OpenIcon />,   onClick: () => setActiveGraph(g.id) },
                { kind: 'item', label: 'Rename', icon: <RenameIcon />, shortcut: '⏎', onClick: () => startRename(g) },
                { kind: 'separator' },
                { kind: 'item', label: 'Delete', icon: <DeleteIcon />, danger: true, onClick: () => confirmDeletes ? setConfirmId(g.id) : handleDelete(g.id, g.name) },
              ] satisfies MenuItemDef[])}
            >
              {/* Left color bar */}
              <span
                className="w-0.5 self-stretch rounded-r-full flex-shrink-0 my-1"
                style={{
                  background: active ? '#60a5fa' : 'transparent',
                  boxShadow:  active ? '0 0 6px #60a5facc' : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
              />

              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 bg-cx-elevated border border-cx-accent/50 rounded-lg px-2 py-1
                             text-[12px] text-cx-text focus:outline-none my-1 ml-2"
                />
              ) : (
                <button
                  onClick={() => setActiveGraph(g.id)}
                  onDoubleClick={() => startRename(g)}
                  className="flex items-start gap-2.5 flex-1 pl-2.5 py-2 min-w-0 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-[12px] font-medium truncate transition-colors',
                      active ? 'text-cx-accent' : 'text-cx-text-dim group-hover:text-cx-text'
                    )}>
                      {g.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full leading-none"
                        style={{
                          background: active ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
                          color:      active ? '#60a5fa' : 'rgba(234,234,248,0.25)',
                          border:     `1px solid ${active ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {g.nodes.length}n
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full leading-none"
                        style={{
                          background: active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.05)',
                          color:      active ? '#a78bfa' : 'rgba(234,234,248,0.25)',
                          border:     `1px solid ${active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {g.edges.length}e
                      </span>
                    </div>
                  </div>
                </button>
              )}

              {!editing && (
                confirming ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(g.id, g.name)}
                      className="text-[9px] px-1.5 py-0.5 rounded-md transition-colors"
                      style={{ background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.9)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                    >Del</button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-[9px] px-1 py-0.5 rounded text-cx-text-muted hover:bg-cx-elevated transition-colors"
                    >&#x2715;</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(g.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
                               opacity-0 group-hover:opacity-100 transition-all duration-150"
                    style={{ color: 'rgba(234,234,248,0.3)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'rgba(239,68,68,0.8)'
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'rgba(234,234,248,0.3)'
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    <TrashIcon />
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>

      {ctxMenu && <ContextMenu {...ctxMenu} onClose={closeCtx} />}

      {/* Active graph detail editor */}
      {activeGraphId && graphs[activeGraphId] && (
        <GraphDetailEditor graph={graphs[activeGraphId]} addToast={addToast} />
      )}
      {activeGraphId && (
        <div style={{ borderTop: '1px solid rgba(24,24,58,0.7)' }} className="flex-shrink-0">
          <GraphExport />
        </div>
      )}
    </div>
  )
}

/* ── Graph detail editor ─────────────────────────────────── */
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
    <div style={{ borderTop: '1px solid rgba(24,24,58,0.7)' }} className="p-3 space-y-2 flex-shrink-0">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em]"
           style={{ color: 'rgba(234,234,248,0.25)' }}>
        About
      </div>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onBlur={() => save({ description: desc })}
        rows={3}
        placeholder="Graph description…"
        className="w-full rounded-lg px-2.5 py-2 text-[11px] text-cx-text placeholder-cx-text-muted
                   resize-none focus:outline-none transition-colors cx-field"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      />
      <input
        value={tags}
        onChange={e => setTags(e.target.value)}
        onBlur={() => save({ tags: tags.split(',').map(t => t.trim()).filter(Boolean) })}
        placeholder="Tags (comma separated)"
        className="w-full rounded-lg px-2.5 py-1.5 text-[11px] text-cx-text placeholder-cx-text-muted
                   focus:outline-none transition-colors cx-field"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      />
    </div>
  )
}

/* ── AI Panel ───────────────────────────────────────────────── */
function AiPanel() {
  const [tab, setTab] = useState<'chat' | 'settings'>('chat')
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
        {(['chat', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-1.5 text-[11px] font-medium transition-colors capitalize',
              tab === t
                ? 'border-b border-cx-accent'
                : 'text-cx-text-muted hover:text-cx-text'
            )}
            style={{ color: tab === t ? '#22d3ee' : undefined, borderColor: tab === t ? '#22d3ee' : undefined }}
          >
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


/* ── Feature-preview panels ─────────────────────────────── */

function FeaturePreviewShell({
  color,
  icon,
  name,
  tagline,
  features,
  eta,
}: {
  color: string
  icon: React.ReactNode
  name: string
  tagline: string
  features: { icon: string; title: string; desc: string }[]
  eta: string
}) {
  return (
    <div className="h-full flex flex-col overflow-y-auto px-4 py-5 gap-4" style={{ color: 'var(--cx-text)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'rgba(234,234,248,0.85)' }}>{name}</div>
          <div className="text-[10px]" style={{ color: 'rgba(234,234,248,0.35)' }}>{tagline}</div>
        </div>
        <div
          className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: `${color}15`, border: `1px solid ${color}25`, color: `${color}cc` }}
        >
          {eta}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Feature cards */}
      <div className="flex flex-col gap-2">
        {features.map((f, i) => (
          <div
            key={i}
            className="rounded-xl px-3 py-2.5 flex gap-3 items-start"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-base mt-0.5 flex-shrink-0">{f.icon}</span>
            <div>
              <div className="text-[11px] font-semibold mb-0.5" style={{ color: 'rgba(234,234,248,0.7)' }}>{f.title}</div>
              <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(234,234,248,0.3)' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="mt-auto rounded-xl px-3 py-2.5 text-[10px] leading-relaxed text-center"
        style={{ background: 'rgba(123,111,255,0.05)', border: '1px solid rgba(123,111,255,0.1)', color: 'rgba(123,111,255,0.5)' }}
      >
        We're building this for the VFX community. Your node library will be ready to use on launch day.
      </div>
    </div>
  )
}

function RecipesPreview() {
  return (
    <FeaturePreviewShell
      color="#f472b6"
      name="Recipes"
      tagline="Save and replay multi-step node workflows"
      eta="v0.5"
      icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="12" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="7.5" x2="11" y2="7.5"/><line x1="5" y1="10" x2="8" y2="10"/></svg>}
      features={[
        { icon: '🎬', title: 'Record a workflow', desc: 'Capture a sequence of node connections as a reusable Recipe — like macros for your graph.' },
        { icon: '▶️', title: 'One-click replay', desc: 'Apply any Recipe to a new graph instantly. CORTEX recreates the exact node chain for you.' },
        { icon: '🔀', title: 'Parameterise inputs', desc: 'Expose knobs inside a Recipe so colleagues can tweak values without touching the graph.' },
        { icon: '📦', title: 'Share with your team', desc: 'Export Recipes as .cortex files and import them on any machine with your vault.' },
      ]}
    />
  )
}

function MediaPreview() {
  return (
    <FeaturePreviewShell
      color="#4ade80"
      name="Media"
      tagline="Attach reference images, flipbooks, and renders to nodes"
      eta="v0.6"
      icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="14" height="9" rx="1.5"/><path d="M6 7l4 2-4 2V7z" fill="currentColor" stroke="none" opacity="0.5"/></svg>}
      features={[
        { icon: '🖼️', title: 'Reference images', desc: 'Drag any PNG/EXR/TIFF onto a node to attach it as a visual reference for artists.' },
        { icon: '🎞️', title: 'Flipbooks', desc: 'Link image sequences directly to nodes. Preview frames without leaving CORTEX.' },
        { icon: '🔗', title: 'Deep links to renders', desc: 'Store RV, DJV, or ftrack links per node so the latest review is always one click away.' },
        { icon: '📁', title: 'Folder watch', desc: 'Point Media at a folder. CORTEX auto-ingests new renders and attaches them to matching nodes.' },
      ]}
    />
  )
}

function BookmarksPreview() {
  return (
    <FeaturePreviewShell
      color="#facc15"
      name="Bookmarks"
      tagline="Pin nodes and graphs you return to every day"
      eta="v0.5"
      icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1h8v14l-4-3-4 3V1z"/></svg>}
      features={[
        { icon: '📌', title: 'Pin anything', desc: 'Bookmark a node, a graph, or a search result. Access it instantly from the sidebar.' },
        { icon: '🗂️', title: 'Organise into folders', desc: 'Group bookmarks by show, department, or project. Collapse folders to stay focused.' },
        { icon: '⌨️', title: 'Keyboard shortcut jump', desc: 'Assign ⌘1–9 to your top bookmarks. Jump to any pinned node without touching the mouse.' },
        { icon: '🔄', title: 'Sync across vaults', desc: 'Bookmarks travel with your user profile, not the vault — they’re yours on every project.' },
      ]}
    />
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
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
function OpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"/>
      <path d="M8 1h3m0 0v3m0-3L6 6"/>
    </svg>
  )
}
function RenameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M2 9.5h2.5l4.7-4.7a1 1 0 000-1.4L8.6 2.8a1 1 0 00-1.4 0L2.5 7.5V9.5z"/>
      <path d="M10 10H2" strokeOpacity="0.4"/>
    </svg>
  )
}
function DeleteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 2.5h9M4 2.5V1.5h4v1M3 2.5l.5 8h5l.5-8"/>
    </svg>
  )
}

/* ── Trash Panel ─────────────────────────────────────────── */
function TrashPanel() {
  const { activeVaultId } = useVaultStore()
  const { addToast } = useUiStore()
  const [nodes, setNodes] = useState<import('@/types').CortexNode[]>([])
  const [loading, setLoading] = useState(false)
  const [emptying, setEmptying] = useState(false)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const load = async () => {
    if (!activeVaultId) return
    setLoading(true)
    try { setNodes(await NodeService.listTrashed(activeVaultId)) }
    catch (e) { addToast(`Failed to load trash: ${String(e)}`, { variant: 'error' }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeVaultId])

  const handleRestore = async (id: string, name: string) => {
    try {
      await NodeService.restore(id)
      setNodes(n => n.filter(x => x.id !== id))
      addToast(`"${name}" restored`, { variant: 'success' })
    } catch (e) { addToast(`Restore failed: ${String(e)}`, { variant: 'error' }) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    try {
      await NodeService.delete(id)
      setNodes(n => n.filter(x => x.id !== id))
      addToast(`"${name}" permanently deleted`, { variant: 'default' })
    } catch (e) { addToast(`Delete failed: ${String(e)}`, { variant: 'error' }) }
  }

  const handleEmptyTrash = async () => {
    if (!activeVaultId) return
    setEmptying(true)
    try {
      const count = await NodeService.emptyTrash(activeVaultId)
      setNodes([])
      addToast(`Trash emptied — ${count} item${count !== 1 ? 's' : ''} removed`, { variant: 'default' })
      setConfirmEmpty(false)
    } catch (e) { addToast(`Empty failed: ${String(e)}`, { variant: 'error' }) }
    finally { setEmptying(false) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
        <span className="text-[11px] font-semibold text-cx-text-dim uppercase tracking-[0.08em]">Trash</span>
        {nodes.length > 0 && (
          confirmEmpty ? (
            <div className="flex items-center gap-1.5">
              <button onClick={handleEmptyTrash} disabled={emptying}
                className="text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                {emptying ? 'Emptying…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmEmpty(false)}
                className="text-[10px] px-2 py-1 rounded-lg text-cx-text-muted border border-cx-border hover:text-cx-text transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmEmpty(true)}
              className="text-[10px] text-cx-error/70 hover:text-cx-error transition-colors">
              Empty Trash
            </button>
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <span className="text-[11px] text-cx-text-muted animate-pulse">Loading…</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center px-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2"
                 strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(248,113,113,0.2)' }}>
              <path d="M6 8h20M13 8V5h6v3"/><rect x="7" y="8" width="18" height="19" rx="2"/>
              <line x1="13" y1="14" x2="13" y2="21"/><line x1="19" y1="14" x2="19" y2="21"/>
            </svg>
            <p className="text-[11px] text-cx-text-muted">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-1">
            {nodes.map(node => (
              <div key={node.id} className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                   style={{ background: 'rgba(14,14,34,0.5)', border: '1px solid rgba(24,24,58,0.6)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-cx-text-dim truncate">{node.displayName}</div>
                  <div className="text-[9px] text-cx-text-muted mt-0.5 truncate">
                    {node.category} · {node.objectType.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleRestore(node.id, node.displayName)} title="Restore"
                    className="text-[10px] px-1.5 py-1 rounded-md transition-colors"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                    ↩
                  </button>
                  <button onClick={() => handleDelete(node.id, node.displayName)} title="Delete permanently"
                    className="text-[10px] px-1.5 py-1 rounded-md transition-colors"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
