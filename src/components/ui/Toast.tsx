import { useUiStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-xl border text-[12px] min-w-[260px] max-w-[340px]',
            'pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
            'animate-[fadeIn_0.2s_ease]',
            toast.variant === 'success' && 'bg-cx-elevated border-cx-success/30 text-cx-text',
            toast.variant === 'error'   && 'bg-cx-elevated border-cx-error/30 text-cx-text',
            toast.variant === 'warning' && 'bg-cx-elevated border-cx-warning/30 text-cx-text',
            toast.variant === 'info'    && 'bg-cx-elevated border-cx-accent/30 text-cx-text',
            toast.variant === 'default' && 'bg-cx-elevated border-cx-border text-cx-text',
          )}
        >
          <span className={cn(
            'mt-0.5 text-[14px] flex-shrink-0',
            toast.variant === 'success' && 'text-cx-success',
            toast.variant === 'error'   && 'text-cx-error',
            toast.variant === 'warning' && 'text-cx-warning',
            toast.variant === 'info'    && 'text-cx-accent',
            toast.variant === 'default' && 'text-cx-text-muted',
          )}>
            {toast.variant === 'success' ? '✓' :
             toast.variant === 'error'   ? '✕' :
             toast.variant === 'warning' ? '!' :
             toast.variant === 'info'    ? 'i' : '·'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{toast.title}</div>
            {toast.description && (
              <div className="text-[11px] text-cx-text-muted mt-0.5 line-clamp-2">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-cx-text-muted hover:text-cx-text transition-colors mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
