import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveSession } from '../context/ActiveSessionContext.jsx'
import { useApp } from '../context/AppContext.jsx'

function useTickEverySecond() {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
}

function formatRemaining(ms) {
  const secs = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ActiveSessionBanner() {
  const { activeSession, cancelActiveSession } = useActiveSession()
  const { subjects } = useApp()
  const navigate = useNavigate()
  useTickEverySecond()

  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!activeSession || activeSession.status !== 'active') return null

  const subject = subjects.find((s) => s.id === activeSession.subjectId)
  const topic = subject?.topics.find((t) => t.id === activeSession.topicId)

  const elapsedMs = Date.now() - new Date(activeSession.startedAt).getTime()
  const totalMs = activeSession.durationMinutes * 60 * 1000
  const remainingMs = totalMs - elapsedMs
  const done = remainingMs <= 0

  const resumePath = activeSession.activityType === 'activity' ? '/activity' : '/session'

  function handleResume() {
    setConfirmCancel(false)
    navigate(resumePath, { state: { resuming: true } })
  }

  function handleFinish() {
    setConfirmCancel(false)
    navigate(resumePath, { state: { resuming: true, finishRequested: true } })
  }

  function handleCancelConfirm() {
    cancelActiveSession()
    setConfirmCancel(false)
  }

  if (confirmCancel) {
    return (
      <div className="active-session-banner active-session-banner--confirm">
        <span className="asb-confirm__text">Cancel this session?</span>
        <div className="asb-confirm__btns">
          <button className="asb-btn asb-btn--danger" onClick={handleCancelConfirm}>
            Yes, cancel
          </button>
          <button className="asb-btn asb-btn--ghost" onClick={() => setConfirmCancel(false)}>
            Keep going
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`active-session-banner${done ? ' active-session-banner--done' : ''}`}
      style={{ '--asb-color': subject?.color || '#5b4cdb' }}
    >
      <div className="asb-info">
        <span className="asb-emoji" aria-hidden="true">{subject?.emoji}</span>
        <div className="asb-text">
          <span className="asb-subject">{subject?.name}</span>
          {topic && <span className="asb-topic">{topic.title}</span>}
        </div>
        <div className="asb-timer">
          {done ? (
            <span className="asb-timer--done">Time&nbsp;done</span>
          ) : (
            <span className="asb-timer--remaining">{formatRemaining(remainingMs)}</span>
          )}
        </div>
      </div>
      <div className="asb-actions">
        <button className="asb-btn asb-btn--primary" onClick={handleResume}>
          Resume
        </button>
        <button className="asb-btn asb-btn--success" onClick={handleFinish}>
          Finish
        </button>
        <button
          className="asb-btn asb-btn--cancel"
          onClick={() => setConfirmCancel(true)}
          aria-label="Cancel session"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
