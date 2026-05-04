import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useActiveSession } from '../context/ActiveSessionContext.jsx'
import ConfidenceRater from '../components/ConfidenceRater.jsx'
import {
  ACTIVITIES,
  getActivitiesForSubject,
  getActivitiesForTopic,
  getTopicsWithActivities,
  suggestConfidence,
  ACTIVITY_SUBJECT_IDS,
} from '../data/activities.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TYPE_LABELS = {
  multiple_choice: 'Multiple choice',
  flashcard: 'Flashcard',
  explain_aloud: 'Explain aloud',
  blurting: 'Blurting',
  practice_question: 'Practice question',
}

const CONF_LABELS = ['', 'No idea', 'Unsure', 'Getting it', 'Almost there', 'Confident']

function scoreFeedback(pct) {
  if (pct === null) return null
  if (pct >= 80) return 'Excellent — you clearly know this material well.'
  if (pct >= 60) return 'Good effort! Keep practising the ones you missed.'
  if (pct >= 40) return 'Keep going — review the tricky ones and try again.'
  return 'This topic needs more work. Review your notes and try again.'
}

// Reconstruct ordered queue from stored IDs (handles deletions gracefully).
function queueFromIds(ids) {
  if (!ids || !Array.isArray(ids)) return []
  return ids.map((id) => ACTIVITIES.find((a) => a.id === id)).filter(Boolean)
}

// ── MCCard ───────────────────────────────────────────────────────────────────

function MCCard({ activity, onAnswer }) {
  const [selected, setSelected] = useState(null)

  function choose(i) {
    if (selected !== null) return
    setSelected(i)
    onAnswer(i === activity.correct)
  }

  return (
    <div className="act-question">
      <p className="act-question__prompt">{activity.prompt}</p>
      <div className="act-options">
        {activity.options.map((opt, i) => {
          let cls = 'act-option'
          if (selected !== null) {
            if (i === activity.correct) cls += ' act-option--correct'
            else if (i === selected) cls += ' act-option--wrong'
          }
          return (
            <button
              key={i}
              type="button"
              className={cls}
              onClick={() => choose(i)}
              disabled={selected !== null}
            >
              <span className="act-option__letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          )
        })}
      </div>
      {selected !== null && activity.explanation && (
        <p className="act-explanation">{activity.explanation}</p>
      )}
    </div>
  )
}

// ── FlashCard ────────────────────────────────────────────────────────────────

function FlashCard({ activity, onAnswer }) {
  const [flipped, setFlipped] = useState(false)
  const [assessed, setAssessed] = useState(false)

  function assess(result) {
    if (assessed) return
    setAssessed(true)
    onAnswer(result)
  }

  return (
    <div className="act-question">
      <button
        type="button"
        className="flashcard-block"
        onClick={() => !flipped && setFlipped(true)}
        aria-label={flipped ? 'Answer shown' : 'Tap to reveal answer'}
        disabled={flipped}
      >
        <div className="flashcard-block__label">
          {flipped ? 'Answer' : 'Question — tap to reveal'}
        </div>
        <div className="flashcard-block__text">
          {flipped ? activity.back : activity.front}
        </div>
      </button>
      {flipped && !assessed && (
        <div className="act-self-assess">
          <p>Did you know it?</p>
          <div className="act-self-assess__btns">
            <button type="button" className="btn btn--success" onClick={() => assess(true)}>
              ✓ Yes
            </button>
            <button type="button" className="btn btn--danger" onClick={() => assess(false)}>
              ✗ No
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── OpenCard ─────────────────────────────────────────────────────────────────

function OpenCard({ activity, onAnswer }) {
  const [revealed, setRevealed] = useState(false)
  const [assessed, setAssessed] = useState(false)

  function assess(result) {
    if (assessed) return
    setAssessed(true)
    onAnswer(result)
  }

  return (
    <div className="act-question">
      <p className="act-question__prompt">{activity.prompt}</p>
      {activity.hint && (
        <details className="act-hint">
          <summary>Show hint</summary>
          <p>{activity.hint}</p>
        </details>
      )}
      {!revealed ? (
        <button
          type="button"
          className="btn btn--secondary btn--full mt-2"
          onClick={() => setRevealed(true)}
        >
          Show sample answer
        </button>
      ) : (
        <>
          <div className="act-sample">
            <div className="act-sample__label">Sample answer</div>
            <div className="act-sample__text">{activity.sampleAnswer}</div>
          </div>
          {!assessed && (
            <div className="act-self-assess">
              <p>How did your answer compare?</p>
              <div className="act-self-assess__btns">
                <button type="button" className="btn btn--success" onClick={() => assess(true)}>
                  ✓ Got it
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => assess(null)}>
                  ~ Partial
                </button>
                <button type="button" className="btn btn--danger" onClick={() => assess(false)}>
                  ✗ Missed it
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Activity component ──────────────────────────────────────────────────

export default function Activity() {
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

  const isActivitySession = activeSession?.activityType === 'activity'
  const savedDraft = isActivitySession ? (activeSession.answersDraft || {}) : {}

  // ── State — initialised from active session draft on resume ───────────────
  const [subjectId, setSubjectId] = useState(
    () => (isActivitySession ? activeSession.subjectId : (paramSubjectId || ''))
  )
  const [selectedTopicId, setSelectedTopicId] = useState(() => preState.topicId || '')
  const [count, setCount] = useState(10)

  // 'setup' | 'running' | 'review'
  const [phase, setPhase] = useState(() => {
    if (isActivitySession) return savedDraft.phase || 'running'
    return 'setup'
  })

  const [queue, setQueue] = useState(() =>
    isActivitySession ? queueFromIds(savedDraft.queueIds) : []
  )
  const [current, setCurrentIdx] = useState(() => savedDraft.currentIdx || 0)
  const [results, setResults] = useState(() => savedDraft.results || [])
  const [answered, setAnswered] = useState(() => savedDraft.answered || false)

  const [confidence, setConfidence] = useState(() => activeSession?.confidenceDraft || null)
  const [suggestedConf, setSuggestedConf] = useState(() => savedDraft.suggestedConf || null)
  const [confidenceError, setConfidenceError] = useState(false)
  const [notes, setNotes] = useState(() => activeSession?.notesDraft || '')

  // Reset to setup if active session is cancelled externally while on this screen.
  useEffect(() => {
    if (phase !== 'setup' && !activeSession) {
      setPhase('setup')
      setQueue([])
      setResults([])
      setCurrentIdx(0)
      setAnswered(false)
      setConfidence(null)
      setSuggestedConf(null)
      setNotes('')
    }
  }, [phase, activeSession])

  // If banner sends "Finish" while activity is still running, jump to review.
  useEffect(() => {
    if (preState.finishRequested && phase === 'running' && queue.length > 0) {
      jumpToReview(results)
    }
  }, []) // only on first mount with this state

  // Scroll confidence into view when Finish is requested and we are in review.
  useEffect(() => {
    if (preState.finishRequested && phase === 'review') {
      const t = setTimeout(() => {
        confidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
      return () => clearTimeout(t)
    }
  }, [preState.finishRequested, phase])

  // ── Draft helpers ─────────────────────────────────────────────────────────
  const saveDraft = useCallback((overrides = {}) => {
    updateActiveSessionDraft({
      answersDraft: {
        queueIds: queue.map((a) => a.id),
        results: overrides.results ?? results,
        currentIdx: overrides.currentIdx ?? current,
        answered: overrides.answered ?? answered,
        phase: overrides.phase ?? phase,
        suggestedConf: overrides.suggestedConf ?? suggestedConf,
      },
      ...(overrides.scoreDraft !== undefined ? { scoreDraft: overrides.scoreDraft } : {}),
      ...(overrides.totalQuestionsDraft !== undefined
        ? { totalQuestionsDraft: overrides.totalQuestionsDraft }
        : {}),
    })
  }, [updateActiveSessionDraft, queue, results, current, answered, phase, suggestedConf])

  // ── Derived ───────────────────────────────────────────────────────────────
  const activitySubjects = subjects.filter((s) => ACTIVITY_SUBJECT_IDS.includes(s.id))
  const activeSubjectId = isActivitySession ? activeSession.subjectId : subjectId
  const subject = subjects.find((s) => s.id === activeSubjectId)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function startActivity() {
    if (!subjectId) return
    const all = selectedTopicId
      ? getActivitiesForTopic(subjectId, selectedTopicId)
      : getActivitiesForSubject(subjectId)
    const shuffled = shuffle(all)
    const picked = count === 'all' ? shuffled : shuffled.slice(0, Math.min(count, shuffled.length))
    if (picked.length === 0) return

    const topicIds = [...new Set(picked.map((a) => a.topicId))]
    const topicId = selectedTopicId || (topicIds.length === 1 ? topicIds[0] : null)
    const checklistItemIds = [...new Set(picked.map((a) => a.checklistItemId))]

    startActiveSession({
      subjectId,
      topicId,
      checklistItemIds,
      activityType: 'activity',
      method: 'quiz',
      durationMinutes: 15,
    })

    const initialResults = []
    setQueue(picked)
    setResults(initialResults)
    setCurrentIdx(0)
    setAnswered(false)
    setConfidence(null)
    setSuggestedConf(null)
    setNotes('')
    setConfidenceError(false)
    setPhase('running')

    // Persist initial queue so resume can reconstruct it.
    updateActiveSessionDraft({
      answersDraft: {
        queueIds: picked.map((a) => a.id),
        results: initialResults,
        currentIdx: 0,
        answered: false,
        phase: 'running',
        suggestedConf: null,
      },
    })
  }

  function handleAnswer(result) {
    const newResults = [...results, result]
    setResults(newResults)
    setAnswered(true)
    saveDraft({ results: newResults, answered: true })
  }

  function jumpToReview(allResults) {
    const scored = allResults.filter((r) => r !== null)
    const correct = allResults.filter((r) => r === true).length
    let sug = null
    if (scored.length > 0) {
      sug = suggestConfidence(correct, scored.length)
      setSuggestedConf(sug)
      setConfidence(sug)
      updateActiveSessionDraft({ confidenceDraft: sug })
    }
    const scoredCount = scored.length
    const correctCount = correct
    setPhase('review')
    saveDraft({
      results: allResults,
      phase: 'review',
      suggestedConf: sug,
      scoreDraft: scoredCount > 0 ? correctCount : null,
      totalQuestionsDraft: scoredCount > 0 ? scoredCount : null,
    })
  }

  function advance() {
    const nextIdx = current + 1
    if (nextIdx >= queue.length) {
      jumpToReview(results)
    } else {
      setCurrentIdx(nextIdx)
      setAnswered(false)
      saveDraft({ currentIdx: nextIdx, answered: false })
    }
  }

  function skipAndAdvance() {
    const newResults = [...results, null]
    setResults(newResults)
    const nextIdx = current + 1
    if (nextIdx >= queue.length) {
      jumpToReview(newResults)
    } else {
      setCurrentIdx(nextIdx)
      setAnswered(false)
      saveDraft({ results: newResults, currentIdx: nextIdx, answered: false })
    }
  }

  function handleConfidenceChange(c) {
    setConfidence(c)
    setConfidenceError(false)
    updateActiveSessionDraft({ confidenceDraft: c })
  }

  function handleNotesChange(e) {
    const val = e.target.value
    setNotes(val)
    updateActiveSessionDraft({ notesDraft: val })
  }

  function finishActivity() {
    if (!confidence) {
      setConfidenceError(true)
      confidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const scored = results.filter((r) => r !== null)
    const correct = results.filter((r) => r === true).length
    completeActiveSession({
      confidence,
      notes: notes.trim() || null,
      score: scored.length > 0 ? correct : null,
      totalQuestions: scored.length > 0 ? scored.length : null,
    })
    navigate('/dashboard')
  }

  function handleCancelSession() {
    if (window.confirm('Cancel this activity session? Progress will not be saved.')) {
      cancelActiveSession()
      setPhase('setup')
      setQueue([])
      setResults([])
      setCurrentIdx(0)
      setAnswered(false)
      setConfidence(null)
      setSuggestedConf(null)
      setNotes('')
    }
  }

  // ── Fallback for invalid route param ──────────────────────────────────────
  if (paramSubjectId && !ACTIVITY_SUBJECT_IDS.includes(paramSubjectId)) {
    return (
      <div className="screen screen--centered">
        <div className="placeholder-screen">
          <div className="placeholder-screen__icon">🎯</div>
          <h2>No activities here</h2>
          <p>Activities are available for Maths, English, French and Science.</p>
          <button className="btn btn--primary mt-2" onClick={() => navigate('/subjects')}>
            Back to subjects
          </button>
        </div>
      </div>
    )
  }

  // ── Conflict: a non-activity session is already active ────────────────────
  if (phase === 'setup' && activeSession && !isActivitySession) {
    const conflictSubject = subjects.find((s) => s.id === activeSession.subjectId)
    return (
      <div className="screen">
        <h2 className="screen__heading">Activities</h2>
        <div className="card">
          <h3 className="card__title">Session already in progress</h3>
          <p className="muted-text" style={{ marginBottom: 12 }}>
            You have an active revision session for{' '}
            <strong>{conflictSubject?.name || activeSession.subjectId}</strong>. Resume or cancel it
            before starting an activity.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn--primary btn--full"
              onClick={() => navigate('/session', { state: { resuming: true } })}
            >
              Resume revision session
            </button>
            <button
              className="btn btn--ghost btn--full"
              onClick={() => {
                if (window.confirm('Cancel the current revision session? Progress will not be saved.')) {
                  cancelActiveSession()
                }
              }}
            >
              Cancel it and start an activity
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review phase ──────────────────────────────────────────────────────────
  if (phase === 'review') {
    const scored = results.filter((r) => r !== null)
    const correct = results.filter((r) => r === true).length
    const hasScore = scored.length > 0
    const pct = hasScore ? Math.round((correct / scored.length) * 100) : null

    return (
      <div className="screen">
        <div className="act-score-summary card">
          <div className="session-complete__icon">🎯</div>
          <h2>Activities done!</h2>
          {hasScore && (
            <p className="act-score-summary__score">
              Score: <strong>{correct}/{scored.length}</strong> ({pct}%)
            </p>
          )}
          {pct !== null && (
            <p className="act-score-summary__feedback">{scoreFeedback(pct)}</p>
          )}
          <p className="act-score-summary__total">
            {queue.length} activit{queue.length !== 1 ? 'ies' : 'y'} completed
          </p>
        </div>

        <div
          ref={confidenceRef}
          className={`card${confidenceError ? ' card--error' : ''}`}
        >
          <label className="form-label">
            How confident do you feel about {subject?.name}?{' '}
            <span className="required-star">*</span>
          </label>
          {hasScore && suggestedConf && (
            <p className="form-hint">
              Based on your score ({pct}%), we suggest:{' '}
              <strong>{CONF_LABELS[suggestedConf]}</strong>
            </p>
          )}
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
            <p className="form-error">Please rate your confidence before completing.</p>
          )}
        </div>

        <div className="card">
          <label className="form-label" htmlFor="act-notes">Notes (optional)</label>
          <textarea
            id="act-notes"
            className="form-textarea"
            rows={3}
            placeholder="What did you find tricky? Any concepts to revisit?"
            value={notes}
            onChange={handleNotesChange}
          />
        </div>

        <button className="btn btn--primary btn--full btn--lg" onClick={finishActivity}>
          Complete session ✓
        </button>
        <button
          className="btn btn--ghost btn--full mt-2"
          onClick={handleCancelSession}
        >
          Cancel session
        </button>
      </div>
    )
  }

  // ── Running phase ─────────────────────────────────────────────────────────
  if (phase === 'running') {
    const activity = queue[current]

    if (!activity) {
      // Queue is empty — malformed session, return to setup.
      return (
        <div className="screen screen--centered">
          <div className="placeholder-screen">
            <div className="placeholder-screen__icon">🎯</div>
            <h2>Something went wrong</h2>
            <p>Could not load the activity. Please start a new session.</p>
            <button
              className="btn btn--primary mt-2"
              onClick={() => {
                cancelActiveSession()
                setPhase('setup')
              }}
            >
              Back to setup
            </button>
          </div>
        </div>
      )
    }

    const progress = Math.round((results.length / queue.length) * 100)
    const isLast = current === queue.length - 1

    return (
      <div className="screen">
        <div className="act-header">
          <span className="act-header__subject">
            {subject?.emoji} {subject?.name}
          </span>
          <span className="act-header__count">
            {current + 1} / {queue.length}
          </span>
        </div>

        <div className="act-progress-bar">
          <div className="act-progress-bar__fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="act-meta">
          <span className="act-type-badge">{TYPE_LABELS[activity.type] || activity.type}</span>
          <span className="act-topic">{activity.topicTitle}</span>
        </div>

        {activity.type === 'multiple_choice' && (
          <MCCard key={activity.id} activity={activity} onAnswer={handleAnswer} />
        )}
        {activity.type === 'flashcard' && (
          <FlashCard key={activity.id} activity={activity} onAnswer={handleAnswer} />
        )}
        {(activity.type === 'explain_aloud' ||
          activity.type === 'blurting' ||
          activity.type === 'practice_question') && (
          <OpenCard key={activity.id} activity={activity} onAnswer={handleAnswer} />
        )}

        <div className="act-nav">
          {answered ? (
            <button className="btn btn--primary btn--full btn--lg" onClick={advance}>
              {isLast ? 'See results →' : 'Next →'}
            </button>
          ) : (
            <button className="btn btn--ghost btn--full" onClick={skipAndAdvance}>
              Skip
            </button>
          )}
        </div>

        <button
          className="btn btn--ghost btn--full mt-2"
          style={{ fontSize: '0.82rem' }}
          onClick={handleCancelSession}
        >
          Cancel session
        </button>
      </div>
    )
  }

  // ── Setup phase ───────────────────────────────────────────────────────────
  return (
    <div className="screen">
      <h2 className="screen__heading">Activities</h2>

      <div className="card">
        <label className="form-label" htmlFor="act-subject-select">
          Subject
        </label>
        <select
          id="act-subject-select"
          className="form-select"
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setSelectedTopicId('') }}
        >
          <option value="">— choose a subject —</option>
          {activitySubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {subjectId && (() => {
        const activeSub = subjects.find((s) => s.id === subjectId)
        const topicIdsWithActs = getTopicsWithActivities(subjectId)
        const topicsForDropdown = (activeSub?.topics || []).filter((t) => topicIdsWithActs.includes(t.id))
        if (topicsForDropdown.length === 0) return null
        return (
          <div className="card">
            <label className="form-label" htmlFor="act-topic-select">
              Topic (optional)
            </label>
            <select
              id="act-topic-select"
              className="form-select"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            >
              <option value="">— all topics —</option>
              {topicsForDropdown.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )
      })()}

      <div className="card">
        <label className="form-label">Number of activities</label>
        <div className="method-grid">
          {[5, 10, 15, 'all'].map((n) => (
            <button
              key={n}
              type="button"
              className={`method-btn${count === n ? ' method-btn--active' : ''}`}
              onClick={() => setCount(n)}
            >
              {n === 'all' ? 'All' : n}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn--primary btn--full btn--lg"
        disabled={!subjectId}
        onClick={startActivity}
      >
        Start activities ▶
      </button>
    </div>
  )
}
