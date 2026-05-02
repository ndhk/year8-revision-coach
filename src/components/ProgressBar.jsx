import React from 'react'

export default function ProgressBar({ pct, color, height = 8, showLabel = false }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className="progress-bar__fill"
        style={{ width: `${clamped}%`, background: color || 'var(--color-primary)' }}
      />
      {showLabel && <span className="progress-bar__label">{clamped}%</span>}
    </div>
  )
}
