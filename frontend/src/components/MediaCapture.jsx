/**
 * Mobile-first camera / gallery capture for Shorts-style uploads.
 * Front camera selfie video (MediaRecorder) + file input fallback.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_RECORD_SECONDS = 60

const pickRecorderMime = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || ''
}

/**
 * @param {object} props
 * @param {'video'|'image'|'both'} [props.mode]
 * @param {(file: File, meta: { previewUrl: string, mimeType: string, mediaType: 'image'|'video' }) => void} props.onCaptured
 * @param {() => void} [props.onCleared]
 * @param {string} [props.label]
 * @param {boolean} [props.disabled]
 */
const MediaCapture = ({
  mode = 'both',
  onCaptured,
  onCleared,
  label = 'Add media',
  disabled = false,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [active, setActive] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewKind, setPreviewKind] = useState(null) // image | video
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const allowVideo = mode === 'video' || mode === 'both'
  const allowImage = mode === 'image' || mode === 'both'

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch (_) { /* ignore */ }
    }
    recorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setRecording(false)
    setActive(false)
    setSeconds(0)
  }, [])

  useEffect(() => () => {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [stopStream, previewUrl])

  const emitFile = (file, kind) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setPreviewKind(kind)
    onCaptured?.(file, {
      previewUrl: url,
      mimeType: file.type || (kind === 'video' ? 'video/webm' : 'image/jpeg'),
      mediaType: kind,
    })
  }

  const startCamera = async () => {
    setError('')
    setBusy(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser. Use gallery upload instead.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: allowVideo,
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      })
      streamRef.current = stream
      setActive(true)
      // Attach after paint
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true
          videoRef.current.playsInline = true
          videoRef.current.play().catch(() => {})
        }
      })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not open camera. Check permissions or use gallery.')
      stopStream()
    } finally {
      setBusy(false)
    }
  }

  const startRecording = () => {
    if (!streamRef.current || !allowVideo) return
    setError('')
    chunksRef.current = []
    const mimeType = pickRecorderMime()
    try {
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || 'video/webm'
        const blob = new Blob(chunksRef.current, { type: blobType })
        const ext = blobType.includes('mp4') ? 'mp4' : 'webm'
        const file = new File([blob], `selfie-explain-${Date.now()}.${ext}`, {
          type: blobType,
        })
        emitFile(file, 'video')
        stopStream()
      }
      recorder.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1
          if (next >= MAX_RECORD_SECONDS) {
            stopRecording()
          }
          return next
        })
      }, 1000)
    } catch (err) {
      console.error(err)
      setError('Recording failed. Try gallery upload instead.')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    setRecording(false)
  }

  const takePhoto = async () => {
    if (!videoRef.current || !allowImage) return
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 720
      canvas.height = video.videoHeight || 1280
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Could not capture photo')
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      emitFile(file, 'image')
      stopStream()
    } catch (err) {
      setError(err.message || 'Photo capture failed')
    }
  }

  const onFilePicked = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const kind = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('image/')
        ? 'image'
        : null
    if (!kind) {
      setError('Please choose an image or video file.')
      return
    }
    if (kind === 'video' && !allowVideo) {
      setError('Video is not allowed here.')
      return
    }
    if (kind === 'image' && !allowImage) {
      setError('Image is not allowed here.')
      return
    }
    setError('')
    emitFile(file, kind)
  }

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setPreviewKind(null)
    onCleared?.()
  }

  const accept = [
    allowImage ? 'image/*' : null,
    allowVideo ? 'video/*' : null,
  ].filter(Boolean).join(',')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {previewUrl && (
          <button
            type="button"
            onClick={clearPreview}
            className="text-xs text-red-300 hover:text-red-200"
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {previewUrl ? (
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
          {previewKind === 'video' ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full max-h-80 object-contain bg-black"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Capture preview"
              className="w-full max-h-80 object-contain bg-black"
            />
          )}
          <div className="flex gap-2 p-2 bg-gray-950">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                clearPreview()
                startCamera()
              }}
              className="flex-1 text-xs font-semibold py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700"
            >
              Retake
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 text-xs font-semibold py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700"
            >
              Gallery
            </button>
          </div>
        </div>
      ) : active ? (
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="w-full max-h-80 object-cover bg-black scale-x-[-1]"
          />
          <div className="flex flex-wrap gap-2 p-2 bg-gray-950">
            {allowVideo && !recording && (
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 text-xs font-semibold py-2.5 rounded-lg bg-red-600 text-white"
              >
                Record
              </button>
            )}
            {allowVideo && recording && (
              <button
                type="button"
                onClick={stopRecording}
                className="flex-1 text-xs font-semibold py-2.5 rounded-lg bg-red-500 text-white"
              >
                Stop ({seconds}s / {MAX_RECORD_SECONDS}s)
              </button>
            )}
            {allowImage && !recording && (
              <button
                type="button"
                onClick={takePhoto}
                className="flex-1 text-xs font-semibold py-2.5 rounded-lg bg-blue-600 text-white"
              >
                Snap photo
              </button>
            )}
            <button
              type="button"
              onClick={stopStream}
              className="flex-1 text-xs font-semibold py-2.5 rounded-lg bg-gray-800 text-gray-200 border border-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={startCamera}
            className="rounded-lg border border-gray-700 bg-gray-950 hover:border-blue-500
              text-white text-sm font-semibold py-3 px-3 transition-colors disabled:opacity-50"
          >
            {busy ? 'Opening…' : allowVideo && !allowImage ? 'Open front camera' : 'Camera'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-700 bg-gray-950 hover:border-blue-500
              text-white text-sm font-semibold py-3 px-3 transition-colors disabled:opacity-50"
          >
            Gallery
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={mode === 'video' ? 'user' : undefined}
        className="hidden"
        onChange={onFilePicked}
      />

      <p className="text-[11px] text-gray-500">
        {allowVideo
          ? `Selfie video capped at ~${MAX_RECORD_SECONDS}s. Uploads go to EduMind Drive.`
          : 'Photos upload to EduMind Drive.'}
      </p>
    </div>
  )
}

export default MediaCapture
