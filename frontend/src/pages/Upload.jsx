/**
 * @file Upload.jsx
 * @description Document upload page for EduMind AI.
 *              Supports PDF, DOCX, and TXT file uploads.
 *              Shows real-time upload progress and document list.
 *              Connects to FastAPI ingestion pipeline via uploadService.
 */
import { useState, useEffect, useRef } from 'react'
import uploadService from '../services/uploadService'

// ─── Document Card ────────────────────────────────────────────────────────────
const DocumentCard = ({ doc, onDelete }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl
    p-4 flex items-center justify-between hover:border-gray-700
    transition-colors">
    <div className="flex items-center gap-3">
      <span className="text-2xl">
        {doc.filename?.endsWith('.pdf') ? '📕' :
         doc.filename?.endsWith('.docx') ? '📘' : '📄'}
      </span>
      <div>
        <p className="text-white text-sm font-medium">{doc.filename}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {doc.chunk_count || 0} chunks · {doc.created_at || 'Just now'}
        </p>
      </div>
    </div>
    <button
      onClick={() => onDelete(doc.id)}
      className="text-gray-500 hover:text-red-400
        transition-colors text-sm px-3 py-1"
    >
      🗑️
    </button>
  </div>
)

// ─── Upload Page ──────────────────────────────────────────────────────────────
const Upload = () => {
  const [documents, setDocuments]   = useState([])
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const fileInputRef                = useRef(null)

  // Load documents on page open.
  useEffect(() => {
    uploadService.getDocuments().then(docs => setDocuments(docs?.documents || docs || [])).catch(err => setError(err.message))
  }, [])

  // ─── Fetch Documents ────────────────────────────────────────────────────────
  const fetchDocuments = async () => {
    try {
      const docs = await uploadService.getDocuments()
      setDocuments(docs?.documents || docs || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }

  // ─── Handle Upload ──────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file) return

    // Validate file type
    const allowed = ['.pdf', '.docx', '.txt']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setError('Only PDF, DOCX, and TXT files are allowed.')
      return
    }

    setError(null)
    setSuccess(null)
    setUploading(true)
    setProgress(0)

    try {
      await uploadService.uploadDocument(file, (pct) => {
        setProgress(pct)
      })
      setSuccess(`✅ "${file.name}" uploaded successfully!`)
      await fetchDocuments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  // ─── Handle Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (docId) => {
    try {
      await uploadService.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      setError(err.message)
    }
  }

  // ─── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📄 Upload Documents</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload PDF, DOCX, or TXT study materials to power your AI Tutor
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12
          flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200 mb-6
          ${dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900'
          }
        `}
      >
        <span className="text-5xl mb-4">📂</span>
        <p className="text-white font-semibold">
          Drop your file here or click to browse
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Supports PDF, DOCX, TXT
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      </div>

      {/* ── Progress Bar ── */}
      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Uploading...</span>
            <span className="text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Success / Error Messages ── */}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30
          text-green-400 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30
          text-red-400 text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* ── Documents List ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          📚 Uploaded Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800
            rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">
              No documents yet. Upload your first study material above!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default Upload
