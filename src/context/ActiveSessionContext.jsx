import React, { createContext, useContext, useState, useCallback } from 'react'
import { load, save, clear, KEYS } from '../utils/storage.js'
import { useApp } from './AppContext.jsx'
import { now } from '../utils/dates.js'

const ActiveSessionContext = createContext(null)

function loadSavedSession() {
  const saved = load(KEYS.ACTIVE_SESSION)
  return saved && saved.status === 'active' ? saved : null
}

export function ActiveSessionProvider({ children }) {
  const { completeSession } = useApp()
  const [activeSession, setActiveSession] = useState(loadSavedSession)

  const persist = useCallback((session) => {
    setActiveSession(session)
    if (session) {
      save(KEYS.ACTIVE_SESSION, session)
    } else {
      clear(KEYS.ACTIVE_SESSION)
    }
  }, [])

  const startActiveSession = useCallback((payload) => {
    const startedAt = now()
    const durationMinutes = payload.durationMinutes || 15
    const targetEndAt = new Date(
      new Date(startedAt).getTime() + durationMinutes * 60 * 1000
    ).toISOString()

    const session = {
      id: `session_${Date.now()}`,
      subjectId: payload.subjectId,
      topicId: payload.topicId || null,
      checklistItemIds: payload.checklistItemIds || [],
      activityId: payload.activityId || null,
      activityType: payload.activityType || 'revision',
      method: payload.method || 'read_notes',
      startedAt,
      targetEndAt,
      durationMinutes,
      status: 'active',
      notesDraft: '',
      answersDraft: null,
      scoreDraft: null,
      totalQuestionsDraft: null,
      confidenceDraft: null,
    }
    persist(session)
    return session
  }, [persist])

  const updateActiveSessionDraft = useCallback((patch) => {
    setActiveSession((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      save(KEYS.ACTIVE_SESSION, updated)
      return updated
    })
  }, [])

  const completeActiveSession = useCallback((finalPayload) => {
    setActiveSession((prev) => {
      if (!prev) return prev
      const session = {
        id: prev.id,
        subjectId: prev.subjectId,
        topicId: prev.topicId,
        checklistItemIds: prev.checklistItemIds,
        startedAt: prev.startedAt,
        endedAt: now(),
        method: prev.method,
        activityType: prev.activityType,
        durationMinutes: prev.durationMinutes,
        actualElapsedMinutes: Math.round(
          (Date.now() - new Date(prev.startedAt).getTime()) / 60000
        ),
        confidenceAfter: finalPayload.confidence,
        notes: finalPayload.notes || null,
        score: finalPayload.score ?? null,
        totalQuestions: finalPayload.totalQuestions ?? null,
      }
      completeSession(session)
      clear(KEYS.ACTIVE_SESSION)
      return null
    })
  }, [completeSession])

  const cancelActiveSession = useCallback(() => {
    persist(null)
  }, [persist])

  const getActiveSession = useCallback(() => activeSession, [activeSession])

  return (
    <ActiveSessionContext.Provider value={{
      activeSession,
      startActiveSession,
      updateActiveSessionDraft,
      completeActiveSession,
      cancelActiveSession,
      getActiveSession,
    }}>
      {children}
    </ActiveSessionContext.Provider>
  )
}

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext)
  if (!ctx) throw new Error('useActiveSession must be used inside ActiveSessionProvider')
  return ctx
}
