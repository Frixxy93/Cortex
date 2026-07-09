/**
 * Port data-type registry for the CORTEX visual node editor.
 * Each type has a color used on handles and edge lines.
 */

export type PortDataType =
  | 'float'   | 'int'      | 'bool'
  | 'vector2' | 'vector3'  | 'vector4'
  | 'color'   | 'string'   | 'geometry'
  | 'volume'  | 'image'    | 'matrix'
  | 'array'   | 'object'   | 'any'

export const PORT_COLORS: Record<PortDataType, string> = {
  float:    '#a8c4ff',   // soft blue
  int:      '#7ee8a2',   // green
  bool:     '#ff9f7e',   // orange
  vector2:  '#c3b1e1',   // lavender
  vector3:  '#b388ff',   // purple
  vector4:  '#ea80fc',   // pink-purple
  color:    '#ff80ab',   // pink
  string:   '#ffd54f',   // amber
  geometry: '#4dd0e1',   // cyan
  volume:   '#80cbc4',   // teal
  image:    '#f48fb1',   // rose
  matrix:   '#ef9a9a',   // red-orange
  array:    '#e6ee9c',   // lime
  object:   '#ffcc80',   // peach
  any:      '#888aaa',   // grey
}

export const PORT_LABELS: Record<PortDataType, string> = {
  float:    'Float',
  int:      'Int',
  bool:     'Bool',
  vector2:  'Vec2',
  vector3:  'Vec3',
  vector4:  'Vec4',
  color:    'Color',
  string:   'String',
  geometry: 'Geo',
  volume:   'Volume',
  image:    'Image',
  matrix:   'Matrix',
  array:    'Array',
  object:   'Object',
  any:      'Any',
}

/** Returns true if an output of `from` type can connect to an input of `to` type. */
export function isCompatible(from: string, to: string): boolean {
  if (from === to)    return true
  if (from === 'any' || to === 'any') return true
  // Numeric promotions
  if (from === 'int'  && to === 'float')   return true
  if (from === 'bool' && to === 'int')     return true
  if (from === 'bool' && to === 'float')   return true
  // Vector promotions
  if (from === 'vector3' && to === 'vector4') return true
  if (from === 'color'   && to === 'vector3') return true
  if (from === 'color'   && to === 'vector4') return true
  return false
}

/** Guess the PortDataType from a freeform string (e.g., from imported .nk files). */
export function inferPortType(hint: string): PortDataType {
  const h = hint.toLowerCase()
  if (h.includes('geo') || h.includes('mesh') || h.includes('point')) return 'geometry'
  if (h.includes('vol') || h.includes('vdb'))  return 'volume'
  if (h.includes('img') || h.includes('image') || h.includes('rgba')) return 'image'
  if (h.includes('col') || h.includes('rgb'))  return 'color'
  if (h.includes('vec4') || h.includes('v4'))  return 'vector4'
  if (h.includes('vec3') || h.includes('v3') || h.includes('normal') || h.includes('pos')) return 'vector3'
  if (h.includes('vec2') || h.includes('uv'))  return 'vector2'
  if (h.includes('mat'))  return 'matrix'
  if (h.includes('bool') || h.includes('flag') || h.includes('toggle')) return 'bool'
  if (h.includes('int')  || h.includes('idx')  || h.includes('count'))  return 'int'
  if (h.includes('str')  || h.includes('name') || h.includes('path'))   return 'string'
  if (h.includes('float') || h.includes('val')) return 'float'
  return 'any'
}
