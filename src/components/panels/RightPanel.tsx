import { useState, useEffect } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { ParameterEditor } from '@/components/inspector/ParameterEditor'
import { CATEGORY_COLORS, NODE_OBJECT_TYPE_ICONS, OBJECT_TYPES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import { nanoid } from 'nanoid'
import type { NodePort, CortexNode, Parameter, GraphNode } from '@/types'

type TabId = 'overview' | 'parameters' | 'inputs' | 'outputs' | 'notes'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const selectedNode = useNodeStore(s => s.selectedNode())

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'parameters', label: 'Params',  count: selectedNode?.parameters.length },
    { id: 'inputs',     label: 'Inputs',  count: selectedNode?.inputs.length },
    { id: 'outputs',    label: 'Outputs', count: selectedNode?.outputs.length },
    { id: 'notes',      label: 'Notes' },
  ]

  useEffect(() => { setActiveTab('overview') }, [selectedNode?.id])

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-cx-surface border-l border-cx-border h-full"
         style={{ boxShadow: '-1px 0 0 rgba(255,255,255,0.02)' }}>
      {selectedNode ? <NodeHeader node={selectedNode} /> : <EmptyHeader />}
      <div className="flex border-b border-cx-border flex-shrink-0 overflow-x-auto"
           style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 min-w-fit px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em]',
              'border-b-2 transition-all duration-150 whitespace-nowrap flex items-center justify-center gap-1',
              activeTab === tab.id
                ? 'border-cx-accent text-cx-accent bg-cx-accent/5'
                : 'border-transparent text-cx-text-muted hover:text-cx-text-dim'
            )}>
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={cn(
                'text-[8px] px-1 py-px rounded font-bold leading-none',
                activeTab === tab.id ? 'bg-cx-accent/20 text-cx-accent' : 'bg-cx-elevated text-cx-text-muted'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {!selectedNode ? <EmptyState /> : (
          <>
            {activeTab === 'overview'   && <OverviewTab   node={selectedNode} />}
            {activeTab === 'parameters' && <ParametersTab node={selectedNode} />}
            {activeTab === 'inputs'     && <InputsTab     node={selectedNode} />}
            {activeTab === 'outputs'    && <OutputsTab    node={selectedNode} />}
            {activeTab === 'notes'      && <NotesTab      node={selectedNode} />}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────── */
function NodeHeader({ node }: { node: CortexNode }) {
  const accent = node.color ?? CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.default
  const icon   = NODE_OBJECT_TYPE_ICONS[node.objectType] ?? '⬡'
  const { toggleBookmark, isBookmarked, addToast } = useUiStore()
  const { activeGraphId, addNode: addToGraph } = useGraphStore()
  const starred = isBookmarked(node.id)
  const [copied, setCopied] = useState(false)

  const handleAddToCanvas = () => {
    if (!activeGraphId) {
      addToast('No graph open — create a graph first', { variant: 'warning' })
      return
    }
    const graphNode: GraphNode = {
      id: nanoid(),
      nodeId: node.id,
      graphId: activeGraphId,
      position: { x: 120 + Math.random() * 300, y: 80 + Math.random() * 200 },
      isCollapsed: false,
      zIndex: 0,
    }
    addToGraph(graphNode)
    addToast(`"${node.displayName}" added to canvas`, { variant: 'success' })
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(node.name)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex-shrink-0 border-b border-cx-border"
         style={{ background: `linear-gradient(160deg, ${accent}12 0%, ${accent}04 60%, transparent 100%)` }}>
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
               style={{ background: `${accent}20`, border: `1.5px solid ${accent}40`, boxShadow: `0 0 14px ${accent}25` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[13px] font-semibold text-cx-text truncate leading-tight">{node.displayName}</div>
            <div className="text-[10px] mt-0.5 font-mono opacity-50 truncate text-cx-text-muted">{node.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}35` }}>
            {node.category}
          </span>
          <span className="text-[9px] text-cx-text-muted px-1.5 py-0.5 rounded-full bg-cx-elevated border border-cx-border">
            {node.objectType.replace(/_/g, ' ')}
          </span>
          {node.isDeprecated && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-cx-error/40 bg-cx-error/10 text-cx-error">
              deprecated
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleAddToCanvas}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                       text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: accent }}>
            <PlusIcon /> Add to Canvas
          </button>
          <button onClick={() => toggleBookmark(node.id)} title={starred ? 'Remove bookmark' : 'Bookmark'}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg border transition-all',
              starred ? 'bg-amber-400/15 border-amber-400/30 text-amber-400'
                      : 'bg-cx-elevated border-cx-border text-cx-text-muted hover:text-amber-400'
            )}>
            <StarIcon filled={starred} />
          </button>
          <button onClick={handleCopyName} title="Copy node name"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg border transition-all',
              copied ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                     : 'bg-cx-elevated border-cx-border text-cx-text-muted hover:text-cx-text'
            )}>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyHeader() {
  return (
    <div className="px-3 py-3 flex-shrink-0 border-b border-cx-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-cx-elevated border border-cx-border flex items-center justify-center">
          <HexOutline />
        </div>
        <span className="text-[12px] font-semibold text-cx-text-dim">Inspector</span>
      </div>
    </div>
  )
}

/* ── Empty State ─────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cx-elevated border border-cx-border flex items-center justify-center opacity-25">
        <HexOutline size={28} />
      </div>
      <div>
        <p className="text-[12px] font-semibold text-cx-text-dim">No node selected</p>
        <p className="text-[10px] text-cx-text-muted mt-1 leading-relaxed">
          Click a node on the canvas or in the Library to inspect it
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {[
          { icon: '🖱', text: 'Click any node on the canvas' },
          { icon: '📚', text: 'Select from the Library panel' },
          { icon: '🔍', text: 'Use Search to find nodes' },
        ].map(h => (
          <div key={h.text} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-cx-elevated border border-cx-border text-left">
            <span className="text-[13px]">{h.icon}</span>
            <span className="text-[10px] text-cx-text-muted">{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Overview Tab ────────────────────────────────────────── */
function OverviewTab({ node }: { node: CortexNode }) {
  const { updateNode } = useNodeStore()
  const { addToast } = useUiStore()
  const accent = node.color ?? CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.default

  const [name, setName] = useState(node.displayName)
  const [desc, setDesc] = useState(node.description ?? '')
  const [cat,  setCat]  = useState(node.category)
  const [tags, setTags] = useState(node.tags.join(', '))
  const [tips, setTips] = useState(node.productionTips.join('\n'))
  const [type, setType] = useState(node.objectType)

  useEffect(() => {
    setName(node.displayName); setDesc(node.description ?? '')
    setCat(node.category); setTags(node.tags.join(', '))
    setTips(node.productionTips.join('\n')); setType(node.objectType)
  }, [node.id])

  const save = async (patch: Record<string, unknown>) => {
    try { await updateNode({ id: node.id, ...patch } as any) }
    catch { addToast('Save failed', { variant: 'error' }) }
  }

  const categories = Object.keys(CATEGORY_COLORS).filter(k => k !== 'default')

  return (
    <div className="p-3 space-y-3">
      {/* Description */}
      <div className="rounded-xl border border-cx-border bg-cx-elevated p-2.5">
        <label className="text-[9px] font-bold uppercase tracking-widest text-cx-text-muted block mb-1.5">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)}
          onBlur={() => save({ description: desc })}
          rows={3} placeholder="Add a description…"
          className="w-full bg-transparent text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none placeholder:text-cx-text-muted/40" />
      </div>

      {/* Tags */}
      {node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: `${accent}14`, color: `${accent}cc`, border: `1px solid ${accent}28` }}>
              {t}
            </span>
          ))}
        </div>
      )}

      <Divider />

      {/* Name */}
      <Field label="Display Name">
        <input value={name} onChange={e => setName(e.target.value)}
          onBlur={() => save({ displayName: name })}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                     text-[12px] text-cx-text focus:outline-none focus:border-cx-accent transition-colors" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Category">
          <select value={cat} onChange={e => { setCat(e.target.value as any); save({ category: e.target.value }) }}
            className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2 py-1.5
                       text-[10px] text-cx-text focus:outline-none focus:border-cx-accent transition-colors">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select value={type} onChange={e => { setType(e.target.value as any); save({ objectType: e.target.value }) }}
            className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2 py-1.5
                       text-[10px] text-cx-text focus:outline-none focus:border-cx-accent transition-colors">
            {OBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Tags" hint="comma-separated">
        <input value={tags} onChange={e => setTags(e.target.value)}
          onBlur={() => save({ tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean) })}
          placeholder="vdb, pyro, rendering…"
          className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-1.5
                     text-[11px] text-cx-text focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40" />
      </Field>

      <Divider />

      <Field label="Production Tips" hint="one per line">
        <textarea value={tips} onChange={e => setTips(e.target.value)}
          onBlur={() => save({ productionTips: tips.split('\n').map(t => t.trim()).filter(Boolean) })}
          rows={Math.max(3, tips.split('\n').length + 1)} placeholder="Add tips…"
          className="w-full bg-cx-elevated border border-cx-border rounded-xl px-2.5 py-2
                     text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40" />
      </Field>

      <Divider />

      <div className="grid grid-cols-2 gap-1.5">
        <StatChip label="Inputs"  value={node.inputs.length}     color="#7B6FFF" />
        <StatChip label="Outputs" value={node.outputs.length}    color="#34D399" />
        <StatChip label="Params"  value={node.parameters.length} color="#FBB040" />
        <StatChip label={node.isDeprecated ? 'Deprecated' : 'Active'}
                  value={node.isDeprecated ? '⚠' : '✓'}
                  color={node.isDeprecated ? '#f87171' : '#34D399'} />
      </div>
    </div>
  )
}

/* ── Parameters Tab ──────────────────────────────────────── */
function ParametersTab({ node }: { node: CortexNode }) {
  const { updateNode } = useNodeStore()
  const { addToast } = useUiStore()
  const [search, setSearch] = useState('')

  const filtered = node.parameters.filter(p =>
    !search || p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      {node.parameters.length > 3 && (
        <div className="p-2 border-b border-cx-border flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cx-text-muted w-3 h-3"
                 viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="5" cy="5" r="3.5"/><line x1="8" y1="8" x2="11" y2="11"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Filter ${node.parameters.length} params…`}
              className="w-full bg-cx-elevated border border-cx-border rounded-lg pl-7 pr-2.5 py-1.5
                         text-[11px] text-cx-text placeholder:text-cx-text-muted
                         focus:outline-none focus:border-cx-accent transition-colors" />
          </div>
        </div>
      )}
      <div className="p-2">
        {node.parameters.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6 px-2 gap-3">
            <span className="text-2xl opacity-25">⚙️</span>
            <div>
              <p className="text-[11px] font-medium text-cx-text-dim">No parameters defined</p>
              <p className="text-[10px] text-cx-text-muted mt-1 leading-relaxed">
                Click <span className="text-cx-accent">+ Add Parameter</span> to define custom params for this node.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyTabState icon="🔍" message={`No params match "${search}"`} />
        ) : (
          <ParameterEditor
            key={node.id}
            parameters={filtered}
            onParamsChange={async params => updateNode({ id: node.id, parameters: params })} />
        )}
        <button
          onClick={async () => {
            const newParam: Parameter = {
              id: crypto.randomUUID(), // must be a valid UUID — Rust deserializes Parameter.id as Uuid
              name: 'new_param', displayName: 'New Parameter',
              paramType: 'float', defaultValue: 0, sortOrder: node.parameters.length,
              performanceImpact: 'none', isAnimatable: false, isExpressionCapable: false,
            }
            try {
              await updateNode({ id: node.id, parameters: [...node.parameters, newParam] })
              addToast('Parameter added', { variant: 'success' })
            } catch (e) {
              addToast(`Failed to add parameter: ${e}`, { variant: 'error' })
            }
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                     border border-dashed border-cx-border text-[11px] text-cx-text-muted
                     hover:text-cx-accent hover:border-cx-accent/40 transition-all">
          <span className="text-cx-accent text-base leading-none">+</span> Add Parameter
        </button>
      </div>
    </div>
  )
}

/* ── Ports ───────────────────────────────────────────────── */
function InputsTab({ node }: { node: CortexNode }) {
  return <PortListEditor node={node} portKey="inputs" accentColor="#7B6FFF" label="input" />
}
function OutputsTab({ node }: { node: CortexNode }) {
  return <PortListEditor node={node} portKey="outputs" accentColor="#34D399" label="output" />
}

const DATA_TYPES = ['any','float','integer','string','boolean','vector2','vector3','vector4',
                    'color','geometry','image','array','object','node']
const DATA_TYPE_COLORS: Record<string, string> = {
  any:'#888', float:'#60a5fa', integer:'#34d399', string:'#f472b6', boolean:'#fb923c',
  vector2:'#a78bfa', vector3:'#818cf8', vector4:'#6366f1', color:'#f59e0b',
  geometry:'#4FC3F7', image:'#a3e635', array:'#e879f9', object:'#94a3b8', node:'#f87171',
}

function PortListEditor({ node, portKey, accentColor, label }: {
  node: CortexNode; portKey: 'inputs'|'outputs'; accentColor: string; label: string
}) {
  const { updateNode } = useNodeStore()
  const { addToast } = useUiStore()
  const ports = node[portKey]
  const savePorts = (next: NodePort[]) => updateNode({ id: node.id, [portKey]: next })

  return (
    <div className="p-2 flex flex-col gap-1.5">
      {ports.length === 0 && <EmptyTabState icon={portKey === 'inputs' ? '→' : '←'} message={`No ${label}s defined`} />}
      {ports.map((port, idx) => {
        const typeColor = DATA_TYPE_COLORS[port.dataType] ?? '#888'
        return (
          <div key={port.id} className="group bg-cx-elevated border border-cx-border rounded-xl p-2.5
                                         hover:border-cx-border-bright transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accentColor }} />
              <input value={port.name} onChange={e => savePorts(ports.map(p => p.id === port.id ? { ...p, name: e.target.value } : p))}
                className="flex-1 bg-transparent text-[11px] text-cx-text font-medium
                           focus:outline-none border-b border-transparent focus:border-cx-accent transition-colors min-w-0" />
              <span className="text-[9px] text-cx-text-muted opacity-30 group-hover:opacity-60">#{idx+1}</span>
              <button onClick={() => savePorts(ports.filter(p => p.id !== port.id))}
                className="w-4 h-4 flex items-center justify-center rounded text-cx-text-muted
                           hover:text-cx-error hover:bg-cx-error/10 opacity-0 group-hover:opacity-100 transition-all">
                <XIcon />
              </button>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <div className="w-2 h-2 rounded-full" style={{ background: typeColor }} />
              <select value={port.dataType}
                onChange={e => savePorts(ports.map(p => p.id === port.id ? { ...p, dataType: e.target.value } : p))}
                style={{ color: typeColor }}
                className="flex-1 bg-cx-surface border border-cx-border rounded-lg px-1.5 py-0.5
                           text-[10px] focus:outline-none focus:border-cx-accent transition-colors">
                {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-1 text-[10px] text-cx-text-muted cursor-pointer">
                <input type="checkbox" checked={port.required}
                  onChange={e => savePorts(ports.map(p => p.id === port.id ? { ...p, required: e.target.checked } : p))}
                  className="accent-cx-accent w-3 h-3" /> req
              </label>
              <label className="flex items-center gap-1 text-[10px] text-cx-text-muted cursor-pointer">
                <input type="checkbox" checked={port.multi}
                  onChange={e => savePorts(ports.map(p => p.id === port.id ? { ...p, multi: e.target.checked } : p))}
                  className="accent-cx-accent w-3 h-3" /> multi
              </label>
            </div>
          </div>
        )
      })}
      <button onClick={async () => {
        const next: NodePort[] = [...ports, { id: nanoid(), name: `${label}_${ports.length+1}`, dataType: 'any', required: false, multi: false }]
        await savePorts(next); addToast(`${label} port added`, { variant: 'success' })
      }}
        className="mt-0.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                   border border-dashed border-cx-border text-[11px] text-cx-text-muted
                   hover:text-cx-accent hover:border-cx-accent/40 transition-all">
        <span className="text-cx-accent text-base leading-none">+</span> Add {label}
      </button>
    </div>
  )
}

/* ── Notes Tab ───────────────────────────────────────────── */
function NotesTab({ node }: { node: CortexNode }) {
  const { updateNode } = useNodeStore()
  const [notes, setNotes] = useState(node.notes ?? '')
  const [docs,  setDocs]  = useState(node.documentation ?? '')
  useEffect(() => { setNotes(node.notes ?? ''); setDocs(node.documentation ?? '') }, [node.id])

  return (
    <div className="p-3 space-y-4">
      <Field label="Personal Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          onBlur={() => updateNode({ id: node.id, notes })}
          rows={6} placeholder="Your notes about this node…"
          className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2
                     text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40" />
      </Field>
      <Field label="Documentation">
        <textarea value={docs} onChange={e => setDocs(e.target.value)}
          onBlur={() => updateNode({ id: node.id, documentation: docs })}
          rows={4} placeholder="Paste a doc URL or reference text…"
          className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2
                     text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40" />
      </Field>
      {docs.startsWith('http') && (
        <a href={docs} target="_blank" rel="noreferrer"
           className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cx-elevated border border-cx-border
                      text-[11px] text-cx-accent hover:bg-cx-accent/10 transition-colors">
          <LinkIcon /> Open Documentation ↗
        </a>
      )}
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-cx-text-muted">{label}</span>
        {hint && <span className="text-[9px] text-cx-text-muted opacity-50">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
function StatChip({ label, value, color }: { label: string; value: number|string; color: string }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-cx-elevated border border-cx-border">
      <span className="text-[10px] text-cx-text-muted">{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
function Divider() { return <div className="border-t border-cx-border/60" /> }
function EmptyTabState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <span className="text-2xl opacity-25">{icon}</span>
      <p className="text-[11px] text-cx-text-muted">{message}</p>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────── */
function StarIcon({ filled }: { filled?: boolean }) {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill={filled ? '#fbbf24' : 'none'}
    stroke={filled ? '#fbbf24' : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9.5l-3 1.5.5-3.5L2 5l3.5-.5z"/>
  </svg>
}
function HexOutline({ size = 18, className }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
    strokeWidth="1.2" strokeLinecap="round" className={className}>
    <path d="M10 2 L17 5.5 L17 14.5 L10 18 L3 14.5 L3 5.5 Z"/>
  </svg>
}
function PlusIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/>
  </svg>
}
function CopyIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="7" height="7" rx="1.5"/><path d="M1 8V2a1 1 0 011-1h6"/>
  </svg>
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6l3 3 5-5"/>
  </svg>
}
function XIcon() {
  return <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/>
  </svg>
}
function LinkIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 6.5a2.5 2.5 0 003.5.5l2-2A2.5 2.5 0 107 1.5L6 2.5"/>
    <path d="M7 5.5a2.5 2.5 0 00-3.5-.5l-2 2A2.5 2.5 0 005 10.5L6 9.5"/>
  </svg>
}
