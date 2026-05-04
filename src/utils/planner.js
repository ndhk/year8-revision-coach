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

// Maps each checklistItemId to the most recent quiz score ratio (0–1).
// Only considers sessions that have checklistItemIds and a score.
export function buildRecentScoreMap(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0)
  )
  const map = {}
  for (const session of sorted) {
    if (!session.checklistItemIds || session.score == null || !session.totalQuestions) continue
    const ratio = session.score / session.totalQuestions
    for (const id of session.checklistItemIds) {
      if (!(id in map)) map[id] = ratio
    }
  }
  return map
}

// Priority order: low confidence > needs_review > low quiz score > revised-not-secure > not-started > stale > core subject
export function scoreItem(item, recentScoreMap = {}) {
  let score = 0
  if (item.confidence !== null && item.confidence <= 2) score += 120
  if (item.status === 'needs_review') score += 100
  const recentRatio = recentScoreMap[item.id]
  if (recentRatio !== undefined && recentRatio < 0.5) score += 80
  if (['practised', 'learned', 'tested'].includes(item.status)) score += 60
  if (item.status === 'not_started') score += 50
  if (isOverdue(item.lastRevisedAt, 7)) score += 35
  if (PRIORITY_SUBJECTS.includes(item.subjectId)) score += 15
  return score
}

export function getItemReason(item, recentScoreMap = {}) {
  if (item.confidence !== null && item.confidence <= 2) return 'Low confidence'
  if (item.status === 'needs_review') return 'Needs review'
  const recentRatio = recentScoreMap[item.id]
  if (recentRatio !== undefined && recentRatio < 0.5) return 'Low quiz score'
  if (item.status === 'not_started') return 'Not started'
  if (isOverdue(item.lastRevisedAt, 7)) return 'Not revised recently'
  if (PRIORITY_SUBJECTS.includes(item.subjectId)) return 'Core subject'
  return 'Low revision count'
}

export function getSuggestedItems(subjects, limit = 3, sessions = []) {
  const recentScoreMap = buildRecentScoreMap(sessions)
  const all = getAllChecklistItems(subjects)
  const unfinished = all.filter((i) => i.status !== 'secure')
  return unfinished
    .map((item) => ({ ...item, _score: scoreItem(item, recentScoreMap), reason: getItemReason(item, recentScoreMap) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

// Items that are hard: low confidence, low quiz score, or needs_review (excluding secure).
export function getHardItems(subjects, sessions = [], limit = 5) {
  const recentScoreMap = buildRecentScoreMap(sessions)
  return getAllChecklistItems(subjects)
    .filter((i) => {
      if (i.status === 'secure') return false
      if (i.confidence !== null && i.confidence <= 2) return true
      const ratio = recentScoreMap[i.id]
      if (ratio !== undefined && ratio < 0.5) return true
      if (i.status === 'needs_review') return true
      return false
    })
    .map((item) => ({ ...item, _score: scoreItem(item, recentScoreMap), reason: getItemReason(item, recentScoreMap) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

// Topics where all items have been touched and a quiz hasn't been taken/dismissed yet.
export function getTopicQuizReadyList(subjects, topicQuizPrompts = {}) {
  const ready = []
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const prompt = topicQuizPrompts[topic.id]
      if (!prompt?.promptedAt) continue
      if (prompt.dismissedAt || prompt.quizCompletedAt) continue
      ready.push({ topic, subject })
    }
  }
  return ready
}

export function getSubjectProgress(subject) {
  let total = 0
  let done = 0
  let weighted = 0
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
