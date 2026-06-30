import { useState } from 'react'
import { useNodeStore } from '@/stores/node.store'
import { NodeService } from '@/services/node.service'
import { useUiStore } from '@/stores/ui.store'
import { useAdminStore } from '@/stores/admin.store'

export function NodeBulkActions() {
  const { getAllNodes, clearAll: clearAllLocal } = useNodeStore()
  const { addToast } = useUiStore()
  const { isAdmin } = useAdminStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const nodes = getAllNodes()

  const handleClearAll = async () => {
    setDeleting(true)
    try {
      const count = await NodeService.clearAll()
      clearAllLocal?.()
      addToast(`Removed ${count.toLocaleString()} nodes`, { variant: 'default' })
    } catch (e) {
      addToast(`Clear failed: ${String(e)}`, { variant: 'error' })
    } finally {
      setDeleting(false)
      setConfirmClear(false)
    }
  }

  if (nodes.length === 0) return null
  if (!isAdmin) return (
    <div className="px-3 py-2.5 border-t border-cx-border">
      <div className="flex items-center gap-1.5 text-[10px] text-cx-text-muted">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4.5" width="7" height="5" rx="1"/>
          <path d="M3.5 4.5V3a2 2 0 0 1 4 0v1.5"/>
        </svg>
        Bulk actions require admin access
      </div>
    </div>
  )

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
