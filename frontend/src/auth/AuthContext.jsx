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
      setLoading(false)
      return null
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      setAuthError(error.message || 'Could not refresh login session.')
      setSession(null)
      setUser(null)
      return null
    }

    setSession(data.session)
    setUser(data.session?.user || null)
    return data.session
  }

  const getAccessToken = () => session?.access_token || null

  const refreshProfile = async (accessToken = null) => {
    const token = accessToken || getAccessToken()

    if (!token) {
      setProfile(null)
      setProfileError('')
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
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user || null)
        setAuthError('')
        if (!nextSession) {
          setProfile(null)
          setProfileError('')
        }
      })
      subscription = data.subscription
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session?.access_token) {
      refreshProfile(session.access_token)
    } else {
      setProfile(null)
      setProfileError('')
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthError(error.message || 'Login failed. Please check your details.')
        return { error }
      }

      setSession(data.session)
      setUser(data.user)
      return { data }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null)
      setUser(null)
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
      setProfile(null)
      setProfileError('')
    } finally {
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
