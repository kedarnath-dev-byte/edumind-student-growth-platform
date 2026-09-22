/**
 * @file StudentLearningLog.jsx
 * @description First student growth flow for daily learning logs.
 *              Optional front-camera selfie video + multi textbook/notes photos (Drive).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import MediaCapture from '../components/MediaCapture'
import MultiImageCapture from '../components/MultiImageCapture'
import InlineMedia from '../components/InlineMedia'
import InstallHint from '../components/InstallHint'
import driveUploadService from '../services/driveUploadService'
import muxUploadService, { COMING_ONLINE as MUX_COMING_ONLINE } from '../services/muxUploadService'
import ShortsPlayer from '../components/ShortsPlayer'
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
  const [muxConfigured, setMuxConfigured] = useState(null) // null=loading, bool
  const [shortsOpen, setShortsOpen] = useState(false)
  const [noteFiles, setNoteFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [pastLogs, setPastLogs] = useState([])
  const [pastLogsLoading, setPastLogsLoading] = useState(false)
  const [pastLogsError, setPastLogsError] = useState('')
  const [topicLabelById, setTopicLabelById] = useState({})

  const schoolOptions = toSafeArray(schools)
  const classroomOptions = toSafeArray(classrooms)
  const subjectOptions = toSafeArray(subjects)
  const topicOptions = toSafeArray(topics)

  useEffect(() => {
    let alive = true
    muxUploadService.getStatus()
      .then((s) => { if (alive) setMuxConfigured(!!s?.configured) })
      .catch(() => { if (alive) setMuxConfigured(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const applyAssignedSchool = () => {
      const assignedSchoolId = studentProfile?.school_id
      const assignedClassroomId = studentProfile?.classroom_id
      if (!assignedSchoolId) return
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

    const loadSchools = async () => {
      setLoadingSetup(true)
      setError('')
      // Prefill school/class from linked profile even if the schools list
      // fails (e.g. locked-down public list). Subjects stay enabled.
      applyAssignedSchool()
      try {
        const data = await studentGrowthService.getSchools()
        setSchools(toSafeArray(data))
      } catch (err) {
        console.error('Failed to load schools:', err)
        // Do not block subject selection when the student is already assigned.
        if (!studentProfile?.school_id) {
          setError(err.message)
        }
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

  
  const loadPastLogs = async () => {
    if (!studentId) return
    setPastLogsLoading(true)
    setPastLogsError('')
    try {
      const logs = await studentGrowthService.getLearningLogsForStudent(studentId)
      const list = Array.isArray(logs) ? logs : []
      setPastLogs(list)

      const subjectIds = [...new Set(list.map((l) => l.subject_id).filter(Boolean))]
      const topicMap = { ...topicLabelById }
      await Promise.all(
        subjectIds.map(async (sid) => {
          try {
            const topicsForSubject = await studentGrowthService.getTopicsBySubject(sid)
            for (const t of topicsForSubject || []) {
              topicMap[t.id] = t.name
            }
          } catch (_) { /* non-blocking */ }
        }),
      )
      setTopicLabelById(topicMap)
    } catch (err) {
      console.error('Failed to load past learning logs:', err)
      setPastLogsError(err.message || 'Failed to load past logs')
    } finally {
      setPastLogsLoading(false)
    }
  }

  useEffect(() => {
    loadPastLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])


  const subjectName = (subjectId) => {
    const match = subjectOptions.find((s) => String(s.id) === String(subjectId))
    return match?.name || (subjectId ? `Subject #${subjectId}` : 'Subject')
  }

  const topicName = (topicId) => {
    if (!topicId) return null
    if (topicLabelById[topicId]) return topicLabelById[topicId]
    const match = topicOptions.find((t) => String(t.id) === String(topicId))
    return match?.name || `Topic #${topicId}`
  }

  const formatLogDate = (value) => {
    if (!value) return 'Unknown date'
    return new Date(value).toLocaleString([], {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

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

  const clearNotePhotos = () => {
    setNoteFiles([])
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
    setUploadLabel('')

    try {
      const token = getAccessToken?.() || localStorage.getItem('edumind_token')
      const needsUpload = (recordSelfie && selfieFile) || noteFiles.length > 0
      if (needsUpload && !token) {
        throw new Error('Please log in to upload photos or your explanation video.')
      }

      let explanationVideoUrl = null
      let muxMeta = null
      if (recordSelfie && selfieFile) {
        if (muxConfigured === false) {
          throw new Error(MUX_COMING_ONLINE)
        }
        setUploadLabel('Uploading explanation Short to Mux…')
        try {
          muxMeta = await muxUploadService.uploadSelfieVideo(selfieFile, token, {
            purpose: 'learning_log',
            onProgress: setUploadProgress,
            onStatus: setUploadLabel,
          })
        } catch (muxErr) {
          if (muxErr.code === 'MUX_UNAVAILABLE' || /coming online/i.test(muxErr.message || '')) {
            throw new Error(MUX_COMING_ONLINE)
          }
          throw muxErr
        }
        explanationVideoUrl = muxMeta.playback_url
        if (!explanationVideoUrl) {
          throw new Error('Mux upload finished but no playback URL was returned.')
        }
      }

      const noteImageUrls = []
      if (noteFiles.length > 0) {
        for (let i = 0; i < noteFiles.length; i += 1) {
          setUploadLabel(`Uploading note photo ${i + 1} of ${noteFiles.length}…`)
          setUploadProgress(0)
          const uploaded = await driveUploadService.upload(
            noteFiles[i],
            'document',
            token,
            setUploadProgress,
          )
          const urls = urlsFromDriveUpload(uploaded)
          const link = urls.playbackUrl || urls.viewUrl
          if (!link) {
            throw new Error(`Drive upload for note photo ${i + 1} returned no link.`)
          }
          noteImageUrls.push(link)
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
        mux_asset_id: muxMeta?.asset_id || null,
        mux_playback_id: muxMeta?.playback_id || null,
        mux_upload_id: muxMeta?.upload_id || null,
        video_duration_seconds: muxMeta?.duration_seconds || null,
        note_image_urls: noteImageUrls,
      })

      setResult(saved)
      loadPastLogs()
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
      clearNotePhotos()
    } catch (err) {
      console.error('Failed to save learning log:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
      setUploadLabel('')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <InstallHint className="mb-4" />

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

          <div className="mb-5">
            <MultiImageCapture
              files={noteFiles}
              onChange={(next) => {
                setResult(null)
                setNoteFiles(next)
              }}
              max={8}
              disabled={loading}
              label="Textbook / class notes photos"
            />
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
                    Record a selfie explanation Short (30s–3 min)
                  </span>
                  <span className="block text-xs text-gray-400 mt-1">
                    Optional. Use your front camera to explain the topic in ~30 seconds to 3 minutes —
                    like an Instagram / YouTube Short for your teacher and future you.
                  </span>
                </span>
              </label>

              {recordSelfie && (
                <div className="space-y-2">
                  {muxConfigured === false && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100 text-xs">
                      Video uploads coming online — selfie Shorts will unlock once Mux is configured on the server. Photos still work.
                    </div>
                  )}
                  <MediaCapture
                    mode="video"
                    disabled={loading || muxConfigured === false}
                    label="Front camera / gallery"
                    onCaptured={(file) => {
                      setSelfieFile(file)
                    }}
                    onCleared={clearSelfie}
                  />
                </div>
              )}

              {loading && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">
                      {uploadLabel || 'Uploading…'}
                    </span>
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

              {Array.isArray(result.note_image_urls) && result.note_image_urls.length > 0 && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-800">
                  <p className="text-white text-sm font-semibold px-3 py-2 bg-gray-950">
                    Textbook / class notes photos
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-950">
                    {result.note_image_urls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="rounded-lg overflow-hidden border border-gray-800"
                      >
                        <InlineMedia
                          src={url}
                          viewUrl={url}
                          mediaType="image"
                          alt={`Note photo ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
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

      <section className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg">My past logs</h2>
            <p className="text-gray-400 text-sm mt-1">
              Your earlier learning logs with notes photos and explanation videos.
            </p>
          </div>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShortsOpen(true)}
            className="text-sm px-3 py-2 rounded-lg border border-blue-500/40 text-blue-200
              hover:border-blue-400 bg-gray-950"
          >
            Watch Shorts
          </button>
          <button
            type="button"
            onClick={loadPastLogs}
            className="text-sm px-3 py-2 rounded-lg border border-gray-700 text-gray-200
              hover:border-gray-500 bg-gray-950"
          >
            Refresh
          </button>
          </div>
        </div>

        {pastLogsLoading && (
          <p className="text-sm text-gray-400">Loading past logs…</p>
        )}
        {pastLogsError && (
          <p className="text-sm text-red-300 mb-3">{pastLogsError}</p>
        )}
        {!pastLogsLoading && !pastLogsError && pastLogs.length === 0 && (
          <p className="text-sm text-gray-500">No past logs yet. Save your first log above.</p>
        )}

        <div className="space-y-4">
          {pastLogs.map((log) => (
            <article
              key={log.id}
              className="bg-gray-950 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{formatLogDate(log.created_at)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-200 border border-blue-500/30">
                  {subjectName(log.subject_id)}
                </span>
                {log.topic_id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {topicName(log.topic_id)}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-200 border border-emerald-500/30">
                  {log.confidence_level || '—'}
                </span>
              </div>
              <p className="text-gray-200 text-sm whitespace-pre-wrap">
                {(log.taught_today || '').slice(0, 280)}
                {(log.taught_today || '').length > 280 ? '…' : ''}
              </p>

              {Array.isArray(log.note_image_urls) && log.note_image_urls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {log.note_image_urls.map((url, index) => (
                    <div
                      key={`${log.id}-note-${index}`}
                      className="rounded-lg overflow-hidden border border-gray-800 aspect-square bg-black"
                    >
                      <InlineMedia
                        src={url}
                        viewUrl={url}
                        mediaType="image"
                        alt={`Note ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {log.explanation_video_url && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-800">
                  <p className="text-xs text-gray-400 px-3 py-2 bg-gray-900">Explanation video</p>
                  <InlineMedia
                    src={log.explanation_video_url}
                    viewUrl={log.explanation_video_url}
                    mediaType="video"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {shortsOpen && (
        <ShortsPlayer
          items={(pastLogs || []).filter(
            (log) => log.mux_playback_id || log.explanation_video_url,
          )}
          onClose={() => setShortsOpen(false)}
        />
      )}
    </div>
  )
}

export default StudentLearningLog
