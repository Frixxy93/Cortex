import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'
import type { Parameter } from '@/types'

interface Props {
  parameters: Parameter[]
  onChange?: (id: string, value: unknown) => void
  onParamsChange?: (params: Parameter[]) => void
}

export function ParameterEditor({ parameters, onChange, onParamsChange }: Props) {
  // Sync values whenever the parameters list changes (node switch, add, delete)
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(parameters.map(p => [p.id, p.defaultValue]))
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setValues(Object.fromEntries(parameters.map(p => [p.id, p.defaultValue])))
  }, [parameters.map(p => p.id).join(',')])

  const setValue = useCallback((id: string, value: unknown) => {
    setValues(prev => ({ ...prev, [id]: value }))
    onChange?.(id, value)
    // Persist defaultValue so it survives node switches
    if (onParamsChange) {
      onParamsChange(parameters.map(p => p.id === id ? { ...p, defaultValue: value } : p))
    }
  }, [parameters, onChange, onParamsChange])

  const groups = parameters.reduce<Record<string, Parameter[]>>((acc, p) => {
    const g = p.group ?? '__default'
    ;(acc[g] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="divide-y divide-cx-border/30">
      {Object.entries(groups).map(([group, params]) => (
        <ParameterGroup
          key={group}
          label={group === '__default' ? undefined : group}
          parameters={params}
          values={values}
          onChange={setValue}
          onDelete={onParamsChange ? (id) => onParamsChange(parameters.filter(p => p.id !== id)) : undefined}
        />
      ))}
    </div>
  )
}

function ParameterGroup({
  label, parameters, values, onChange, onDelete,
}: {
  label?: string
  parameters: Parameter[]
  values: Record<string, unknown>
  onChange: (id: string, value: unknown) => void
  onDelete?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      {label && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-cx-text-muted
                     hover:text-cx-text transition-colors text-left"
        >
          <span className="text-[8px]">{expanded ? '▼' : '▶'}</span>
          {label}
        </button>
      )}
      {expanded && (
        <div className="px-3 pb-2 space-y-2">
          {parameters
            .filter(p => p.paramType !== 'separator' && p.paramType !== 'label')
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(param => (
              <ParameterRow
                key={param.id}
                param={param}
                value={values[param.id]}
                onChange={(v) => onChange(param.id, v)}
                onDelete={onDelete ? () => onDelete(param.id) : undefined}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function ParameterRow({ param, value, onChange, onDelete }: {
  param: Parameter
  value: unknown
  onChange: (v: unknown) => void
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-2 group/row">
      <label
        className="text-[11px] text-cx-text-dim w-[38%] truncate flex-shrink-0"
        title={param.description ?? param.displayName}
      >
        {param.displayName}
      </label>
      <div className="flex-1 min-w-0">
        <ParameterInput param={param} value={value} onChange={onChange} />
      </div>
      {onDelete && (
        <button onClick={onDelete}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded
                     text-cx-text-muted hover:text-cx-error hover:bg-cx-error/10
                     opacity-0 group-hover/row:opacity-100 transition-all">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function ParameterInput({ param, value, onChange }: {
  param: Parameter
  value: unknown
  onChange: (v: unknown) => void
}) {
  const baseInput = 'w-full bg-cx-elevated border border-cx-border rounded px-2 py-1 text-xs text-cx-text focus:outline-none focus:border-cx-accent transition-colors'

  switch (param.paramType) {
    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={cn(
            'relative w-8 h-4 rounded-full transition-colors',
            value ? 'bg-cx-accent' : 'bg-cx-border'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
            value ? 'translate-x-4' : 'translate-x-0.5'
          )} />
        </button>
      )

    case 'integer':
    case 'float':
      if (param.minValue != null && param.maxValue != null) {
        const min = param.minValue as number
        const max = param.maxValue as number
        const current = (value as number) ?? min
        return (
          <div className="space-y-0.5">
            <input
              type="range"
              min={min} max={max}
              step={param.paramType === 'integer' ? 1 : 0.001}
              value={current}
              onChange={e => onChange(param.paramType === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
              className="w-full accent-cx-accent h-1"
            />
            <div className="flex justify-between text-[9px] text-cx-text-muted">
              <span>{min}</span>
              <span className="text-cx-text">{current}</span>
              <span>{max}</span>
            </div>
          </div>
        )
      }
      return (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={e => onChange(parseFloat(e.target.value))}
          className={baseInput}
        />
      )

    case 'enum':
      return (
        <select
          value={value as string}
          onChange={e => onChange(e.target.value)}
          className={cn(baseInput, 'cursor-pointer')}
        >
          {(param.options ?? []).map(opt => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
          ))}
        </select>
      )

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) ?? '#6c63ff'}
            onChange={e => onChange(e.target.value)}
            className="w-7 h-6 rounded cursor-pointer border border-cx-border bg-transparent"
          />
          <span className="text-[11px] text-cx-text-dim font-mono">
            {(value as string) ?? '#6c63ff'}
          </span>
        </div>
      )

    case 'vector2':
    case 'vector3':
    case 'vector4': {
      const dims = param.paramType === 'vector2' ? 2 : param.paramType === 'vector3' ? 3 : 4
      const labels = ['X', 'Y', 'Z', 'W']
      const vec = Array.isArray(value) ? value as number[] : Array(dims).fill(0)
      return (
        <div className="flex gap-1">
          {Array.from({ length: dims }).map((_, i) => (
            <div key={i} className="flex-1 min-w-0">
              <div className="text-[8px] text-cx-text-muted text-center mb-0.5">{labels[i]}</div>
              <input
                type="number"
                value={vec[i] ?? 0}
                onChange={e => {
                  const next = [...vec]
                  next[i] = parseFloat(e.target.value)
                  onChange(next)
                }}
                className="w-full bg-cx-elevated border border-cx-border rounded px-1.5 py-1
                           text-[10px] text-cx-text focus:outline-none focus:border-cx-accent
                           transition-colors text-center"
              />
            </div>
          ))}
        </div>
      )
    }

    case 'string':
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={param.description}
          className={baseInput}
        />
      )
  }
}
            