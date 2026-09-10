/**
 * Build the best browser-playable URL from a Drive upload API response.
 * Drive webViewLink opens the Drive UI and usually will NOT play inside
 * <video>/<img>. Prefer uc?export=download when drive_file_id is present
 * (works when the file is shared "anyone with the link").
 */

export function mediaTypeFromMime(mime) {
  const value = (mime || '').toLowerCase()
  if (value.startsWith('video/')) return 'video'
  if (value.startsWith('image/')) return 'image'
  return 'text'
}

export function mediaTypeFromUrl(url) {
  const value = (url || '').toLowerCase()
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(value) || value.includes('video')) {
    return 'video'
  }
  if (/\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(value)) {
    return 'image'
  }
  return null
}

/**
 * @param {{ drive_file_id?: string, webViewLink?: string, web_view_link?: string, mime?: string }} upload
 * @returns {{ playbackUrl: string|null, viewUrl: string|null, mediaType: 'image'|'video'|'text', driveFileId: string|null }}
 */
export function urlsFromDriveUpload(upload) {
  if (!upload) {
    return { playbackUrl: null, viewUrl: null, mediaType: 'text', driveFileId: null }
  }
  const driveFileId = upload.drive_file_id || upload.driveFileId || null
  const viewUrl = upload.webViewLink || upload.web_view_link || null
  const mediaType = mediaTypeFromMime(upload.mime || upload.mime_type) || 'text'

  let playbackUrl = null
  if (driveFileId) {
    // Direct-ish download URL — best effort for <img>/<video> after anyone-with-link share.
    playbackUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`
  } else if (viewUrl && !/drive\.google\.com\/file\//.test(viewUrl)) {
    playbackUrl = viewUrl
  }

  return { playbackUrl, viewUrl, mediaType, driveFileId }
}

export function drivePreviewEmbedUrl(driveFileId) {
  if (!driveFileId) return null
  return `https://drive.google.com/file/d/${driveFileId}/preview`
}

export function extractDriveFileId(url) {
  if (!url) return null
  const match =
    String(url).match(/\/file\/d\/([^/]+)/) ||
    String(url).match(/[?&]id=([^&]+)/)
  return match ? match[1] : null
}
