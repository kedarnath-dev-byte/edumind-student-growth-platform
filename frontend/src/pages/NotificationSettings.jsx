import { useEffect, useState } from 'react'
import api from '../services/api'

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [prefRes, noteRes] = await Promise.all([
        api.get('/api/v1/growth/notification-preferences'),
        api.get('/api/v1/growth/notifications'),
      ])
      setPrefs(prefRes.data)
      setItems(Array.isArray(noteRes.data) ? noteRes.data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load notifications')
    }
  }

  useEffect(() => { load() }, [])

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    await api.patch('/api/v1/growth/notification-preferences', { [key]: next[key] })
  }

  const markRead = async (id) => {
    await api.post(`/api/v1/growth/notifications/${id}/read`)
    await load()
  }

  if (!prefs) return <div className="p-6 text-gray-400">Loading notification settings…</div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-gray-400 text-sm mt-2">Quiet hours default 20:00–07:00 IST. Revision reminders stay supportive, never shame-based.</p>
      </div>
      {error && <div className="text-red-300 text-sm">{error}</div>}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        {[
          ['in_app_enabled', 'In-app inbox'],
          ['push_enabled', 'Push (enable after first successful log)'],
          ['email_enabled', 'Email digest'],
          ['revision_due_enabled', 'Revision due'],
          ['memory_rescue_enabled', 'Memory rescue'],
          ['parent_digest_enabled', 'Parent evening digest'],
          ['teacher_support_enabled', 'Teacher support signals'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between text-sm text-gray-200">
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(prefs[key])} onChange={() => toggle(key)} />
          </label>
        ))}
        <p className="text-gray-500 text-xs">Quiet hours {prefs.quiet_hours_start}–{prefs.quiet_hours_end} ({prefs.timezone})</p>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Inbox</h2>
        {items.length === 0 && <p className="text-gray-500 text-sm">No notifications yet.</p>}
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => !item.is_read && markRead(item.id)} className={`w-full text-left rounded-xl border p-4 ${item.is_read ? 'border-gray-800 bg-gray-900 text-gray-400' : 'border-blue-900 bg-blue-950/40 text-white'}`}>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm mt-1">{item.body}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default NotificationSettings
