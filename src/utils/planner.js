import { isOverdue, daysSince } from './dates.js'

const PRIORITY_SUBJECTS = ['maths', 'english', 'science', 'french']

const STATUS_WEIGHT = {
  not_started: 0,
  needs_review: 0.2,
  learned: 0.35,
  practised: 0.6,
  tested: 0.8,
  secure: 1.0,
}

export function getAllChecklistItems(subjects) {
  const items = []
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      for (const item of topic.checklistItems) {
        items.push({
          ...item,
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: topic.id,
          topicTitle: topic.title,
        })
      }
    }
  }
  return items
}

export function getItemReason(item) {
  if (item.status === 'not_started') return 'Not started'
  if (item.status === 'needs_review') return 'Needs review'
  if (item.confidence !== null && item.confidence <= 2) return 'Low confidence'
  if (isOverdue(item.lastRevisedAt, 7)) return 'Not revised recently'
  if (PRIORITY_SUBJECTS.includes(item.subjectId)) return 'Core subject'
  return 'Low revision count'
}

export function scoreItem(item) {
  let score = 0
  if (item.status === 'not_started') score += 100
  if (item.status === 'needs_review') score += 80
  if (item.confidence !== null && item.confidence <= 2) score += 60
  if (isOverdue(item.lastRevisedAt, 7)) score += 40
  if (PRIORITY_SUBJECTS.includes(item.subjectId)) score += 20
  if (item.revisionCount === 0) score += 15
  if (item.revisionCount < 3) score += 5
  return score
}

export function getSuggestedItems(subjects, limit = 3) {
  const all = getAllChecklistItems(subjects)
  const unfinished = all.filter((i) => i.status !== 'secure')
  return unfinished
    .map((item) => ({ ...item, _score: scoreItem(item), reason: getItemReason(item) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

export function getSubjectProgress(subject) {
  let total = 0
  let done = 0        // items touched (not_started = 0, anything else = 1)
  let weighted = 0    // weighted sum using STATUS_WEIGHT
  let secure = 0
  let notStarted = 0
  let lowConfidence = 0
  let needsReview = 0
  let confidenceSum = 0
  let confidenceCount = 0

  for (const topic of (subject.topics || [])) {
    for (const item of (topic.checklistItems || [])) {
      total++
      const w = STATUS_WEIGHT[item.status] ?? 0
      weighted += w
      if (item.status !== 'not_started') done++
      if (item.status === 'secure') secure++
      if (item.status === 'not_started') notStarted++
      if (item.status === 'needs_review') needsReview++
      if (item.confidence !== null && item.confidence <= 2) lowConfidence++
      if (item.confidence !== null) {
        confidenceSum += item.confidence
        confidenceCount++
      }
    }
  }

  const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : null
  return {
    total,
    done,
    secure,
    notStarted,
    lowConfidence,
    needsReview,
    avgConfidence,
    pct: total > 0 ? Math.round((weighted / total) * 100) : 0,
  }
}

export function getOverallProgress(subjects) {
  let total = 0
  let done = 0
  let weighted = 0
  let secure = 0
  let needsReview = 0
  for (const subject of (subjects || [])) {
    for (const topic of (subject.topics || [])) {
      for (const item of (topic.checklistItems || [])) {
        total++
        const w = STATUS_WEIGHT[item.status] ?? 0
        weighted += w
        if (item.status !== 'not_started') done++
        if (item.status === 'secure') secure++
        if (item.status === 'needs_review') needsReview++
      }
    }
  }
  return {
    total,
    done,
    secure,
    needsReview,
    pct: total > 0 ? Math.round((weighted / total) * 100) : 0,
  }
}

export function getSubjectLastRevised(subject) {
  let latest = null
  for (const topic of subject.topics) {
    for (const item of topic.checklistItems) {
      if (item.lastRevisedAt) {
        if (!latest || new Date(item.lastRevisedAt) > new Date(latest)) {
          latest = item.lastRevisedAt
        }
      }
    }
  }
  return latest
}

export function getSubjectsNeedingAttention(subjects, limit = 3) {
  return subjects
    .map((s) => ({ ...s, _progress: getSubjectProgress(s) }))
    .filter((s) => s._progress.pct < 80)
    .sort((a, b) => {
      const aScore = a._progress.notStarted * 3 + a._progress.lowConfidence * 2 + a._progress.needsReview * 2
      const bScore = b._progress.notStarted * 3 + b._progress.lowConfidence * 2 + b._progress.needsReview * 2
      return bScore - aScore
    })
    .slice(0, limit)
}

export function getStrongestSubjects(subjects, limit = 3) {
  return subjects
    .map((s) => {
      const p = getSubjectProgress(s)
      const avgConf = p.avgConfidence || 0
      const score = p.pct * 0.6 + avgConf * 8
      return { ...s, _progress: p, _score: score }
    })
    .filter((s) => s._progress.done > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

export function getWeakestSubjects(subjects, limit = 3) {
  return subjects
    .map((s) => {
      const p = getSubjectProgress(s)
      const avgConf = p.avgConfidence || 3
      const weakScore = (100 - p.pct) * 0.5 + (5 - avgConf) * 8 + p.needsReview * 5
      return { ...s, _progress: p, _weakScore: weakScore }
    })
    .sort((a, b) => b._weakScore - a._weakScore)
    .slice(0, limit)
}

export function getSessionsThisWeek(sessions) {
  return sessions.filter((s) => {
    const d = daysSince(s.startedAt)
    return d !== null && d <= 6
  })
}

export function getWeakItems(subjects) {
  return getAllChecklistItems(subjects).filter(
    (i) => i.confidence !== null && i.confidence <= 2
  )
}

export function getNotStartedItems(subjects) {
  return getAllChecklistItems(subjects).filter((i) => i.status === 'not_started')
}

export function getNeedsReviewItems(subjects) {
  return getAllChecklistItems(subjects).filter((i) => i.status === 'needs_review')
}

export function getSubjectsNotTouchedRecently(subjects, sessions, thresholdDays = 7) {
  const recentSubjectIds = new Set(
    sessions
      .filter((s) => {
        const d = daysSince(s.startedAt)
        return d !== null && d <= thresholdDays
      })
      .map((s) => s.subjectId)
  )
  return subjects.filter((s) => !recentSubjectIds.has(s.id))
}
