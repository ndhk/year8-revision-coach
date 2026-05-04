import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useActiveSession } from '../context/ActiveSessionContext.jsx'
import Timer from '../components/Timer.jsx'
import ConfidenceRater from '../components/ConfidenceRater.jsx'

const METHODS = [
  { id: 'read_notes', label: 'Read notes', desc: 'Go through your class notes or the revision guide.' },
  { id: 'blurting', label: 'Blurting', desc: 'Write down everything you can remember without looking.' },
  { id: 'flashcards', label: 'Flashcards', desc: 'Use cards or cover-and-test to quiz yourself.' },
  { id: 'explain_aloud', label: 'Explain aloud', desc: 'Say it out loud as if teaching someone else.' },
  { id: 'mindmap', label: 'Mind map', desc: 'Draw a mind map connecting key ideas.' },
  { id: 'practice_question', label: 'Practice question', desc: 'Answer a past question or exam-style prompt.' },
  { id: 'quiz', label: 'Quiz', desc: 'Self-quiz using questions from your notes.' },
]

const DURATIONS = [10, 15, 20, 30]

export default function RevisionSession() {
  const { subjectId: paramSubjectId } = useParams()
  const { subjects } = useApp()
  const {
    activeSession,
    startActiveSession,
    updateActiveSessionDraft,
    completeActiveSession,
    cancelActiveSession,
  } = useActiveSession()
  const navigate = useNavigate()
  const location = useLocation()
  const preState = location.state || {}
  const confidenceRef = useRef(null)

  // ── Setup form state (only used when no active session) ──────────
  const [subjectId, setSubjectId] = useState(paramSubjectId || preState.subjectId || '')
  const [selectedTopicId, setSelectedTopicId] = useState(preState.topicId || '')
  const [selectedItemIds, setSelectedItemIds] = useState(
    preState.itemId ? [preState.itemId] : []
  )
  const [method, setMethod] = useState('read_notes')
  const [durationMinutes, setDurationMinutes] = useState(15)

  // ── Session phase local mirrors of active session draft ──────────
  const [notes, setNotes] = useState(activeSession?.notesDraft || '')
  const [confidence, setConfidence] = useState(activeSession?.confidenceDraft || null)
  const [confidenceError, setConfidenceError] = useState(false)

  // ── Phase ────────────────────────────────────────────────────────
  // 'setup' | 'session' | 'review'
  const [phase, setPhase] = useState(() => (activeSession ? 'session' : 'setup'))

  // If banner cancels the session while we are on the session screen,
  // fall back to setup.
  useEffect(() => {
    if (phase === 'session' && !activeSession) {
      setPhase('setup')
    }
  }, [phase, activeSession])

  // Scroll to confidence rater when Finish is requested from the banner.
  useEffect(() => {
    if (preState.finishRequested && phase === 'session') {
      const t = setTimeout(() => {
        confidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
      return () => clearTimeout(t)
    }
  }, [preState.finishRequested, phase])

  // Sync local draft state when session ID changes (new session started).
  useEffect(() => {
    if (activeSession) {
      setNotes(activeSession.notesDraft || '')
      setConfidence(activeSession.confidenceDraft || null)
      setConfidenceError(false)
    }
  }, [activeSession?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────
  const sessionSubject = activeSession
    ? subjects.find((s) => s.id === activeSession.subjectId)
    : null
  const sessionTopic = sessionSubject?.topics.find((t) => t.id === activeSession?.topicId)

  const setupSubject = subjects.find((s) => s.id === subjectId)
  const setupTopic = setupSubject?.topics.find((t) => t.id === selectedTopicId)

  // ── Handlers ─────────────────────────────────────────────────────
  function handleStartSession() {
    if (!subjectId) return
    startActiveSession({
      subjectId,
      topicId: selectedTopicId || null,
      checklistItemIds: selectedItemIds,
      method,
      durationMinutes,
    })
    setNotes('')
    setConfidence(null)
    setConfidenceError(false)
    setPhase('session')
  }

  function handleNotesChange(e) {
    const val = e.target.value
    setNotes(val)
    updateActiveSessionDraft({ notesDraft: val })
  }

  function handleConfidenceChange(c) {
    setConfidence(c)
    setConfidenceError(false)
    updateActiveSessionDraft({ confidenceDraft: c })
  }

  function handleComplete() {
    if (!confidence) {
      setConfidenceError(true)
      confidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    completeActiveSession({ confidence, notes })
    setPhase('review')
  }

  function toggleItem(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  // ── Review phase ─────────────────────────────────────────────────
  if (phase === 'review') {
    const statusNote =
      confidence >= 4
        ? 'Items marked as Secure.'
        : confidence <= 2
        ? 'Items flagged as Needs Review — keep working on these.'
        : 'Items updated to Practised.'

    const reviewSubject = sessionSubject

    return (
      <div className="screen screen--centered">
        <div className="session-complete">
          <div className="session-complete__icon">🎉</div>
          <h2>Session complete!</h2>
          <p>{statusNote}</p>
          <div className="session-complete__actions">
            {reviewSubject && (
              <button
                className="btn btn--primary"
                onClick={() => navigate(`/subjects/${reviewSubject.id}`)}
              >
                View {reviewSubject.name}
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
              }}
            >
              Start another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active session phase ─────────────────────────────────────────
  if (phase === 'session' && activeSession) {
    const itemsInSession = activeSession.checklistItemIds || []

    return (
      <div className="screen">
        <div className="card">
          <div
            className="session-banner"
            style={{ '--subject-color': sessionSubject?.color || '#5b4cdb' }}
          >
            <span className="session-banner__emoji">{sessionSubject?.emoji}</span>
            <div>
              <div className="session-banner__subject">{sessionSubject?.name}</div>
              {sessionTopic && (
                <div className="session-banner__topic">{sessionTopic.title}</div>
              )}
              {itemsInSession.length > 0 && (
                <div className="session-banner__items">
                  {itemsInSession.length} item{itemsInSession.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
          <div className="session-banner__method">
            Method: {METHODS.find((m) => m.id === activeSession.method)?.label}
          </div>
        </div>

        <Timer
          startedAt={activeSession.startedAt}
          durationMinutes={activeSession.durationMinutes}
        />

        <div className="card">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="What did you cover? Any tricky bits to come back to?"
            value={notes}
            onChange={handleNotesChange}
          />
        </div>

        <div
          ref={confidenceRef}
          className={`card${confidenceError ? ' card--error' : ''}`}
        >
          <label className="form-label">
            How confident do you feel now? <span className="required-star">*</span>
          </label>
          {preState.finishRequested && !confidence && (
            <p className="form-hint session-finish-hint">
              Choose your confidence rating to complete the session.
            </p>
          )}
          <ConfidenceRater
            value={confidence}
            onChange={handleConfidenceChange}
          />
          {confidenceError && (
            <p className="form-error">Please rate your confidence before completing the session.</p>
          )}
        </div>

        {itemsInSession.length > 0 && sessionTopic && (
          <div className="card">
            <label className="form-label">Items worked on</label>
            {sessionTopic.checklistItems
              .filter((c) => itemsInSession.includes(c.id))
              .map((c) => (
                <div key={c.id} className="session-item-tag">✓ {c.title}</div>
              ))}
          </div>
        )}

        <button
          className="btn btn--primary btn--full btn--lg"
          onClick={handleComplete}
        >
          Complete session ✓
        </button>

        <button
          className="btn btn--ghost btn--full"
          onClick={() => {
            if (window.confirm('Cancel this session? Progress will not be saved.')) {
              cancelActiveSession()
              navigate('/dashboard')
            }
          }}
        >
          Cancel session
        </button>
      </div>
    )
  }

  // ── Setup phase ───────────────────────────────────────────────────
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

      {setupSubject && (
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
            {setupSubject.topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      )}

      {setupTopic && (
        <div className="card">
          <label className="form-label">Checklist items to focus on (optional)</label>
          <div className="item-picker">
            {setupTopic.checklistItems.map((item) => (
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

      <div className="card">
        <label className="form-label">Duration</label>
        <div className="method-grid">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`method-btn${durationMinutes === d ? ' method-btn--active' : ''}`}
              onClick={() => setDurationMinutes(d)}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn--primary btn--full btn--lg"
        disabled={!subjectId}
        onClick={handleStartSession}
      >
        Start session ▶
      </button>
    </div>
  )
}
