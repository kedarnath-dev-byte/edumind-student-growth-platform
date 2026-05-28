/**
 * @file studentGrowthService.js
 * @description API calls for the EduMind Student Growth student flow.
 */
import api from './api'

const apiPrefix = (import.meta.env.VITE_API_BASE_URL || '')
  .replace(/\/$/, '')
  .endsWith('/api/v1')
  ? ''
  : '/api/v1'

const getErrorMessage = (error, fallback) => {
  if (!error.response) {
    return 'Could not reach the backend. Please make sure it is running.'
  }
  return error.response?.data?.detail || fallback
}

const normalizeList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload

  const data = payload?.data
  if (Array.isArray(data)) return data

  if (data && typeof data === 'object') {
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data.items)) return data.items
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key]
    }
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key]
    }
  }

  return []
}

const studentGrowthService = {
  async getSchools() {
    try {
      const response = await api.get(`${apiPrefix}/schools`)
      return normalizeList(response, ['schools'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load schools'))
    }
  },

  async getClassroomsBySchool(schoolId) {
    try {
      const response = await api.get(`${apiPrefix}/classrooms/school/${schoolId}`)
      return normalizeList(response, ['classrooms'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load classrooms'))
    }
  },

  async getSubjectsBySchool(schoolId) {
    try {
      const response = await api.get(`${apiPrefix}/subjects/school/${schoolId}`)
      return normalizeList(response, ['subjects'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load subjects'))
    }
  },

  async getTopicsBySubject(subjectId) {
    try {
      const response = await api.get(`${apiPrefix}/topics/subject/${subjectId}`)
      return normalizeList(response, ['topics'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load topics'))
    }
  },

  async createLearningLog(payload) {
    try {
      const response = await api.post(`${apiPrefix}/learning-logs`, payload)
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to save learning log'))
    }
  },

  async getRevisionsForStudent(studentId) {
    try {
      const response = await api.get(`${apiPrefix}/revisions/student/${studentId}`)
      return normalizeList(response, ['revisions', 'revision_tasks'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load revisions'))
    }
  },

  async completeRevision(revisionTaskId, payload) {
    try {
      const response = await api.patch(
        `${apiPrefix}/revisions/${revisionTaskId}/complete`,
        payload
      )
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to complete revision'))
    }
  },

  async getRewardsForStudent(studentId) {
    try {
      const response = await api.get(`${apiPrefix}/rewards/student/${studentId}`)
      return normalizeList(response, ['rewards'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load rewards'))
    }
  },

  async getHabitSummary(studentId) {
    try {
      const response = await api.get(`${apiPrefix}/habits/student/${studentId}/summary`)
      return response?.data && typeof response.data === 'object' ? response.data : null
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load habit summary'))
    }
  },

  async createPeerHelpRequest(payload) {
    try {
      const response = await api.post(`${apiPrefix}/peer-learning/requests`, payload)
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to ask for peer support'))
    }
  },

  async getOpenPeerHelpRequests(filters = {}) {
    try {
      const response = await api.get(`${apiPrefix}/peer-learning/requests/open`, {
        params: filters,
      })
      return normalizeList(response, ['requests', 'open_requests'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load open support requests'))
    }
  },

  async createPeerHelpOffer(payload) {
    try {
      const response = await api.post(`${apiPrefix}/peer-learning/offers`, payload)
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to offer peer help'))
    }
  },

  async getAvailablePeerHelpOffers(filters = {}) {
    try {
      const response = await api.get(`${apiPrefix}/peer-learning/offers/available`, {
        params: filters,
      })
      return normalizeList(response, ['offers', 'available_offers'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load available helpers'))
    }
  },

  async acceptPeerHelpRequest(helpRequestId, payload) {
    try {
      const response = await api.post(
        `${apiPrefix}/peer-learning/requests/${helpRequestId}/accept`,
        payload
      )
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to start peer learning session'))
    }
  },

  async completePeerHelpSession(sessionId, payload) {
    try {
      const response = await api.patch(
        `${apiPrefix}/peer-learning/sessions/${sessionId}/complete`,
        payload
      )
      return response.data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to complete peer help session'))
    }
  },

  async getPeerLearningSessionsForStudent(studentId) {
    try {
      const response = await api.get(`${apiPrefix}/peer-learning/student/${studentId}/sessions`)
      return normalizeList(response, ['sessions'])
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load peer learning sessions'))
    }
  },

  async getPeerLearningTopicCircle(topicId) {
    try {
      const response = await api.get(`${apiPrefix}/peer-learning/topic/${topicId}/circle`)
      return response?.data && typeof response.data === 'object' ? response.data : null
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load topic support circle'))
    }
  },

  async getTeacherClassroomSummary(classroomId, filters = {}) {
    try {
      const response = await api.get(
        `${apiPrefix}/teacher-dashboard/classroom/${classroomId}/summary`,
        { params: filters }
      )
      return response?.data && typeof response.data === 'object' ? response.data : null
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load teacher dashboard summary'))
    }
  },
}

export default studentGrowthService
