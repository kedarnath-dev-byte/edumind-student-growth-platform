/**
 * @file muxUploadService.js
 * @description Mux direct-upload client for EduMind Shorts (not Google Drive).
 * Flow: create upload → PUT file to Mux URL → poll until ready → optional attach.
 */
import api from './api'

const COMING_ONLINE = 'Video uploads coming online'

const muxUploadService = {
  async getStatus() {
    const { data } = await api.get('/api/v1/mux/status', { timeout: 30000 })
    return data
  },

  /**
   * @param {string} token
   * @param {'learning_log'|'subject_post'|'general'} [purpose]
   */
  async createUpload(token, purpose = 'general') {
    try {
      const { data } = await api.post(
        '/api/v1/mux/uploads',
        { purpose },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000,
        },
      )
      return data
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 503 || /coming online/i.test(String(detail || ''))) {
        const e = new Error(COMING_ONLINE)
        e.code = 'MUX_UNAVAILABLE'
        throw e
      }
      throw err
    }
  },

  /**
   * PUT bytes directly to Mux (not through EduMind backend).
   * @param {string} uploadUrl
   * @param {File|Blob} file
   * @param {(pct: number) => void} [onProgress]
   */
  async putToMux(uploadUrl, file, onProgress) {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'video/webm')
      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Mux upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Network error uploading to Mux'))
      xhr.send(file)
    })
  },

  async getUploadStatus(token, uploadId) {
    const { data } = await api.get(`/api/v1/mux/uploads/${encodeURIComponent(uploadId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 60000,
    })
    return data
  },

  /**
   * Poll until ready, duration invalid, or timeout.
   */
  async waitUntilReady(token, uploadId, { intervalMs = 2500, maxAttempts = 48, onTick } = {}) {
    let last = null
    for (let i = 0; i < maxAttempts; i += 1) {
      last = await this.getUploadStatus(token, uploadId)
      if (onTick) onTick(last, i)
      if (last.duration_ok === false) {
        const e = new Error(last.message || 'Video length must be 30–180 seconds')
        e.code = 'DURATION_INVALID'
        e.status = last
        throw e
      }
      if (last.ready && last.playback_id) return last
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    const e = new Error(last?.message || 'Mux is still processing — try again in a moment.')
    e.code = 'MUX_TIMEOUT'
    e.status = last
    throw e
  },

  async attach(token, body) {
    const { data } = await api.post('/api/v1/mux/attach', body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 90000,
    })
    return data
  },

  /**
   * Full path: create → PUT → wait → return playback fields.
   */
  async uploadSelfieVideo(file, token, { purpose = 'general', onProgress, onStatus } = {}) {
    const created = await this.createUpload(token, purpose)
    await this.putToMux(created.upload_url, file, onProgress)
    if (onStatus) onStatus('Processing video…')
    const ready = await this.waitUntilReady(token, created.upload_id, {
      onTick: (status) => {
        if (onStatus) onStatus(status.message || 'Processing…')
      },
    })
    return {
      upload_id: created.upload_id,
      asset_id: ready.asset_id,
      playback_id: ready.playback_id,
      playback_url: ready.playback_url,
      duration_seconds: ready.duration_seconds,
    }
  },
}

export default muxUploadService
export { COMING_ONLINE }
