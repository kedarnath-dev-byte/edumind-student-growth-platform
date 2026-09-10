/**
 * Instagram / Shorts-style inline image or video renderer.
 * Falls back to Drive open link when direct playback fails (common for webViewLink).
 */
import { useMemo, useState } from 'react'
import {
  drivePreviewEmbedUrl,
  extractDriveFileId,
  mediaTypeFromMime,
  mediaTypeFromUrl,
} from '../utils/driveMediaHelpers'

/**
 * @param {object} props
 * @param {string} [props.src] - preferred playback URL
 * @param {string} [props.viewUrl] - Drive web view / open link
 * @param {'image'|'video'|'text'|string} [props.mediaType]
 * @param {string} [props.mime]
 * @param {string} [props.className]
 * @param {string} [props.alt]
 */
const InlineMedia = ({
  src,
  viewUrl,
  mediaType,
  mime,
  className = '',
  alt = '',
}) => {
  const [failed, setFailed] = useState(false)

  const kind = useMemo(() => {
    if (mediaType === 'image' || mediaType === 'video') return mediaType
    const fromMime = mediaTypeFromMime(mime)
    if (fromMime === 'image' || fromMime === 'video') return fromMime
    return mediaTypeFromUrl(src || viewUrl) || 'image'
  }, [mediaType, mime, src, viewUrl])

  const driveId = useMemo(
    () => extractDriveFileId(viewUrl) || extractDriveFileId(src),
    [viewUrl, src],
  )
  const embedUrl = drivePreviewEmbedUrl(driveId)
  const openUrl = viewUrl || (driveId ? `https://drive.google.com/file/d/${driveId}/view` : src)

  if (!src && !viewUrl && !driveId) return null

  const shell = `w-full bg-black overflow-hidden ${className}`

  if (kind === 'video') {
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
        {openUrl && (
          <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 flex justify-between items-center gap-2">
            <span className="text-[11px] text-gray-500 truncate">
              {failed || !src
                ? 'Direct play blocked — open in Drive'
                : 'Also available in Drive'}
            </span>
            <a
              href={openUrl}
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
      {(failed || !src) && openUrl && (
        <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 text-right">
          <a
            href={openUrl}
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
