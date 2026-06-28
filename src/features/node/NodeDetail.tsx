import { useState } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'
import { CATEGORY_COLORS } from '@/utils/constants'
import type { CortexNode } from '@/types'

interface Props { node: CortexNode }

export function NodeDetail({ node }: Props) {
  const { updateNode, deleteNode } = useNodeStore()
  const { addToast } = useUiStore()
  const { isAdmin } = useAdminStore()
  const [notes, setNotes] = useState(node.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const color = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS.default

  const saveNotes = async () => {
    await updateNode({ id: node.id, notes })
    addToast('Notes saved', { variant: 'success' })
  }

  const handleDelete = async () => {
    await deleteNode(node.id)
    addToast(`Deleted "${node.displayName}"`, { variant: 'default' })
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
        <div>
          <div className="text-[13px] font-semibold text-cx-text leading-tight">{node.displayName}</div>
          <div className="text-[10px] text-cx-text-muted mt-0.5 font-mono">{node.name}</div>
        </div>
      </div>

      {/* Category + type */}
      <div className="flex gap-1.5">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ background: `${color}20`, color }}>
          {node.category.toUpperCase()}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cx-elevated text-cx-text-muted border border-cx-border">
          {node.objectType.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Description */}
      {node.description && (
        <div className="text-[11px] text-cx-text-dim leading-relaxed">{node.description}</div>
      )}

      {/* Tags */}
      {node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.filter(t => t !== 'houdini').map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-cx-elevated border border-cx-border text-[10px] text-cx-text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ports */}
      {(node.inputs.length > 0 || node.outputs.length > 0) && (
        <div className="space-y-1.5">
          {node.inputs.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1">Inputs</div>
              {node.inputs.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 text-[10px] text-cx-text-dim py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cx-text-muted flex-shrink-0" />
                  <span className="font-mono">{p.name}</span>
                  <span className="text-cx-text-muted ml-auto">{p.dataType}</span>
                </div>
              ))}
            </div>
          )}
          {node.outputs.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1">Outputs</div>
              {node.outputs.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 text-[10px] text-cx-text-dim py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cx-accent flex-shrink-0" />
                  <span className="font-mono">{p.name}</span>
                  <span className="text-cx-text-muted ml-auto">{p.dataType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-1">Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add notes…"
          className="w-full bg-cx-elevated border border-cx-border rounded-lg px-2.5 py-2
                     text-[11px] text-cx-text placeholder-cx-text-muted resize-none
                     focus:outline-none focus:border-cx-accent/50"
        />
      </div>

      {/* Delete — admin only */}
      {isAdmin && (
      <div className="pt-1 border-t border-cx-border">
        {confirmDelete ? (
          <div className="flex gap-2">
            <button onClick={handleDelete}
              className="flex-1 py-1.5 rounded-lg bg-cx-error/20 text-cx-error text-[11px] hover:bg-cx-error/30">
              Confirm Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 rounded-lg border border-cx-border text-[11px] text-cx-text-muted hover:text-cx-text">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-1.5 rounded-lg text-[11px] text-cx-text-muted hover:text-cx-error transition-colors">
            Delete Node
          </button>
        )}
      </div>
      )}
    </div>
  )
}
