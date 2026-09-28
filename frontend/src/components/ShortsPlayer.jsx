/**
 * @file ShortsPlayer.jsx
 * @description Full-screen vertical snap-scroll feed (Instagram Reels / YouTube Shorts).
 * IntersectionObserver autoplay/pause on the visible slide. Mux HLS via muxHls.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { attachMediaSource, resolveMuxSrc } from '../utils/muxHls'

function resolvePlaybackSrc(item) {
  if (item?.mux_playback_id) {
    return resolveMuxSrc(item.mux_playback_id)
  }
  if (item?.playback_url) return item.playback_url
  if (item?.media_url) return item.media_url
  if (item?.explanation_video_url) return item.explanation_video_url
  if (item?.src) return item.src
  return null
}

const ShortSlide = ({ item, active, muted, onToggleMute, onVisible, index }) => {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)
  const src = resolvePlaybackSrc(item)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
          onVisible?.(index)
        }
      },
      { threshold: [0.6, 0.75, 0.9] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [index, onVisible])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return undefined
    let cancelled = false
    const cleanup = attachMediaSource(video, src)
    queueMicrotask(() => {
      if (!cancelled) setFailed(false)
    })
    return () => {
      cancelled = true
      cleanup()
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
      try { video.currentTime = 0 } catch { /* ignore */ }
    }
  }, [active, muted])

  const title = item?.author_display_name || item?.caption || item?.taught_today || 'Short'
  const caption = item?.caption || item?.taught_today || item?.understood || ''

  return (
    <section
      ref={sectionRef}
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always bg-black flex items-center justify-center"
      aria-label={typeof title === 'string' ? title.slice(0, 80) : 'Short'}
      data-short-index={index}
    >
      {src && !failed ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain bg-black"
          playsInline
          loop
          muted={muted}
          preload={active ? 'auto' : 'metadata'}
          onClick={onToggleMute}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="text-gray-400 text-sm px-6 text-center">
          {failed ? 'Video unavailable' : 'No playable Short (needs Mux upload)'}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-10 pointer-events-none">
        <p className="text-white font-semibold text-sm line-clamp-2">{title}</p>
        {caption && caption !== title && (
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
 * @param {Array<object>} props.items - posts/logs with mux_playback_id (preferred)
 * @param {() => void} [props.onClose]
 * @param {number} [props.startIndex]
 */
const ShortsPlayer = ({ items = [], onClose, startIndex = 0 }) => {
  const scrollerRef = useRef(null)
  const safeStart = Math.max(0, Math.min(startIndex, Math.max(items.length - 1, 0)))
  const [activeIndex, setActiveIndex] = useState(safeStart)
  const [muted, setMuted] = useState(true)

  const onVisible = useCallback((index) => {
    setActiveIndex(index)
  }, [])

  // Lock body scroll while open (Instagram-style overlay)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !items.length) return
    // Wait a frame so layout has 100dvh heights
    const id = requestAnimationFrame(() => {
      const slideH = el.clientHeight || window.innerHeight
      el.scrollTop = safeStart * slideH
      setActiveIndex(safeStart)
    })
    return () => cancelAnimationFrame(id)
  }, [safeStart, items.length])

  if (!items.length) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6">
        <p className="text-sm text-gray-300 text-center">
          No Reel-ready Shorts yet. Record a selfie explanation (Mux) on your Learning Log —
          older Drive-only videos stay in Archive and cannot autoplay like Reels.
        </p>
        {onClose && (
          <button type="button" onClick={onClose} className="mt-4 text-blue-300 text-sm">
            Close
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" role="dialog" aria-modal="true" aria-label="Watch Shorts">
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
        className="absolute top-3 left-3 z-20 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-gray-300"
        aria-live="polite"
      >
        {activeIndex + 1} / {items.length}
      </div>
      <div
        ref={scrollerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-contain touch-pan-y"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, index) => (
          <ShortSlide
            key={item.id || item.mux_playback_id || `short-${index}`}
            item={item}
            index={index}
            active={index === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onVisible={onVisible}
          />
        ))}
      </div>
    </div>
  )
}

export default ShortsPlayer
