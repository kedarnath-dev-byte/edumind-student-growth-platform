import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const JoinClass = () => {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const joinClass = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api.post('/api/v1/growth/classrooms/join', { code: code.trim().toUpperCase() })
      setMessage('You joined the class. Memory missions will now follow this classroom.')
      setTimeout(() => navigate('/student-dashboard'), 800)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not join class. Check the 6-letter code.')
    } finally {
      setBusy(false)
    }
  }

  const acceptInvite = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api.post('/api/v1/growth/parent-invites/accept', {
        invite_code: inviteCode.trim().toUpperCase(),
      })
      setMessage('Parent linked. They can now see your learning growth, not your ranks.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invite code did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Join class</h1>
        <p className="text-gray-400 text-sm mt-2">
          Enter the 6-letter code from your teacher. No password required from the class board.
        </p>
      </div>
      {message && <div className="bg-blue-500/10 border border-blue-500/30 text-blue-100 rounded-lg p-3 text-sm">{message}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-100 rounded-lg p-3 text-sm">{error}</div>}
      <form onSubmit={joinClass} className="space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <label className="text-sm text-gray-300">Class join code</label>
        <input value={code} onChange={(event) => setCode(event.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white tracking-widest uppercase" placeholder="AB12CD" maxLength={8} required />
        <button disabled={busy} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg">{busy ? 'Joining…' : 'Join classroom'}</button>
      </form>
      <form onSubmit={acceptInvite} className="space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <label className="text-sm text-gray-300">Parent invite code</label>
        <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white tracking-widest uppercase" placeholder="PARENT12" />
        <button disabled={busy} className="w-full border border-gray-700 hover:border-blue-500 text-white font-semibold py-3 rounded-lg">Link parent</button>
      </form>
    </div>
  )
}

export default JoinClass
