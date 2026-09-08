/**
 * @file api.js
 * @description Central Axios instance for EduMind AI frontend.
 *              All API calls go through this instance — base URL,
 *              auth headers, and error interceptors configured once here.
 *              Follows DRY principle — no repeated axios configuration.
 */
import axios from 'axios'
import { supabase } from '../lib/supabaseClient'

// ─── Create Axios Instance ───────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Automatically attach auth token to every request
api.interceptors.request.use(
  async (config) => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: {} }
    const token = data.session?.access_token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ────────────────────────────────────────────────────
// Handle global errors (401 = logout, 500 = show error)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('edumind_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api