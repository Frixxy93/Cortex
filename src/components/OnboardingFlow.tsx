import { useState, useRef, useEffect } from 'react'
import { useVaultStore } from '@/stores/vault.store'
import { isWindows } from '@/utils/platform'

interface Props { onDone: () => void }

const VAULT_COLORS = [
  '#7b6fff', '#60a5fa', '#a78bfa', '#34d399',
  '#f59e0b', '#f472b6', '#fb923c', '#22d3ee',
]

const SOFTWARES = [
  { id: 'houdini',  label: 'Houdini',  color: '#ff6b35' },
  { id: 'nuke',     label: 'Nuke',     color: '#60a5fa' },
  { id: 'katana',   label: 'Katana',   color: '#34d399' },
  { id: 'blender',  label: 'Blender',  color: '#f59e0b' },
  { id: 'maya',     label: 'Maya',     color: '#a78bfa' },
  { id: 'other',    label: 'Other',    color: '#94a3b8' },
]

type StepId = 'welcome' | 'vault' | 'graph' | 'library' | 'ai' | 'ready'

interface Step {
  id: StepId
  label: string
  color: string
}

const STEPS: Step[] = [
  { id: 'welcome', label: 'Welcome',   color: '#7b6fff' },
  { id: 'vault',   label: 'Your Vault', color: '#60a5fa' },
  { id: 'graph',   label: 'Graphs',    color: '#a78bfa' },
  { id: 'library', label: 'Library',   color: '#34d399' },
  { id: 'ai',      label: 'AI Copilot', color: '#22d3ee' },
  { id: 'ready',   label: 'Ready',     color: '#7b6fff' },
]

export function OnboardingFlow({ onDone }: Props) {
  const [stepIdx,   setStepIdx]   = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animKey,   setAnimKey]   = useState(0)
  const [exiting,   setExiting]   = useState(false)

  // vault creation state
  const [vaultName,     setVaultName]     = useState('')
  const [vaultColor,    setVaultColor]    = useState(VAULT_COLORS[0])
  const [vaultDesc,     setVaultDesc]     = useState('')
  const [vaultSoftware, setVaultSoftware] = useState('')
  const [creating,      setCreating]      = useState(false)
  const [vaultError,    setVaultError]    = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const { createVault } = useVaultStore()
  const step = STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === STEPS.length - 1

  useEffect(() => {
    if (localStorage.getItem('cortex:onboarded')) onDone()
  }, [])

  useEffect(() => {
    if (step.id === 'vault') setTimeout(() => nameRef.current?.focus(), 120)
  }, [step.id])

  const go = (dir: 'forward' | 'back') => {
    setDirection(dir)
    setAnimKey(k => k + 1)
    setStepIdx(i => dir === 'forward' ? i + 1 : i - 1)
  }

  const handleNext = async () => {
    if (step.id === 'vault') {
      if (!vaultName.trim()) { setVaultError('Give your vault a name'); return }
      setVaultError('')
      setCreating(true)
      try {
        await createVault({
          name: vaultName.trim(),
          description: vaultDesc.trim() || undefined,
          path: isWindows ? `%USERPROFILE%\\Cortex\\${vaultName.trim().replace(/\s+/g, '-').toLowerCase()}` : `~/Cortex/${vaultName.trim().replace(/\s+/g, '-').toLowerCase()}`,
          color: vaultColor,
        })
      } catch (e) {
        setVaultError(String(e))
        setCreating(false)
        return
      }
      setCreating(false)
    }
    if (isLast) { finish(); return }
    go('forward')
  }

  const finish = () => {
    setExiting(true)
    localStorage.setItem('cortex:onboarded', '1')
    setTimeout(onDone, 400)
  }

  const slideIn  = direction === 'forward' ? 'onb-slide-in-r'  : 'onb-slide-in-l'
  const slideOut = direction === 'forward' ? 'onb-slide-out-l' : 'onb-slide-out-r'

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center" style={{ background: 'rgba(2,2,10,0.92)', backdropFilter: 'blur(16px)', animation: exiting ? 'onb-fade-out 0.4s ease forwards' : 'onb-fade-in 0.35s ease forwards' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: `radial-gradient(ellipse, ${step.color}14 0%, transparent 70%)`, transition: 'background 0.6s ease' }} />
      </div>

      {/* Modal */}
      <div className="relative flex overflow-hidden" style={{ width: 820, minHeight: 520, background: 'linear-gradient(160deg, rgba(10,10,26,0.99) 0%, rgba(7,7,20,0.99) 100%)', border: '1px solid rgba(36,36,80,0.7)', borderRadius: 28, boxShadow: '0 48px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)', animation: 'onb-modal-in 0.42s cubic-bezier(0.16,1,0.3,1) forwards' }}>

        {/* ── Left panel (nav) ───────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col py-8 px-5" style={{ width: 200, background: 'rgba(5,5,14,0.7)', borderRight: '1px solid rgba(18,18,46,0.8)' }}>

          {/* Logo */}
          <div className="mb-8 px-1">
            <div className="text-[15px] font-bold tracking-[0.08em]" style={{ color: 'rgba(234,234,248,0.9)' }}>CORTEX</div>
            <div className="text-[10px] mt-0.5 tracking-wider" style={{ color: 'rgba(100,100,160,0.7)' }}>KNOWLEDGE OS</div>
          </div>

          {/* Step list */}
          <div className="space-y-1 flex-1">
            {STEPS.map((s, i) => {
              const done   = i < stepIdx
              const active = i === stepIdx
              const future = i > stepIdx
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: active ? `${s.color}12` : 'transparent', border: active ? `1px solid ${s.color}25` : '1px solid transparent', transition: 'all 0.3s ease' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold transition-all" style={{ background: done ? s.color : active ? `${s.color}22` : 'rgba(24,24,58,0.7)', border: done ? 'none' : `1.5px solid ${active ? s.color : 'rgba(40,40,80,0.8)'}`, color: done ? 'white' : active ? s.color : 'rgba(80,80,120,0.7)' }}>
                    {done ? <CheckIcon /> : i + 1}
                  </div>
                  <span className="text-[11px] font-medium transition-colors" style={{ color: active ? 'rgba(220,220,248,0.95)' : done ? 'rgba(160,160,210,0.7)' : 'rgba(80,80,120,0.6)' }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-6 px-1">
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%`, background: `linear-gradient(90deg, ${step.color}, ${step.color}99)` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px]" style={{ color: 'rgba(80,80,130,0.6)' }}>Step {stepIdx + 1} of {STEPS.length}</span>
              <span className="text-[9px]" style={{ color: step.color, opacity: 0.7 }}>{Math.round(((stepIdx + 1) / STEPS.length) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* ── Right panel (content) ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

          {/* Colored top strip */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${step.color}, ${step.color}66)`, transition: 'background 0.5s ease' }} />

          {/* Animated content */}
          <div key={animKey} className={slideIn} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* ── Welcome ───────────────────────────────── */}
            {step.id === 'welcome' && (
              <div className="flex flex-col items-center justify-center flex-1 px-10 py-12 text-center">
                <WelcomeIllustration color={step.color} />
                <h1 className="text-[26px] font-bold mt-8 mb-3 leading-tight" style={{ color: 'rgba(234,234,248,0.97)', letterSpacing: '-0.02em' }}>
                  Welcome to CORTEX
                </h1>
                <p className="text-[13.5px] leading-relaxed max-w-[340px]" style={{ color: 'rgba(180,180,220,0.65)' }}>
                  Your creative knowledge OS for VFX, animation, and technical art pipelines. Store, connect, and explore everything you know.
                </p>
                <div className="flex items-center gap-6 mt-8">
                  {['Node Graphs', 'Knowledge Vaults', 'AI Copilot'].map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: step.color }} />
                      <span className="text-[11px]" style={{ color: 'rgba(160,160,210,0.7)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Vault ─────────────────────────────────── */}
            {step.id === 'vault' && (
              <div className="flex flex-col flex-1 px-10 py-9">
                <VaultIllustration color={step.color} vaultName={vaultName || 'My Vault'} vaultColor={vaultColor} />
                <h2 className="text-[20px] font-bold mb-1.5 mt-6" style={{ color: 'rgba(234,234,248,0.95)', letterSpacing: '-0.02em' }}>Create your first vault</h2>
                <p className="text-[12px] mb-6" style={{ color: 'rgba(140,140,190,0.7)' }}>A vault holds your entire node library, graphs, and pipeline knowledge.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(80,80,130,0.8)' }}>Vault Name</label>
                    <input ref={nameRef} value={vaultName} onChange={e => { setVaultName(e.target.value); setVaultError('') }} onKeyDown={e => e.key === 'Enter' && handleNext()} placeholder="e.g. Houdini FX, Studio Pipeline…" className="cx-field w-full bg-cx-elevated border border-cx-border rounded-xl px-4 py-2.5 text-[13px] text-cx-text placeholder:text-cx-text-muted/40 focus:outline-none transition-colors" />
                    {vaultError && <p className="text-[10px] mt-1.5" style={{ color: '#f87171' }}>{vaultError}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(80,80,130,0.8)' }}>Color</label>
                    <div className="flex gap-2">
                      {VAULT_COLORS.map(c => (
                        <button key={c} onClick={() => setVaultColor(c)} className="w-7 h-7 rounded-full flex-shrink-0 transition-all hover:scale-110" style={{ background: c, boxShadow: vaultColor === c ? `0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3.5px ${c}` : 'none', transform: vaultColor === c ? 'scale(1.2)' : undefined }} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(80,80,130,0.8)' }}>Primary Software</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SOFTWARES.map(sw => (
                        <button key={sw.id} onClick={() => setVaultSoftware(sw.id === vaultSoftware ? '' : sw.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: vaultSoftware === sw.id ? `${sw.color}20` : 'rgba(14,14,34,0.7)', border: `1px solid ${vaultSoftware === sw.id ? sw.color + '50' : 'rgba(30,30,68,0.8)'}`, color: vaultSoftware === sw.id ? sw.color : 'rgba(120,120,170,0.8)' }}>
                          {sw.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Graph ─────────────────────────────────── */}
            {step.id === 'graph' && (
              <div className="flex flex-col items-center justify-center flex-1 px-10 py-10 text-center">
                <GraphIllustration color={step.color} />
                <h2 className="text-[22px] font-bold mt-7 mb-2" style={{ color: 'rgba(234,234,248,0.95)', letterSpacing: '-0.02em' }}>Visual node graphs</h2>
                <p className="text-[13px] leading-relaxed max-w-[330px]" style={{ color: 'rgba(160,160,210,0.65)' }}>
                  Connect nodes to map pipelines, document workflows, and capture your technical knowledge visually.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-7 w-full max-w-[340px]">
                  {[['Drag to connect', 'Link any two nodes'], ['⌘K to quick-add', 'Open node picker instantly'], ['Left-drag to select', 'Box-select multiple nodes'], ['⌘S to save', 'Auto-saves changes']].map(([title, desc]) => (
                    <div key={title} className="px-3 py-2.5 rounded-xl text-left" style={{ background: 'rgba(14,14,34,0.6)', border: '1px solid rgba(24,24,58,0.7)' }}>
                      <div className="text-[11px] font-semibold mb-0.5" style={{ color: 'rgba(200,200,240,0.9)' }}>{title}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(100,100,150,0.7)' }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Library ───────────────────────────────── */}
            {step.id === 'library' && (
              <div className="flex flex-col items-center justify-center flex-1 px-10 py-10 text-center">
                <LibraryIllustration color={step.color} />
                <h2 className="text-[22px] font-bold mt-7 mb-2" style={{ color: 'rgba(234,234,248,0.95)', letterSpacing: '-0.02em' }}>3,273+ nodes ready</h2>
                <p className="text-[13px] leading-relaxed max-w-[330px]" style={{ color: 'rgba(160,160,210,0.65)' }}>
                  A curated library of Houdini, Nuke, Katana, and general VFX nodes. Search, filter, and drag directly onto your graph.
                </p>
                <div className="flex items-center gap-4 mt-7">
                  {[['Search', '#34d399'], ['Filter', '#60a5fa'], ['Drag & drop', '#a78bfa']].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI ────────────────────────────────────── */}
            {step.id === 'ai' && (
              <div className="flex flex-col items-center justify-center flex-1 px-10 py-10 text-center">
                <AiIllustration color={step.color} />
                <h2 className="text-[22px] font-bold mt-7 mb-2" style={{ color: 'rgba(234,234,248,0.95)', letterSpacing: '-0.02em' }}>AI Copilot</h2>
                <p className="text-[13px] leading-relaxed max-w-[330px]" style={{ color: 'rgba(160,160,210,0.65)' }}>
                  Ask questions about your nodes, get suggestions for connections, and generate graph layouts — all inside CORTEX.
                </p>
                <div className="mt-7 w-full max-w-[360px] text-left space-y-2">
                  {['"What does the Voronoi Fracture node do?"', '"Connect these nodes into a destruction rig"', '"Find all simulation nodes in my vault"'].map(q => (
                    <div key={q} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: step.color }} />
                      <span className="text-[11.5px] italic" style={{ color: 'rgba(180,220,230,0.75)' }}>{q}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-5" style={{ color: 'rgba(80,80,130,0.6)' }}>Set up your AI provider in Settings → AI Copilot</p>
              </div>
            )}

            {/* ── Ready ─────────────────────────────────── */}
            {step.id === 'ready' && (
              <div className="flex flex-col items-center justify-center flex-1 px-10 py-12 text-center">
                <ReadyIllustration color={step.color} />
                <h2 className="text-[26px] font-bold mt-8 mb-3 leading-tight" style={{ color: 'rgba(234,234,248,0.97)', letterSpacing: '-0.02em' }}>
                  You&rsquo;re all set
                </h2>
                <p className="text-[13px] leading-relaxed max-w-[310px]" style={{ color: 'rgba(160,160,210,0.65)' }}>
                  Your vault is ready. Start by opening the Graph view or searching the node library.
                </p>
                <div className="flex gap-3 mt-8">
                  <button onClick={finish} className="px-7 py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}99)`, boxShadow: `0 4px 24px ${step.color}40` }}>
                    Open CORTEX
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ── Footer nav ──────────────────────────────── */}
          {step.id !== 'ready' && (
            <div className="flex items-center justify-between px-10 py-5" style={{ borderTop: '1px solid rgba(18,18,46,0.6)' }}>
              <button onClick={finish} className="text-[11px] transition-colors" style={{ color: 'rgba(234,234,248,0.25)' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(234,234,248,0.55)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(234,234,248,0.25)' }}>
                Skip setup
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button onClick={() => go('back')} className="px-4 py-2 rounded-xl text-[12px] font-medium transition-all" style={{ background: 'rgba(14,14,34,0.7)', border: '1px solid rgba(30,30,68,0.8)', color: 'rgba(140,140,190,0.8)' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(200,200,240,0.9)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(140,140,190,0.8)' }}>
                    Back
                  </button>
                )}
                <button onClick={handleNext} disabled={creating} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}99)`, boxShadow: `0 2px 16px ${step.color}40` }}>
                  {creating ? 'Creating…' : step.id === 'vault' ? 'Create Vault' : 'Continue'}
                  {!creating && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5h6M5.5 2l3 3-3 3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes onb-fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes onb-fade-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes onb-modal-in { from { opacity: 0; transform: scale(0.96) translateY(16px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes onb-in-r  { from { opacity: 0; transform: translateX(32px)  } to { opacity: 1; transform: translateX(0) } }
        @keyframes onb-in-l  { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes onb-out-l { from { opacity: 1; transform: translateX(0)      } to { opacity: 0; transform: translateX(-24px) } }
        @keyframes onb-out-r { from { opacity: 1; transform: translateX(0)      } to { opacity: 0; transform: translateX(24px)  } }
        .onb-slide-in-r  { animation: onb-in-r  0.32s cubic-bezier(0.16,1,0.3,1) forwards }
        .onb-slide-in-l  { animation: onb-in-l  0.32s cubic-bezier(0.16,1,0.3,1) forwards }
        .onb-slide-out-l { animation: onb-out-l 0.22s ease forwards }
        .onb-slide-out-r { animation: onb-out-r 0.22s ease forwards }
      `}</style>
    </div>
  )
}

/* ── Illustrations ───────────────────────────────────────── */
function WelcomeIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
      <circle cx="80" cy="60" r="45" stroke={color} strokeWidth="1" strokeDasharray="4 6" opacity="0.2"/>
      <circle cx="80" cy="60" r="28" stroke={color} strokeWidth="1.5" opacity="0.35"/>
      <circle cx="80" cy="60" r="13" fill={color} opacity="0.18"/>
      <circle cx="80" cy="60" r="6"  fill={color} opacity="0.9"/>
      <circle cx="38" cy="38" r="5"  fill={color} opacity="0.6"/>
      <circle cx="122" cy="38" r="5" fill={color} opacity="0.6"/>
      <circle cx="38" cy="82" r="5"  fill={color} opacity="0.6"/>
      <circle cx="122" cy="82" r="5" fill={color} opacity="0.6"/>
      <circle cx="80" cy="18" r="4"  fill={color} opacity="0.5"/>
      <circle cx="80" cy="102" r="4" fill={color} opacity="0.5"/>
      <line x1="80" y1="60" x2="38"  y2="38"  stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="80" y1="60" x2="122" y2="38"  stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="80" y1="60" x2="38"  y2="82"  stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="80" y1="60" x2="122" y2="82"  stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="80" y1="60" x2="80"  y2="18"  stroke={color} strokeWidth="1" opacity="0.3"/>
      <line x1="80" y1="60" x2="80"  y2="102" stroke={color} strokeWidth="1" opacity="0.3"/>
    </svg>
  )
}

function VaultIllustration({ color, vaultName, vaultColor }: { color: string; vaultName: string; vaultColor: string }) {
  return (
    <div className="flex items-center justify-center pt-2">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(14,14,34,0.8)', border: `1px solid ${vaultColor}40`, boxShadow: `0 0 32px ${vaultColor}18` }}>
        <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: `${vaultColor}22`, border: `1.5px solid ${vaultColor}50` }}>
          <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
            <circle cx="20" cy="20" r="6" fill={vaultColor} opacity="0.7"/>
            <circle cx="20" cy="20" r="10" stroke={vaultColor} strokeWidth="1.5" opacity="0.4"/>
            <circle cx="20" cy="20" r="14" stroke={vaultColor} strokeWidth="1" opacity="0.2"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'rgba(220,220,248,0.95)' }}>{vaultName}</div>
          <div className="text-[10px]" style={{ color: 'rgba(100,100,160,0.7)' }}>New vault · 0 nodes</div>
        </div>
        <div className="w-3 h-3 rounded-full ml-2 flex-shrink-0" style={{ background: vaultColor, boxShadow: `0 0 8px ${vaultColor}` }} />
      </div>
    </div>
  )
}

function GraphIllustration({ color }: { color: string }) {
  return (
    <svg width="260" height="130" viewBox="0 0 260 130" fill="none">
      <rect x="10"  y="45" width="64" height="38" rx="8" fill="rgba(14,14,34,0.9)" stroke={color} strokeWidth="1.5" strokeOpacity="0.6"/>
      <rect x="98"  y="10" width="64" height="38" rx="8" fill="rgba(14,14,34,0.9)" stroke={color} strokeWidth="1.5" strokeOpacity="0.6"/>
      <rect x="98"  y="80" width="64" height="38" rx="8" fill="rgba(14,14,34,0.9)" stroke={color} strokeWidth="1.5" strokeOpacity="0.6"/>
      <rect x="186" y="45" width="64" height="38" rx="8" fill="rgba(14,14,34,0.9)" stroke={color} strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="74"  y1="64" x2="98"  y2="29"  stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="74"  y1="64" x2="98"  y2="99"  stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="162" y1="29" x2="186" y2="64"  stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="162" y1="99" x2="186" y2="64"  stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <text x="42"  y="68" fill="rgba(180,180,220,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">VEX</text>
      <text x="130" y="33" fill="rgba(180,180,220,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">Solver</text>
      <text x="130" y="103" fill="rgba(180,180,220,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">Cache</text>
      <text x="218" y="68" fill="rgba(180,180,220,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">Output</text>
    </svg>
  )
}

function LibraryIllustration({ color }: { color: string }) {
  const rows = [['SOP', 'Scatter', 'Geometry'], ['VEX', 'AttributeCreate', 'Attribute'], ['DOP', 'RigidBodySolver', 'Simulation'], ['COP', 'ColorCorrect', 'Compositing']]
  return (
    <div className="w-full max-w-[320px] rounded-xl overflow-hidden" style={{ border: '1px solid rgba(24,24,58,0.8)', background: 'rgba(8,8,20,0.6)' }}>
      {rows.map(([type, name, cat], i) => (
        <div key={name} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(14,14,40,0.6)' : 'none', background: i % 2 === 0 ? 'rgba(12,12,28,0.4)' : 'transparent' }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[8px] font-bold" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>{type}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium truncate" style={{ color: 'rgba(200,200,240,0.9)' }}>{name}</div>
            <div className="text-[9px]" style={{ color: 'rgba(80,80,130,0.7)' }}>{cat}</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  )
}

function AiIllustration({ color }: { color: string }) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="32" stroke={color} strokeWidth="1.5" opacity="0.3"/>
      <circle cx="50" cy="50" r="20" fill={color} opacity="0.12"/>
      <circle cx="50" cy="50" r="10" fill={color} opacity="0.7"/>
      <circle cx="50" cy="50" r="4"  fill="white" opacity="0.9"/>
      <circle cx="22" cy="28" r="4" fill={color} opacity="0.5"/>
      <circle cx="78" cy="28" r="4" fill={color} opacity="0.5"/>
      <circle cx="22" cy="72" r="4" fill={color} opacity="0.5"/>
      <circle cx="78" cy="72" r="4" fill={color} opacity="0.5"/>
      <circle cx="50" cy="12" r="3" fill={color} opacity="0.4"/>
      <circle cx="50" cy="88" r="3" fill={color} opacity="0.4"/>
      <line x1="50" y1="50" x2="22" y2="28" stroke={color} strokeWidth="1" opacity="0.35"/>
      <line x1="50" y1="50" x2="78" y2="28" stroke={color} strokeWidth="1" opacity="0.35"/>
      <line x1="50" y1="50" x2="22" y2="72" stroke={color} strokeWidth="1" opacity="0.35"/>
      <line x1="50" y1="50" x2="78" y2="72" stroke={color} strokeWidth="1" opacity="0.35"/>
      <line x1="50" y1="30" x2="50" y2="12" stroke={color} strokeWidth="1" opacity="0.25"/>
      <line x1="50" y1="70" x2="50" y2="88" stroke={color} strokeWidth="1" opacity="0.25"/>
    </svg>
  )
}

function ReadyIllustration({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="45" r="36" fill={color} opacity="0.1"/>
      <circle cx="45" cy="45" r="28" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <circle cx="45" cy="45" r="18" fill={color} opacity="0.2"/>
      <path d="M32 45l9 9 17-17" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4l2 2 3-3"/>
    </svg>
  )
}
