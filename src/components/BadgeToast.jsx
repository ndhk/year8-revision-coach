import React, { useEffect } from 'react'
import { getBadgeById } from '../utils/rewards.js'

export default function BadgeToast({ badges, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const defs = badges.map((b) => getBadgeById(b.id)).filter(Boolean)
  if (!defs.length) return null

  return (
    <div className="badge-toast" onClick={onClose}>
      <div className="badge-toast__inner">
        <span className="badge-toast__emoji">{defs[0].emoji}</span>
        <div>
          <div className="badge-toast__title">Badge Unlocked!</div>
          <div className="badge-toast__name">{defs[0].title}</div>
          <div className="badge-toast__desc">{defs[0].description}</div>
        </div>
      </div>
    </div>
  )
}
