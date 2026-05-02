import React from 'react'

const LABELS = ['', 'No idea', 'Unsure', 'Getting it', 'Almost there', 'Confident']
const COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

export default function ConfidenceRater({ value, onChange, size = 'md' }) {
  return (
    <div className={`confidence-rater confidence-rater--${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`confidence-rater__btn${value === n ? ' confidence-rater__btn--active' : ''}`}
          style={value === n ? { background: COLORS[n], borderColor: COLORS[n], color: '#fff' } : {}}
          onClick={() => onChange(n)}
          aria-label={`Confidence ${n} — ${LABELS[n]}`}
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="confidence-rater__label" style={{ color: COLORS[value] }}>
          {LABELS[value]}
        </span>
      )}
    </div>
  )
}
