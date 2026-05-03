import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  getSubjectProgress,
  getOverallProgress,
  getSessionsThisWeek,
  getStrongestSubjects,
  getWeakestSubjects,
} from '../utils/planner.js'
import { levelFromPoints, getBadgeById } from '../utils/rewards.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { formatDateTime } from '../utils/dates.js'
import { useNavigate } from 'react-router-dom'

export default function Progress() {
  const { subjects, sessions, rewards } = useApp()
  const navigate = useNavigate()
  const overall = getOverallProgress(subjects)
  const { level, title: levelTitle } = levelFromPoints(rewards.points)
  const thisWeek = getSessionsThisWeek(sessions)
  const strongest = getStrongestSubjects(subjects, 3)
  const weakest = getWeakestSubjects(subjects, 3)

  const recentActivitySessions = [...sessions].reverse()
    .filter((s) => s.activityType === 'activity')
    .slice(0, 5)

  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => {
      if (!s.endedAt || !s.startedAt) return acc
      return acc + (new Date(s.endedAt) - new Date(s.startedAt)) / 60000
    }, 0)
  )

  return (
    <div className="screen">

      {/* Level */}
      <section className="card card--highlight">
        <div className="level-banner">
          <div className="level-banner__left">
            <div className="level-banner__level">Level {level}</div>
            <div className="level-banner__title">{levelTitle}</div>
          </div>
          <div className="level-banner__points">⭐ {rewards.points} pts</div>
        </div>
      </section>

      {/* Overall */}
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Overall coverage</h3>
          <span className="badge-pill">{overall.pct}%</span>
        </div>
        <ProgressBar pct={overall.pct} height={14} />
        <div className="progress-legend">
          <span>{overall.done} covered</span>
          <span>🔒 {overall.secure} secure</span>
          {overall.needsReview > 0 && (
            <span className="tag tag--danger">⚠ {overall.needsReview} review</span>
          )}
          <span>{overall.total - overall.done} remaining</span>
        </div>
      </section>

      {/* Session stats */}
      <section className="card">
        <h3 className="card__title">Session summary</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-box__value">{sessions.length}</div>
            <div className="stat-box__label">Total sessions</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{thisWeek.length}</div>
            <div className="stat-box__label">This week</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{totalMinutes}</div>
            <div className="stat-box__label">Minutes total</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{overall.secure}</div>
            <div className="stat-box__label">Items secured</div>
          </div>
        </div>
      </section>

      {/* Recent activity results */}
      {recentActivitySessions.length > 0 && (
        <section className="card">
          <h3 className="card__title">Recent activity results</h3>
          <div className="session-list">
            {recentActivitySessions.map((s) => {
              const sub = subjects.find((x) => x.id === s.subjectId)
              const hasScore = s.score != null && s.totalQuestions != null
              return (
                <div key={s.id} className="session-item">
                  <span className="session-item__emoji">{sub?.emoji || '🎯'}</span>
                  <div className="session-item__body">
                    <div className="session-item__subject">{sub?.name || s.subjectId}</div>
                    <div className="session-item__meta">
                      {hasScore
                        ? `${s.score}/${s.totalQuestions} correct (${Math.round((s.score / s.totalQuestions) * 100)}%)`
                        : 'Reflection activity'}
                      {s.confidenceAfter && ` · Confidence: ${s.confidenceAfter}/5`}
                    </div>
                  </div>
                  <div className="session-item__time">{formatDateTime(s.endedAt)}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Strongest subjects */}
      {strongest.length > 0 && (
        <section className="card">
          <h3 className="card__title">Strongest subjects</h3>
          <div className="subject-progress-list">
            {strongest.map((subject) => {
              const p = subject._progress
              const avgConf = p.avgConfidence ? p.avgConfidence.toFixed(1) : null
              return (
                <button
                  key={subject.id}
                  className="subject-progress-item"
                  onClick={() => navigate(`/subjects/${subject.id}`)}
                  aria-label={`${subject.name} — ${p.pct}% coverage`}
                >
                  <div className="subject-progress-item__header">
                    <span>{subject.emoji} {subject.name}</span>
                    <span style={{ color: subject.color }}>{p.pct}%</span>
                  </div>
                  <ProgressBar pct={p.pct} color={subject.color} height={6} />
                  <div className="subject-progress-item__stats">
                    {p.secure > 0 && <span className="tag tag--success">🔒 {p.secure} secure</span>}
                    {avgConf && <span className="tag tag--muted">avg confidence {avgConf}/5</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Weakest subjects */}
      <section className="card">
        <h3 className="card__title">Needs most work</h3>
        {weakest.length === 0 ? (
          <p className="muted-text">All subjects look good — keep it up!</p>
        ) : (
          <div className="subject-progress-list">
            {weakest.map((subject) => {
              const p = subject._progress
              const avgConf = p.avgConfidence ? p.avgConfidence.toFixed(1) : null
              return (
                <button
                  key={subject.id}
                  className="subject-progress-item"
                  onClick={() => navigate(`/subjects/${subject.id}`)}
                  aria-label={`${subject.name} — ${p.pct}% coverage`}
                >
                  <div className="subject-progress-item__header">
                    <span>{subject.emoji} {subject.name}</span>
                    <span style={{ color: subject.color }}>{p.pct}%</span>
                  </div>
                  <ProgressBar pct={p.pct} color={subject.color} height={6} />
                  <div className="subject-progress-item__stats">
                    {p.notStarted > 0 && <span className="tag tag--warn">{p.notStarted} not started</span>}
                    {p.needsReview > 0 && <span className="tag tag--danger">⚠ {p.needsReview} review</span>}
                    {avgConf && <span className="tag tag--muted">avg confidence {avgConf}/5</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Per-subject breakdown */}
      <section className="card">
        <h3 className="card__title">All subjects</h3>
        <div className="subject-progress-list">
          {subjects.map((subject) => {
            const p = getSubjectProgress(subject)
            const avgConf = p.avgConfidence ? p.avgConfidence.toFixed(1) : null
            return (
              <button
                key={subject.id}
                className="subject-progress-item"
                onClick={() => navigate(`/subjects/${subject.id}`)}
                aria-label={`${subject.name} — ${p.pct}% coverage`}
              >
                <div className="subject-progress-item__header">
                  <span>{subject.emoji} {subject.name}</span>
                  <span style={{ color: subject.color }}>{p.pct}%</span>
                </div>
                <ProgressBar pct={p.pct} color={subject.color} height={6} />
                <div className="subject-progress-item__stats">
                  <span>{p.done}/{p.total}</span>
                  {p.secure > 0 && <span className="tag tag--success">🔒 {p.secure}</span>}
                  {p.needsReview > 0 && <span className="tag tag--danger">⚠ {p.needsReview}</span>}
                  {p.notStarted > 0 && <span className="tag tag--muted">{p.notStarted} left</span>}
                  {avgConf && <span className="tag tag--muted">conf {avgConf}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Badges */}
      <section className="card">
        <h3 className="card__title">Badges ({rewards.badges.length}/8)</h3>
        {rewards.badges.length === 0 ? (
          <p className="muted-text">Complete your first session to earn a badge.</p>
        ) : (
          <div className="badge-grid">
            {rewards.badges.map((b) => {
              const def = getBadgeById(b.id)
              if (!def) return null
              return (
                <div key={b.id} className="badge-item">
                  <span className="badge-item__emoji">{def.emoji}</span>
                  <span className="badge-item__title">{def.title}</span>
                  <span className="badge-item__desc">{def.description}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
