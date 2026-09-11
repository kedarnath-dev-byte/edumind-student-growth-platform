/**
 * Multi-image capture for textbook / class-notes photos.
 * Supports gallery multi-select + rear-camera capture, thumbnails, remove, max cap.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_MAX = 8

/**
 * @param {object} props
 * @param {File[]} props.files
 * @param {(files: File[]) => void} props.onChange
 * @param {number} [props.max]
 * @param {boolean} [props.disabled]
 * @param {string} [props.label]
 */
const MultiImageCapture = ({
  files = [],
  onChange,
  max = DEFAULT_MAX,
  disabled = false,
  label = 'Textbook / class notes photos',
}) => {
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const [error, setError] = useState('')

  const previews = useMemo(
    () => files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      key: `${file.name}-${file.size}-${file.lastModified}`,
    })),
    [files],
  )

  useEffect(() => () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [previews])

  const remaining = Math.max(0, max - files.length)

  const mergeFiles = (incoming) => {
    setError('')
    const images = Array.from(incoming || []).filter((f) =>
      (f.type || '').startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name || ''),
    )
    if (!images.length) {
      setError('Please choose image files only.')
      return
    }
    const room = max - files.length
    if (room <= 0) {
      setError(`You can add up to ${max} photos.`)
      return
    }
    const accepted = images.slice(0, room)
    if (images.length > room) {
      setError(`Only ${room} more photo${room === 1 ? '' : 's'} can be added (max ${max}).`)
    }
    onChange([...files, ...accepted])
  }

  const removeAt = (index) => {
    setError('')
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          Optional. Snap textbook pages or class notes for this subject
          (camera or gallery). Up to {max} photos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || remaining <= 0}
          onClick={() => cameraRef.current?.click()}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs
            font-semibold text-gray-200 hover:border-blue-500 disabled:opacity-50"
        >
          Take photo (rear camera)
        </button>
        <button
          type="button"
          disabled={disabled || remaining <= 0}
          onClick={() => galleryRef.current?.click()}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs
            font-semibold text-gray-200 hover:border-blue-500 disabled:opacity-50"
        >
          Add from gallery
        </button>
        <span className="self-center text-[11px] text-gray-500">
          {files.length}/{max} selected
        </span>
      </div>

      {/* Multi-select gallery */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled || remaining <= 0}
        onChange={(e) => {
          mergeFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {/* Rear camera one-by-one */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || remaining <= 0}
        onChange={(e) => {
          mergeFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {error && (
        <p className="text-xs text-amber-300">{error}</p>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((item, index) => (
            <div
              key={item.key}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-800 bg-black"
            >
              <img
                src={item.url}
                alt={`Note ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute top-1 right-1 rounded-full bg-black/70 text-white
                  text-[10px] font-bold px-1.5 py-0.5 hover:bg-red-600"
                aria-label={`Remove photo ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiImageCapture
