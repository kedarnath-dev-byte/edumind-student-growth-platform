/**
 * @file ShortsPlayer.jsx
 * @description Full-screen vertical swipe feed (Instagram / YouTube Shorts feel).
 * Autoplay muted; tap to unmute. Prefers Mux HLS (stream.mux.com/{id}.m3u8).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const loadHls = (() => {
  let promise = null
  return () => {
    if (window.Hls) return Promise.resolve(window.Hls)
    if (promise) return promise
    promise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'
      s.async = true
      s.onload = () => resolve(window.Hls)
      s.onerror = () => reject(new Error('Failed to load HLS'))
      document.head.appendChild(s)
    })
    return promise
  }
})()

function resolvePlaybackSrc(item) {
  if (item?.mux_playback_id) {
    return `https://stream.mux.com/${item.mux_playback_id}.m3u8`
  }
  if (item?.playback_url) return item.playback_url
  if (item?.media_url) return item.media_url
  if (item?.explanation_video_url) return item.explanation_video_url
  if (item?.src) return item.src
  return null
}

const ShortSlide = ({ item, active, muted, onToggleMute }) => {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const src = resolvePlaybackSrc(item)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    const video = videoRef.current
    if (!video || !src) return undefined

    let cancelled = false

    const setup = async () => {
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
        const isHls = /\.m3u8(\?|$)/i.test(src)
        if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src
        } else if (isHls) {
          const Hls = await loadHls()
          if (cancelled || !Hls?.isSupported()) {
            video.src = src
            return
          }
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
          hlsRef.current = hls
          hls.loadSource(src)
          hls.attachMedia(video)
        } else {
          video.src = src
        }
      } catch (_) {
        if (!cancelled) setFailed(true)
      }
    }

    setup()
    return () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (active) {
      const play = video.play()
      if (play?.catch) play.catch(() => {})
    } else {
      video.pause()
      try { video.currentTime = 0 } catch (_) { /* ignore */ }
    }
  }, [active, muted])

  const title = item?.author_display_name || item?.caption || 'Short'
  const caption = item?.caption || item?.taught_today || ''

  return (
    <section
      className="relative h-full w-full snap-start snap-always bg-black flex items-center justify-center"
      aria-label={title}
    >
      {src && !failed ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain bg-black"
          playsInline
          loop
          muted={muted}
          preload="metadata"
          onClick={onToggleMute}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="text-gray-400 text-sm px-6 text-center">
          {failed ? 'Video unavailable' : 'No video'}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-8 pointer-events-none">
        <p className="text-white font-semibold text-sm">{title}</p>
        {caption && (
          <p className="text-gray-200 text-xs mt-1 line-clamp-3">{caption}</p>
        )}
        <p className="text-gray-400 text-[10px] mt-2">
          {muted ? 'Tap video to unmute' : 'Tap video to mute'} · swipe for next
        </p>
      </div>
    </section>
  )
}

/**
 * @param {object} props
 * @param {Array<object>} props.items - posts/logs with mux_playback_id or media URLs
 * @param {() => void} [props.onClose]
 * @param {number} [props.startIndex]
 */
const ShortsPlayer = ({ items = [], onClose, startIndex = 0 }) => {
  const scrollerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [muted, setMuted] = useState(true)

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / Math.max(el.clientHeight, 1))
    setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)))
  }, [items.length])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = startIndex * el.clientHeight
  }, [startIndex])

  if (!items.length) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6">
        <p className="text-sm text-gray-300">No Shorts videos yet.</p>
        {onClose && (
          <button type="button" onClick={onClose} className="mt-4 text-blue-300 text-sm">
            Close
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold"
          aria-label="Close Shorts"
        >
          Close
        </button>
      )}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-contain"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {items.map((item, index) => (
          <div key={item.id || item.mux_playback_id || index} className="h-full w-full">
            <ShortSlide
              item={item}
              active={index === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShortsPlayer
export { resolvePlaybackSrc }
