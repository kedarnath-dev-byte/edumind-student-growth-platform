/**
 * @file InstallHint.jsx
 * @description Compact PWA / Add-to-Home-Screen hint for mobile & WhatsApp browsers.
 */
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'edumind_install_hint_dismissed'

const isStandalone = () => {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  )
}

const isMobileLike = () => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobile|WhatsApp/i.test(ua)
    || window.matchMedia('(max-width: 768px)').matches
}

const InstallHint = ({ className = '' }) => {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (isStandalone()) return undefined
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return undefined
    } catch (_) { /* ignore */ }

    if (!isMobileLike()) return undefined
    setVisible(true)

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch (_) { /* ignore */ }
    setVisible(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try { await deferredPrompt.userChoice } catch (_) { /* ignore */ }
    setDeferredPrompt(null)
    dismiss()
  }

  return (
    <div
      className={`rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3
        text-sm text-blue-100 ${className}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Install EduMind on your phone</p>
          <p className="text-blue-100/80 text-xs mt-1">
            Add to Home Screen for faster WhatsApp / mobile access (works offline for the shell).
            Android Chrome: menu → Install app. iPhone Safari: Share → Add to Home Screen.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-blue-200/70 hover:text-white text-xs shrink-0"
          aria-label="Dismiss install hint"
        >
          Dismiss
        </button>
      </div>
      {deferredPrompt && (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500
            text-white text-xs font-semibold px-3 py-2"
        >
          Install EduMind
        </button>
      )}
    </div>
  )
}

export default InstallHint
