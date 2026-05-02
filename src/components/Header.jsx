import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/subjects': 'Subjects',
  '/session': 'Revision Session',
  '/progress': 'My Progress',
  '/parent': 'Parent View',
  '/settings': 'Settings',
  '/flashcards': 'Flashcards',
}

export default function Header() {
  const { rewards } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const pathKey = '/' + location.pathname.split('/')[1]
  const title = TITLES[pathKey] || 'Year 8 Revision'

  const canGoBack = location.pathname.split('/').length > 2 ||
    (location.pathname.startsWith('/subjects/') && location.pathname !== '/subjects')

  return (
    <header className="app-header">
      <div className="app-header__left">
        {canGoBack ? (
          <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
            ‹
          </button>
        ) : (
          <span className="app-header__logo">✏️</span>
        )}
      </div>
      <h1 className="app-header__title">{title}</h1>
      <div className="app-header__right">
        <button
          className="app-header__points"
          onClick={() => navigate('/progress')}
          aria-label={`${rewards.points} points — view progress`}
        >
          ⭐ {rewards.points}
        </button>
        <button
          className="btn-icon"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
