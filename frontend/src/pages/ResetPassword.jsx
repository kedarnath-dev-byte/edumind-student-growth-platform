import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const inputClassName = `mt-2 w-full bg-gray-950 border border-gray-700
  text-white rounded-lg px-3 py-3 focus:outline-none focus:border-blue-500`

const ResetPassword = () => {
  const navigate = useNavigate()
  const {
    authError,
    isConfigured,
    isAuthenticated,
    loading,
    updatePassword,
  } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Give Supabase a moment to pick up the recovery session from the URL hash.
    const t = setTimeout(() => setReady(true), 400)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setInfoMessage('')

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }

    const result = await updatePassword(password)
    if (result?.error) return

    setInfoMessage('Password updated. Redirecting to sign in…')
    setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex
            items-center justify-center text-white text-3xl font-bold">
            E
          </div>
          <h1 className="text-3xl font-bold text-white mt-5">Set new password</h1>
          <p className="text-gray-400 text-sm mt-2">
            Choose a new password for your EduMind account.
          </p>
        </div>

        {!isConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30
            text-amber-200 text-sm rounded-lg p-3 mb-5">
            Login is not configured yet. Please contact EduMind admin.
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-500/10 border border-blue-500/30
            text-blue-100 text-sm rounded-lg p-3 mb-5">
            {infoMessage}
          </div>
        )}

        {(formError || authError) && (
          <div className="bg-red-500/10 border border-red-500/30
            text-red-200 text-sm rounded-lg p-3 mb-5">
            {formError || authError}
          </div>
        )}

        {ready && !isAuthenticated && !infoMessage && (
          <div className="bg-amber-500/10 border border-amber-500/30
            text-amber-200 text-sm rounded-lg p-3 mb-5">
            This reset link is missing or expired. Request a new one from{' '}
            <Link to="/login" className="text-blue-300 underline">Sign in</Link>
            {' '}→ Forgot password.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-gray-300 text-sm font-medium">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={!isAuthenticated}
            />
          </label>

          <label className="block">
            <span className="text-gray-300 text-sm font-medium">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={inputClassName}
              placeholder="Repeat password"
              autoComplete="new-password"
              disabled={!isAuthenticated}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !isConfigured || !isAuthenticated}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
            disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
            transition-colors"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <p className="text-gray-500 text-xs mt-6 text-center">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
