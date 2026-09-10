import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultRouteForRole } from '../auth/roleRoutes'

const MODES = [
  { id: 'signin', label: 'Sign in' },
  { id: 'register', label: 'Register' },
  { id: 'phone', label: 'Phone OTP' },
]

/** Normalize Indian mobiles to E.164 (+91XXXXXXXXXX). */
export const normalizeIndianPhone = (raw) => {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (trimmed.startsWith('+') && digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}

const inputClassName = `mt-2 w-full bg-gray-950 border border-gray-700
  text-white rounded-lg px-3 py-3 focus:outline-none focus:border-blue-500`

const Login = () => {
  const navigate = useNavigate()
  const {
    authError,
    isConfigured,
    loading,
    profileLoading,
    signIn,
    signUp,
    requestPhoneOtp,
    verifyPhoneOtp,
    refreshProfile,
    bootstrapStudentProfile,
  } = useAuth()

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [needsName, setNeedsName] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [formError, setFormError] = useState('')

  const busy = loading || profileLoading

  const resetMessages = () => {
    setFormError('')
    setInfoMessage('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    resetMessages()
    setOtpSent(false)
    setNeedsName(false)
    setOtp('')
  }

  const navigateFromProfile = (profileResult) => {
    if (profileResult?.app_user?.role) {
      navigate(getDefaultRouteForRole(profileResult.app_user.role))
      return true
    }
    return false
  }

  const finishWithProfile = async (accessToken, { fullNameForBootstrap, phoneForBootstrap } = {}) => {
    let profileResult = await refreshProfile(accessToken)

    if (navigateFromProfile(profileResult)) return true

    if (profileResult?.errorCode === 'PROFILE_NOT_LINKED') {
      if (!fullNameForBootstrap?.trim()) {
        setNeedsName(true)
        setInfoMessage('Almost done — enter your full name to create your student profile.')
        return false
      }

      const bootstrapResult = await bootstrapStudentProfile({
        full_name: fullNameForBootstrap.trim(),
        phone: phoneForBootstrap || undefined,
        accessToken,
      })

      if (bootstrapResult?.error) {
        setFormError(bootstrapResult.error.message)
        return false
      }

      if (navigateFromProfile(bootstrapResult.data)) return true
      profileResult = bootstrapResult.data
    }

    if (profileResult?.errorCode === 'PROFILE_LOAD_FAILED') {
      setFormError(
        'Login successful, but EduMind profile could not be loaded. Please try again.'
      )
      return false
    }

    setFormError(
      'Login successful, but your EduMind profile is not linked yet. Please finish registration or contact EduMind admin.'
    )
    return false
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    const result = await signIn(email.trim(), password)
    if (!result?.error) {
      const accessToken = result.data?.session?.access_token
      await finishWithProfile(accessToken)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    resetMessages()

    const normalizedPhone = normalizeIndianPhone(phone)
    if (!fullName.trim()) {
      setFormError('Please enter your full name.')
      return
    }
    if (!normalizedPhone) {
      setFormError('Please enter a valid Indian mobile number (10 digits).')
      return
    }
    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    const result = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phone: normalizedPhone,
    })

    if (result?.error) return

    if (result?.needsEmailConfirmation) {
      setInfoMessage(result.message)
      return
    }

    const accessToken = result.data?.session?.access_token
    await finishWithProfile(accessToken, {
      fullNameForBootstrap: fullName.trim(),
      phoneForBootstrap: normalizedPhone,
    })
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()
    resetMessages()

    const normalizedPhone = normalizeIndianPhone(phone)
    if (!normalizedPhone) {
      setFormError('Please enter a valid Indian mobile number (10 digits).')
      return
    }

    const result = await requestPhoneOtp(normalizedPhone)
    if (!result?.error) {
      setPhone(normalizedPhone)
      setOtpSent(true)
      setInfoMessage(`OTP sent to ${normalizedPhone}. Enter the code to continue.`)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    resetMessages()

    const normalizedPhone = normalizeIndianPhone(phone)
    if (!normalizedPhone) {
      setFormError('Please enter a valid Indian mobile number (10 digits).')
      return
    }
    if (!otp.trim()) {
      setFormError('Please enter the OTP code.')
      return
    }

    const result = await verifyPhoneOtp({
      phone: normalizedPhone,
      token: otp.trim(),
    })

    if (result?.error) return

    const accessToken = result.data?.session?.access_token
    await finishWithProfile(accessToken, {
      fullNameForBootstrap: fullName.trim() || undefined,
      phoneForBootstrap: normalizedPhone,
    })
  }

  const handleCompleteName = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!fullName.trim()) {
      setFormError('Please enter your full name.')
      return
    }

    const normalizedPhone = normalizeIndianPhone(phone)
    const result = await bootstrapStudentProfile({
      full_name: fullName.trim(),
      phone: normalizedPhone || undefined,
    })

    if (result?.error) {
      setFormError(result.error.message)
      return
    }

    navigateFromProfile(result.data)
  }

  const tabButtonClass = (id) =>
    `flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      mode === id
        ? 'bg-blue-600 text-white'
        : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'
    }`

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
            Sign in, register, or continue with phone OTP.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchMode(item.id)}
              className={tabButtonClass(item.id)}
            >
              {item.label}
            </button>
          ))}
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

        {needsName ? (
          <form onSubmit={handleCompleteName} className="space-y-4">
            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClassName}
                placeholder="Your full name"
                autoComplete="name"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Saving...' : 'Create student profile'}
            </button>
          </form>
        ) : null}

        {!needsName && mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="student@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {!needsName && mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClassName}
                placeholder="Student full name"
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Mobile (+91)</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClassName}
                placeholder="9876543210"
                autoComplete="tel"
              />
            </label>

            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="student@example.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Creating account...' : 'Register as student'}
            </button>
          </form>
        )}

        {!needsName && mode === 'phone' && (
          <form
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            className="space-y-4"
          >
            <label className="block">
              <span className="text-gray-300 text-sm font-medium">Mobile (+91)</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setOtpSent(false)
                }}
                className={inputClassName}
                placeholder="9876543210"
                autoComplete="tel"
              />
            </label>

            {otpSent && (
              <label className="block">
                <span className="text-gray-300 text-sm font-medium">OTP code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className={inputClassName}
                  placeholder="6-digit code"
                  autoComplete="one-time-code"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy
                ? (otpSent ? 'Verifying...' : 'Sending OTP...')
                : (otpSent ? 'Verify OTP' : 'Send OTP')}
            </button>

            {otpSent && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSendOtp}
                className="w-full text-sm text-blue-400 hover:text-blue-300 py-2"
              >
                Resend OTP
              </button>
            )}
          </form>
        )}

        <p className="text-gray-500 text-xs mt-6 text-center">
          New students can register with email or phone OTP. Teachers and parents
          are still provisioned by EduMind admin.
        </p>
      </div>
    </div>
  )
}

export default Login
