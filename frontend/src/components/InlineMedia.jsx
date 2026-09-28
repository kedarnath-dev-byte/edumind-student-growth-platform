/**
 * Instagram / Shorts-style inline image or video renderer.
 * Mux / HLS plays via hls.js (Android WebView). Drive footer ONLY for Drive URLs
 * and labeled Archive / Drive so users know why it is not a Reel.
 */
import { useMemo, useState } from 'react'
import MuxInlineVideo from './MuxInlineVideo'
import {
  drivePreviewEmbedUrl,
  extractDriveFileId,
  mediaTypeFromMime,
  mediaTypeFromUrl,
} from '../utils/driveMediaHelpers'
import { isHlsUrl, isMuxUrl, muxThumbnailUrl, resolveMuxSrc } from '../utils/muxHls'

/**
 * @param {object} props
 * @param {string} [props.src] - preferred playback URL
 * @param {string} [props.viewUrl] - Drive web view / open link
 * @param {string} [props.muxPlaybackId] - Mux playback id (prefer over raw m3u8 src)
 * @param {'image'|'video'|'text'|string} [props.mediaType]
 * @param {string} [props.mime]
 * @param {string} [props.className]
 * @param {string} [props.alt]
 * @param {() => void} [props.onPlayShort] - when set with Mux, show thumbnail + play (opens Shorts)
 */
const InlineMedia = ({
  src,
  viewUrl,
  muxPlaybackId,
  mediaType,
  mime,
  className = '',
  alt = '',
  onPlayShort,
}) => {
  const [failed, setFailed] = useState(false)

  const muxSrc = useMemo(
    () => resolveMuxSrc(muxPlaybackId, src),
    [muxPlaybackId, src],
  )
  const isMuxVideo = !!(muxPlaybackId || isMuxUrl(src) || isMuxUrl(viewUrl) || isHlsUrl(src))
  const poster = muxPlaybackId ? muxThumbnailUrl(muxPlaybackId) : null

  const kind = useMemo(() => {
    if (isMuxVideo) return 'video'
    if (mediaType === 'image' || mediaType === 'video') return mediaType
    const fromMime = mediaTypeFromMime(mime)
    if (fromMime === 'image' || fromMime === 'video') return fromMime
    return mediaTypeFromUrl(src || viewUrl) || 'image'
  }, [mediaType, mime, src, viewUrl, isMuxVideo])

  const driveId = useMemo(
    () => extractDriveFileId(viewUrl) || extractDriveFileId(src),
    [viewUrl, src],
  )
  const embedUrl = drivePreviewEmbedUrl(driveId)
  // Drive open link only when we actually have a Drive file id — never for Mux HLS.
  const driveOpenUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/view`
    : null

  if (!src && !viewUrl && !driveId && !muxPlaybackId) return null

  const shell = `w-full bg-black overflow-hidden ${className}`

  if (kind === 'video') {
    if (isMuxVideo && muxSrc) {
      // Optional Reel entry: thumbnail + play opens full Shorts feed
      if (typeof onPlayShort === 'function' && muxPlaybackId) {
        return (
          <button
            type="button"
            onClick={onPlayShort}
            className={`${shell} relative block text-left aspect-[9/16] max-h-[28rem] group`}
            aria-label="Play Short"
          >
            {poster ? (
              <img
                src={poster}
                alt={alt || 'Short thumbnail'}
                className="absolute inset-0 h-full w-full object-cover bg-black"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-900" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black text-xl shadow-lg">
                ▶
              </span>
            </span>
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/60 text-white px-2 py-0.5 rounded-full">
              Reel · Mux
            </span>
          </button>
        )
      }
      return (
        <div className={shell}>
          <MuxInlineVideo
            muxPlaybackId={muxPlaybackId}
            src={muxSrc}
            poster={poster || undefined}
            className="w-full max-h-[32rem] object-contain bg-black"
            controls
          />
        </div>
      )
    }

    return (
      <div className={shell}>
        {src && !failed ? (
          <video
            src={src}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[32rem] object-contain bg-black"
            onError={() => setFailed(true)}
          />
        ) : embedUrl ? (
          <iframe
            title="Drive video archive preview"
            src={embedUrl}
            className="w-full aspect-[9/16] max-h-[32rem] border-0 bg-black"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Video preview unavailable in-app.
            <p className="text-xs text-gray-500 mt-2">
              Archive / Drive videos cannot autoplay like Reels. Re-upload as a Mux Short to get Reel playback.
            </p>
          </div>
        )}
        {driveOpenUrl && (
          <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 flex justify-between items-center gap-2">
            <span className="text-[11px] text-amber-200/90 truncate">
              Archive / Drive — not a Reel (cannot autoplay)
            </span>
            <a
              href={driveOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-300 hover:underline shrink-0"
            >
              Open in Drive
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={shell}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="w-full max-h-[32rem] object-cover bg-black"
          onError={() => setFailed(true)}
        />
      ) : embedUrl ? (
        <iframe
          title="Drive image preview"
          src={embedUrl}
          className="w-full aspect-square max-h-[32rem] border-0 bg-black"
          allowFullScreen
        />
      ) : (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          Image preview unavailable in-app.
        </div>
      )}
      {(failed || !src) && driveOpenUrl && (
        <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 flex justify-between items-center gap-2">
          <span className="text-[11px] text-gray-500 truncate">Archive / Drive</span>
          <a
            href={driveOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-300 hover:underline shrink-0"
          >
            Open in Drive
          </a>
        </div>
      )}
    </div>
  )
}

export default InlineMedia
