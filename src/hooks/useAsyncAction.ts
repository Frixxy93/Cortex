import { useState, useCallback } from 'react'

export function useAsyncAction<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): [(...args: T) => Promise<void>, boolean, string | null] {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (...args: T) => {
    setLoading(true)
    setError(null)
    try {
      await fn(...args)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [fn])

  return [run, loading, error]
}
