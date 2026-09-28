/**
 * Render free-tier cold-start hygiene: ping a cheap root health path on mount
 * and show a calm banner with Retry. Prefer `/` over `/api/v1/health` — root
 * stays fast even when metric middleware / DB are busy.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const WARM_KEY = 'edumind_api_warm_at'
const WARM_TTL_MS = 8 * 60 * 1000

const resolveWarmUrl = () => {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!raw) return ''
  if (raw.endsWith('/api/v1')) {
    const origin = raw.slice(0, -'/api/v1'.length)
    return `${origin || ''}/`
  }
  return `${raw}/`
}

const recentlyWarmed = () => {
  try {
    const at = Number(sessionStorage.getItem(WARM_KEY) || 0)
    return at > 0 && Date.now() - at < WARM_TTL_MS
  } catch {
    return false
  }
}

const markWarmed = () => {
  try {
    sessionStorage.setItem(WARM_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

const ApiWarmBanner = () => {
  const [status, setStatus] = useState(() => (recentlyWarmed() ? 'ready' : 'checking'))
  const [attempt, setAttempt] = useState(0)
  const [detail, setDetail] = useState('')
  const cancelledRef = useRef(false)

  const ping = useCallback(async () => {
    const warmUrl = resolveWarmUrl()
    if (!warmUrl) {
      if (!cancelledRef.current) {
        setStatus('slow')
        setDetail('API base URL is not configured.')
      }
      return
    }

    for (let tries = 1; tries <= 3; tries += 1) {
      if (cancelledRef.current) return
      setAttempt(tries)
      setStatus(tries === 1 ? 'warming' : 'retrying')
      setDetail('')

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)
      try {
        const response = await fetch(warmUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        })
        if (cancelledRef.current) return
        if (response.status < 500) {
          markWarmed()
          setStatus('ready')
          setDetail('')
          return
        }
        setDetail(`Warm probe HTTP ${response.status}`)
      } catch (err) {
        if (cancelledRef.current) return
        setDetail(
          err?.name === 'AbortError'
            ? 'Warm probe timed out after 45s.'
            : (err?.message || 'Warm probe failed'),
        )
      } finally {
        clearTimeout(timer)
      }

      if (tries < 3 && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, tries === 1 ? 2500 : 5000))
      }
    }

    if (!cancelledRef.current) setStatus('slow')
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    if (recentlyWarmed()) {
      setStatus('ready')
      return undefined
    }
    ping()
    return () => {
      cancelledRef.current = true
    }
  }, [ping])

  if (status === 'ready') return null

  const copy =
    status === 'checking' || status === 'warming'
      ? 'Waking EduMind servers… first open after idle can take 30–60s on free hosting.'
      : status === 'retrying'
        ? `Still waking the API (try ${attempt}/3). Keep this screen open — do not force-close yet.`
        : 'API is slow to wake. Wait ~30s, then tap Retry — Log / Revisions keep your work.'

  return (
    <div
      role="status"
      className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-amber-100 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center gap-2"
    >
      <div className="flex-1">
        <span className="font-semibold text-amber-200">Open speed · </span>
        {copy}
        {detail ? (
          <span className="block text-amber-200/80 mt-1 font-mono text-[11px]">{detail}</span>
        ) : null}
      </div>
      {status === 'slow' && (
        <button
          type="button"
          onClick={() => {
            cancelledRef.current = false
            ping()
          }}
          className="shrink-0 rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-amber-50 text-xs font-semibold hover:bg-amber-500/30"
        >
          Retry wake
        </button>
      )}
    </div>
  )
}

export default ApiWarmBanner
