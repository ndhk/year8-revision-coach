import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Setup() {
  const { setupProfile } = useApp()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter your name.'); return }
    setupProfile(trimmed)
  }

  return (
    <div className="setup-screen">
      <div className="setup-screen__inner">
        <div className="setup-screen__logo">✏️</div>
        <h1 className="setup-screen__heading">Year 8 Revision Coach</h1>
        <p className="setup-screen__sub">
          Your personal guide to the summer assessments.
          <br />
          <strong>26 May – 2 June 2026</strong>
        </p>

        <form className="setup-screen__form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="student-name">
            What&apos;s your first name?
          </label>
          <input
            id="student-name"
            className="form-input"
            type="text"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            autoFocus
            autoComplete="given-name"
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary btn--full">
            Let&apos;s get started →
          </button>
        </form>

        <ul className="setup-screen__features">
          <li>📋 Checklist for every subject</li>
          <li>⏱ 15-minute revision sessions</li>
          <li>📊 Track your progress</li>
          <li>⭐ Earn points and badges</li>
        </ul>
      </div>
    </div>
  )
}
