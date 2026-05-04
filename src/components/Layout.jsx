import React, { useEffect } from 'react'
import Header from './Header.jsx'
import BottomNav from './BottomNav.jsx'
import BadgeToast from './BadgeToast.jsx'
import ActiveSessionBanner from './ActiveSessionBanner.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useActiveSession } from '../context/ActiveSessionContext.jsx'

export default function Layout({ children }) {
  const { newBadges, clearNewBadges } = useApp()
  const { activeSession } = useActiveSession()
  const hasBanner = !!(activeSession && activeSession.status === 'active')

  return (
    <div className={`app-shell${hasBanner ? ' app-shell--has-banner' : ''}`}>
      <Header />
      <ActiveSessionBanner />
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
