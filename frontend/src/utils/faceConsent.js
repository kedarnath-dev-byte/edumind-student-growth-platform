/**
 * Client-side face Shorts consent stub (P0).
 * Later: persist on student_profiles / parent consent flag.
 */
const STORAGE_KEY = 'edumind_face_shorts_consent_v1'

export function hasFaceShortsConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return parsed?.acknowledged === true
  } catch {
    return false
  }
}

export function saveFaceShortsConsent({ mode } = {}) {
  const payload = {
    acknowledged: true,
    mode: mode === 'hands_only' ? 'hands_only' : 'parent_aware_face',
    at: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return payload
}

export function clearFaceShortsConsent() {
  localStorage.removeItem(STORAGE_KEY)
}
