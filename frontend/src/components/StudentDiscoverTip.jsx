/**
 * @file StudentDiscoverTip.jsx
 * @description First-run tip pointing students to Subject Worlds + Learning Log.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const DISMISS_KEY = 'edumind_student_discover_tip_v1'

const StudentDiscoverTip = ({ className = '' }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch (_) { /* ignore */ }
    setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch (_) { /* ignore */ }
    setVisible(false)
  }

  return (
    <div
      className={`rounded-xl border border-blue-500/35 bg-gradient-to-br from-blue-600/20 to-indigo-600/10
        px-4 py-4 text-sm text-blue-50 ${className}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white text-base">Find your way around EduMind</p>
          <p className="text-blue-100/85 text-xs mt-1.5 leading-relaxed">
            Use the bottom tabs: <strong className="text-white">Worlds</strong> for classmate subject feeds,
            and <strong className="text-white">Log</strong> for your Daily Learning Log.
            Home keeps revision, habits, peers, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-blue-200/70 hover:text-white text-xs shrink-0"
          aria-label="Dismiss discover tip"
        >
          Got it
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/student-subjects"
          className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-500
            text-white text-xs font-semibold px-3.5 py-2 transition-colors"
        >
          Open Subject Worlds
        </Link>
        <Link
          to="/student-growth"
          className="inline-flex items-center rounded-full border border-blue-400/40
            bg-gray-950/40 hover:bg-gray-900 text-blue-100 text-xs font-semibold px-3.5 py-2 transition-colors"
        >
          Open Learning Log
        </Link>
      </div>
    </div>
  )
}

export default StudentDiscoverTip
