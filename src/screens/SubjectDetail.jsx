import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import ChecklistItemRow from '../components/ChecklistItemRow.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { getSubjectProgress } from '../utils/planner.js'
import { hasActivities } from '../data/activities.js'

export default function SubjectDetail() {
  const { subjectId } = useParams()
  const { subjects, topicQuizPrompts, dismissTopicQuizPrompt } = useApp()
  const navigate = useNavigate()
  const [openTopics, setOpenTopics] = useState({})

  const subject = subjects.find((s) => s.id === subjectId)
  if (!subject) return <div className="screen"><p>Subject not found.</p></div>

  const progress = getSubjectProgress(subject)

  function toggleTopic(topicId) {
    setOpenTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }))
  }

  return (
    <div className="screen">
      {/* Subject header */}
      <div className="subject-header" style={{ '--subject-color': subject.color }}>
        <div className="subject-header__top">
          <span className="subject-header__emoji">{subject.emoji}</span>
          <div>
            <h2 className="subject-header__name">{subject.name}</h2>
            <p className="subject-header__desc">{subject.description}</p>
          </div>
        </div>
        <div className="subject-header__progress">
          <ProgressBar pct={progress.pct} color={subject.color} height={10} />
          <div className="subject-header__stats">
            <span>{progress.done}/{progress.total} items covered</span>
            <span style={{ color: subject.color }}>{progress.pct}%</span>
          </div>
        </div>
      </div>

      <button
        className="btn btn--primary btn--full mb-3"
        onClick={() => navigate(`/session/${subject.id}`)}
      >
        ▶ Start a revision session
      </button>
      {hasActivities(subject.id) && (
        <button
          className="btn btn--secondary btn--full mb-3"
          onClick={() => navigate(`/activity/${subject.id}`)}
        >
          🎯 Try activities
        </button>
      )}

      {/* Topics */}
      {subject.topics.map((topic) => {
        const isOpen = openTopics[topic.id] !== false
        const topicDone = topic.checklistItems.filter((c) => c.status !== 'not_started').length
        const topicTotal = topic.checklistItems.length
        const prompt = topicQuizPrompts?.[topic.id]
        const showQuizPrompt = prompt?.promptedAt && !prompt.dismissedAt && !prompt.quizCompletedAt

        return (
          <div key={topic.id} className="topic-block">
            <button
              className="topic-block__header"
              onClick={() => toggleTopic(topic.id)}
            >
              <div className="topic-block__title-row">
                <span className="topic-block__title">{topic.title}</span>
                <span className="topic-block__count">{topicDone}/{topicTotal}</span>
              </div>
              <ProgressBar
                pct={Math.round((topicDone / topicTotal) * 100)}
                color={subject.color}
                height={4}
              />
              <span className="topic-block__chevron">{isOpen !== false ? '▲' : '▼'}</span>
            </button>

            {showQuizPrompt && (
              <div className="topic-quiz-prompt">
                <span className="topic-quiz-prompt__text">
                  🎉 All items touched — ready for a quiz?
                </span>
                <div className="topic-quiz-prompt__actions">
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate(`/activity/${subject.id}`, { state: { topicId: topic.id } })}
                  >
                    Start quiz
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => dismissTopicQuizPrompt(topic.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {isOpen !== false && (
              <div className="topic-block__items">
                {topic.checklistItems.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    subjectId={subject.id}
                    topicId={topic.id}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
