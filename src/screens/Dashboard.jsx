import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { daysUntilAssessment, isAssessmentWeek, formatDateTime } from '../utils/dates.js'
import {
  getOverallProgress,
  getSuggestedItems,
  getSessionsThisWeek,
  getTopicQuizReadyList,
} from '../utils/planner.js'
import { levelFromPoints, getBadgeById } from '../utils/rewards.js'
import ProgressBar from '../components/ProgressBar.jsx'

const METHOD_LABELS = {
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  blurting: 'Blurting',
  mindmap: 'Mind map',
  explain_aloud: 'Explain aloud',
  practice_question: 'Practice question',
  read_notes: 'Read notes',
}

const REASON_STYLE = {
  'Not started': 'reason--grey',
  'Needs review': 'reason--red',
  'Low confidence': 'reason--orange',
  'Low quiz score': 'reason--red',
  'Not revised recently': 'reason--blue',
  'Core subject': 'reason--purple',
  'Low revision count': 'reason--grey',
}

export default function Dashboard() {
  const { profile, subjects, sessions, rewards, topicQuizPrompts, dismissTopicQuizPrompt } = useApp()
  const navigate = useNavigate()

  const daysLeft = daysUntilAssessment()
  const assessmentWeek = isAssessmentWeek()
  const overall = getOverallProgress(subjects)
  const suggested = getSuggestedItems(subjects, 3, sessions)
  const thisWeekSessions = getSessionsThisWeek(sessions)
  const { level, title: levelTitle } = levelFromPoints(rewards.points)
  const recentSessions = [...sessions].reverse().slice(0, 3)
  const quizReady = getTopicQuizReadyList(subjects, topicQuizPrompts)

  const subjectsStarted = new Set(sessions.map((s) => s.subjectId)).size
  const subjectsNotStarted = subjects.length - subjectsStarted

  return (
    <div className="screen">
      {/* Greeting + countdown */}
      <section className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__greeting">Hi, {profile.name} 👋</h2>
          {assessmentWeek ? (
            <p className="dashboard-hero__countdown dashboard-hero__countdown--now">
              Assessment week is <strong>now!</strong> You&apos;ve got this.
            </p>
          ) : (
            <p className="dashboard-hero__countdown">
              <strong>{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''} until assessments begin
            </p>
          )}
          <p className="dashboard-hero__date">26 May – 2 June 2026</p>
        </div>
        <div className="dashboard-hero__level">
          <div className="dashboard-hero__level-num">Lv {level}</div>
          <div className="dashboard-hero__level-title">{levelTitle}</div>
        </div>
      </section>

      {/* Overall progress */}
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Overall coverage</h3>
          <span className="badge-pill">{overall.pct}%</span>
        </div>
        <ProgressBar pct={overall.pct} height={12} />
        <div className="dashboard-stats-row">
          <span>{overall.done}/{overall.total} items covered</span>
          <span>🔒 {overall.secure} secure</span>
        </div>
        <div className="dashboard-stats-row dashboard-stats-row--sub">
          <span>
            <strong>{subjectsStarted}</strong> subject{subjectsStarted !== 1 ? 's' : ''} started
          </span>
          {subjectsNotStarted > 0 && (
            <span className="tag tag--warn">{subjectsNotStarted} not started yet</span>
          )}
          {thisWeekSessions.length > 0 && (
            <span className="tag tag--success">
              {thisWeekSessions.length} session{thisWeekSessions.length !== 1 ? 's' : ''} this week
            </span>
          )}
        </div>
      </section>

      {/* Quiz prompts */}
      {quizReady.length > 0 && (
        <section className="card quiz-prompt-card">
          <h3 className="card__title">🎉 Topics ready for a quiz</h3>
          <div className="quiz-prompt-list">
            {quizReady.map(({ topic, subject }) => (
              <div key={topic.id} className="quiz-prompt-item">
                <div className="quiz-prompt-item__info">
                  <span className="quiz-prompt-item__emoji">{subject.emoji}</span>
                  <div>
                    <div className="quiz-prompt-item__subject">{subject.name}</div>
                    <div className="quiz-prompt-item__topic">{topic.title}</div>
                  </div>
                </div>
                <div className="quiz-prompt-item__actions">
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate(`/activity/${subject.id}`, { state: { topicId: topic.id } })}
                  >
                    Quiz
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => dismissTopicQuizPrompt(topic.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested revision */}
      <section className="card">
        <h3 className="card__title">Suggested today</h3>
        {suggested.length === 0 ? (
          <p className="muted-text">All items are secure — amazing work!</p>
        ) : (
          <div className="suggested-list">
            {suggested.map((item) => {
              const subject = subjects.find((s) => s.id === item.subjectId)
              return (
                <div
                  key={item.id}
                  className="suggested-item"
                  style={{ '--subject-color': subject?.color || '#5b4cdb' }}
                >
                  <div className="suggested-item__left">
                    <span className="suggested-item__emoji">{subject?.emoji}</span>
                    <div className="suggested-item__body">
                      <div className="suggested-item__subject">{subject?.name}</div>
                      <div className="suggested-item__topic">{item.topicTitle}</div>
                      <div className="suggested-item__title">{item.title}</div>
                      <span className={`suggested-item__reason ${REASON_STYLE[item.reason] || 'reason--grey'}`}>
                        {item.reason}
                      </span>
                    </div>
                  </div>
                  <button
                    className="suggested-item__start"
                    onClick={() =>
                      navigate(`/session/${item.subjectId}`, {
                        state: { topicId: item.topicId, itemId: item.id },
                      })
                    }
                    aria-label={`Start session for ${item.title}`}
                  >
                    ▶
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="dashboard-actions-row">
          <button
            className="btn btn--ghost btn--full"
            onClick={() => navigate('/session')}
          >
            Start a custom session →
          </button>
          <button
            className="btn btn--secondary btn--full"
            onClick={() => navigate('/activity')}
          >
            🎯 Try activities
          </button>
        </div>
      </section>

      {/* Badges */}
      {rewards.badges.length > 0 && (
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Rewards</h3>
            <span className="badge-pill">⭐ {rewards.points} pts</span>
          </div>
          <div className="badge-grid">
            {rewards.badges.map((b) => {
              const def = getBadgeById(b.id)
              if (!def) return null
              return (
                <div key={b.id} className="badge-item" title={def.description}>
                  <span className="badge-item__emoji">{def.emoji}</span>
                  <span className="badge-item__title">{def.title}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 ? (
        <section className="card">
          <h3 className="card__title">Recent sessions</h3>
          <div className="session-list">
            {recentSessions.map((s) => {
              const sub = subjects.find((x) => x.id === s.subjectId)
              const mins =
                s.endedAt && s.startedAt
                  ? Math.round(
                      (new Date(s.endedAt) - new Date(s.startedAt)) / 60000
                    )
                  : null
              return (
                <div key={s.id} className="session-item">
                  <span className="session-item__emoji">{sub?.emoji || '📚'}</span>
                  <div className="session-item__body">
                    <div className="session-item__subject">{sub?.name || s.subjectId}</div>
                    <div className="session-item__meta">
                      {METHOD_LABELS[s.method] || s.method}
                      {mins !== null && ` · ${mins} min`}
                      {s.score != null && ` · ${s.score}/${s.totalQuestions}`}
                      {s.confidenceAfter && ` · Confidence: ${s.confidenceAfter}/5`}
                    </div>
                  </div>
                  <div className="session-item__time">{formatDateTime(s.endedAt)}</div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="card card--empty">
          <p>No sessions yet. Start your first revision session now.</p>
          <button
            className="btn btn--primary mt-2"
            onClick={() => navigate('/session')}
          >
            Start your first session →
          </button>
        </section>
      )}
    </div>
  )
}
