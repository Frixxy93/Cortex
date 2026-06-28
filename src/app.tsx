import { useEffect, useState, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStore } from '@/stores/admin.store'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'
import { LeftSidebar } from '@/components/panels/LeftSidebar'
import { ContentPanel } from '@/components/panels/ContentPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { TitleBar } from '@/components/panels/TitleBar'
import { CommandPalette } from '@/components/panels/CommandPalette'
import { GraphCanvas } from '@/components/canvas/GraphCanvas'
import { useVaultStore } from '@/stores/vault.store'
import { useNodeStore } from '@/stores/node.store'
import { useGraphStore } from '@/stores/graph.store'
import { useUiStore } from '@/stores/ui.store'
import { useBridgeStore } from '@/stores/bridge.store'
import { HomeDashboard } from '@/features/home/HomeDashboard'
import { ToastContainer } from '@/components/ui/Toast'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { BridgePanel } from '@/components/panels/BridgePanel'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// ── Admin password modal ──────────────────────────────────────────────────────

function AdminPasswordModal({ onClose, onUnlock }: {
  onClose: () => void
  onUnlock: (pw: string) => boolean
}) {
  const [pw,  setPw]  = useState('')
  const [err, setErr] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = () => {
    if (onUnlock(pw)) {
      onClose()
    } else {
      setErr(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col gap-4 rounded-2xl px-7 py-6"
        style={{
          width: 340,
          background: 'rgba(10,10,22,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#7b6fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="9" height="6.5" rx="1.5"/>
              <path d="M4.5 6V4a2.5 2.5 0 015 0v2"/>
              <circle cx="7" cy="9.5" r="1" fill="#7b6fff" stroke="none"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-cx-text">Admin Access</div>
            <div className="text-[11px] text-cx-text-muted mt-0.5">Enter passphrase to unlock</div>
          </div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Passphrase"
          className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-cx-text outline-none"
          style={{
            border: err ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            transition: 'border-color 0.15s',
          }}
        />

        {err && (
          <div className="text-[11px] text-red-400 -mt-2">Incorrect passphrase — try again</div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-[12px] text-cx-text-muted transition-all"
            style={{ background: 'rgba(2