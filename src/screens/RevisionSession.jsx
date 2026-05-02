import React, { useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import Timer from '../components/Timer.jsx'
import ConfidenceRater from '../components/ConfidenceRater.jsx'
import { now } from '../utils/dates.js'

const METHODS = [
  { id: 'read_notes', label: 'Read notes', desc: 'Go through your class notes or the revision guide.' },
  { id: 'blurting', label: 'Blurting', desc: 'Write down everything you can remember without looking.' },
  { id: 'flashcards', label: 'Flashcards', desc: 'Use cards or cover-and-test to quiz yourself.' },
  { id: 'explain_aloud', label: 'Explain aloud', desc: 'Say it out loud as if teaching someone else.' },
  { id: 'mindmap', label: 'Mind map', desc: 'Draw a mind map connecting key ideas.' },
  { id: 'practice_question', label: 'Practice question', desc: 'Answer a past question or exam-style prompt.' },
  { id: 'quiz', label: 'Quiz', desc: 'Self-quiz using questions from your notes.' },
]

export default function RevisionSession() {
  const { subjectId: paramSubjectId } = useParams()
  const { subjects, completeSession } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Pre-populate from navigation state (set by ChecklistItemRow or suggested task)
  const preState = location.state || {}

  const [subjectId, setSubjectId] = useState(paramSubjectId || preState.subjectId || '')
  const [selectedTopicId, setSelectedTopicId] = useState(preState.topicId || '')
  const [selectedItemIds, setSelectedItemIds] = useState(
    preState.itemId ? [preState.itemId] : []
  )
  const [method, setMethod] = useState('read_notes')
  const [notes, setNotes] = useState('')
  const [confidence, setConfidence] = useState(null)
  const [confidenceError, setConfidenceError] = useState(false)
  const [phase, setPhase] = useState('setup') // 'setup' | 'session' | 'review'
  const [timerDone, setTimerDone] = useState(false)
  const startedAtRef = useRef(null)

  const subject = subjects.find((s) => s.id === subjectId)
  const topic = subject?.topics.find((t) => t.id === selectedTopicId)

  function startSession() {
    if (!subjectId) return
    startedAtRef.current = now()
    setPhase('session')
  }

  function finishSession() {
    if (!confidence) {
      setConfidenceError(true)
      return
    }
    const session = {
      id: `session_${Date.now()}`,
      subjectId,
      topicId: selectedTopicId || null,
      checklistItemIds: selectedItemIds,
      startedAt: startedAtRef.current,
      endedAt: now(),
      method,
      confidenceAfter: confidence,
      notes,
    }
    completeSession(session)
    setPhase('review')
  }

  function toggleItem(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  // ── Review phase ──────────────────────────────────────────────
  if (phase === 'review') {
    const statusNote =
      confidence >= 4
        ? 'Items marked as Secure.'
        : confidence <= 2
        ? 'Items flagged as Needs Review — keep working on these.'
        : 'Items updated to Practised.'

    return (
      <div className="screen screen--centered">
        <div className="session-complete">
          <div className="session-complete__icon">🎉</div>
          <h2>Session complete!</h2>
          <p>{statusNote}</p>
          <div className="session-complete__actions">
            {subjectId && (
              <button
                className="btn btn--primary"
                onClick={() => navigate(`/subjects/${subjectId}`)}
              >
                View {subject?.name || 'subject'}
              </button>
            )}
            <button
              className="btn btn--secondary"
              onClick={() => navigate('/dashboard')}
            >
              Back to dashboard
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setPhase('setup')
                setNotes('')
                setConfidence(null)
                setConfidenceError(false)
                setSelectedItemIds([])
                setTimerDone(false)
              }}
            >
              Start another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active session phase ──────────────────────────────────────
  if (phase === 'session') {
    return (
      <div className="screen">
        <div className="card">
          <div
            className="session-banner"
            style={{ '--subject-color': subject?.color || '#5b4cdb' }}
          >
            <span className="session-banner__emoji">{subject?.emoji}</span>
            <div>
              <div className="session-banner__subject">{subject?.name}</div>
              {topic && <div className="session-banner__topic">{topic.title}</div>}
              {selectedItemIds.length > 0 && (
                <div className="session-banner__items">
                  {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
          <div className="session-banner__method">
            Method: {METHODS.find((m) => m.id === method)?.label}
          </div>
        </div>

        <Timer minutes={15} onComplete={() => setTimerDone(true)} />

        {timerDone && (
          <div className="card card--success">
            <p>⏱ 15 minutes done! Fill in your confidence and wrap up below.</p>
          </div>
        )}

        <div className="card">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="What did you cover? Any tricky bits to come back to?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className={`card${confidenceError ? ' card--error' : ''}`}>
          <label className="form-label">
            How confident do you feel now? <span className="required-star">*</span>
          </label>
          <ConfidenceRater
            value={confidence}
            onChange={(c) => { setConfidence(c); setConfidenceError(false) }}
          />
          {confidenceError && (
            <p className="form-error">Please rate your confidence before completing the session.</p>
          )}
        </div>

        {selectedItemIds.length > 0 && topic && (
          <div className="card">
            <label className="form-label">Items worked on</label>
            {topic.checklistItems
              .filter((c) => selectedItemIds.includes(c.id))
              .map((c) => (
                <div key={c.id} className="session-item-tag">✓ {c.title}</div>
              ))}
          </div>
        )}

        <button
          className="btn btn--primary btn--full btn--lg"
          onClick={finishSession}
        >
          Complete session ✓
        </button>
      </div>
    )
  }

  // ── Setup phase ───────────────────────────────────────────────
  return (
    <div className="screen">
      <h2 className="screen__heading">Set up your session</h2>

      <div className="card">
        <label className="form-label" htmlFor="subject-select">Subject</label>
        <select
          id="subject-select"
          className="form-select"
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value)
            setSelectedTopicId('')
            setSelectedItemIds([])
          }}
        >
          <option value="">— choose a subject —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {subject && (
        <div className="card">
          <label className="form-label" htmlFor="topic-select">Topic (optional)</label>
          <select
            id="topic-select"
            className="form-select"
            value={selectedTopicId}
            onChange={(e) => {
              setSelectedTopicId(e.target.value)
              setSelectedItemIds([])
            }}
          >
            <option value="">— all topics —</option>
            {subject.topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      )}

      {topic && (
        <div className="card">
          <label className="form-label">Checklist items to focus on (optional)</label>
          <div className="item-picker">
            {topic.checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`item-picker__item${
                  selectedItemIds.includes(item.id) ? ' item-picker__item--selected' : ''
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <span className="item-picker__check">
                  {selectedItemIds.includes(item.id) ? '✓' : '○'}
                </span>
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <label className="form-label">Revision method</label>
        <div className="method-grid">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`method-btn${method === m.id ? ' method-btn--active' : ''}`}
              onClick={() => setMethod(m.id)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="form-hint">{METHODS.find((m) => m.id === method)?.desc}</p>
      </div>

      <button
        className="btn btn--primary btn--full btn--lg"
        disabled={!subjectId}
        onClick={startSession}
      >
        Start session ▶
      </button>
    </div>
  )
}
