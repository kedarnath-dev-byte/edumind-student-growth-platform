/**
 * @file ragService.js
 * @description Service layer for all RAG pipeline API calls.
 *              Sends full chat history so AI personalizes responses.
 *              Follows Single Responsibility Principle.
 */
import api from './api'

const ragService = {

  /**
   * Query RAG with question + full conversation history
   * @param {string} question - Student's question
   * @param {Array}  history  - Full chat history [{role, content}]
   * @param {string} documentId - Optional: filter by document
   * @param {number} userId     - Optional: track per student
   * @param {number} sessionId  - Optional: group by session
   */
  async query(question, history = [], documentId = null, userId = null, sessionId = null) {
    try {
      const response = await api.post('/rag/query', {
        question,
        history,
        document_id: documentId,
        user_id: userId,
        session_id: sessionId,
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'RAG query failed', { cause: error })
    }
  },

  /**
   * Get list of uploaded documents
   */
  async getDocuments(userId = null) {
    try {
      const url = userId
        ? `/ingestion/documents?user_id=${userId}`
        : '/ingestion/documents'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch documents', { cause: error })
    }
  },

  /**
   * Get RAG query history
   */
  async getHistory(userId = null) {
    try {
      const url = userId
        ? `/rag/history?user_id=${userId}`
        : '/rag/history'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch history', { cause: error })
    }
  },

  /**
   * Get analytics for admin dashboard
   */
  async getAnalytics(userId = null) {
    try {
      const url = userId
        ? `/rag/analytics?user_id=${userId}`
        : '/rag/analytics'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch analytics', { cause: error })
    }
  },
}

export default ragService