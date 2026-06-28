import { useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/**
 * Silent auto-updater — checks GitHub on startup, downloads + installs in background,
 * then relaunches the app. No user prompt needed.
 */
export function useAutoUpdate() {
  useEffect(() => {
    // Only run in production builds
    if (import.meta.env.DEV) return

    async function silentUpdate() {
      try {
        const update = await check()
        if (!update?.available) return

        console.log(`[CORTEX] Update available: ${update.version} — downloading…`)

        await update.downloadAndInstall()
        await relaunch()
      } catch (e) {
        // Never crash the app over an update failure
        console.warn('[CORTEX] Auto-update check failed:', e)
      }
    }

    // Small delay so the app UI loads first
    const t = setTimeout(silentUpdate, 3000)
    return () => clearTimeout(t)
  }, [])
}
