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

  async bootstrapStudent(accessToken, { full_name, phone } = {}) {
    if (!accessToken) {
      throw new Error('Missing Supabase access token.')
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/v1/auth/bootstrap-student`,
        {
          full_name,
          phone: phone || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 409) {
        const conflictError = new Error(
          error.response?.data?.detail
            || 'An EduMind account with these details already exists.'
        )
        conflictError.code = 'BOOTSTRAP_CONFLICT'
        throw conflictError
      }

      if (error.response?.status === 401) {
        const authError = new Error('Your login session could not be verified.')
        authError.code = 'AUTH_TOKEN_INVALID'
        throw authError
      }

      const bootstrapError = new Error(
        error.response?.data?.detail
          || 'Could not create your EduMind student profile. Please try again.'
      )
      bootstrapError.code = 'BOOTSTRAP_FAILED'
      throw bootstrapError
    }
  },

  async bootstrapAdmin(accessToken, { full_name, phone } = {}) {
    if (!accessToken) {
      throw new Error('Missing Supabase access token.')
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/v1/auth/bootstrap-admin`,
        {
          full_name,
          phone: phone || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 403) {
        const conflictError = new Error(
          error.response?.data?.detail
            || 'Admin account could not be created for this login.'
        )
        conflictError.code = 'BOOTSTRAP_CONFLICT'
        throw conflictError
      }

      if (error.response?.status === 401) {
        const authError = new Error('Your login session could not be verified.')
        authError.code = 'AUTH_TOKEN_INVALID'
        throw authError
      }

      const bootstrapError = new Error(
        error.response?.data?.detail
          || 'Could not create your EduMind admin profile. Please try again.'
      )
      bootstrapError.code = 'BOOTSTRAP_FAILED'
      throw bootstrapError
    }
  },
}

export default authService
