export type ParameterType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'enum'
  | 'vector2'
  | 'vector3'
  | 'vector4'
  | 'color'
  | 'file'
  | 'image'
  | 'expression'
  | 'array'
  | 'object'
  | 'json'
  | 'button'
  | 'separator'
  | 'label'
  | 'ramp'
  | 'keyframe'

export type PerformanceImpact = 'none' | 'low' | 'medium' | 'high' | 'critical'

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains'

export interface ParameterCondition {
  parameter: string
  operator: ConditionOperator
  value: unknown
}

export interface ParameterOption {
  value: unknown
  label: string
  icon?: string
}

export interface Parameter {
  id: string
  name: string
  displayName: string
  paramType: ParameterType
  defaultValue?: unknown
  minValue?: unknown
  maxValue?: unknown
  options?: ParameterOption[]
  description?: string
  group?: string
  visibleWhen?: ParameterCondition
  enabledWhen?: ParameterCondition
  performanceImpact: PerformanceImpact
  isAnimatable: boolean
  isExpressionCapable: boolean
  sortOrder: number
}
