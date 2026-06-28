interface Props { onClose: () => void }

const SECTIONS = [
  {
    label: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'K'],           desc: 'Open command palette' },
      { keys: ['Ctrl', 'S'],           desc: 'Save current graph' },
      { keys: ['Escape'],              desc: 'Close panel / go home' },
      { keys: ['Tab'],                 desc: 'Toggle node picker' },
    ],
  },
  {
    label: 'Graph',
    shortcuts: [
      { keys: ['Ctrl', 'Z'],           desc: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'],  desc: 'Redo' },
      { keys: ['Ctrl', 'D'],           desc: 'Duplicate selected node' },
      { keys: ['Scroll'],              desc: 'Zoom in / out' },
      { keys: ['Middle drag'],         desc: 'Pan canvas' },
      { keys: ['Click node'],          desc: 'Select & inspect node' },
    ],
  },
  {
    label: 'Node Library',
    shortcuts: [
      { keys: ['/'],                   desc: 'Focus search' },
      { keys: ['↑', '↓'],             desc: 'Navigate results' },
      { keys: ['Enter'],               desc: 'Open node detail' },
    ],
  },
  {
    label: 'Admin',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'Alt', 'A'], desc: 'Toggle admin mode' },
    ],
  },
]

export function ShortcutsPanel({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden animate-modal-in"
        style={{
          width: 480,
          maxHeight: '80vh',
          background: 'rgba(10,10,22,0.99)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <div className="text-sm font-semibold text-cx-text">Keyboard Shortcuts</div>
            <div className="text-[11px] text-cx-text-muted mt-0.5">Quick reference for all hotkeys</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-cx-text-muted hover:text-cx-text transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {SECTIONS.map(section => (
            <div key={section.label}>
              {/* Section label */}
              <div
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5"
                style={{ color: 'rgba(123,111,255,0.7)' }}
              >
                {section.label}
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {section.shortcuts.map(({ keys, desc }) => (
                  <div
                    key={desc}
                    className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-[12px] text-cx-text-dim">{desc}</span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                      {keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                              background:  'rgba(255,255,255,0.07)',
                              border:      '1px solid rgba(255,255,255,0.1)',
                              color:       'rgba(226,226,240,0.8)',
                              fontFamily:  'system-ui, sans-serif',
                              boxShadow:   '0 1px 0 rgba(0,0,0,0.4)',
                              minWidth:    24,
                              textAlign:   'center',
                              display:     'inline-block',
                            }}
                          >
                            {key}
                          </kbd>
                          {i < keys.length - 1 && (
                            <span className="text-[9px] text-cx-text-muted">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex-shrink-0 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[10px] text-cx-text-muted">Press <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>?</kbd> to open this panel</span>
          <button
            onClick={onClose}
            className="text-[11px] text-cx-text-muted hover:text-cx-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
