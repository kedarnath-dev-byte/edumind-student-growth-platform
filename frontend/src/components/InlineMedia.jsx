/**
 * Instagram / Shorts-style inline image or video renderer.
 * Mux / HLS plays via hls.js (Android WebView). Drive footer ONLY for Drive URLs.
 */
import { useMemo, useState } from 'react'
import MuxInlineVideo from './MuxInlineVideo'
import {
  drivePreviewEmbedUrl,
  extractDriveFileId,
  mediaTypeFromMime,
  mediaTypeFromUrl,
} from '../utils/driveMediaHelpers'
import { isHlsUrl, isMuxUrl, resolveMuxSrc } from '../utils/muxHls'

/**
 * @param {object} props
 * @param {string} [props.src] - preferred playback URL
 * @param {string} [props.viewUrl] - Drive web view / open link
 * @param {string} [props.muxPlaybackId] - Mux playback id (prefer over raw m3u8 src)
 * @param {'image'|'video'|'text'|string} [props.mediaType]
 * @param {string} [props.mime]
 * @param {string} [props.className]
 * @param {string} [props.alt]
 */
const InlineMedia = ({
  src,
  viewUrl,
  muxPlaybackId,
  mediaType,
  mime,
  className = '',
  alt = '',
}) => {
  const [failed, setFailed] = useState(false)

  const muxSrc = useMemo(
    () => resolveMuxSrc(muxPlaybackId, src),
    [muxPlaybackId, src],
  )
  const isMuxVideo = !!(muxPlaybackId || isMuxUrl(src) || isMuxUrl(viewUrl) || isHlsUrl(src))

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
      return (
        <div className={shell}>
          <MuxInlineVideo
            muxPlaybackId={muxPlaybackId}
            src={muxSrc}
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
            title="Drive video preview"
            src={embedUrl}
            className="w-full aspect-[9/16] max-h-[32rem] border-0 bg-black"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Video preview unavailable in-app.
          </div>
        )}
        {driveOpenUrl && (
          <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 flex justify-between items-center gap-2">
            <span className="text-[11px] text-gray-500 truncate">
              {failed || !src
                ? 'Direct play blocked — open in Drive'
                : 'Also available in Drive'}
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
        <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 text-right">
          <a
            href={driveOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-300 hover:underline"
          >
            Open in Drive
          </a>
        </div>
      )}
    </div>
  )
}

export default InlineMedia
