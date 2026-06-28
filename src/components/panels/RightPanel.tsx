import { useState, useEffect } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'
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
    <div className="w-64 flex-shrink-0 flex flex-col h-full"
         style={{
           background: 'linear-gradient(180deg, rgba(9,9,26,0.98) 0%, rgba(7,7,20,0.98) 100%)',
           borderLeft: '1px solid rgba(24,24,58,0.7)',
           boxShadow: '-4px 0 24px rgba(0,0,0,0.2), -1px 0 0 rgba(255,255,255,0.02)',
         }}>
      {selectedNode ? <NodeHeader node={selectedNode} /> : <EmptyHeader />}
      <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(24,24,58,0.7)', scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 min-w-fit px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
              'border-b-2 transition-all duration-150 whitespace-nowrap flex items-center justify-center gap-1',
              activeTab === tab.id
                ? 'text-cx-accent'
                : 'border-transparent text-cx-text-muted hover:text-cx-text-dim'
            )}
            style={activeTab === tab.id ? {
              borderBottomColor: 'var(--cx-accent)',
              background: 'linear-gradient(180deg, rgba(123,111,255,0.05) 0%, transparent 100%)',
            } : undefined}>
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="text-[8px] px-1 py-px rounded font-bold leading-none"
                    style={activeTab === tab.id
                      ? { background: 'rgba(123,111,255,0.2)', color: 'var(--cx-accent)' }
                      : { background: 'rgba(14,14,34,0.8)', color: 'rgba(100,100,150,0.8)' }}>
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
    <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
      {/* Accent top line */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${accent}cc 0%, ${accent}40 60%, transparent 100%)` }} />
      {/* Header bg */}
      <div style={{ background: `linear-gradient(160deg, ${accent}10 0%, rgba(9,9,26,0.95) 70%)` }}>
        <div className="px-3.5 pt-3 pb-3">
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
                 style={{
                   background: `${accent}18`,
                   border: `1.5px solid ${accent}45`,
                   boxShadow: `0 0 16px ${accent}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
                 }}>
              {icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'rgba(226,226,240,0.95)' }}>
                {node.displayName}
              </div>
              <div className="text-[9.5px] mt-0.5 font-mono truncate" style={{ color: 'rgba(80,80,130,0.8)' }}>
                {node.name}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
              {node.category}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(14,14,34,0.8)', color: 'rgba(100,100,150,0.8)', border: '1px solid rgba(24,24,58,0.7)' }}>
              {node.objectType.replace(/_/g, ' ')}
            </span>
            {node.isDeprecated && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                deprecated
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={handleAddToCanvas}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                         text-[10px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                boxShadow: `0 2px 10px ${accent}30`,
              }}>
              <PlusIcon /> Add to Canvas
            </button>
            <button onClick={() => toggleBookmark(node.id)} title={starred ? 'Remove bookmark' : 'Bookmark'}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={starred ? {
                background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24',
              } : {
                background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(24,24,58,0.7)', color: 'rgba(100,100,150,0.7)',
              }}>
              <StarIcon filled={starred} />
            </button>
            <button onClick={handleCopyName} title="Copy node name"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={copied ? {
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399',
              } : {
                background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(24,24,58,0.7)', color: 'rgba(100,100,150,0.7)',
              }}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyHeader() {
  return (
    <div className="px-3.5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(24,24,58,0.7)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(36,36,80,0.6)' }}>
          <HexOutline />
        </div>
        <div>
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(140,140,180,0.8)' }}>Inspector</span>
          <p className="text-[9px] mt-0.5" style={{ color: 'rgba(80,80,130,0.7)' }}>Select a node to inspect</p>
        </div>
      </div>
    </div>
  )
}

/* ── Empty State ─────────────────────────────────────────── */
function EmptyState() {
  const hints = [
    { svg: <CanvasHint />,  text: 'Click any node on the canvas' },
    { svg: <LibraryHint />, text: 'Select from the Nodes panel' },
    { svg: <SearchHint />,  text: 'Use Search to find nodes' },
  ]
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-4 text-center">
      {/* Animated hex */}
      <div className="relative" style={{ animation: 'hexDrift 6s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(123,111,255,0.2))' }}>
        <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
          <path d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
                stroke="rgba(123,111,255,0.15)" strokeWidth="1" fill="none"/>
          <path d="M32 14 L49 24 L49 44 L32 54 L15 44 L15 24 Z"
                stroke="rgba(123,111,255,0.2)" strokeWidth="1" fill="none"/>
          <path d="M32 24 L42 30 L42 42 L32 48 L22 42 L22 30 Z"
                stroke="rgba(123,111,255,0.35)" strokeWidth="1.5" fill="rgba(123,111,255,0.05)"/>
        </svg>
      </div>
      <div>
        <p className="text-[12px] font-semibold" style={{ color: 'rgba(160,160,200,0.8)' }}>No node selected</p>
        <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: 'rgba(80,80,130,0.8)' }}>
          Click a node on the canvas or in the Library to inspect it
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {hints.map(h => (
          <div key={h.text}
               className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
               style={{ background: 'rgba(14,14,34,0.7)', border: '1px solid rgba(24,24,58,0.6)' }}>
            <span style={{ color: 'rgba(123,111,255,0.5)' }}>{h.svg}</span>
            <span className="text-[10.5px]" style={{ color: 'rgba(100,100,150,0.75)' }}>{h.text}</span>
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
  const { isAdmin } = useAdminStore()
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
            onParamsChange={isAdmin ? async params => updateNode({ id: node.id, parameters: params }) : undefined} />
        )}
        {isAdmin && (
          <button
            onClick={async () => {
              const newParam: Parameter = {
                id: crypto.randomUUID(),
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
        )}
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
  const { isAdmin } = useAdminStore()
  const [notes, setNotes] = useState(node.notes ?? '')
  const [docs,  setDocs]  = useState(node.documentation ?? '')
  useEffect(() => { setNotes(node.notes ?? ''); setDocs(node.documentation ?? '') }, [node.id])

  return (
    <div className="p-3 space-y-4">
      <Field label="Notes">
        <textarea value={notes}
          onChange={isAdmin ? e => setNotes(e.target.value) : undefined}
          onBlur={isAdmin ? () => updateNode({ id: node.id, notes }) : undefined}
          readOnly={!isAdmin}
          rows={6} placeholder={isAdmin ? "Your notes about this node…" : "No notes yet."}
          className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2
                     text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40 read-only:opacity-60 read-only:cursor-default" />
      </Field>
      <Field label="Documentation">
        <textarea value={docs}
          onChange={isAdmin ? e => setDocs(e.target.value) : undefined}
          onBlur={isAdmin ? () => updateNode({ id: node.id, documentation: docs }) : undefined}
          readOnly={!isAdmin}
          rows={4} placeholder={isAdmin ? "Paste a doc URL or reference text…" : ""}
          className="w-full bg-cx-elevated border border-cx-border rounded-xl px-3 py-2
                     text-[11px] text-cx-text-dim leading-relaxed resize-none
                     focus:outline-none focus:border-cx-accent transition-colors
                     placeholder:text-cx-text-muted/40 read-only:opacity-60 read-only:cursor-default" />
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
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
         style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(24,24,58,0.6)' }}>
      <span className="text-[10px]" style={{ color: 'rgba(100,100,150,0.8)' }}>{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function HexOutline({ size = 48, opacity = 0.18 }: { size?: number; opacity?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.44
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <polygon points={pts} stroke={`rgba(123,111,255,${opacity})`} strokeWidth="1.2" fill="none"/>
    </svg>
  )
}

function CanvasHint() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2.5"/>
      <circle cx="9" cy="9" r="2.5"/>
      <line x1="9" y1="2" x2="9" y2="4"/>
      <line x1="9" y1="14" x2="9" y2="16"/>
      <line x1="2" y1="9" x2="4" y2="9"/>
      <line x1="14" y1="9" x2="16" y2="9"/>
    </svg>
  )
}

function LibraryHint() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2 L14 2 L14 16 L9 13 L4 16 Z"/>
      <line x1="7" y1="6" x2="11" y2="6"/>
      <line x1="7" y1="9" x2="11" y2="9"/>
    </svg>
  )
}

function SearchHint() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="5"/>
      <line x1="12" y1="12" x2="16" y2="16"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round">
      <line x1="5.5" y1="1" x2="5.5" y2="10"/>
      <line x1="1" y1="5.5" x2="10" y2="5.5"/>
    </svg>
  )
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1l1.3 2.6L10 4l-2 2 .5 2.8L6 7.4 3.5 8.8 4 6 2 4l2.7-.4Z"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.2"/>
      <path d="M4 8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5"/>
    </svg>
  )
}

function Divider() {
  return (
    <div style={{ height: '1px', background: 'rgba(24,24,58,0.7)', margin: '2px 0' }} />
  )
}
