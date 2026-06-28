import { useGraphStore } from '@/stores/graph.store'
import { useVaultStore } from '@/stores/vault.store'
import { useUiStore } from '@/stores/ui.store'

const TEMPLATES = [
  {
    name: 'Pyro FX',
    description: 'Smoke & fire simulation graph with source, solver, and render nodes.',
    tags: ['houdini', 'simulation', 'vfx'],
    nodes: [] as import('@/types').GraphNode[],
    edges: [] as import('@/types').GraphEdge[],
  },
  {
    name: 'Character Rig',
    description: 'KineFX skeleton setup with IK solvers and blend shapes.',
    tags: ['houdini', 'rigging', 'kinefx'],
    nodes: [],
    edges: [],
  },
  {
    name: 'Procedural City',
    description: 'City block generation using scatter, instance, and crowd nodes.',
    tags: ['houdini', 'procedural', 'environment'],
    nodes: [],
    edges: [],
  },
  {
    name: 'VDB Workflow',
    description: 'OpenVDB pipeline: convert, smooth, combine, and render volumes.',
    tags: ['houdini', 'vdb', 'volumes'],
    nodes: [],
    edges: [],
  },
]

export function GraphTemplates() {
  const { activeVaultId } = useVaultStore()
  const { createGraph } = useGraphStore()
  const { addToast } = useUiStore()

  const handleCreate = async (t: typeof TEMPLATES[0]) => {
    if (!activeVaultId) return
    await createGraph({
      vaultId: activeVaultId,
      name: t.name,
      description: t.description,
      tags: t.tags,
    })
    addToast(`Created "${t.name}" from template`, { variant: 'success' })
  }

  return (
    <div className="p-3 space-y-2">
      <div className="text-[9px] font-semibold text-cx-text-muted uppercase tracking-[0.1em] mb-2">
        Starter Templates
      </div>
      {TEMPLATES.map(t => (
        <button key={t.name} onClick={() => handleCreate(t)}
          className="w-full text-left bg-cx-elevated border border-cx-border rounded-lg p-2.5
                     hover:border-cx-accent/40 transition-colors group">
          <div className="text-[12px] font-medium text-cx-text group-hover:text-cx-accent transition-colors">
            {t.name}
          </div>
          <div className="text-[10px] text-cx-text-muted mt-0.5 leading-relaxed">{t.description}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {t.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-cx-bg text-[9px] text-cx-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
