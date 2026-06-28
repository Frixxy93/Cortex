import { useState, useEffect } from 'react'

interface Props {
  onDone: () => void
}

const STEPS = [
  {
    title: 'Your vault is ready',
    body: 'A vault holds your node library, graphs, and pipeline knowledge. Switch vaults any time from the sidebar.',
    icon: '🗂️',
    cta: 'Next',
  },
  {
    title: 'Build node graphs',
    body: 'Open the Graph view to start connecting nodes. Drag from the library, tab to quick-add, and Ctrl+S to save.',
    icon: '🔗',
    cta: 'Next',
  },
  {
    title: 'Import from your DCC',
    body: 'Use the Bridge (plug icon in the sidebar) to pull nodes directly from Houdini, Nuke, or Katana into CORTEX.',
    icon: '🌀',
    cta: "Let's go",
  },
]

export function OnboardingFlow({ onDone }: Props) {
  const [step, setStep]       = useState(0)
  const [exiting, setExiting] = useState(false)

  // skip if user already onboarded
  useEffect(() => {
    if (localStorage.getItem('cortex:onboarded')) onDone()
  }, [])

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  const finish = () => {
    setExiting(true)
    localStorage.setItem('cortex:onboarded', '1')
    setTimeout(onDone, 350)
  }

  const current = STEPS[step]

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center pb-10"
      style={{ pointerEvents: 'none' }}
    >
      {/* Card */}
      <div
        className="relative flex flex-col"
        style={{
          width: 400,
          background: 'rgba(10,10,22,0.97)',
          border: '1px solid rgba(123,111,255,0.25)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(123,111,255,0.08)',
          pointerEvents: 'all',
          animation: exiting
            ? 'onboard-out 0.32s cubic-bezier(0.4,0,1,1) forwards'
            : 'onboard-in 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Purple top bar */}
        <div style={{
          height: 3,
          borderRadius: '20px 20px 0 0',
          background: 'linear-gradient(90deg, #7b6fff, #a89fff)',
        }} />

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 999,
                background: i <= step
                  ? 'linear-gradient(90deg, #7b6fff, #9b8fff)'
                  : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'rgba(123,111,255,0.12)',
                border: '1px solid rgba(123,111,255,0.2)',
              }}
            >
              {current.icon}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-cx-text mb-1">{current.title}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: 'rgba(234,234,248,0.55)' }}>
                {current.body}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={finish}
              className="text-[11px] transition-colors"
              style={{ color: 'rgba(234,234,248,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(234,234,248,0.3)')}
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: 'rgba(234,234,248,0.25)' }}>
                {step + 1} / {STEPS.length}
              </span>
              <button
                onClick={advance}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #7b6fff, #5a53cc)',
                  boxShadow: '0 2px 16px rgba(123,111,255,0.35)',
                }}
              >
                {current.cta}
                {step < STEPS.length - 1 && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5h6M5.5 2l3 3-3 3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboard-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes onboard-out {
          from { opacity: 1; transform: translateY(0)    scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.97); }
        }
      `}</style>
    </div>
  )
}
