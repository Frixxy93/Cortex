import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional label shown in the error screen — e.g. "Node Panel" */
  label?: string
}

interface State {
  error:   Error | null
  info:    ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info })
    console.error('[CORTEX] Uncaught error:', error, info)
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children

    const { error, info } = this.state
    const label = this.props.label ?? 'CORTEX'
    const stack = info?.componentStack ?? ''

    return (
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          width:          '100%',
          background:     '#05050c',
          padding:        32,
          gap:            0,
          userSelect:     'text',
        }}
      >
        {/* Glow */}
        <div style={{
          position:   'absolute',
          inset:       0,
          background: 'radial-gradient(ellipse 50% 35% at 50% 50%, rgba(239,68,68,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div style={{
          width:        56, height: 56, borderRadius: 16,
          background:   'rgba(239,68,68,0.08)',
          border:       '1px solid rgba(239,68,68,0.2)',
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: '#e2e2f0', marginBottom: 6,
          letterSpacing: '0.01em',
        }}>
          Something went wrong
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 12, color: 'rgba(136,136,184,0.6)',
          marginBottom: 24, textAlign: 'center', maxWidth: 360,
        }}>
          {label} crashed unexpectedly. Your data is safe — click below to recover.
        </div>

        {/* Error message */}
        <div style={{
          background:   'rgba(239,68,68,0.06)',
          border:       '1px solid rgba(239,68,68,0.12)',
          borderRadius: 10, padding: '10px 16px',
          marginBottom: 20, maxWidth: 480, width: '100%',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.8)', fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {error.message || 'Unknown error'}
          </div>
        </div>

        {/* Stack trace (collapsed) */}
        {stack && (
          <details style={{ maxWidth: 480, width: '100%', marginBottom: 24 }}>
            <summary style={{
              fontSize: 10, color: 'rgba(136,136,184,0.4)', cursor: 'pointer',
              letterSpacing: '0.05em', listStyle: 'none', marginBottom: 8,
            }}>
              Stack trace ▾
            </summary>
            <pre style={{
              fontSize: 9, color: 'rgba(136,136,184,0.35)', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              background: 'rgba(255,255,255,0.02)', borderRadius: 8,
              padding: '10px 12px', maxHeight: 160, overflow: 'auto',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              {stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={this.reset}
            style={{
              padding:      '8px 20px', borderRadius: 10, cursor: 'pointer',
              fontSize:     12, fontWeight: 600, color: '#fff',
              background:   'linear-gradient(135deg,#7b6fff,#6058dd)',
              border:       'none',
              boxShadow:    '0 2px 12px rgba(123,111,255,0.35)',
            }}
          >
            Try to recover
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding:    '8px 20px', borderRadius: 10, cursor: 'pointer',
              fontSize:   12, fontWeight: 500,
              color:      'rgba(136,136,184,0.7)',
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.06)',
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
