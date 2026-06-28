import { useState, useCallback } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import type { NodeCategory, NodeObjectType } from '@/types'
import { CATEGORY_COLORS } from '@/utils/constants'

interface Props {
  onClose: () => void
  onCreated?: (nodeId: string) => void
}

const CATEGORIES: NodeCategory[] = [
  'sop','dop','cop','vop','lop','rop','chop','object',
  'geometry','shader','compositor','utility','math','logic','custom','other',
]
const OBJECT_TYPES: { value: NodeObjectType; label: string }[] = [
  { value: 'software_node', label: 'Software Node' },
  { value: 'recipe',        label: 'Recipe' },
  { value: 'blueprint',     label: 'Blueprint' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'asset',         label: 'Asset' },
  { value: 'note',          label: 'Note' },
  { value: 'reference',     label: 'Reference' },
  { value: 'learning_topic',label: 'Learning Topic' },
  { value: 'custom',        label: 'Custom' },
]

export function NodeCreateModal({ onClose, onCreated }: Props) {
  const { createNode } = useNodeStore()
  const { addToast } = useUiStore()

  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<NodeCategory>('sop')
  const [objectType, setObjectType] = useState<NodeObjectType>('software_node')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  const name = displayName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const accent = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    try {
      const node = await createNode({
        name: name || 'node',
        displayName: displayName.trim(),
        category,
        objectType,
        description: description.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        inputs: [],
        outputs: [],
        parameters: [],
        productionTips: [],
      })
      addToast(`"${node.displayName}" created`, { variant: 'success' })
      onCreated?.(node.id)
      onClose()
    } catch (err) {
      addToast('Failed to create node', { variant: 'error', description: String(err) })
    } finally {
      setSaving(false)
    }
  }, [displayName, name, category, objectType, description, tags, createNode, addToast, onClose, onCreated])

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] max-w-[92vw]">
        <form
          onSubmit={handleSubmit}
          className="bg-cx-elevated border border-cx-border rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(123,111,255,0.12)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-cx-border flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-cx-text">New Node</h2>
              <p className="text-[11px] text-cx-text-muted mt-0.5">Add a node to this vault</p>
            </div>
            <button type="button" onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-cx-text-muted
                         hover:bg-cx-surface hover:text-cx-text transition-colors">
              <CloseIcon />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            {/* Display name */}
            <div>
              <label className="block text-[11px] font-medium text-cx-text-muted mb-1.5">
                Display Name <span className="text-cx-error">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. VDB From Polygons"
                className="cx-input w-full"
                required
              />
              {name && (
                <div className="mt-1 text-[10px] text-cx-text-muted font-mono">
                  id: <span className="text-cx-accent">{name}</span>
                </div>
              )}
            </div>

            {/* Category + Object type row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-cx-text-muted mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as NodeCategory)}
                    className="cx-input w-full appearance-none pr-7"
                    style={{ borderColor: accent + '66' }}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cx-text-muted pointer-events-none text-[10px]">▾</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-cx-text-muted mb-1.5">Type</label>
                <div className="relative">
                  <select
                    value={objectType}
                    onChange={e => setObjectType(e.target.value as NodeObjectType)}
                    className="cx-input w-full appearance-none pr-7"
                  >
                    {OBJECT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cx-text-muted pointer-events-none text-[10px]">▾</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-medium text-cx-text-muted mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this node do?"
                rows={2}
                className="cx-input w-full resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-medium text-cx-text-muted mb-1.5">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="vdb, simulation, pyro (comma separated)"
                className="cx-input w-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-cx-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-[12px] text-cx-text-muted border border-cx-border
                         hover:bg-cx-surface hover:text-cx-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white
                         bg-cx-accent hover:bg-cx-accent-dim transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating…' : 'Create Node'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function CloseIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round">
    <line x1="2" y1="2" x2="9" y2="9"/><line x1="9" y1="2" x2="2" y2="9"/>
  </svg>
}
