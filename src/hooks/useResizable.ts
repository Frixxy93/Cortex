import { useState, useCallback, useRef } from 'react'

export function useResizable(initial: number, min = 160, max = 480) {
  const [width, setWidth] = useState(initial)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const next = Math.min(max, Math.max(min, startW.current + ev.clientX - startX.current))
      setWidth(next)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, min, max])

  return { width, onMouseDown }
}
