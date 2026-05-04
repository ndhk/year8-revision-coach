import React, { useState, useEffect } from 'react'

// Renders using real wall-clock time so it stays accurate when the phone
// locks or the tab is backgrounded. setInterval only drives re-renders.
export default function Timer({ startedAt, durationMinutes }) {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const totalMs = durationMinutes * 60 * 1000
  const startMs = new Date(startedAt).getTime()
  const elapsedMs = Math.max(0, Date.now() - startMs)
  const remainingMs = Math.max(0, totalMs - elapsedMs)
  const done = elapsedMs >= totalMs

  const circumference = 2 * Math.PI * 45

  if (done) {
    return (
      <div className="timer timer--done">
        <div className="timer__ring-wrap">
          <svg className="timer__ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="timer__ring-bg" />
            <circle
              cx="50" cy="50" r="45"
              className="timer__ring-fill timer__ring-fill--done"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="timer__display timer__display--done">✓</div>
        </div>
        <p className="timer__done-label">Time complete</p>
      </div>
    )
  }

  const totalSecs = Math.ceil(remainingMs / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  const pct = Math.min((elapsedMs / totalMs) * 100, 100)
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="timer">
      <div className="timer__ring-wrap">
        <svg className="timer__ring" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" className="timer__ring-bg" />
          <circle
            cx="50" cy="50" r="45"
            className="timer__ring-fill"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="timer__display">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>
      <p className="timer__label">remaining</p>
    </div>
  )
}
