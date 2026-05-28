import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { authError, isConfigured, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    const result = await signIn(email.trim(), password)
    if (!result?.error) {
      navigate('/student-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex
            items-center justify-center text-white text-3xl font-bold">
            E
          </div>
          <h1 className="text-3xl font-bold text-white mt-5">EduMind Login</h1>
          <p className="text-gray-400 text-sm mt-2">
            Sign in to continue your learning journey.
          </p>
        </div>

        {!isConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30
            text-amber-200 text-sm rounded-lg p-3 mb-5">
            Login is not configured yet. Please contact EduMind admin.
          </div>
        )}

        {(formError || authError) && (
          <div className="bg-red-500/10 border border-red-500/30
            text-red-200 text-sm rounded-lg p-3 mb-5">
            {formError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-gray-300 text-sm font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full bg-gray-950 border border-gray-700
              text-white rounded-lg px-3 py-3 focus:outline-none
              focus:border-blue-500"
              placeholder="student1@edumind.local"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-gray-300 text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full bg-gray-950 border border-gray-700
              text-white rounded-lg px-3 py-3 focus:outline-none
              focus:border-blue-500"
              placeholder="Enter pilot password"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
            disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
            transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-500 text-xs mt-6 text-center">
          Pilot accounts are created by EduMind admin.
        </p>
      </div>
    </div>
  )
}

export default Login
