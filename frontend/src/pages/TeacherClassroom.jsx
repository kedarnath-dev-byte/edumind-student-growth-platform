import { useState } from 'react'
import api from '../services/api'

const TeacherClassroom = () => {
  const [classroomId, setClassroomId] = useState('1')
  const [code, setCode] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [csvText, setCsvText] = useState('name,email\nAsha,asha@school.local\nRahul,rahul@school.local')
  const [studentId, setStudentId] = useState('')
  const [targetClass, setTargetClass] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const makeCode = async () => {
    setError('')
    try {
      const response = await api.post('/api/v1/growth/classrooms/join-codes', { classroom_id: Number(classroomId) })
      const nextCode = response.data?.code || ''
      setCode(nextCode)
      const joinUrl = `${window.location.origin}/join-class?code=${nextCode}`
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`)
      setMessage(`Class code ${nextCode}. Students scan QR or type the letters.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create class code')
    }
  }

  const importRoster = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await api.post('/api/v1/growth/classrooms/roster', { classroom_id: Number(classroomId), csv_text: csvText })
      setMessage(`Imported ${response.data.imported} students, skipped ${response.data.skipped}.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Roster import failed')
    }
  }

  const transfer = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/api/v1/growth/classrooms/transfer', { student_profile_id: Number(studentId), classroom_id: Number(targetClass) })
      setMessage(`Moved student ${studentId} to classroom ${targetClass}.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Transfer failed')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Classroom tools</h1>
        <p className="text-gray-400 text-sm mt-2">QR / 6-letter code, CSV roster, and transfer.</p>
      </div>
      {message && <div className="bg-blue-500/10 border border-blue-500/30 text-blue-100 rounded-lg p-3 text-sm">{message}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-100 rounded-lg p-3 text-sm">{error}</div>}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <label className="text-sm text-gray-300">Classroom ID</label>
        <input value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white" />
        <button type="button" onClick={makeCode} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg">Create QR + class code</button>
        {code && <p className="text-blue-300 text-3xl tracking-widest font-bold">{code}</p>}
        {qrUrl && <img src={qrUrl} alt="Class join QR" className="bg-white p-2 rounded-lg w-44 h-44" />}
      </section>
      <form onSubmit={importRoster} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold">CSV roster</h2>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white font-mono text-sm" />
        <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg">Import roster</button>
      </form>
      <form onSubmit={transfer} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold">Transfer student</h2>
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student profile ID" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white" />
        <input value={targetClass} onChange={(e) => setTargetClass(e.target.value)} placeholder="New classroom ID" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-white" />
        <button className="border border-gray-600 text-white font-semibold px-4 py-2 rounded-lg">Move student</button>
      </form>
    </div>
  )
}

export default TeacherClassroom
