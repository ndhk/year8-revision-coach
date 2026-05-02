import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  getSubjectProgress,
  getOverallProgress,
  getAllChecklistItems,
  getSessionsThisWeek,
  getSubjectsNotTouchedRecently,
  getSuggestedItems,
} from '../utils/planner.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { daysUntilAssessment, daysSince } from '../utils/dates.js'

const QUESTION_TEMPLATES = [
  (title) => `Can you explain "${title}" in your own words?`,
  (title) => `Can you give me an example of ${title}?`,
  (title) => `Can you teach me about ${title} without looking at your notes?`,
  (title) => `What would a test question on "${title}" look like?`,
  (title) => `What is the most important thing to remember about ${title}?`,
]

function pickTemplate(index) {
  return QUESTION_TEMPLATES[index % QUESTION_TEMPLATES.length]
}

function buildPraise(sessions, subjects, profile) {
  const thisWeek = getSessionsThisWeek(sessions)
  const allItems = getAllChecklistItems(subjects)
  const secureCount = allItems.filter((i) => i.status === 'secure').length
  const highConfSessions = sessions.filter((s) => s.confidenceAfter >= 4)

  // Most specific praise in priority order
  if (highConfSessions.length > 0) {
    const subjectIds = [...new Set(highConfSessions.map((s) => s.subjectId))]
    const names = subjectIds
      .map((id) => subjects.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
    if (names.length > 0) {
      return `${profile.name} has shown strong confidence in ${names.join(' and ')} — great progress.`
    }
  }
  if (secureCount > 0) {
    return `${secureCount} item${secureCount !== 1 ? 's have' : ' has'} been locked as Secure — ${profile.name} is building solid knowledge.`
  }
  if (thisWeek.length > 0) {
    return `${thisWeek.length} revision session${thisWeek.length !== 1 ? 's' : ''} completed this week — a solid start.`
  }
  if (sessions.length > 0) {
    return `${sessions.length} revision session${sessions.length !== 1 ? 's' : ''} completed so far — keep the momentum going.`
  }
  return `No sessions yet. Encourage ${profile.name} to start with one 15-minute session today.`
}

function buildNextAction(suggested, subjects, profile) {
  if (suggested.length === 0) {
    return `All items have been attempted. Encourage ${profile.name} to push more items to Secure status.`
  }
  const top = suggested[0]
  const sub = subjects.find((s) => s.id === top.subjectId)
  if (top.status === 'needs_review') {
    return `Ask ${profile.name} to revisit "${top.title}" in ${sub?.name} — it was flagged as needing review.`
  }
  if (top.status === 'not_started') {
    return `Suggest ${profile.name} starts "${top.title}" in ${sub?.name} — it hasn't been touched yet.`
  }
  return `Encourage ${profile.name} to review "${top.title}" in ${sub?.name} (${top.topicTitle}).`
}

function getTopAttentionItems(subjects, limit = 5) {
  const all = getAllChecklistItems(subjects)
  return all
    .filter((i) => i.status !== 'secure')
    .sort((a, b) => {
      let scoreA = 0
      let scoreB = 0
      if (a.status === 'not_started') scoreA += 10
      if (b.status === 'not_started') scoreB += 10
      if (a.status === 'needs_review') scoreA += 8
      if (b.status === 'needs_review') scoreB += 8
      if (a.confidence !== null && a.confidence <= 2) scoreA += 6
      if (b.confidence !== null && b.confidence <= 2) scoreB += 6
      const dA = daysSince(a.lastRevisedAt)
      const dB = daysSince(b.lastRevisedAt)
      if (dA === null || dA >= 7) scoreA += 4
      if (dB === null || dB >= 7) scoreB += 4
      return scoreB - scoreA
    })
    .slice(0, limit)
}

export default function ParentDashboard() {
  const { subjects, sessions, profile } = useApp()
  const daysLeft = daysUntilAssessment()
  const overall = getOverallProgress(subjects)
  const thisWeek = getSessionsThisWeek(sessions)
  const notTouched = getSubjectsNotTouchedRecently(subjects, sessions, 7)
  const suggested = getSuggestedItems(subjects, 3)
  const praise = buildPraise(sessions, subjects, profile)
  const nextAction = buildNextAction(suggested, subjects, profile)
  const topAttention = getTopAttentionItems(subjects, 5)
  const coveredSubjectIds = new Set(sessions.map((s) => s.subjectId))

  const allItems = getAllChecklistItems(subjects)
  const questionCandidates = allItems
    .filter((i) => i.status !== 'secure')
    .sort((a, b) => {
      const scoreA = (a.status === 'not_started' ? 3 : 0) + (a.confidence !== null && a.confidence <= 2 ? 2 : 0)
      const scoreB = (b.status === 'not_started' ? 3 : 0) + (b.confidence !== null && b.confidence <= 2 ? 2 : 0)
      return scoreB - scoreA
    })
    .slice(0, 5)

  const subjectsSorted = [...subjects].sort((a, b) => {
    const pa = getSubjectProgress(a)
    const pb = getSubjectProgress(b)
    return pa.pct - pb.pct
  })

  return (
    <div className="screen">
      <div className="parent-header">
        <h2 className="parent-header__title">Parent View</h2>
        <p className="parent-header__sub">
          Revision progress for <strong>{profile?.name}</strong>
          {' · '}Assessment week in <strong>{daysLeft} days</strong>
          {' (26 May – 2 June 2026)'}
        </p>
      </div>

      {/* Praise + next action */}
      <section className="card card--praise">
        <h3 className="card__title">Effort summary</h3>
        <p className="praise-single">{praise}</p>
        <div className="parent-next-action">
          <span className="parent-next-action__label">Suggested next:</span>
          <span className="parent-next-action__text">{nextAction}</span>
        </div>
      </section>

      {/* At a glance */}
      <section className="card">
        <h3 className="card__title">At a glance</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-box__value">{overall.pct}%</div>
            <div className="stat-box__label">Coverage</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{sessions.length}</div>
            <div className="stat-box__label">Total sessions</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{thisWeek.length}</div>
            <div className="stat-box__label">This week</div>
          </div>
          <div className="stat-box">
            <div className="stat-box__value">{coveredSubjectIds.size}/{subjects.length}</div>
            <div className="stat-box__label">Subjects started</div>
          </div>
        </div>
      </section>

      {/* Subject progress */}
      <section className="card">
        <h3 className="card__title">Subject progress</h3>
        <div className="subject-progress-list">
          {subjectsSorted.map((subject) => {
            const p = getSubjectProgress(subject)
            const started = coveredSubjectIds.has(subject.id)
            return (
              <div key={subject.id} className="subject-progress-item">
                <div className="subject-progress-item__header">
                  <span>{subject.emoji} {subject.name}</span>
                  <div className="subject-progress-item__tags">
                    {!started && <span className="tag tag--warn">Not started</span>}
                    {p.secure > 0 && <span className="tag tag--success">🔒 {p.secure} secure</span>}
                    {p.needsReview > 0 && <span className="tag tag--danger">⚠ {p.needsReview} review</span>}
                    <span style={{ color: subject.color, fontWeight: 700 }}>{p.pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={p.pct} color={subject.color} height={6} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Top 5 items needing attention */}
      {topAttention.length > 0 ? (
        <section className="card">
          <h3 className="card__title">Top 5 items needing attention</h3>
          <div className="parent-item-list">
            {topAttention.map((item, idx) => {
              const sub = subjects.find((s) => s.id === item.subjectId)
              const reasonLabel =
                item.status === 'not_started'
                  ? 'Not started'
                  : item.status === 'needs_review'
                  ? 'Needs review'
                  : item.confidence !== null && item.confidence <= 2
                  ? `Confidence ${item.confidence}/5`
                  : 'Not revised recently'
              return (
                <div key={item.id} className="parent-item">
                  <span className="parent-item__num">{idx + 1}</span>
                  <div className="parent-item__body">
                    <span className="parent-item__subject">{sub?.emoji} {sub?.name}</span>
                    <span className="parent-item__title">{item.title}</span>
                  </div>
                  <span className={`tag ${item.status === 'not_started' ? 'tag--warn' : item.status === 'needs_review' ? 'tag--danger' : 'tag--muted'}`}>
                    {reasonLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="card card--empty">
          <p>All items have been attempted — no urgent gaps found.</p>
        </section>
      )}

      {/* Subjects not touched recently */}
      {notTouched.length > 0 && (
        <section className="card">
          <h3 className="card__title">Not revised in the last 7 days</h3>
          <div className="not-touched-list">
            {notTouched.map((sub) => (
              <div key={sub.id} className="not-touched-item">
                <span>{sub.emoji} {sub.name}</span>
                <span className="tag tag--muted">Not recent</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested parent questions */}
      <section className="card">
        <h3 className="card__title">Questions to ask</h3>
        <p className="muted-text mb-2">
          Pick one to test understanding without notes.
        </p>
        {questionCandidates.length === 0 ? (
          <p className="muted-text">All items are secure — ask anything!</p>
        ) : (
          <ol className="parent-questions-list">
            {questionCandidates.map((item, idx) => {
              const sub = subjects.find((s) => s.id === item.subjectId)
              const question = pickTemplate(idx)(item.title)
              return (
                <li key={item.id} className="parent-question-item">
                  <div className="parent-question-item__subject">
                    {sub?.emoji} {sub?.name} — {item.topicTitle}
                  </div>
                  <div className="parent-question-item__q">{question}</div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
