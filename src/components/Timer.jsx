import React, { useState, useEffect, useRef } from 'react'

export default function Timer({ minutes = 15, onComplete }) {
  const totalSeconds = minutes * 60
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            onComplete?.()
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, onComplete])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const pct = ((totalSeconds - secondsLeft) / totalSeconds) * 100

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (pct / 100) * circumference

  function reset() {
    setRunning(false)
    setSecondsLeft(totalSeconds)
  }

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
      <div className="timer__controls">
        <button
          className={`btn ${running ? 'btn--secondary' : 'btn--primary'}`}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : secondsLeft < totalSeconds ? 'Resume' : 'Start'}
        </button>
        {secondsLeft < totalSeconds && (
          <button className="btn btn--ghost" onClick={reset}>Reset</button>
        )}
      </div>
    </div>
  )
}
