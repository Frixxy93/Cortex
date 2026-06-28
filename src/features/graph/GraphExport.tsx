import { useState } from 'react'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'

export function GraphExport() {
  const { activeGraphId, graphs } = useGraphStore()
  const { addToast } = useUiStore()
  const [copied, setCopied] = useState(false)

  const graph = activeGraphId ? graphs[activeGraphId] : null
  if (!graph) return (
    <div className="p-4 text-center text-[11px] text-cx-text-muted">No graph selected</div>
  )

  const handleCopy = async () => {
    const json = JSON.stringify(graph, null, 2)
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('Copied to clipboard', { variant: 'success' })
  }

  const handleDownload = () => {
    const json = JSON.stringify(graph, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${graph.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast(`Exported "${graph.name}"`, { variant: 'success' })
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] font-semibold text-cx-text-muted uppercase tracking-[0.1em]">
        Export Graph
      </div>
      <div className="bg-cx-elevated border border-cx-border rounded-lg p-2.5">
        <div className="text-[11px] text-cx-text font-medium truncate">{graph.name}</div>
        <div className="text-[10px] text-cx-text-muted mt-0.5">
          {graph.nodes.length} nodes · {graph.edges.length} edges
        </div>
      </div>
      <button onClick={handleCopy}
        className="w-full py-1.5 rounded-lg border border-cx-border text-[12px] text-cx-text
                   hover:bg-cx-elevated transition-colors">
        {copied ? '✓ Copied' : 'Copy JSON'}
      </button>
      <button onClick={handleDownload}
        className="w-full py-1.5 rounded-lg bg-cx-accent text-white text-[12px] font-medium
                   hover:opacity-90 transition-opacity">
        Download .json
      </button>
    </div>
  )
}
