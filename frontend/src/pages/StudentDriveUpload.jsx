/**
 * @file StudentDriveUpload.jsx
 * @description Student "Upload proof" UI for Google Drive uploads.
 *              Uses authenticated /api/v1/drive/upload — no secrets in FE.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import driveUploadService from '../services/driveUploadService'

const ACCEPTED =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.mp4,.webm,.mov,image/*,application/pdf,video/mp4,video/webm,video/quicktime'

const StudentDriveUpload = () => {
  const { getAccessToken, isAuthenticated, profile } = useAuth()
  const [category, setCategory] = useState('proof')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [uploads, setUploads] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const token = getAccessToken()
  const role = profile?.app_user?.role

  const refreshList = async () => {
    if (!token) return
    setLoadingList(true)
    try {
      const rows = await driveUploadService.listMine(token)
      setUploads(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    refreshList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleUpload = async (file) => {
    if (!file) return
    if (!isAuthenticated || !token) {
      setError('Please log in as a student to upload proofs.')
      return
    }
    if (role && role !== 'STUDENT') {
      setError('Only student accounts can upload proofs and documents.')
      return
    }

    setError(null)
    setSuccess(null)
    setUploading(true)
    setProgress(0)

    try {
      const result = await driveUploadService.upload(
        file,
        category,
        token,
        setProgress
      )
      setSuccess(
        `Uploaded "${result.name || file.name}" as ${result.category}.`
      )
      await refreshList()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-blue-300 text-sm font-semibold mb-1">
          Student growth
        </p>
        <h1 className="text-2xl font-bold text-white">Upload proof</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload revision proofs or learning documents to EduMind Google Drive.
          Images/PDF up to 10MB; short videos up to 50MB.
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Local RAG study uploads stay on{' '}
          <Link to="/upload" className="text-blue-300 hover:underline">
            Upload Docs
          </Link>
          .
        </p>
      </div>

      {!isAuthenticated && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200
          text-sm px-4 py-3 rounded-lg">
          Please <Link to="/login" className="underline">log in</Link> to upload.
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <label className="block text-sm text-gray-300">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full bg-gray-950 border border-gray-700 rounded-lg
              px-3 py-2 text-white text-sm"
          >
            <option value="proof">Proof (revision / habit proof)</option>
            <option value="document">Document (learning material)</option>
          </select>
        </label>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10
            flex flex-col items-center justify-center
            cursor-pointer transition-all duration-200
            ${dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 hover:border-gray-500 bg-gray-950'
            }
          `}
        >
          <span className="text-4xl mb-3">📎</span>
          <p className="text-white font-semibold text-sm">
            Drop a file here or click to browse
          </p>
          <p className="text-gray-400 text-xs mt-1">
            PDF, images, or short video
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </div>

        {uploading && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Uploading to Drive...</span>
              <span className="text-blue-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30
            text-green-400 text-sm px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30
            text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          Your Drive uploads
        </h2>
        {loadingList ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : uploads.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">No Drive uploads yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4
                  flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {item.category} · {item.mime} ·{' '}
                    {Math.round((item.size || 0) / 1024)} KB
                  </p>
                </div>
                {item.webViewLink && (
                  <a
                    href={item.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 text-sm font-semibold hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDriveUpload
