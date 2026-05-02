import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Flashcards() {
  const navigate = useNavigate()
  return (
    <div className="screen screen--centered">
      <div className="placeholder-screen">
        <div className="placeholder-screen__icon">🃏</div>
        <h2>Flashcards</h2>
        <p>
          Interactive flashcards and quizzes are coming soon. For now, use
          the <strong>Revision Session</strong> screen to track your work.
        </p>
        <button className="btn btn--primary" onClick={() => navigate('/session')}>
          Go to Revision Session
        </button>
      </div>
    </div>
  )
}
