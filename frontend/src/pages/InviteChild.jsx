import { useEffect, useState } from 'react'
import api from '../services/api'

const InviteChild = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const response = await api.get('/api/v1/growth/parent-invites')
      setInvites(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load invites')
    }
  }

  useEffect(() => { load() }, [])

  const createInvite = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/api/v1/growth/parent-invites', {
        student_display_name: name.trim(),
        child_email: email.trim() || undefined,
      })
      setName('')
      setEmail('')
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create invite')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invite your child</h1>
        <p className="text-gray-400 text-sm mt-2">Create a code. Your child accepts it after login — they do not need a new password from you.</p>
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-100 rounded-lg p-3 text-sm">{error}</div>}
      <form onSubmit={createInvite} className="space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <input value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white" placeholder="Child full name" required />
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white" placeholder="Child email (optional)" type="email" />
        <button disabled={busy} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg">{busy ? 'Creating…' : 'Create invite code'}</button>
      </form>
      <div className="space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-white font-semibold">{invite.student_display_name}</p>
            <p className="text-blue-300 text-2xl tracking-widest mt-2">{invite.invite_code}</p>
            <p className="text-gray-400 text-xs mt-1">{invite.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InviteChild
