import React, { useEffect } from 'react'
import Header from './Header.jsx'
import BottomNav from './BottomNav.jsx'
import BadgeToast from './BadgeToast.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function Layout({ children }) {
  const { newBadges, clearNewBadges } = useApp()

  return (
    <div className="app-shell">
      <Header />
      <main className="app-content">
        {children}
      </main>
      <BottomNav />
      {newBadges.length > 0 && (
        <BadgeToast badges={newBadges} onClose={clearNewBadges} />
      )}
    </div>
  )
}
