import { useState } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'

export function NodeBulkActions() {
  const { getAllNodes, deleteNode } = useNodeStore()
  const { addToast } = useUiStore()
  const { isAdmin } = useAdminStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const nodes = getAllNodes()

  const handleClearAll = async () => {
    setDeleting(true)
    let count = 0
    for (const node of nodes) {
      await deleteNode(node.id)
      count++
    }
    setDeleting(false)
    setConfirmClear(false)
    addToast(`Removed ${count} nodes`, { variant: 'default' })
  }

  if (nodes.length === 0 || !isAdmin) return null

  return (
    <div className="p-3 border-t border-cx-border">
      <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
        Bulk Actions
      </div>
      {confirmClear ? (
        <div className="space-y-1.5">
          <div className="text-[10px] text-cx-text-muted">
            Remove all {nodes.length} nodes from this vault?
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleClearAll} disabled={deleting}
              className="flex-1 py-1.5 rounded-lg bg-cx-error/20 text-cx-error text-[11px] disabled:opacity-50">
              {deleting ? 'Removing…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmClear(false)}
              className="flex-1 py-1.5 rounded-lg border border-cx-border text-[11px] text-cx-text-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmClear(true)}
          className="w-full py-1.5 rounded-lg border border-cx-border text-[11px] text-cx-text-muted
                     hover:text-cx-error hover:border-cx-error/30 transition-colors">
          Clear All Nodes
        </button>
      )}
    </div>
  )
}
