import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: '⊞' },
  { to: '/subjects', label: 'Subjects', icon: '📚' },
  { to: '/session', label: 'Revise', icon: '▶' },
  { to: '/progress', label: 'Progress', icon: '◎' },
  { to: '/parent', label: 'Parent', icon: '👤' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          end={to === '/dashboard'}
        >
          <span className="bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
