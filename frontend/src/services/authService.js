import axios from 'axios'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const authService = {
  async getCurrentEduMindProfile(accessToken) {
    if (!accessToken) {
      throw new Error('Missing Supabase access token.')
    }

    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/v1/auth/me/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 404) {
        const profileError = new Error(
          'EduMind profile is not linked yet. Please contact EduMind admin.'
        )
        profileError.code = 'PROFILE_NOT_LINKED'
        throw profileError
      }

      if (error.response?.status === 401) {
        const authError = new Error('Your login session could not be verified.')
        authError.code = 'AUTH_TOKEN_INVALID'
        throw authError
      }

      const networkError = new Error(
        'EduMind profile could not be loaded. Please try again.'
      )
      networkError.code = 'PROFILE_LOAD_FAILED'
      throw networkError
    }
  },
}

export default authService
