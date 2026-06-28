import { invoke } from '@tauri-apps/api/core'

/**
 * Type-safe Tauri invoke wrapper.
 * Surfaces Rust CortexError as a typed JS error.
 */
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'kind' in e) {
      const err = e as { kind: string; message: string }
      throw new CortexApiError(err.kind, err.message)
    }
    throw e
  }
}

export class CortexApiError extends Error {
  constructor(
    public readonly kind: string,
    message: string
  ) {
    super(message)
    this.name = `CortexError[${kind}]`
  }
}
