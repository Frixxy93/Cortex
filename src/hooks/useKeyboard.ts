import { useEffect, useCallback } from 'react'

type KeyHandler = (e: KeyboardEvent) => void

export function useKeyboard(
  key: string,
  handler: KeyHandler,
  options: { meta?: boolean; shift?: boolean; ctrl?: boolean; disabled?: boolean } = {}
) {
  const cb = useCallback((e: KeyboardEvent) => {
    if (options.disabled) return
    const meta = options.meta ? (e.metaKey || e.ctrlKey) : true
    const shift = options.shift ? e.shiftKey : true
    if (meta && shift && e.key === key) {
      e.preventDefault()
      handler(e)
    }
  }, [key, handler, options.disabled, options.meta, options.shift])

  useEffect(() => {
    window.addEventListener('keydown', cb)
    return () => window.removeEventListener('keydown', cb)
  }, [cb])
}
