import { useState, useRef } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import type { CortexGraph } from '@/types'

type ImportState = 'idle' | 'parsing' | 'done' | 'error'

export function ImportPanel() {
  const { activeVaultId } = useVaultStore()
  const { createGraph } = useGraphStore()
  const { addToast } = useUiStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<ImportState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; nodes: number; edges: number } | null>(null)
  const [parsed, setParsed] = useState<Partial<CortexGraph> | null>(null)
  const [dragging, setDragging] = useState(false)

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Only .json files are supported')
      setState('error')
      return
    }
    setState('parsing')
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as Partial<CortexGraph>
        setPreview({
          name: data.name ?? file.name.replace('.json', ''),
          nodes: data.nodes?.length ?? 0,
          edges: data.edges?.length ?? 0,
        })
        setParsed(data)
        setState('done')
      } catch {
        setError('Invalid JSON — could not parse graph file.')
        setState('error')
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!activeVaultId || !parsed) return
    await createGraph({
      vaultId: activeVaultId,
      name: parsed.name ?? 'Imported Graph',
      description: parsed.description ?? '',
      tags: parsed.tags ?? [],
    })
    addToast(`Imported "${parsed.name ?? 'graph'}"`, { variant: 'success' })
    setState('idle')
    setParsed(null)
    setPreview(null)
  }

  const reset = () => { setState('idle'); setError(null); setPreview(null); setParsed(null) }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">Import Graph</div>

      {state === 'idle' || state === 'error' ? (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              dragging ? 'border-cx-accent bg-cx-accent/5' : 'border-cx-border hover:border-cx-accent/40'
            )}
          >
            <div className="text-[11px] text-cx-text-muted">Drop a graph .json here</div>
            <div className="text-[10px] text-cx-text-muted mt-1 opacity-60">or click to browse</div>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          {state === 'error' && (
            <div className="text-[10px] text-cx-error">{error}</div>
          )}
        </>
      ) : state === 'parsing' ? (
        <div className="text-[11px] text-cx-text-muted animate-pulse text-center py-4">Parsing…</div>
      ) : preview && (
        <div className="space-y-2">
          <div className="bg-cx-elevated border border-cx-border rounded-lg p-3">
            <div className="text-[12px] font-medium text-cx-text">{preview.name}</div>
            <div className="text-[10px] text-cx-text-muted mt-1">
              {preview.nodes} nodes · {preview.edges} edges
            </div>
          </div>
          <button onClick={handleImport}
            className="w-full py-1.5 rounded-lg bg-cx-accent text-white text-[12px] font-medium hover:opacity-90">
            Import into Vault
          </button>
          <button onClick={reset}
            className="w-full py-1.5 rounded-lg border border-cx-border text-[12px] text-cx-text-muted hover:text-cx-text">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
