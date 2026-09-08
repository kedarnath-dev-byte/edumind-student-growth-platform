import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/authContext'

export default function PasswordRecovery({ reset = false }) {
  const { signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [account, setAccount] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!reset || !supabase) return
    let active = true
    // Wait for Supabase's URL/session initialization, then verify with Auth.
    supabase.auth.getUser().then(({ data }) => {
      if (active) setAccount(data.user || null)
    }).catch(() => { if (active) setAccount(null) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAccount(session?.user || null)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [reset])

  const submit = async event => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    try {
      if (!supabase) throw new Error('Account access is not configured. Contact your mentor.')
      if (reset) {
        if (!account) throw new Error('Open a fresh password reset link from your email.')
        if (password.length < 12) throw new Error('Use at least 12 characters.')
        if (password !== confirmation) throw new Error('The passwords do not match.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword(''); setConfirmation('')
        const signedOut = await signOut()
        setMessage(signedOut ? 'Password updated. Return to the app and sign in with your new password.' : 'Password updated. Please sign out using My account before sharing this device.')
      } else {
        const origin = import.meta.env.VITE_PUBLIC_APP_URL || (!Capacitor.isNativePlatform() ? window.location.origin : '')
        if (!origin) throw new Error('Password recovery is not configured. Contact your mentor.')
        const destination = new URL('/reset-password', origin)
        if (destination.protocol !== 'https:' && destination.hostname !== 'localhost') throw new Error('Password recovery requires a secure app address.')
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: destination.href })
        if (resetError) throw new Error('Could not request the email. Please wait and try again.')
        setMessage('If this email has an account, you will receive a reset link. Open it in your browser, then return to the app to sign in.')
      }
    } catch (failure) { setError(failure.message || 'Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-gray-950 text-white p-6"><div className="growth-page max-w-md mx-auto">
    <h1>{reset ? 'Choose a new password' : 'Forgot password?'}</h1>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="notice">{message}</p>}
    <form className="panel space-y-4" onSubmit={submit}>
      {reset ? <>
        <p>{account ? `Updating password for ${account.email}.` : 'Open the reset link from your email to continue.'}</p>
        <label>New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Repeat new password<input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      </> : <label>Your enrolled email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <button className="primary" disabled={busy || !supabase || (reset && !account)}>{busy ? 'Please wait…' : reset ? 'Save new password' : 'Send reset link'}</button>
    </form>
    <Link to="/login">Back to sign in</Link>
  </div></main>
}
