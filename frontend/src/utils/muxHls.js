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
