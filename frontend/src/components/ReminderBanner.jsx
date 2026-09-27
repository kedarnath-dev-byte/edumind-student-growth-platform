import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const ReminderBanner = () => {
  const [item, setItem] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        await api.post('/api/v1/growth/notifications/me/refresh')
        const response = await api.get('/api/v1/growth/notifications', { params: { unread_only: true } })
        const rows = Array.isArray(response.data) ? response.data : []
        if (alive) setItem(rows[0] || null)
      } catch {
        if (alive) setItem(null)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  if (!item) return null

  return (
    <Link to={item.link_path || '/notifications'} className="block mb-4 rounded-xl border border-blue-800 bg-blue-950/40 p-4">
      <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide">{String(item.category || '').replaceAll('_', ' ')}</p>
      <p className="text-white font-semibold mt-1">{item.title}</p>
      <p className="text-gray-300 text-sm mt-1">{item.body}</p>
    </Link>
  )
}

export default ReminderBanner
