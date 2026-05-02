export const KEYS = {
  PROFILE: 'yr8_profile',
  SUBJECTS: 'yr8_subjects',
  SESSIONS: 'yr8_sessions',
  REWARDS: 'yr8_rewards',
  SETTINGS: 'yr8_settings',
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
  if (!data || typeof data !== 'object') return 'Not a valid JSON object.'
  if (data.appName && data.appName !== 'Year 8 Revision Coach') {
    return 'This file does not appear to be from Year 8 Revision Coach.'
  }
  if (!data.SUBJECTS && !data.PROFILE) {
    return 'File is missing expected revision data (SUBJECTS or PROFILE).'
  }
  if (data.SUBJECTS && !Array.isArray(data.SUBJECTS)) {
    return 'SUBJECTS field is not a valid array.'
  }
  return null // null = valid
}
