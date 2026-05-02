import React from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar.jsx'
import { getSubjectProgress, getSubjectLastRevised } from '../utils/planner.js'

export default function SubjectCard({ subject, showDetail = false }) {
  const navigate = useNavigate()
  const progress = getSubjectProgress(subject)
  const lastRevised = getSubjectLastRevised(subject)

  const lastRevisedLabel = lastRevised
    ? new Date(lastRevised).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'Not revised yet'

  return (
    <button
      className="subject-card"
      style={{ '--subject-color': subject.color }}
      onClick={() => navigate(`/subjects/${subject.id}`)}
    >
      <div className="subject-card__header">
        <span className="subject-card__emoji">{subject.emoji}</span>
        <div className="subject-card__info">
          <div className="subject-card__name">{subject.name}</div>
          {showDetail && (
            <div className="subject-card__desc">{subject.description}</div>
          )}
        </div>
        <div className="subject-card__pct" style={{ color: subject.color }}>
          {progress.pct}%
        </div>
      </div>

      <ProgressBar pct={progress.pct} color={subject.color} height={6} />

      <div className="subject-card__stats">
        <span>{progress.done}/{progress.total} done</span>
        {progress.secure > 0 && (
          <span className="tag tag--success">🔒 {progress.secure} secure</span>
        )}
        {progress.needsReview > 0 && (
          <span className="tag tag--danger">⚠ {progress.needsReview} review</span>
        )}
        {progress.notStarted > 0 && (
          <span className="tag tag--warn">{progress.notStarted} to start</span>
        )}
        <span className="subject-card__last-revised">{lastRevisedLabel}</span>
      </div>
    </button>
  )
}
