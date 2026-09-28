/**
 * Render free-tier cold-start hygiene: ping health on mount and show a calm banner.
 */
import { useEffect, useState } from 'react'
import api from '../services/api'

const WARM_KEY = 'edumind_api_warm_at'
const WARM_TTL_MS = 5 * 60 * 1000

const apiPrefix = (import.meta.env.VITE_API_BASE_URL || '')
  .replace(/\/$/, '')
  .endsWith('/api/v1')
  ? ''
  : '/api/v1'

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

  useEffect(() => {
    if (recentlyWarmed()) {
      setStatus('ready')
      return undefined
    }

    let cancelled = false
    let tries = 0

    const ping = async () => {
      tries += 1
      if (!cancelled) {
        setAttempt(tries)
        setStatus(tries === 1 ? 'warming' : 'retrying')
      }
      try {
        await api.get(`${apiPrefix}/health`, {
          timeout: 45000,
        })
        if (!cancelled) {
          markWarmed()
          setStatus('ready')
        }
      } catch (err) {
        const code = err?.response?.status
        if (code && code < 500) {
          if (!cancelled) {
            markWarmed()
            setStatus('ready')
          }
          return
        }
        if (tries < 3 && !cancelled) {
          await new Promise((r) => setTimeout(r, tries === 1 ? 3000 : 6000))
          return ping()
        }
        if (!cancelled) setStatus('slow')
      }
    }

    ping()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'ready') return null

  const copy =
    status === 'checking' || status === 'warming'
      ? 'Waking EduMind servers… first open after idle can take 30–60s on free hosting.'
      : status === 'retrying'
        ? `Still waking the API (try ${attempt}/3). Keep this tab open — do not refresh yet.`
        : 'API is slow to wake. Wait ~30s, then retry Log / Revisions — your work is not lost.'

  return (
    <div
      role="status"
      className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-amber-100 text-xs sm:text-sm"
    >
      <span className="font-semibold text-amber-200">Open speed · </span>
      {copy}
    </div>
  )
}

export default ApiWarmBanner
