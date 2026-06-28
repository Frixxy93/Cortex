export const CORTEX_VERSION = '0.1.0'

export const SOFTWARE_COLORS: Record<string, string> = {
  houdini: '#FF6B35',
  nuke: '#7B5EA7',
  blender: '#E87D0D',
  unreal: '#0D7CC1',
  maya: '#00AEEF',
  cinema4d: '#011A6A',
  substance: '#A3522A',
  touchdesigner: '#2D9B8A',
}

export const CATEGORY_COLORS: Record<string, string> = {
  sop: '#4FC3F7',
  dop: '#EF9A9A',
  cop: '#A5D6A7',
  vop: '#FFE082',
  lop: '#CE93D8',
  rop: '#FFAB91',
  chop: '#80CBC4',
  geometry: '#4FC3F7',
  shader: '#CE93D8',
  compositor: '#A5D6A7',
  utility: '#B0BEC5',
  math: '#FFE082',
  default: '#6C63FF',
}

export const NODE_OBJECT_TYPE_ICONS: Record<string, string> = {
  software_node: '⬡',
  recipe: '📋',
  blueprint: '🔷',
  documentation: '📄',
  asset: '🖼',
  project: '📁',
  template: '🧩',
  reference: '🔗',
  learning_topic: '🎓',
  external_link: '↗',
  note: '📝',
  custom: '✦',
}

export const GRAPH_DEFAULTS = {
  snapGrid: [16, 16] as [number, number],
  defaultZoom: 1,
  minZoom: 0.05,
  maxZoom: 4,
  nodeWidth: 180,
  nodeHeight: 80,
}

export const SEARCH_DEBOUNCE_MS = 150
export const AUTOSAVE_INTERVAL_MS = 5000

export const OBJECT_TYPES: { value: string; label: string }[] = [
  { value: 'software_node',  label: 'Software Node'  },
  { value: 'recipe',         label: 'Recipe'         },
  { value: 'blueprint',      label: 'Blueprint'      },
  { value: 'documentation',  label: 'Documentation'  },
  { value: 'asset',          label: 'Asset'          },
  { value: 'project',        label: 'Project'        },
  { value: 'template',       label: 'Template'       },
  { value: 'reference',      label: 'Reference'      },
  { value: 'learning_topic', label: 'Learning Topic' },
  { value: 'external_link',  label: 'External Link'  },
  { value: 'note',           label: 'Note'           },
  { value: 'custom',         label: 'Custom'         },
]
