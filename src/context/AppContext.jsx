import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { load, save, KEYS } from '../utils/storage.js'
import { YEAR8_REVISION_SEED } from '../data/year8RevisionSeed.js'
import { calculateSessionPoints, checkNewBadges } from '../utils/rewards.js'
import { now } from '../utils/dates.js'

const AppContext = createContext(null)

function buildInitialSubjects() {
  return YEAR8_REVISION_SEED.map((subject) => ({
    ...subject,
    topics: subject.topics.map((topic) => ({
      ...topic,
      checklistItems: topic.checklistItems.map((item) => ({ ...item })),
    })),
  }))
}

function sanitizeSubjects(loaded) {
  if (!Array.isArray(loaded) || loaded.length === 0) return buildInitialSubjects()
  return loaded.map((sub) => ({
    id: sub.id || '',
    name: sub.name || '',
    emoji: sub.emoji || '📚',
    color: sub.color || '#5b4cdb',
    description: sub.description || '',
    guidePageRange: sub.guidePageRange || '',
    ...sub,
    topics: Array.isArray(sub.topics)
      ? sub.topics.map((topic) => ({
          id: topic.id || '',
          title: topic.title || '',
          subjectId: topic.subjectId || sub.id || '',
          ...topic,
          checklistItems: Array.isArray(topic.checklistItems)
            ? topic.checklistItems.map((item) => ({
                status: 'not_started',
                confidence: null,
                lastRevisedAt: null,
                nextReviewAt: null,
                revisionCount: 0,
                ...item,
              }))
            : [],
        }))
      : [],
  }))
}

function sanitizeSessions(loaded) {
  if (!Array.isArray(loaded)) return []
  return loaded.filter((s) => s && typeof s === 'object' && s.id && s.subjectId)
}

function sanitizeRewards(loaded) {
  if (!loaded || typeof loaded !== 'object') return { points: 0, badges: [] }
  return {
    points: typeof loaded.points === 'number' ? loaded.points : 0,
    badges: Array.isArray(loaded.badges) ? loaded.badges : [],
  }
}

function sanitizeTopicQuizPrompts(loaded) {
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) return {}
  const result = {}
  for (const [key, val] of Object.entries(loaded)) {
    if (val && typeof val === 'object') {
      result[key] = {
        promptedAt: val.promptedAt || null,
        dismissedAt: val.dismissedAt || null,
        quizCompletedAt: val.quizCompletedAt || null,
      }
    }
  }
  return result
}

function getInitialState() {
  const profile = load(KEYS.PROFILE)
  const subjects = sanitizeSubjects(load(KEYS.SUBJECTS))
  const sessions = sanitizeSessions(load(KEYS.SESSIONS))
  const rewards = sanitizeRewards(load(KEYS.REWARDS))
  const settings = load(KEYS.SETTINGS) || { name: '', theme: 'light' }
  const topicQuizPrompts = sanitizeTopicQuizPrompts(load(KEYS.TOPIC_QUIZ_PROMPTS))
  return { profile, subjects, sessions, rewards, settings, newBadges: [], topicQuizPrompts }
}

// confidence 3 + score <50% → needs_review (otherwise practised)
function confidenceToStatus(confidence, currentStatus, sessionScore, sessionTotal) {
  if (confidence == null) return currentStatus
  if (confidence >= 4) return 'secure'
  if (confidence <= 2) return 'needs_review'
  if (sessionScore != null && sessionTotal != null && sessionTotal > 0) {
    if (sessionScore / sessionTotal < 0.5) return 'needs_review'
  }
  return 'practised'
}

function applyItemUpdate(subjects, subjectId, itemMatcher, updater) {
  return subjects.map((sub) => {
    if (sub.id !== subjectId) return sub
    return {
      ...sub,
      topics: sub.topics.map((topic) => ({
        ...topic,
        checklistItems: topic.checklistItems.map((item) =>
          itemMatcher(item) ? { ...item, ...updater(item) } : item
        ),
      })),
    }
  })
}

// Returns topicIds that transitioned from "has at least one not_started" to "none not_started".
function detectNewlyCompletedTopics(prevSubjects, nextSubjects, subjectId) {
  const prev = prevSubjects.find((s) => s.id === subjectId)
  const next = nextSubjects.find((s) => s.id === subjectId)
  if (!prev || !next) return []
  const newlyCompleted = []
  for (const topic of next.topics) {
    if (topic.checklistItems.length === 0) continue
    const prevTopic = prev.topics.find((t) => t.id === topic.id)
    if (!prevTopic) continue
    const hadNotStarted = prevTopic.checklistItems.some((i) => i.status === 'not_started')
    const hasNotStarted = topic.checklistItems.some((i) => i.status === 'not_started')
    if (hadNotStarted && !hasNotStarted) {
      newlyCompleted.push(topic.id)
    }
  }
  return newlyCompleted
}

function applyQuizPrompts(topicQuizPrompts, newlyCompletedTopicIds) {
  if (newlyCompletedTopicIds.length === 0) return topicQuizPrompts
  const promptTime = now()
  const updated = { ...topicQuizPrompts }
  for (const topicId of newlyCompletedTopicIds) {
    if (!updated[topicId]?.promptedAt) {
      updated[topicId] = { promptedAt: promptTime, dismissedAt: null, quizCompletedAt: null }
    }
  }
  return updated
}

function reducer(state, action) {
  switch (action.type) {

    case 'SETUP_PROFILE': {
      const profile = { name: action.name, createdAt: now() }
      const settings = { ...state.settings, name: action.name }
      return { ...state, profile, settings }
    }

    case 'UPDATE_CHECKLIST_ITEM': {
      const { subjectId, topicId, itemId, changes } = action
      const subjects = applyItemUpdate(
        state.subjects,
        subjectId,
        (item) => item.id === itemId && item.topicId === topicId,
        () => changes
      )
      return { ...state, subjects }
    }

    case 'SET_STATUS': {
      const { subjectId, topicId, itemId, status } = action
      const subjects = applyItemUpdate(
        state.subjects,
        subjectId,
        (item) => item.id === itemId,
        (item) => ({
          status,
          lastRevisedAt: now(),
          revisionCount: status !== 'not_started' ? item.revisionCount + 1 : item.revisionCount,
        })
      )
      let rewards = state.rewards
      const wasNotSecure = (() => {
        for (const sub of state.subjects) {
          if (sub.id !== subjectId) continue
          for (const topic of sub.topics) {
            if (topic.id !== topicId) continue
            for (const item of topic.checklistItems) {
              if (item.id === itemId) return item.status !== 'secure'
            }
          }
        }
        return false
      })()
      if (status === 'secure' && wasNotSecure) {
        rewards = { ...state.rewards, points: state.rewards.points + 5 }
      }
      const newlyCompleted = detectNewlyCompletedTopics(state.subjects, subjects, subjectId)
      const topicQuizPrompts = applyQuizPrompts(state.topicQuizPrompts, newlyCompleted)
      return { ...state, subjects, rewards, topicQuizPrompts }
    }

    case 'SET_CONFIDENCE': {
      const { subjectId, topicId, itemId, confidence } = action
      const subjects = applyItemUpdate(
        state.subjects,
        subjectId,
        (item) => item.id === itemId,
        () => ({ confidence })
      )
      return { ...state, subjects }
    }

    case 'COMPLETE_SESSION': {
      const session = { ...action.session, endedAt: now() }
      const sessions = [...state.sessions, session]

      let subjects = state.subjects
      let secureBonus = 0

      if (session.checklistItemIds && session.checklistItemIds.length > 0) {
        const prevSecureIds = new Set()
        for (const sub of state.subjects) {
          if (sub.id !== session.subjectId) continue
          for (const topic of sub.topics) {
            for (const item of topic.checklistItems) {
              if (item.status === 'secure') prevSecureIds.add(item.id)
            }
          }
        }

        subjects = state.subjects.map((sub) => {
          if (sub.id !== session.subjectId) return sub
          return {
            ...sub,
            topics: sub.topics.map((topic) => ({
              ...topic,
              checklistItems: topic.checklistItems.map((item) => {
                if (!session.checklistItemIds.includes(item.id)) return item
                const newStatus = confidenceToStatus(
                  session.confidenceAfter,
                  item.status,
                  session.score,
                  session.totalQuestions
                )
                if (newStatus === 'secure' && !prevSecureIds.has(item.id)) {
                  secureBonus += 5
                }
                return {
                  ...item,
                  status: newStatus,
                  lastRevisedAt: now(),
                  revisionCount: item.revisionCount + 1,
                  confidence: session.confidenceAfter ?? item.confidence,
                }
              }),
            })),
          }
        })
      }

      const earned = calculateSessionPoints(session) + secureBonus
      const updatedRewards = {
        ...state.rewards,
        points: state.rewards.points + earned,
      }
      const existingIds = updatedRewards.badges.map((b) => b.id)
      const newBadges = checkNewBadges(sessions, subjects, existingIds)
      updatedRewards.badges = [...updatedRewards.badges, ...newBadges]

      const newlyCompleted = detectNewlyCompletedTopics(state.subjects, subjects, session.subjectId)
      const topicQuizPrompts = applyQuizPrompts(state.topicQuizPrompts, newlyCompleted)

      return { ...state, subjects, sessions, rewards: updatedRewards, newBadges, topicQuizPrompts }
    }

    case 'CLEAR_NEW_BADGES':
      return { ...state, newBadges: [] }

    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.changes }
      return { ...state, settings }
    }

    case 'DISMISS_TOPIC_QUIZ_PROMPT': {
      const topicQuizPrompts = {
        ...state.topicQuizPrompts,
        [action.topicId]: {
          ...(state.topicQuizPrompts[action.topicId] || {}),
          dismissedAt: now(),
        },
      }
      return { ...state, topicQuizPrompts }
    }

    case 'COMPLETE_TOPIC_QUIZ_PROMPT': {
      const topicQuizPrompts = {
        ...state.topicQuizPrompts,
        [action.topicId]: {
          ...(state.topicQuizPrompts[action.topicId] || {}),
          quizCompletedAt: now(),
        },
      }
      return { ...state, topicQuizPrompts }
    }

    case 'IMPORT_DATA': {
      const d = action.data
      return {
        profile: d.PROFILE || state.profile,
        subjects: sanitizeSubjects(d.SUBJECTS),
        sessions: sanitizeSessions(d.SESSIONS),
        rewards: sanitizeRewards(d.REWARDS),
        settings: d.SETTINGS || state.settings,
        newBadges: [],
        topicQuizPrompts: sanitizeTopicQuizPrompts(d.TOPIC_QUIZ_PROMPTS),
      }
    }

    case 'RESET_ALL': {
      return {
        profile: null,
        subjects: buildInitialSubjects(),
        sessions: [],
        rewards: { points: 0, badges: [] },
        settings: { name: '', theme: 'light' },
        newBadges: [],
        topicQuizPrompts: {},
      }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState)

  useEffect(() => { save(KEYS.PROFILE, state.profile) }, [state.profile])
  useEffect(() => { save(KEYS.SUBJECTS, state.subjects) }, [state.subjects])
  useEffect(() => { save(KEYS.SESSIONS, state.sessions) }, [state.sessions])
  useEffect(() => { save(KEYS.REWARDS, state.rewards) }, [state.rewards])
  useEffect(() => { save(KEYS.SETTINGS, state.settings) }, [state.settings])
  useEffect(() => { save(KEYS.TOPIC_QUIZ_PROMPTS, state.topicQuizPrompts) }, [state.topicQuizPrompts])

  const setupProfile = useCallback((name) => dispatch({ type: 'SETUP_PROFILE', name }), [])

  const updateChecklistItem = useCallback((subjectId, topicId, itemId, changes) =>
    dispatch({ type: 'UPDATE_CHECKLIST_ITEM', subjectId, topicId, itemId, changes }), [])

  const setStatus = useCallback((subjectId, topicId, itemId, status) =>
    dispatch({ type: 'SET_STATUS', subjectId, topicId, itemId, status }), [])

  const setConfidence = useCallback((subjectId, topicId, itemId, confidence) =>
    dispatch({ type: 'SET_CONFIDENCE', subjectId, topicId, itemId, confidence }), [])

  const completeSession = useCallback((session) =>
    dispatch({ type: 'COMPLETE_SESSION', session }), [])

  const clearNewBadges = useCallback(() => dispatch({ type: 'CLEAR_NEW_BADGES' }), [])

  const updateSettings = useCallback((changes) => dispatch({ type: 'UPDATE_SETTINGS', changes }), [])

  const importData = useCallback((data) => dispatch({ type: 'IMPORT_DATA', data }), [])

  const resetAll = useCallback(() => dispatch({ type: 'RESET_ALL' }), [])

  const dismissTopicQuizPrompt = useCallback((topicId) =>
    dispatch({ type: 'DISMISS_TOPIC_QUIZ_PROMPT', topicId }), [])

  const completeTopicQuizPrompt = useCallback((topicId) =>
    dispatch({ type: 'COMPLETE_TOPIC_QUIZ_PROMPT', topicId }), [])

  return (
    <AppContext.Provider value={{
      ...state,
      setupProfile,
      updateChecklistItem,
      setStatus,
      setConfidence,
      completeSession,
      clearNewBadges,
      updateSettings,
      importData,
      resetAll,
      dismissTopicQuizPrompt,
      completeTopicQuizPrompt,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
