import { BADGE_DEFINITIONS } from '../data/badges.js'

export const POINTS_PER_SESSION = 10
export const POINTS_CONFIDENCE_BONUS = { 4: 5, 5: 10 }

export function calculateSessionPoints(session) {
  let points = POINTS_PER_SESSION
  if (session.confidenceAfter >= 5) points += POINTS_CONFIDENCE_BONUS[5]
  else if (session.confidenceAfter >= 4) points += POINTS_CONFIDENCE_BONUS[4]
  return points
}

export function checkNewBadges(sessions, subjects, existingBadgeIds) {
  const newBadges = []
  for (const def of BADGE_DEFINITIONS) {
    if (existingBadgeIds.includes(def.id)) continue
    if (def.condition(sessions, subjects)) {
      newBadges.push({ id: def.id, earnedAt: new Date().toISOString() })
    }
  }
  return newBadges
}

export function getBadgeById(id) {
  return BADGE_DEFINITIONS.find((b) => b.id === id)
}

export function levelFromPoints(points) {
  if (points < 50) return { level: 1, title: 'Getting Started' }
  if (points < 150) return { level: 2, title: 'Building Momentum' }
  if (points < 300) return { level: 3, title: 'Making Progress' }
  if (points < 500) return { level: 4, title: 'On Track' }
  if (points < 750) return { level: 5, title: 'Serious Reviser' }
  return { level: 6, title: 'Exam Ready' }
}
