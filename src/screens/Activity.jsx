import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import ConfidenceRater from '../components/ConfidenceRater.jsx'
import {
  getActivitiesForSubject,
  suggestConfidence,
  ACTIVITY_SUBJECT_IDS,
} from '../data/activities.js'
import { now } from '../utils/dates.js'

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

// ── MCCard ────────────────────────────────────────────────────────

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

// ── FlashCard ─────────────────────────────────────────────────────

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

// ── OpenCard ──────────────────────────────────────────────────────

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

// ── Main Activity component ───────────────────────────────────────

export default function Activity() {
  const { subjectId: paramSubjectId } = useParams()
  const { subjects, completeSession } = useApp()
  const navigate = useNavigate()

  const [subjectId, setSubjectId] = useState(paramSubjectId || '')
  const [count, setCount] = useState(10)

  const [phase, setPhase] = useState('setup')
  const [queue, setQueue] = useState([])
  const [current, setCurrentIdx] = useState(0)
  const [results, setResults] = useState([])
  const [answered, setAnswered] = useState(false)

  const [confidence, setConfidence] = useState(null)
  const [suggestedConf, setSuggestedConf] = useState(null)
  const [confidenceError, setConfidenceError] = useState(false)

  const startedAtRef = useRef(null)

  const activitySubjects = subjects.filter((s) => ACTIVITY_SUBJECT_IDS.includes(s.id))
  const subject = subjects.find((s) => s.id === subjectId)

  function startActivity() {
    if (!subjectId) return
    const all = getActivitiesForSubject(subjectId)
    const shuffled = shuffle(all)
    const picked =
      count === 'all' ? shuffled : shuffled.slice(0, Math.min(count, shuffled.length))
    if (picked.length === 0) return
    setQueue(picked)
    setResults([])
    setCurrentIdx(0)
    setAnswered(false)
    setConfidence(null)
    setSuggestedConf(null)
    startedAtRef.current = now()
    setPhase('running')
  }

  function handleAnswer(result) {
    setResults((prev) => [...prev, result])
    setAnswered(true)
  }

  function goToReview(allResults) {
    const scored = allResults.filter((r) => r !== null)
    const correct = allResults.filter((r) => r === true).length
    if (scored.length > 0) {
      const sug = suggestConfidence(correct, scored.length)
      setSuggestedConf(sug)
      setConfidence(sug)
    }
    setPhase('review')
  }

  function advance() {
    const nextIdx = current + 1
    if (nextIdx >= queue.length) {
      goToReview(results)
    } else {
      setCurrentIdx(nextIdx)
      setAnswered(false)
    }
  }

  function skipAndAdvance() {
    const newResults = [...results, null]
    setResults(newResults)
    const nextIdx = current + 1
    if (nextIdx >= queue.length) {
      goToReview(newResults)
    } else {
      setCurrentIdx(nextIdx)
      setAnswered(false)
    }
  }

  function finishActivity() {
    if (!confidence) {
      setConfidenceError(true)
      return
    }
    const scored = results.filter((r) => r !== null)
    const correct = results.filter((r) => r === true).length
    const session = {
      id: `session_${Date.now()}`,
      subjectId,
      topicId: null,
      checklistItemIds: [],
      startedAt: startedAtRef.current,
      method: 'quiz',
      activityType: 'activity',
      confidenceAfter: confidence,
      score: scored.length > 0 ? correct : null,
      totalQuestions: scored.length > 0 ? scored.length : null,
    }
    completeSession(session)
    navigate('/dashboard')
  }

  // ── Review phase ──────────────────────────────────────────────
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
          <p className="act-score-summary__total">
            {queue.length} activit{queue.length !== 1 ? 'ies' : 'y'} completed
          </p>
        </div>

        <div className="card">
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
          <ConfidenceRater
            value={confidence}
            onChange={(c) => {
              setConfidence(c)
              setConfidenceError(false)
            }}
          />
          {confidenceError && (
            <p className="form-error">Please rate your confidence before completing.</p>
          )}
        </div>

        <button className="btn btn--primary btn--full btn--lg" onClick={finishActivity}>
          Complete session ✓
        </button>
        <button
          className="btn btn--ghost btn--full mt-2"
          onClick={() => {
            setPhase('setup')
            setQueue([])
            setResults([])
            setAnswered(false)
            setConfidence(null)
            setSuggestedConf(null)
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Running phase ─────────────────────────────────────────────
  if (phase === 'running') {
    const activity = queue[current]
    if (!activity) return null
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
      </div>
    )
  }

  // ── Setup phase ───────────────────────────────────────────────
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
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="">— choose a subject —</option>
          {activitySubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

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
