/**
 * @file driveUploadService.js
 * @description Student Google Drive proof/document uploads.
 *              Calls JWT-protected /api/v1/drive/upload — no Drive secrets
 *              in the browser. Separate from local RAG ingestion uploads.
 */
import api from './api'

const driveUploadService = {
  /**
   * Upload a proof or document to Google Drive via the backend.
   * @param {File} file
   * @param {'proof'|'document'} category
   * @param {string} accessToken - Supabase access token
   * @param {Function} [onProgress]
   */
  async upload(file, category, accessToken, onProgress) {
    if (!accessToken) {
      throw new Error('Please log in to upload proofs.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    try {
      const response = await api.post('/api/v1/drive/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
        onUploadProgress: (progressEvent) => {
          if (!onProgress || !progressEvent.total) return
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentage)
        },
      })
      return response.data
    } catch (error) {
      const detail = error.response?.data?.detail
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || d).join(', ')
          : 'Drive upload failed'
      throw new Error(message)
    }
  },

  async listMine(accessToken) {
    if (!accessToken) {
      throw new Error('Please log in to view uploads.')
    }
    try {
      const response = await api.get('/api/v1/drive/uploads', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return response.data
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || 'Failed to load Drive uploads'
      )
    }
  },
}

export default driveUploadService
