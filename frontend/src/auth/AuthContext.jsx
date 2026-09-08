import { useEffect, useRef, useState, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { AuthContext } from './authContext'
import authService from '../services/authService'
export function AuthProvider({children}) {
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [profile,setProfile]=useState(null)
  const [profileLoading,setProfileLoading]=useState(false)
  const [profileError,setProfileError]=useState('')
  const [authError,setAuthError]=useState('')
  const tokenRef=useRef(null), generation=useRef(0)
  const refreshProfile=useCallback(async token=>{
    const accessToken=token || tokenRef.current
    if(!accessToken)return null
    const version=++generation.current
    setProfileLoading(true);setProfileError('')
    try {
      const result=await authService.getCurrentEduMindProfile(accessToken)
      if(version!==generation.current)return null
      setProfile(result);return result
    } catch(e) {
      if(version!==generation.current)return null
      setProfile(null);setProfileError(e.code==='PROFILE_NOT_LINKED'?'Your school has not enrolled this account yet. Contact your mentor.':'Could not load your account. Please retry.')
      return {errorCode:e.code || 'PROFILE_LOAD_FAILED'}
    } finally {if(version===generation.current)setProfileLoading(false)}
  },[])
  const adoptSession=useCallback(next=>{
    generation.current+=1;tokenRef.current=next?.access_token || null
    setSession(next);setProfile(null);setProfileError('');setLoading(false)
    setProfileLoading(Boolean(next))
    if(next)queueMicrotask(()=>{if(tokenRef.current===next.access_token)refreshProfile(next.access_token)})
  },[refreshProfile])
  useEffect(()=>{
    if(!supabase){queueMicrotask(()=>setLoading(false));return}
    let active=true
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)adoptSession(next)})
    supabase.auth.getSession().then(({data,error})=>{if(active){if(error)setAuthError(error.message);adoptSession(data.session)}}).catch(()=>{if(active){setAuthError('Could not restore your session.');setLoading(false)}})
    return()=>{active=false;generation.current+=1;data.subscription.unsubscribe()}
  },[adoptSession])
  const signIn=async(email,password)=>{
    if(!supabase)return {error:{message:'Login is not configured.'}}
    setLoading(true);setAuthError('')
    try {const result=await supabase.auth.signInWithPassword({email,password});if(result.error)setAuthError(result.error.message);else adoptSession(result.data.session);return result}
    catch(e){setAuthError('Could not connect. Try again.');return {error:e}}
    finally{setLoading(false)}
  }
  const signOut=async()=>{
    setAuthError('')
    if(supabase){const {error}=await supabase.auth.signOut({scope:'local'});if(error){setAuthError('Sign out did not complete. Reconnect and try again.');return false}}
    for(const key of Object.keys(sessionStorage)){if(key.startsWith('edumind:draft:'))sessionStorage.removeItem(key)}
    adoptSession(null);return true
  }
  const refreshSession=async()=>{if(!supabase)return null;const {data}=await supabase.auth.getSession();adoptSession(data.session);return data.session}
  return <AuthContext.Provider value={{session,user:session?.user || null,loading,profile,profileLoading,profileError,authError,isConfigured:isSupabaseConfigured,isAuthenticated:Boolean(session?.user),getAccessToken:()=>tokenRef.current,signIn,signOut,refreshSession,refreshProfile}}>{children}</AuthContext.Provider>
}
