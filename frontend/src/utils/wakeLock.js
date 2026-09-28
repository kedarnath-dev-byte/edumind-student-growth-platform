/**
 * Keep the screen awake during long Mux uploads (phone sleep kills XHR).
 * Uses Screen Wake Lock API; best-effort on Android WebView / Capacitor.
 * Native @capacitor-community/keep-awake is optional — not required for this PR
 * because the APK loads the live Vercel URL (JS wakeLock ships on web deploy).
 */

let wakeLock = null
let visibilityHandler = null
let wantActive = false

async function requestLock() {
  if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) {
    return null
  }
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    return null
  }
}

/**
 * Acquire (or re-acquire) a screen wake lock for the duration of upload.
 * @returns {Promise<() => void>} release function
 */
export async function acquireWakeLock() {
  wantActive = true
  wakeLock = await requestLock()

  if (!visibilityHandler && typeof document !== 'undefined') {
    visibilityHandler = async () => {
      if (!wantActive) return
      if (document.visibilityState === 'visible') {
        wakeLock = await requestLock()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  return () => {
    wantActive = false
    if (wakeLock) {
      try {
        wakeLock.release()
      } catch { /* ignore */ }
      wakeLock = null
    }
    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }
}

/**
 * Run an async fn while holding a wake lock.
 */
export async function withWakeLock(fn) {
  const release = await acquireWakeLock()
  try {
    return await fn()
  } finally {
    release()
  }
}
