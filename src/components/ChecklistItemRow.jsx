import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfidenceRater from './ConfidenceRater.jsx'
import { useApp } from '../context/AppContext.jsx'

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'learned', label: 'Learned' },
  { value: 'practised', label: 'Practised' },
  { value: 'tested', label: 'Tested' },
  { value: 'secure', label: 'Secure ✓' },
  { value: 'needs_review', label: 'Needs review' },
]

const STATUS_COLORS = {
  not_started: '#94a3b8',
  learned: '#3b82f6',
  practised: '#8b5cf6',
  tested: '#f59e0b',
  secure: '#10b981',
  needs_review: '#ef4444',
}

export default function ChecklistItemRow({ item, subjectId, topicId }) {
  const { setStatus, setConfidence } = useApp()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const statusColor = STATUS_COLORS[item.status] || '#94a3b8'
  const isSecure = item.status === 'secure'

  function handleStatusChange(e) {
    setStatus(subjectId, topicId, item.id, e.target.value)
  }

  function handleStartSession(e) {
    e.stopPropagation()
    navigate(`/session/${subjectId}`, { state: { topicId, itemId: item.id } })
  }

  const lastRevised = item.lastRevisedAt
    ? new Date(item.lastRevisedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className={`checklist-item${isSecure ? ' checklist-item--secure' : ''}`}>
      {/* Always-visible row */}
      <div className="checklist-item__main">
        <div
          className="checklist-item__text"
          onClick={() => setExpanded((e) => !e)}
          style={{ cursor: 'pointer' }}
        >
          <div className="checklist-item__title">{item.title}</div>
          <div className="checklist-item__row2">
            {lastRevised ? (
              <span className="checklist-item__meta-inline">
                Last revised {lastRevised}
                {item.revisionCount > 0 && ` · ${item.revisionCount}×`}
              </span>
            ) : (
              <span className="checklist-item__meta-inline checklist-item__meta-inline--none">
                Not revised yet
              </span>
            )}
          </div>
        </div>

        <div className="checklist-item__controls" onClick={(e) => e.stopPropagation()}>
          <select
            className="status-select"
            value={item.status}
            onChange={handleStatusChange}
            style={{ '--status-color': statusColor }}
            aria-label={`Status for ${item.title}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            className="btn-start-session"
            onClick={handleStartSession}
            title="Start a revision session on this item"
          >
            ▶
          </button>
        </div>

        <button
          className="checklist-item__chevron-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="checklist-item__detail">
          {item.detail && <p className="checklist-item__detail-text">{item.detail}</p>}

          <div className="checklist-item__confidence-row">
            <span className="checklist-item__confidence-label">Confidence:</span>
            <ConfidenceRater
              value={item.confidence}
              onChange={(c) => setConfidence(subjectId, topicId, item.id, c)}
              size="sm"
            />
          </div>

          <div className="checklist-item__detail-actions">
            <button
              className="btn btn--secondary"
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              onClick={handleStartSession}
            >
              ▶ Start session on this item
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
