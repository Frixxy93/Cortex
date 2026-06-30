export type PlatformOS = 'macos' | 'windows' | 'linux'

function detectOS(): PlatformOS {
  const ua  = navigator.userAgent.toLowerCase()
  const pf  = navigator.platform?.toLowerCase() ?? ''
  if (ua.includes('mac os x') || ua.includes('macintosh') || pf.startsWith('mac')) return 'macos'
  if (ua.includes('windows') || pf.startsWith('win')) return 'windows'
  return 'linux'
}

export const OS: PlatformOS = detectOS()
export const isMac     = OS === 'macos'
export const isWindows = OS === 'windows'
export const isLinux   = OS === 'linux'

export const OS_LABELS: Record<PlatformOS, string> = {
  macos:   'macOS',
  windows: 'Windows',
  linux:   'Linux',
}

/** Returns platform-aware modifier key symbol. Override via settings cmdKey. */
export function getModKey(override: 'auto' | 'meta' | 'ctrl' = 'auto'): string {
  if (override === 'meta') return '⌘'
  if (override === 'ctrl') return 'Ctrl'
  return isMac ? '⌘' : 'Ctrl'
}
