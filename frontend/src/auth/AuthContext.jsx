import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

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
      })
      subscription = data.subscription
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo(() => ({
    session,
    user,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    isAuthenticated: Boolean(user),
    signIn,
    signOut,
    refreshSession,
  }), [session, user, loading, authError])

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
