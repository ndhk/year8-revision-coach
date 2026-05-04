export const KEYS = {
  PROFILE: 'yr8_profile',
  SUBJECTS: 'yr8_subjects',
  SESSIONS: 'yr8_sessions',
  REWARDS: 'yr8_rewards',
  SETTINGS: 'yr8_settings',
  ACTIVE_SESSION: 'yr8_active_session',
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — fail silently in MVP
  }
}

export function clear(key) {
  localStorage.removeItem(key)
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}

export function exportAllData() {
  const data = {
    appName: 'Year 8 Revision Coach',
    exportedAt: new Date().toISOString(),
  }
  Object.entries(KEYS).forEach(([label, key]) => {
    data[label] = load(key)
  })
  return data
}

export function validateImportData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Not a valid JSON object.'
  if (data.appName && data.appName !== 'Year 8 Revision Coach') {
    return 'This file does not appear to be from Year 8 Revision Coach.'
  }
  if (!data.SUBJECTS && !data.PROFILE) {
    return 'File is missing expected revision data (SUBJECTS or PROFILE).'
  }
  if (data.SUBJECTS !== undefined) {
    if (!Array.isArray(data.SUBJECTS)) return 'SUBJECTS field is not a valid array.'
    for (const sub of data.SUBJECTS) {
      if (!sub || typeof sub !== 'object') return 'SUBJECTS contains an invalid entry.'
      if (sub.topics !== undefined && !Array.isArray(sub.topics)) {
        return `Subject "${sub.name || sub.id}" has an invalid topics field.`
      }
    }
  }
  if (data.SESSIONS !== undefined && !Array.isArray(data.SESSIONS)) {
    return 'SESSIONS field is not a valid array.'
  }
  if (data.REWARDS !== undefined) {
    if (typeof data.REWARDS !== 'object' || Array.isArray(data.REWARDS)) {
      return 'REWARDS field is not a valid object.'
    }
  }
  return null // null = valid
}
