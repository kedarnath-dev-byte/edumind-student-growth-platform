/**
 * @file uploadService.js
 * @description Service layer for document upload and ingestion API calls.
 *              Handles PDF, DOCX, and TXT file uploads to FastAPI backend.
 *              Uses multipart/form-data for file transfer — not JSON.
 *              Follows Single Responsibility Principle — only upload calls here.
 */
import api from './api'

// ─── Upload Service ───────────────────────────────────────────────────────────
const uploadService = {

  /**
   * Upload a document to the backend ingestion pipeline
   * @param {File} file - The file object from browser input
   * @param {Function} onProgress - Callback for upload progress (0-100)
   * @returns {Promise} - Ingestion result with chunk count
   */
  async uploadDocument(file, onProgress) {
    try {
      // Files must be sent as FormData — not JSON
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/ingestion/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          if (onProgress) onProgress(percentage)
        },
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Document upload failed', { cause: error })
    }
  },

  /**
   * Get list of all uploaded documents
   * @returns {Promise} - List of documents with metadata
   */
  async getDocuments() {
    try {
      const response = await api.get('/ingestion/documents')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch documents', { cause: error })
    }
  },

  /**
   * Delete a document by ID
   * @param {string} documentId - ID of document to delete
   * @returns {Promise} - Deletion confirmation
   */
  async deleteDocument(documentId) {
    try {
      const response = await api.delete(`/ingestion/documents/${documentId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to delete document', { cause: error })
    }
  },
}

export default uploadService