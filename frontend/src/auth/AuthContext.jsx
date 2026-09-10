import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import authService from '../services/authService'

const AuthContext = createContext(null)
const profileNotLinkedMessage =
  'EduMind profile is not linked yet. Please contact EduMind admin.'

const clearProfileState = (setProfile, setProfileError) => {
  setProfile(null)
  setProfileError('')
}

const mapAuthError = (error, fallback) => {
  const message = error?.message || fallback
  const lower = String(message).toLowerCase()
  if (
    lower.includes('sms')
    || lower.includes('phone provider')
    || lower.includes('unsupported phone')
    || lower.includes('phone signups are disabled')
    || lower.includes('twilio')
  ) {
    return 'Phone OTP is not configured yet. Please enable Supabase Phone auth and an SMS provider (e.g. Twilio), or use email sign-in.'
  }
  return message
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  const refreshSession = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(null)
      clearProfileState(setProfile, setProfileError)
      setLoading(false)
      return null
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      setAuthError(error.message || 'Could not refresh login session.')
      setSession(null)
      setUser(null)
      clearProfileState(setProfile, setProfileError)
      return null
    }

    // Keep an existing profile when the same session is re-read.
    // Clearing here raced with onAuthStateChange and left profileLoading stuck.
    if (!data.session) {
      clearProfileState(setProfile, setProfileError)
    }
    setSession(data.session)
    setUser(data.session?.user || null)
    if (data.session?.access_token) {
      localStorage.setItem('edumind_token', data.session.access_token)
    } else {
      localStorage.removeItem('edumind_token')
    }
    return data.session
  }

  const getAccessToken = () => session?.access_token || null

  const refreshProfile = async (accessToken = null) => {
    const token = accessToken || getAccessToken()

    if (!token) {
      setProfile(null)
      setProfileError('')
      setProfileLoading(false)
      return null
    }

    setProfileLoading(true)
    setProfileError('')

    try {
      const currentProfile = await authService.getCurrentEduMindProfile(token)
      setProfile(currentProfile)
      return currentProfile
    } catch (error) {
      setProfile(null)
      if (error.code === 'PROFILE_NOT_LINKED') {
        setProfileError(profileNotLinkedMessage)
      } else {
        setProfileError(
          'EduMind profile could not be loaded. Please try again.'
        )
      }
      return { errorCode: error.code || 'PROFILE_LOAD_FAILED' }
    } finally {
      setProfileLoading(false)
    }
  }

  const bootstrapStudentProfile = async ({ full_name, phone, accessToken = null } = {}) => {
    const token = accessToken || getAccessToken()
    if (!token) {
      const message = 'You must be signed in to finish registration.'
      setAuthError(message)
      return { error: { message } }
    }

    setProfileLoading(true)
    setAuthError('')
    setProfileError('')

    try {
      const currentProfile = await authService.bootstrapStudent(token, {
        full_name,
        phone,
      })
      setProfile(currentProfile)
      return { data: currentProfile }
    } catch (error) {
      const message = error.message || 'Could not create your EduMind student profile.'
      setAuthError(message)
      setProfileError(message)
      return { error: { message, code: error.code } }
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let subscription

    const loadSession = async () => {
      try {
        await refreshSession()
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user || null)
        setAuthError('')

        if (nextSession?.access_token) {
          localStorage.setItem('edumind_token', nextSession.access_token)
          // Do NOT clear profile / force profileLoading on every auth event.
          // refreshProfile is driven by the access_token effect below. Clearing
          // here with an unchanged token left the UI stuck on
          // "Checking your EduMind access..." forever.
          if (event === 'SIGNED_OUT') {
            clearProfileState(setProfile, setProfileError)
            setProfileLoading(false)
          }
        } else {
          localStorage.removeItem('edumind_token')
          clearProfileState(setProfile, setProfileError)
          setProfileLoading(false)
        }
      })
      subscription = data.subscription
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      if (!session?.access_token) {
        if (!cancelled) {
          clearProfileState(setProfile, setProfileError)
          setProfileLoading(false)
        }
        return
      }

      if (!cancelled) {
        setProfileLoading(true)
        setProfileError('')
      }

      try {
        const currentProfile = await authService.getCurrentEduMindProfile(
          session.access_token
        )
        if (!cancelled) {
          setProfile(currentProfile)
        }
      } catch (error) {
        if (cancelled) return
        setProfile(null)
        if (error.code === 'PROFILE_NOT_LINKED') {
          setProfileError(profileNotLinkedMessage)
        } else {
          setProfileError(
            'EduMind profile could not be loaded. Please try again.'
          )
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [session?.access_token])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Login is not configured yet. Please contact EduMind admin.'
      setAuthError(message)
      return { error: { message } }
    }

    setLoading(true)
    setAuthError('')
    clearProfileState(setProfile, setProfileError)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('email not confirmed') || error.code === 'email_not_confirmed') {
          const friendly =
            'Email not confirmed yet. Open the confirmation link from your inbox, or ask EduMind admin to confirm your account for the pilot.'
          setAuthError(friendly)
          return { error: { ...error, message: friendly } }
        }
        if (msg.includes('invalid login credentials')) {
          const friendly =
            'Invalid email or password. New students: use Register first with a real email (not .local).'
          setAuthError(friendly)
          return { error: { ...error, message: friendly } }
        }
        setAuthError(error.message || 'Login failed. Please check your details.')
        return { error }
      }

      setSession(data.session)
      setUser(data.user)
      if (data.session?.access_token) {
        localStorage.setItem('edumind_token', data.session.access_token)
      }
      return { data }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async ({ email, password, fullName, phone } = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Login is not configured yet. Please contact EduMind admin.'
      setAuthError(message)
      return { error: { message } }
    }

    setLoading(true)
    setAuthError('')
    clearProfileState(setProfile, setProfileError)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      })

      if (error) {
        setAuthError(error.message || 'Registration failed. Please try again.')
        return { error }
      }

      setSession(data.session || null)
      setUser(data.user || null)
      if (data.session?.access_token) {
        localStorage.setItem('edumind_token', data.session.access_token)
      }

      if (!data.session) {
        return {
          data,
          needsEmailConfirmation: true,
          message: 'Account created. Confirm your email from the inbox link, then use Sign in. For the pilot, admin can also confirm you in Supabase.',
        }
      }

      return { data }
    } finally {
      setLoading(false)
    }
  }

  const requestPhoneOtp = async (phone) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Login is not configured yet. Please contact EduMind admin.'
      setAuthError(message)
      return { error: { message } }
    }

    setLoading(true)
    setAuthError('')

    try {
      const { data, error } = await supabase.auth.signInWithOtp({ phone })

      if (error) {
        const message = mapAuthError(
          error,
          'Could not send OTP. Please check your phone number.'
        )
        setAuthError(message)
        return { error: { ...error, message } }
      }

      return { data }
    } finally {
      setLoading(false)
    }
  }

  const verifyPhoneOtp = async ({ phone, token } = {}) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Login is not configured yet. Please contact EduMind admin.'
      setAuthError(message)
      return { error: { message } }
    }

    setLoading(true)
    setAuthError('')
    clearProfileState(setProfile, setProfileError)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })

      if (error) {
        const message = mapAuthError(
          error,
          'Invalid or expired OTP. Please try again.'
        )
        setAuthError(message)
        return { error: { ...error, message } }
      }

      setSession(data.session)
      setUser(data.user)
      if (data.session?.access_token) {
        localStorage.setItem('edumind_token', data.session.access_token)
      }
      return { data }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(null)
      clearProfileState(setProfile, setProfileError)
      setProfileLoading(false)
      localStorage.removeItem('edumind_token')
      return
    }

    setLoading(true)
    setAuthError('')

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setAuthError(error.message || 'Logout failed.')
        return
      }
      setSession(null)
      setUser(null)
      clearProfileState(setProfile, setProfileError)
      localStorage.removeItem('edumind_token')
    } finally {
      setProfileLoading(false)
      setLoading(false)
    }
  }

  const value = useMemo(() => ({
    session,
    user,
    loading,
    authError,
    profile,
    profileLoading,
    profileError,
    isConfigured: isSupabaseConfigured,
    isAuthenticated: Boolean(user),
    getAccessToken,
    signIn,
    signUp,
    requestPhoneOtp,
    verifyPhoneOtp,
    bootstrapStudentProfile,
    signOut,
    refreshSession,
    refreshProfile,
  }), [session, user, loading, authError, profile, profileLoading, profileError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export default AuthContext
