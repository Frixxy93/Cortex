import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings.store'

const PRESET_COLORS = [
  '#7b6fff', '#34d399', '#f59e0b', '#60a5fa',
  '#f472b6', '#fb923c', '#a78bfa', '#ef4444',
]

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Create Profile (first launch) ────────────────────────────────────────────
function CreateProfileScreen({ onDone }: { onDone: () => void }) {
  const addProfile = useSettingsStore(s => s.addProfile)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7b6fff')

  function handleCreate() {
    if (!name.trim()) return
    addProfile(name.trim(), color)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(4,4,16,0.97)' }}>
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.25)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#7b6fff" opacity="0.9"/>
              <circle cx="3" cy="5" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="17" cy="5" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="3" cy="15" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="17" cy="15" r="2" fill="#7b6fff" opacity="0.5"/>
              <line x1="10" y1="10" x2="3" y2="5" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="17" y2="5" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="3" y2="15" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="17" y2="15" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'rgba(234,234,248,0.95)' }}>Welcome to CORTEX</h1>
          <p className="text-sm mt-1.5 text-center" style={{ color: 'rgba(140,140,180,0.6)' }}>Create your profile to get started</p>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`,
              boxShadow: `0 0 0 3px rgba(0,0,0,0.6), 0 0 0 4px ${color}60, 0 8px 32px ${color}30`,
            }}
          >
            {initials(name) || '?'}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: 'rgba(140,140,180,0.5)' }}>Your Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Alex, FX Artist..."
            maxLength={30}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: 'rgba(14,14,34,0.8)',
              border: '1px solid rgba(60,60,100,0.5)',
              color: 'rgba(234,234,248,0.9)',
              caretColor: color,
            }}
          />
        </div>

        {/* Color picker */}
        <div className="mb-8">
          <label className="block text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'rgba(140,140,180,0.5)' }}>Avatar Color</label>
          <div className="flex items-center gap-3">
            {PRESET_COLORS.map(hex => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                className="w-8 h-8 rounded-full flex-shrink-0 transition-all hover:scale-110"
                style={{
                  background: hex,
                  boxShadow: color === hex
                    ? `0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3.5px ${hex}, 0 0 12px ${hex}60`
                    : 'none',
                }}
              >
                {color === hex && (
                  <svg viewBox="0 0 10 10" width="10" height="10" fill="none" className="mx-auto" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5l2.5 2.5L8 3"/>
                  </svg>
                )}
              </button>
            ))}
            <label className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all" style={{ background: 'rgba(24,24,58,0.8)', border: '1.5px dashed rgba(60,60,100,0.7)' }}>
              <span style={{ color: 'rgba(90,90,140,0.7)', fontSize: 16 }}>+</span>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="sr-only" />
            </label>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: name.trim()
              ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`
              : 'rgba(40,40,80,0.4)',
            color: name.trim() ? '#fff' : 'rgba(120,120,160,0.4)',
            boxShadow: name.trim() ? `0 4px 20px ${color}40` : 'none',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Enter CORTEX
        </button>
      </div>
    </div>
  )
}

// ── Select Profile (returning user) ──────────────────────────────────────────
function SelectProfileScreen({ onDone }: { onDone: () => void }) {
  const { profiles, switchProfile, addProfile } = useSettingsStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#7b6fff')
  const [hovered, setHovered] = useState<string | null>(null)

  function handleSelect(id: string) {
    switchProfile(id)
    onDone()
  }

  function handleCreate() {
    if (!newName.trim()) return
    addProfile(newName.trim(), newColor)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(4,4,16,0.97)' }}>
      <div className="w-full max-w-xs px-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.25)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#7b6fff" opacity="0.9"/>
              <circle cx="3" cy="5" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="17" cy="5" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="3" cy="15" r="2" fill="#7b6fff" opacity="0.5"/>
              <circle cx="17" cy="15" r="2" fill="#7b6fff" opacity="0.5"/>
              <line x1="10" y1="10" x2="3" y2="5" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="17" y2="5" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="3" y2="15" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
              <line x1="10" y1="10" x2="17" y2="15" stroke="#7b6fff" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'rgba(234,234,248,0.95)' }}>Who's using CORTEX?</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(140,140,180,0.5)' }}>Select your profile to continue</p>
        </div>

        {/* Profile list */}
        <div className="space-y-2 mb-4">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.id)}
              onMouseEnter={() => setHovered(profile.id)}
              onMouseLeave={() => setHovered(null)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left"
              style={{
                background: hovered === profile.id ? 'rgba(123,111,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: hovered === profile.id ? '1px solid rgba(123,111,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${profile.color} 0%, ${profile.color}aa 100%)`,
                  boxShadow: hovered === profile.id ? `0 0 0 2px ${profile.color}50, 0 4px 16px ${profile.color}30` : 'none',
                  fontSize: 15,
                }}
              >
                {initials(profile.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'rgba(234,234,248,0.9)' }}>{profile.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(120,120,160,0.5)' }}>CORTEX profile</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: hovered === profile.id ? 'rgba(123,111,255,0.7)' : 'rgba(80,80,120,0.4)', flexShrink: 0, transition: 'color 0.15s' }}>
                <path d="M5 3l4 4-4 4"/>
              </svg>
            </button>
          ))}
        </div>

        {/* New profile */}
        {creating ? (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.2)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
                style={{ background: `linear-gradient(135deg, ${newColor} 0%, ${newColor}aa 100%)` }}
              >
                {initials(newName) || '?'}
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Profile name"
                maxLength={30}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{ background: 'rgba(14,14,34,0.8)', border: '1px solid rgba(60,60,100,0.5)', color: 'rgba(234,234,248,0.9)', caretColor: newColor }}
              />
            </div>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(hex => (
                <button key={hex} onClick={() => setNewColor(hex)} className="w-6 h-6 rounded-full flex-shrink-0 transition-all hover:scale-110"
                  style={{ background: hex, boxShadow: newColor === hex ? `0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3px ${hex}` : 'none' }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: 'rgba(123,111,255,0.2)', border: '1px solid rgba(123,111,255,0.35)', color: '#a89fff' }}>
                Create & Enter
              </button>
              <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(160,160,200,0.5)' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all"
            style={{ background: 'rgba(123,111,255,0.05)', border: '1px dashed rgba(123,111,255,0.2)', color: 'rgba(123,111,255,0.6)' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5.5 1v9M1 5.5h9"/></svg>
            Add Profile
          </button>
        )}
      </div>
    </div>
  )
}

// ── Gate ─────────────────────────────────────────────────────────────────────
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { hasCompletedProfileSetup, profiles } = useSettingsStore()
  const [entered, setEntered] = useState(false)

  // Already entered this session
  if (entered) return <>{children}</>

  // First ever launch — no profiles set up yet
  if (!hasCompletedProfileSetup || profiles.length === 0) {
    return <CreateProfileScreen onDone={() => setEntered(true)} />
  }

  // Returning user — pick a profile
  return <SelectProfileScreen onDone={() => setEntered(true)} />
}
