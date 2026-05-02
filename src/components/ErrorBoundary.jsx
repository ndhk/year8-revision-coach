import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  handleReset() {
    try {
      // Clear only app-specific keys so a corrupted localStorage can't loop
      const KEYS = ['yr8_profile', 'yr8_subjects', 'yr8_sessions', 'yr8_rewards', 'yr8_settings']
      KEYS.forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Something went wrong</h1>
            <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '24px' }}>
              The app encountered an unexpected error. Your progress is saved.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                padding: '10px 20px',
                background: '#5b4cdb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              Try again
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Reset app data
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
