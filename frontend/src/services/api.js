/**
 * @file api.js
 * @description Central Axios instance for EduMind AI frontend.
 *              All API calls go through this instance — base URL,
 *              auth headers, and error interceptors configured once here.
 *              Follows DRY principle — no repeated axios configuration.
 */
import axios from 'axios'

// Render free-tier cold starts often need 40–60s. Never use a tight timeout in demos.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edumind_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const shouldRetry = (error, config) => {
  if (!config || config.__edumindRetry >= 2) return false
  // Retry network/cold-start failures for all methods — Render free wake kills demos otherwise.
  // Network / timeout / 502-504 during wake
  if (!error.response) return true
  const status = error.response.status
  return status === 502 || status === 503 || status === 504
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}
    if (shouldRetry(error, config)) {
      config.__edumindRetry = (config.__edumindRetry || 0) + 1
      const delay = config.__edumindRetry === 1 ? 2500 : 5000
      await sleep(delay)
      return api.request(config)
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('edumind_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
