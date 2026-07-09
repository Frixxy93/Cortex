import { useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useUiStore } from '@/stores/ui.store'

/**
 * Auto-updater — checks GitHub on startup, downloads silently in background,
 * then shows a persistent toast asking the user to restart.
 * Never relaunches without user consent.
 */
export function useAutoUpdate() {
  const addToast = useUiStore(s => s.addToast)

  useEffect(() => {
    async function checkAndDownload() {
      try {
        const update = await check()
        if (!update?.available) return

        console.log('[CORTEX] Update ' + update.version + ' available — downloading...')
        await update.download()

        addToast('CORTEX ' + update.version + ' ready', {
          description: 'Downloaded in background. Restart to apply.',
          variant: 'info',
          duration: 0,
          action: {
            label: 'Restart Now',
            onClick: async () => {
              await update.install()
              await relaunch()
            },
          },
        })
      } catch (e) {
        console.warn('[CORTEX] Auto-update check failed:', e)
      }
    }

    const t = setTimeout(checkAndDownload, 4000)
    return () => clearTimeout(t)
  }, [])
}
