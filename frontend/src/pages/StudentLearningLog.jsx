/**
 * @file StudentLearningLog.jsx
 * @description First student growth flow for daily learning logs.
 *              Optional front-camera selfie video explanation uploaded to Drive.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import MediaCapture from '../components/MediaCapture'
import InlineMedia from '../components/InlineMedia'
import driveUploadService from '../services/driveUploadService'
import studentGrowthService from '../services/studentGrowthService'
import { urlsFromDriveUpload } from '../utils/driveMediaHelpers'

const DEMO_STUDENT_ID = 1
const LAST_SUBJECT_KEY = 'edumind_last_subject_topic'

const initialForm = {
  school_id: '',
  classroom_id: '',
  subject_id: '',
  topic_id: '',
  taught_today: '',
  understood: '',
  not_understood: '',
  confidence_level: 'MEDIUM',
}

const FieldLabel = ({ children }) => (
  <label className="block text-sm font-medium text-gray-200 mb-2">
    {children}
  </label>
)

const EmptyHint = ({ children }) => (
  <p className="text-xs text-amber-300 mt-2">{children}</p>
)

const formatDueDate = (value) => {
  if (!value) return 'Not scheduled yet'
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toSafeArray = (value) => Array.isArray(value) ? value : []

const StudentLearningLog = () => {
  const { profile, getAccessToken } = useAuth()
  const studentProfile = profile?.student_profile || null
  const studentId = studentProfile?.id || DEMO_STUDENT_ID

  const [form, setForm] = useState(initialForm)
  const [schools, setSchools] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSetup, setLoadingSetup] = useState(false)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')
  const [result, setResult] = useState(null)

  const [recordSelfie, setRecordSelfie] = useState(false)
  const [selfieFile, setSelfieFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const schoolOptions = toSafeArray(schools)
  const classroomOptions = toSafeArray(classrooms)
  const subjectOptions = toSafeArray(subjects)
  const topicOptions = toSafeArray(topics)

  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSetup(true)
      setError('')
      try {
        const data = await studentGrowthService.getSchools()
        setSchools(toSafeArray(data))
        const assignedSchoolId = studentProfile?.school_id
        const assignedClassroomId = studentProfile?.classroom_id
        if (assignedSchoolId) {
          let last = {}
          try {
            last = JSON.parse(localStorage.getItem(LAST_SUBJECT_KEY) || '{}') || {}
          } catch (_) {
            last = {}
          }
          setForm((prev) => ({
            ...prev,
            school_id: String(assignedSchoolId),
            classroom_id: assignedClassroomId ? String(assignedClassroomId) : prev.classroom_id,
            subject_id: last.subject_id ? String(last.subject_id) : prev.subject_id,
            topic_id: last.topic_id ? String(last.topic_id) : prev.topic_id,
          }))
        }
      } catch (err) {
        console.error('Failed to load schools:', err)
        setError(err.message)
      } finally {
        setLoadingSetup(false)
      }
    }

    loadSchools()
    // Prefill when profile school assignment arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile?.school_id, studentProfile?.classroom_id])

  useEffect(() => {
    const loadSchoolOptions = async () => {
      if (!form.school_id) {
        setClassrooms([])
        setSubjects([])
        setTopics([])
        return
      }

      setError('')
      try {
        const [classroomData, subjectData] = await Promise.all([
          studentGrowthService.getClassroomsBySchool(form.school_id),
          studentGrowthService.getSubjectsBySchool(form.school_id),
        ])
        setClassrooms(toSafeArray(classroomData))
        setSubjects(toSafeArray(subjectData))
      } catch (err) {
        console.error('Failed to load school setup options:', err)
        setError(err.message)
      }
    }

    loadSchoolOptions()
  }, [form.school_id])

  useEffect(() => {
    const loadTopics = async () => {
      if (!form.subject_id) {
        setTopics([])
        return
      }

      setError('')
      try {
        const data = await studentGrowthService.getTopicsBySubject(form.subject_id)
        setTopics(toSafeArray(data))
      } catch (err) {
        console.error('Failed to load topics:', err)
        setError(err.message)
      }
    }

    loadTopics()
  }, [form.subject_id])

  const canSubmit = useMemo(() => (
    form.school_id &&
    form.classroom_id &&
    form.subject_id &&
    form.topic_id &&
    form.taught_today.trim() &&
    form.understood.trim()
  ), [form])

  const updateField = (name, value) => {
    setResult(null)
    setValidation('')

    if (name === 'school_id') {
      setForm((prev) => ({
        ...prev,
        school_id: value,
        classroom_id: '',
        subject_id: '',
        topic_id: '',
      }))
      return
    }

    if (name === 'subject_id') {
      setForm((prev) => ({ ...prev, subject_id: value, topic_id: '' }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const clearSelfie = () => {
    setSelfieFile(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmit) {
      setValidation('Please complete the required dropdowns and reflection fields.')
      return
    }

    if (recordSelfie && !selfieFile) {
      setValidation('Turn off selfie video, or record / pick a short explanation clip.')
      return
    }

    setLoading(true)
    setError('')
    setValidation('')
    setUploadProgress(0)

    try {
      let explanationVideoUrl = null
      if (recordSelfie && selfieFile) {
        const token = getAccessToken?.() || localStorage.getItem('edumind_token')
        if (!token) {
          throw new Error('Please log in to upload your explanation video.')
        }
        const uploaded = await driveUploadService.upload(
          selfieFile,
          'proof',
          token,
          setUploadProgress,
        )
        const urls = urlsFromDriveUpload(uploaded)
        explanationVideoUrl = urls.playbackUrl || urls.viewUrl
        if (!explanationVideoUrl) {
          throw new Error('Drive upload succeeded but no link was returned.')
        }
      }

      const saved = await studentGrowthService.createLearningLog({
        student_id: studentId,
        school_id: Number(form.school_id),
        classroom_id: Number(form.classroom_id),
        subject_id: Number(form.subject_id),
        topic_id: Number(form.topic_id),
        taught_today: form.taught_today.trim(),
        understood: form.understood.trim(),
        not_understood: form.not_understood.trim(),
        confidence_level: form.confidence_level,
        explanation_video_url: explanationVideoUrl,
      })

      setResult(saved)
      try {
        localStorage.setItem(
          LAST_SUBJECT_KEY,
          JSON.stringify({
            subject_id: form.subject_id,
            topic_id: form.topic_id,
          }),
        )
      } catch (_) { /* ignore */ }
      setForm((prev) => ({
        ...initialForm,
        school_id: prev.school_id,
        classroom_id: prev.classroom_id,
        subject_id: prev.subject_id,
        topic_id: prev.topic_id,
      }))
      setRecordSelfie(false)
      clearSelfie()
    } catch (err) {
      console.error('Failed to save learning log:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Daily Learning Log · दैनिक लर्निंग लॉग</h1>
        <p className="text-gray-400 text-sm mt-1">
          It is okay to say &quot;I don&apos;t know yet.&quot; / &quot;मुझे अभी नहीं आता&quot; कहना ठीक है।
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30
          text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {validation && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30
          text-amber-200 text-sm px-4 py-3 rounded-lg">
          {validation}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5"
        >
          {(studentProfile?.school_id) ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                {schoolOptions.find((s) => String(s.id) === String(form.school_id))?.name
                  || 'Your school'}
                {form.classroom_id
                  ? ` · ${classroomOptions.find((c) => String(c.id) === String(form.classroom_id))?.name
                    || `Class #${form.classroom_id}`}`
                  : ''}
              </span>
              <span className="text-xs text-gray-500">Fixed from your profile — no need to re-enter</span>
            </div>
          ) : (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg p-3">
              Ask your admin to assign your school and class once. Then daily logging skips those fields.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {!studentProfile?.school_id && (
              <>
                <div>
                  <FieldLabel>School</FieldLabel>
                  <select
                    value={form.school_id}
                    onChange={(e) => updateField('school_id', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg
                    text-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">{loadingSetup ? 'Loading schools...' : 'Select school'}</option>
                    {schoolOptions.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Classroom</FieldLabel>
                  <select
                    value={form.classroom_id}
                    onChange={(e) => updateField('classroom_id', e.target.value)}
                    disabled={!form.school_id}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg
                    text-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500
                    disabled:opacity-50"
                  >
                    <option value="">Select classroom</option>
                    {classroomOptions.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} - Grade {classroom.grade}{classroom.section}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <FieldLabel>Subject</FieldLabel>
              <select
                value={form.subject_id}
                onChange={(e) => updateField('subject_id', e.target.value)}
                disabled={!form.school_id}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg
                text-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500
                disabled:opacity-50"
              >
                <option value="">Select subject</option>
                {subjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {form.school_id && subjectOptions.length === 0 && (
                <EmptyHint>No subjects found for this school.</EmptyHint>
              )}
            </div>

            <div>
              <FieldLabel>Topic</FieldLabel>
              <select
                value={form.topic_id}
                onChange={(e) => updateField('topic_id', e.target.value)}
                disabled={!form.subject_id}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg
                text-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500
                disabled:opacity-50"
              >
                <option value="">Select topic</option>
                {topicOptions.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
              {form.subject_id && topicOptions.length === 0 && (
                <EmptyHint>No topics found for this subject.</EmptyHint>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>What did your teacher teach today?</FieldLabel>
              <textarea
                value={form.taught_today}
                onChange={(e) => updateField('taught_today', e.target.value)}
                rows={4}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg
                text-white px-3 py-3 text-sm resize-none focus:outline-none
                focus:border-blue-500"
              />
            </div>

            <div>
              <FieldLabel>What did you understand?</FieldLabel>
              <textarea
                value={form.understood}
                onChange={(e) => updateField('understood', e.target.value)}
                rows={4}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg
                text-white px-3 py-3 text-sm resize-none focus:outline-none
                focus:border-blue-500"
              />
            </div>

            <div>
              <FieldLabel>What do you need support with?</FieldLabel>
              <textarea
                value={form.not_understood}
                onChange={(e) => updateField('not_understood', e.target.value)}
                rows={4}
                placeholder="I don't know yet..."
                className="w-full bg-gray-950 border border-gray-700 rounded-lg
                text-white px-3 py-3 text-sm resize-none focus:outline-none
                focus:border-blue-500 placeholder-gray-500"
              />
            </div>

            <div>
              <FieldLabel>How confident do you feel right now?</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {['HARD', 'MEDIUM', 'EASY'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateField('confidence_level', level)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold
                    transition-colors ${
                      form.confidence_level === level
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-950 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordSelfie}
                  onChange={(e) => {
                    setRecordSelfie(e.target.checked)
                    if (!e.target.checked) clearSelfie()
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Record a selfie explanation video
                  </span>
                  <span className="block text-xs text-gray-400 mt-1">
                    Optional. Use your front camera to explain the topic in ~60 seconds —
                    like a Shorts clip for your teacher and future you.
                  </span>
                </span>
              </label>

              {recordSelfie && (
                <MediaCapture
                  mode="video"
                  label="Front camera / gallery"
                  disabled={loading}
                  onCaptured={(file) => {
                    setSelfieFile(file)
                  }}
                  onCleared={clearSelfie}
                />
              )}

              {loading && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Uploading explanation to Drive…</span>
                    <span className="text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
            disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg
            transition-colors"
          >
            {loading ? 'Saving learning log...' : 'Save learning log'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            
          <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <p className="text-indigo-100 text-sm font-semibold">Stuck or scared? · अटके या डर?</p>
            <p className="text-indigo-100/80 text-xs mt-1">
              Start a private Courage Loop — never posted to Subject Worlds.
            </p>
            <Link
              to={`/student-courage-loop?subject_id=${form.subject_id || ''}&topic_id=${form.topic_id || ''}`}
              className="inline-block mt-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-2"
            >
              I&apos;m stuck / I&apos;m scared · साहस चक्र
            </Link>
          </div>

            <h2 className="text-white font-semibold">Student-first reminder</h2>
            <p className="text-gray-400 text-sm mt-2">
              This log is not a test. It helps your teacher, your family, and
              future you understand where support is needed.
            </p>
          </div>

          {result && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
              <h2 className="text-green-300 font-semibold">Learning log saved</h2>
              <p className="text-gray-300 text-sm mt-2">
                Your revision plan has been created.
              </p>

              {result.explanation_video_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-800">
                  <p className="text-white text-sm font-semibold px-3 py-2 bg-gray-950">
                    Your explanation video
                  </p>
                  <InlineMedia
                    src={result.explanation_video_url}
                    viewUrl={result.explanation_video_url}
                    mediaType="video"
                  />
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-white text-sm font-semibold mb-2">
                  Revision tasks
                </h3>
                <div className="space-y-2">
                  {(result.revision_tasks || []).map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-blue-300 text-sm font-semibold">
                          {task.revision_stage}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDueDate(task.due_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-white text-sm font-semibold mb-2">
                  Rewards earned
                </h3>
                <div className="space-y-2">
                  {(result.rewards || []).map((reward) => (
                    <div
                      key={reward.id}
                      className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2"
                    >
                      <p className="text-gray-200 text-sm">{reward.message}</p>
                      <p className="text-green-300 text-xs mt-1">
                        +{reward.points} points
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default StudentLearningLog
