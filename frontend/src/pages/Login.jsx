import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultRouteForRole } from '../auth/roleRoutes'

const MODES = [
  { id: 'signin', label: 'Sign in' },
  { id: 'register', label: 'Register' },
  { id: 'admin', label: 'Admin' },
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

const GUARDIAN_CONSENT_LABEL =
  'I confirm I am a parent/guardian or school staff authorised to create this account for a minor where applicable, and I agree to EduMind processing this data for school learning support.'

const ConsentBlock = ({ guardianConsent, setGuardianConsent, requireGuardian }) => (
  <div
    className="rounded-lg border border-gray-700 bg-gray-950/80 p-4 space-y-3"
    role="group"
    aria-labelledby="consent-heading"
  >
    <p id="consent-heading" className="text-gray-200 text-sm font-medium">
      Privacy & consent (pilot)
    </p>
    <p className="text-gray-300 text-sm leading-relaxed">
      EduMind is a school learning-support pilot. By continuing you agree to our{' '}
      <Link to="/privacy" className="text-blue-300 underline hover:text-blue-200">
        Privacy notice
      </Link>{' '}
      and{' '}
      <Link to="/terms" className="text-blue-300 underline hover:text-blue-200">
        Terms
      </Link>
      . These pages are placeholders for the pilot and will be updated with formal policy text.
    </p>
    {requireGuardian && (
      <label htmlFor="guardian-consent" className="flex gap-3 items-start cursor-pointer">
        <input
          id="guardian-consent"
          type="checkbox"
          checked={guardianConsent}
          onChange={(event) => setGuardianConsent(event.target.checked)}
          required
          aria-required="true"
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-600 bg-gray-950 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-gray-200 text-sm leading-relaxed">{GUARDIAN_CONSENT_LABEL}</span>
      </label>
    )}
  </div>
)

const Login = () => {
  const navigate = useNavigate()
  const {
    authError,
    isConfigured,
    loading,
    profileLoading,
    signIn,
    signUp,
    requestPasswordReset,
    requestPhoneOtp,
    verifyPhoneOtp,
    refreshProfile,
    bootstrapStudentProfile,
    bootstrapAdminProfile,
  } = useAuth()

  const [mode, setMode] = useState('signin')
  const [adminAuthMode, setAdminAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [needsName, setNeedsName] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [guardianConsent, setGuardianConsent] = useState(false)

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
    setShowForgot(false)
    setGuardianConsent(false)
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!email.trim()) {
      setFormError('Please enter the Gmail / email for your account.')
      return
    }

    const result = await requestPasswordReset(email.trim())
    if (result?.error) {
      setFormError(result.error.message)
      return
    }

    setInfoMessage(
      result.message
      || 'If that email has an EduMind account, we sent a reset link. Check inbox and spam.',
    )
  }

  const navigateFromProfile = (profileResult) => {
    if (profileResult?.app_user?.role) {
      navigate(getDefaultRouteForRole(profileResult.app_user.role))
      return true
    }
    return false
  }

  const finishWithProfile = async (
    accessToken,
    { fullNameForBootstrap, phoneForBootstrap, bootstrapRole = 'STUDENT' } = {},
  ) => {
    let profileResult = await refreshProfile(accessToken)

    if (navigateFromProfile(profileResult)) return true

    if (profileResult?.errorCode === 'PROFILE_NOT_LINKED') {
      if (!fullNameForBootstrap?.trim()) {
        setNeedsName(true)
        setInfoMessage(
          bootstrapRole === 'ADMIN'
            ? 'Almost done — enter your full name to create your admin profile.'
            : 'Almost done — enter your full name to create your student profile.',
        )
        return false
      }

      const bootstrapFn = bootstrapRole === 'ADMIN'
        ? bootstrapAdminProfile
        : bootstrapStudentProfile

      const bootstrapResult = await bootstrapFn({
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
    if (!guardianConsent) {
      setFormError('Please confirm guardian / authorised-staff consent before registering.')
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


  const handleAdminSignIn = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    const result = await signIn(email.trim(), password)
    if (!result?.error) {
      const accessToken = result.data?.session?.access_token
      await finishWithProfile(accessToken, {
        fullNameForBootstrap: fullName.trim() || undefined,
        phoneForBootstrap: normalizeIndianPhone(phone) || undefined,
        bootstrapRole: 'ADMIN',
      })
    }
  }

  const handleAdminRegister = async (event) => {
    event.preventDefault()
    resetMessages()

    const normalizedPhone = phone.trim() ? normalizeIndianPhone(phone) : null
    if (phone.trim() && !normalizedPhone) {
      setFormError('Please enter a valid Indian mobile number (10 digits), or leave phone blank.')
      return
    }
    if (!fullName.trim()) {
      setFormError('Please enter your full name.')
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
      phone: normalizedPhone || undefined,
    })

    if (result?.error) return

    if (result?.needsEmailConfirmation) {
      setInfoMessage(result.message)
      return
    }

    const accessToken = result.data?.session?.access_token
    await finishWithProfile(accessToken, {
      fullNameForBootstrap: fullName.trim(),
      phoneForBootstrap: normalizedPhone || undefined,
      bootstrapRole: 'ADMIN',
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
    const bootstrapFn = mode === 'admin' ? bootstrapAdminProfile : bootstrapStudentProfile
    const result = await bootstrapFn({
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
    `flex-1 min-h-[44px] py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      mode === id
        ? 'bg-blue-600 text-white'
        : 'bg-gray-950 text-gray-300 hover:text-white border border-gray-800'
    }`

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <a
        href="#login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
          focus:bg-blue-600 focus:text-white focus:px-4 focus:py-3 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to login form
      </a>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex
            items-center justify-center text-white text-3xl font-bold">
            E
          </div>
          <h1 className="text-3xl font-bold text-white mt-5">EduMind Login</h1>
          <p className="text-gray-300 text-sm mt-2">
            Sign in, register, admin access, or phone OTP.
          </p>
        </div>

        <div className="flex gap-2 mb-6" role="tablist" aria-label="Login modes">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => switchMode(item.id)}
              className={tabButtonClass(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div id="login-main">
        {!isConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30
            text-amber-100 text-sm rounded-lg p-3 mb-5" role="status">
            Login is not configured yet. Please contact EduMind admin.
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-500/10 border border-blue-500/30
            text-blue-100 text-sm rounded-lg p-3 mb-5" role="status">
            {infoMessage}
          </div>
        )}

        {(formError || authError) && (
          <div className="bg-red-500/10 border border-red-500/30
            text-red-100 text-sm rounded-lg p-3 mb-5" role="alert">
            {formError || authError}
          </div>
        )}

        {needsName ? (
          <form onSubmit={handleCompleteName} className="space-y-4">
            <div className="block">
              <label htmlFor="complete-full-name" className="text-gray-200 text-sm font-medium">
                Full name
              </label>
              <input
                id="complete-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClassName}
                placeholder="Your full name"
                autoComplete="name"
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Saving...' : (mode === 'admin' ? 'Create admin profile' : 'Create student profile')}
            </button>
          </form>
        ) : null}

        {!needsName && mode === 'signin' && !showForgot && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="block">
              <label htmlFor="signin-email" className="text-gray-200 text-sm font-medium">
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="student@example.com"
                autoComplete="email"
                required
                aria-required="true"
              />
            </div>

            <div className="block">
              <label htmlFor="signin-password" className="text-gray-200 text-sm font-medium">
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                aria-required="true"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetMessages()
                  setShowForgot(true)
                }}
                className="min-h-[44px] px-2 text-sm text-blue-300 hover:text-blue-200
                  inline-flex items-center"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {!needsName && mode === 'signin' && showForgot && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-gray-300 text-sm">
              Enter the same Gmail you registered with. We will email a link to set a new password.
            </p>
            <div className="block">
              <label htmlFor="forgot-email" className="text-gray-200 text-sm font-medium">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="student@example.com"
                autoComplete="email"
                required
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages()
                setShowForgot(false)
              }}
              className="w-full min-h-[44px] text-sm text-blue-300 hover:text-blue-200 py-2"
            >
              Back to sign in
            </button>
          </form>
        )}

        {!needsName && mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="block">
              <label htmlFor="register-full-name" className="text-gray-200 text-sm font-medium">
                Full name
              </label>
              <input
                id="register-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClassName}
                placeholder="Student full name"
                autoComplete="name"
                required
                aria-required="true"
              />
            </div>

            <div className="block">
              <label htmlFor="register-phone" className="text-gray-200 text-sm font-medium">
                Mobile (+91)
              </label>
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={inputClassName}
                placeholder="9876543210"
                autoComplete="tel"
                required
                aria-required="true"
              />
            </div>

            <div className="block">
              <label htmlFor="register-email" className="text-gray-200 text-sm font-medium">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="student@example.com"
                autoComplete="email"
                required
                aria-required="true"
              />
            </div>

            <div className="block">
              <label htmlFor="register-password" className="text-gray-200 text-sm font-medium">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                aria-required="true"
                minLength={6}
              />
            </div>

            <ConsentBlock
              guardianConsent={guardianConsent}
              setGuardianConsent={setGuardianConsent}
              requireGuardian
            />

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
              transition-colors"
            >
              {busy ? 'Creating account...' : 'Register as student'}
            </button>
          </form>
        )}


        {!needsName && mode === 'admin' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdminAuthMode('signin')}
                className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-lg ${
                  adminAuthMode === 'signin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-950 text-gray-300 border border-gray-800'
                }`}
              >
                Admin sign in
              </button>
              <button
                type="button"
                onClick={() => setAdminAuthMode('register')}
                className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-lg ${
                  adminAuthMode === 'register'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-950 text-gray-300 border border-gray-800'
                }`}
              >
                Admin register
              </button>
            </div>

            <p className="text-sm text-gray-300">
              School admin access only. Students should use Sign in / Register.
            </p>

            <form
              onSubmit={adminAuthMode === 'register' ? handleAdminRegister : handleAdminSignIn}
              className="space-y-4"
            >
              {adminAuthMode === 'register' && (
                <div className="block">
                  <label htmlFor="admin-full-name" className="text-gray-200 text-sm font-medium">
                    Full name
                  </label>
                  <input
                    id="admin-full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClassName}
                    placeholder="Admin full name"
                    autoComplete="name"
                    required
                    aria-required="true"
                  />
                </div>
              )}

              <div className="block">
                <label htmlFor="admin-email" className="text-gray-200 text-sm font-medium">
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  placeholder="admin@school.edu"
                  autoComplete="email"
                  required
                  aria-required="true"
                />
              </div>

              <div className="block">
                <label htmlFor="admin-password" className="text-gray-200 text-sm font-medium">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Enter password"
                  autoComplete={adminAuthMode === 'register' ? 'new-password' : 'current-password'}
                  required
                  aria-required="true"
                  minLength={adminAuthMode === 'register' ? 6 : undefined}
                />
              </div>

              {adminAuthMode === 'register' && (
                <div className="block">
                  <label htmlFor="admin-phone" className="text-gray-200 text-sm font-medium">
                    Mobile (optional)
                  </label>
                  <input
                    id="admin-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClassName}
                    placeholder="9876543210"
                    autoComplete="tel"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !isConfigured}
                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700
                disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg
                transition-colors"
              >
                {busy
                  ? (adminAuthMode === 'register' ? 'Creating admin...' : 'Signing in...')
                  : (adminAuthMode === 'register' ? 'Register as admin' : 'Admin Sign In')}
              </button>
            </form>
          </div>
        )}

        {!needsName && mode === 'phone' && (
          <form
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            className="space-y-4"
          >
            <div className="block">
              <label htmlFor="phone-mobile" className="text-gray-200 text-sm font-medium">
                Mobile (+91)
              </label>
              <input
                id="phone-mobile"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setOtpSent(false)
                }}
                className={inputClassName}
                placeholder="9876543210"
                autoComplete="tel"
                required
                aria-required="true"
              />
            </div>

            {otpSent && (
              <div className="block">
                <label htmlFor="phone-otp" className="text-gray-200 text-sm font-medium">
                  OTP code
                </label>
                <input
                  id="phone-otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className={inputClassName}
                  placeholder="6-digit code"
                  autoComplete="one-time-code"
                  required
                  aria-required="true"
                />
              </div>
            )}

            <ConsentBlock
              guardianConsent={guardianConsent}
              setGuardianConsent={setGuardianConsent}
              requireGuardian={false}
            />

            <button
              type="submit"
              disabled={busy || !isConfigured}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
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
                className="w-full min-h-[44px] text-sm text-blue-300 hover:text-blue-200 py-2"
              >
                Resend OTP
              </button>
            )}
          </form>
        )}
        </div>

        <p className="text-gray-300 text-sm mt-6 text-center leading-relaxed">
          New students: use Register with a real email (Gmail etc).
          Already registered? Sign in, or use Forgot password if you need a new one.
        </p>

        <nav
          className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm"
          aria-label="Legal and help"
        >
          <Link to="/privacy" className="text-blue-300 hover:text-blue-200 underline min-h-[44px] inline-flex items-center">
            Privacy
          </Link>
          <Link to="/terms" className="text-blue-300 hover:text-blue-200 underline min-h-[44px] inline-flex items-center">
            Terms
          </Link>
          <a
            href="#login-main"
            className="text-blue-300 hover:text-blue-200 underline min-h-[44px] inline-flex items-center"
            onClick={(event) => {
              event.preventDefault()
              setInfoMessage('For help, contact your school admin or EduMind support (pilot).')
            }}
          >
            Help
          </a>
        </nav>
      </div>
    </div>
  )
}

export default Login
