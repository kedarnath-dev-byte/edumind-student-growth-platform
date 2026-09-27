import { useEffect, useState } from 'react'
import api from '../services/api'

const deviceId = () => {
  const existing = localStorage.getItem('edumind_device_id')
  if (existing) return existing
  const next = `dev_${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem('edumind_device_id', next)
  return next
}

const DevicesAndPin = () => {
  const [pin, setPin] = useState('')
  const [devices, setDevices] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      await api.post('/api/v1/growth/devices', {
        device_id: deviceId(),
        device_label: navigator.userAgent.slice(0, 48),
      })
      const response = await api.get('/api/v1/growth/devices')
      setDevices(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load devices')
    }
  }

  useEffect(() => { load() }, [])

  const savePin = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/api/v1/growth/pin', { pin })
      setMessage('4-digit PIN saved for shared school tablets.')
      setPin('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save PIN')
    }
  }

  const revoke = async (id) => {
    await api.post('/api/v1/growth/devices/revoke', { device_id: id })
    await load()
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">PIN and devices</h1>
        <p className="text-gray-400 text-sm mt-2">Shared tablet: unlock with PIN. Stolen phone: revoke that device.</p>
      </div>
      {message && <p className="text-blue-200 text-sm">{message}</p>}
      {error && <p className="text-red-300 text-sm">{error}</p>}
      <form onSubmit={savePin} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={4} placeholder="4-digit PIN" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white tracking-widest" />
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg">Save PIN</button>
      </form>
      <div className="space-y-3">
        {devices.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm">{item.device_label || item.device_id}</p>
              <p className="text-gray-500 text-xs">{item.status}</p>
            </div>
            {item.status === 'ACTIVE' && (
              <button type="button" onClick={() => revoke(item.device_id)} className="text-red-300 text-sm">Unlink</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DevicesAndPin
