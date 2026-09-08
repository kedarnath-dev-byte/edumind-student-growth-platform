import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Shared-device default: tokens live only in this tab unless explicitly remembered.
const authStorage = {
  getItem: key => sessionStorage.getItem(key) || localStorage.getItem(key),
  setItem: (key, value) => {
    const remember = localStorage.getItem('edumind:remember') === 'true'
    const target = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    other.removeItem(key)
    target.setItem(key, value)
  },
  removeItem: key => { sessionStorage.removeItem(key); localStorage.removeItem(key) },
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: authStorage } })
  : null

export default supabase
