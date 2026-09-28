/**
 * Inline Mux / HLS video for feed cards and Learning Log past entries.
 * Reuses the ShortsPlayer hls.js pattern so Android WebView plays .m3u8.
 */
import { useEffect, useRef, useState } from 'react'
import { attachMediaSource, resolveMuxSrc } from '../utils/muxHls'

/**
 * @param {object} props
 * @param {string} [props.muxPlaybackId]
 * @param {string} [props.src] - HLS or progressive URL
 * @param {string} [props.className]
 * @param {boolean} [props.controls]
 * @param {boolean} [props.autoPlay]
 * @param {boolean} [props.muted]
 * @param {boolean} [props.loop]
 * @param {string} [props.poster]
 */
const MuxInlineVideo = ({
  muxPlaybackId,
  src,
  className = 'w-full max-h-[32rem] object-contain bg-black',
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  poster,
}) => {
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const playbackSrc = resolveMuxSrc(muxPlaybackId, src)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playbackSrc) return undefined
    let cancelled = false
    const cleanup = attachMediaSource(video, playbackSrc)
    // Reset failure flag asynchronously so effect stays sync-clean for React Compiler lint.
    queueMicrotask(() => {
      if (!cancelled) setFailed(false)
    })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [playbackSrc])

  if (!playbackSrc) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        No video
      </div>
    )
  }

  if (failed) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        Video unavailable
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      poster={poster}
      onError={() => setFailed(true)}
    />
  )
}

export default MuxInlineVideo
