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

function getInitialState() {
  const profile = load(KEYS.PROFILE)
  const subjects = load(KEYS.SUBJECTS) || buildInitialSubjects()
  const sessions = load(KEYS.SESSIONS) || []
  const rewards = load(KEYS.REWARDS) || { points: 0, badges: [] }
  const settings = load(KEYS.SETTINGS) || { name: '', theme: 'light' }
  return { profile, subjects, sessions, rewards, settings, newBadges: [] }
}

function confidenceToStatus(confidence, currentStatus) {
  if (confidence == null) return currentStatus
  if (confidence >= 4) return 'secure'
  if (confidence <= 2) return 'needs_review'
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
      // Award secure bonus if newly secure
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
      return { ...state, subjects, rewards }
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
        // Track which items were not secure before this session
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
                const newStatus = confidenceToStatus(session.confidenceAfter, item.status)
                // Track newly secured items
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

      return { ...state, subjects, sessions, rewards: updatedRewards, newBadges }
    }

    case 'CLEAR_NEW_BADGES':
      return { ...state, newBadges: [] }

    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.changes }
      return { ...state, settings }
    }

    case 'IMPORT_DATA': {
      const d = action.data
      return {
        profile: d.PROFILE || state.profile,
        subjects: d.SUBJECTS || buildInitialSubjects(),
        sessions: d.SESSIONS || [],
        rewards: d.REWARDS || { points: 0, badges: [] },
        settings: d.SETTINGS || state.settings,
        newBadges: [],
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
