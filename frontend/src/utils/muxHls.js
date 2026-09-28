/**
 * Shared Mux HLS helpers for Android WebView + desktop.
 * WebView often cannot play .m3u8 natively — use hls.js (same CDN as ShortsPlayer).
 */

const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'

const loadHls = (() => {
  let promise = null
  return () => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('No window'))
    }
    if (window.Hls) return Promise.resolve(window.Hls)
    if (promise) return promise
    promise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = HLS_CDN
      s.async = true
      s.onload = () => resolve(window.Hls)
      s.onerror = () => reject(new Error('Failed to load HLS'))
      document.head.appendChild(s)
    })
    return promise
  }
})()

/**
 * Build stream.mux.com HLS URL from a playback id or existing media URL.
 * @param {string|null|undefined} muxPlaybackId
 * @param {string|null|undefined} fallbackUrl
 */
export function resolveMuxSrc(muxPlaybackId, fallbackUrl) {
  if (muxPlaybackId) {
    return `https://stream.mux.com/${muxPlaybackId}.m3u8`
  }
  if (fallbackUrl && /stream\.mux\.com/i.test(fallbackUrl)) {
    return fallbackUrl
  }
  if (fallbackUrl && /\.m3u8(\?|$)/i.test(fallbackUrl)) {
    return fallbackUrl
  }
  return fallbackUrl || null
}

/**
 * Mux image API thumbnail for a playback id (list cards / posters).
 * @param {string|null|undefined} muxPlaybackId
 * @param {{ width?: number, height?: number, time?: number }} [opts]
 */
export function muxThumbnailUrl(muxPlaybackId, opts = {}) {
  if (!muxPlaybackId) return null
  const width = opts.width || 540
  const height = opts.height || 960
  const time = opts.time ?? 1
  return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?width=${width}&height=${height}&fit_mode=smartcrop&time=${time}`
}

/** True when item can autoplay like a Reel (Mux HLS). */
export function hasMuxPlayback(item) {
  if (!item) return false
  if (item.mux_playback_id) return true
  const url = item.playback_url || item.media_url || item.explanation_video_url || item.src || ''
  return /stream\.mux\.com/i.test(url) || /\.m3u8(\?|$)/i.test(url)
}

/**
 * Prefer Mux items for Shorts feeds; optionally append non-Mux last (usually skip).
 * @param {Array<object>} items
 * @param {{ includeNonMux?: boolean }} [opts]
 */
export function preferMuxShorts(items, opts = {}) {
  const list = Array.isArray(items) ? items : []
  const mux = list.filter((item) => hasMuxPlayback(item))
  if (opts.includeNonMux) {
    const rest = list.filter((item) => !hasMuxPlayback(item))
    return [...mux, ...rest]
  }
  return mux
}

export function isHlsUrl(url) {
  return !!url && /\.m3u8(\?|$)/i.test(url)
}

export function isMuxUrl(url) {
  return !!url && /stream\.mux\.com/i.test(url)
}

/**
 * Attach source to a <video> element, using hls.js when needed.
 * @returns {() => void} cleanup
 */
export function attachMediaSource(video, src) {
  let destroyed = false
  let hlsInstance = null

  const cleanup = () => {
    destroyed = true
    if (hlsInstance) {
      try {
        hlsInstance.destroy()
      } catch { /* ignore */ }
      hlsInstance = null
    }
  }

  if (!video || !src) return cleanup

  const setup = async () => {
    try {
      const hls = isHlsUrl(src)
      if (hls && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        return
      }
      if (hls) {
        const Hls = await loadHls()
        if (destroyed) return
        if (!Hls?.isSupported()) {
          video.src = src
          return
        }
        hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true })
        hlsInstance.loadSource(src)
        hlsInstance.attachMedia(video)
        return
      }
      video.src = src
    } catch {
      if (!destroyed) {
        try {
          video.src = src
        } catch { /* ignore */ }
      }
    }
  }

  setup()
  return cleanup
}

export { loadHls }
