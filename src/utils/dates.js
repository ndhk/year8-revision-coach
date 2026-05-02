export const ASSESSMENT_START = new Date('2026-05-26T00:00:00')
export const ASSESSMENT_END = new Date('2026-06-02T23:59:59')

export function daysUntilAssessment() {
  const now = new Date()
  const diff = ASSESSMENT_START - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isAssessmentWeek() {
  const now = new Date()
  return now >= ASSESSMENT_START && now <= ASSESSMENT_END
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysSince(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function isOverdue(isoString, thresholdDays = 7) {
  const d = daysSince(isoString)
  return d === null || d >= thresholdDays
}

export function now() {
  return new Date().toISOString()
}
