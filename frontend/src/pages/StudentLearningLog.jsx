/**
 * @file StudentLearningLog.jsx
 * @description First student growth flow for daily learning logs.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const STUDENT_ID = 1

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
      } catch (err) {
        console.error('Failed to load schools:', err)
        setError(err.message)
      } finally {
        setLoadingSetup(false)
      }
    }

    loadSchools()
  }, [])

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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmit) {
      setValidation('Please complete the required dropdowns and reflection fields.')
      return
    }

    setLoading(true)
    setError('')
    setValidation('')

    try {
      const saved = await studentGrowthService.createLearningLog({
        student_id: STUDENT_ID,
        school_id: Number(form.school_id),
        classroom_id: Number(form.classroom_id),
        subject_id: Number(form.subject_id),
        topic_id: Number(form.topic_id),
        taught_today: form.taught_today.trim(),
        understood: form.understood.trim(),
        not_understood: form.not_understood.trim(),
        confidence_level: form.confidence_level,
      })

      setResult(saved)
      setForm((prev) => ({
        ...initialForm,
        school_id: prev.school_id,
        classroom_id: prev.classroom_id,
        subject_id: prev.subject_id,
        topic_id: prev.topic_id,
      }))
    } catch (err) {
      console.error('Failed to save learning log:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Daily Learning Log</h1>
        <p className="text-gray-400 text-sm mt-1">
          It is okay to say "I don't know yet." Honest confusion helps improvement.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
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
              {!loadingSetup && schoolOptions.length === 0 && (
                <EmptyHint>No schools found yet. Please create school setup data from Swagger first.</EmptyHint>
              )}
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
              {form.school_id && classroomOptions.length === 0 && (
                <EmptyHint>No classrooms found for this school.</EmptyHint>
              )}
            </div>

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
