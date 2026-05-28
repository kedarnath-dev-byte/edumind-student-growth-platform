/**
 * @file TeacherDashboard.jsx
 * @description Teacher support dashboard for classroom learning signals.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const CLASSROOM_ID = 1
const SCHOOL_ID = 1
const SUBJECT_ID = 1

const defaultSummary = {
  classroom_id: CLASSROOM_ID,
  message: 'Teacher support summary for student growth.',
  learning_logs_count: 0,
  students_with_learning_logs_count: 0,
  honest_confusion_count: 0,
  pending_revisions_count: 0,
  overdue_revisions_count: 0,
  completed_revisions_count: 0,
  peer_help_open_requests_count: 0,
  peer_help_completed_sessions_count: 0,
  topics_needing_support: [],
  students_needing_support: [],
  supportive_teacher_actions: [],
}

const toSafeArray = (value) => Array.isArray(value) ? value : []

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeSummary = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultSummary

  return {
    ...defaultSummary,
    ...payload,
    classroom_id: toNumber(payload.classroom_id || CLASSROOM_ID),
    learning_logs_count: toNumber(payload.learning_logs_count),
    students_with_learning_logs_count: toNumber(
      payload.students_with_learning_logs_count
    ),
    honest_confusion_count: toNumber(payload.honest_confusion_count),
    pending_revisions_count: toNumber(payload.pending_revisions_count),
    overdue_revisions_count: toNumber(payload.overdue_revisions_count),
    completed_revisions_count: toNumber(payload.completed_revisions_count),
    peer_help_open_requests_count: toNumber(payload.peer_help_open_requests_count),
    peer_help_completed_sessions_count: toNumber(
      payload.peer_help_completed_sessions_count
    ),
    topics_needing_support: toSafeArray(payload.topics_needing_support),
    students_needing_support: toSafeArray(payload.students_needing_support),
    supportive_teacher_actions: toSafeArray(payload.supportive_teacher_actions),
  }
}

const StatCard = ({ label, value, helper }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
    <p className="text-gray-500 text-xs">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {helper && <p className="text-gray-500 text-xs mt-2">{helper}</p>}
  </div>
)

const EmptyState = ({ children }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-center">
    <p className="text-gray-400 text-sm">{children}</p>
  </div>
)

const TeacherDashboard = () => {
  const [summary, setSummary] = useState(defaultSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await studentGrowthService.getTeacherClassroomSummary(
          CLASSROOM_ID,
          { school_id: SCHOOL_ID, subject_id: SUBJECT_ID }
        )
        setSummary(normalizeSummary(data))
      } catch (err) {
        console.error('Failed to load teacher dashboard:', err)
        setError('Backend is not reachable. Please start the backend server.')
        setSummary(defaultSummary)
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [])

  const topicsNeedingSupport = useMemo(() => (
    toSafeArray(summary.topics_needing_support)
  ), [summary])
  const studentsNeedingSupport = useMemo(() => (
    toSafeArray(summary.students_needing_support)
  ), [summary])
  const teacherActions = useMemo(() => (
    toSafeArray(summary.supportive_teacher_actions)
  ), [summary])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-blue-300 text-sm font-semibold mb-2">
          Classroom support view
        </p>
        <h1 className="text-3xl font-bold text-white">Teacher Dashboard</h1>
        <p className="text-gray-400 text-sm mt-2">
          Support students before confusion becomes marks pressure.
        </p>
        <p className="text-gray-300 text-sm mt-4">
          {summary.message || 'Teacher support summary for student growth.'}
        </p>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30
          text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Class Support Summary
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Honest confusion is useful signal, not failure.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading classroom signals...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <StatCard label="Learning logs" value={summary.learning_logs_count} />
            <StatCard
              label="Students with learning logs"
              value={summary.students_with_learning_logs_count}
            />
            <StatCard
              label="Honest confusions shared"
              value={summary.honest_confusion_count}
            />
            <StatCard
              label="Pending revisions"
              value={summary.pending_revisions_count}
            />
            <StatCard
              label="Overdue revisions"
              value={summary.overdue_revisions_count}
            />
            <StatCard
              label="Completed revisions"
              value={summary.completed_revisions_count}
            />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">Revision Health</h2>
          <p className="text-gray-400 text-sm mt-1">
            Overdue revisions are Memory Rescue opportunities.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <StatCard
              label="Pending"
              value={summary.pending_revisions_count}
              helper="Waiting for attention"
            />
            <StatCard
              label="Memory rescue"
              value={summary.overdue_revisions_count}
              helper="Support opportunity"
            />
            <StatCard
              label="Completed"
              value={summary.completed_revisions_count}
              helper="Revision health"
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">
            Peer Learning Activity
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Peer learning helps students explain and understand together.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <StatCard
              label="Open requests"
              value={summary.peer_help_open_requests_count}
              helper="Needs support"
            />
            <StatCard
              label="Completed sessions"
              value={summary.peer_help_completed_sessions_count}
              helper="Mutual growth"
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Topics Needing Support
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Topics with repeated support signals can guide tomorrow's review.
          </p>
        </div>

        {topicsNeedingSupport.length === 0 ? (
          <EmptyState>No repeated support signals yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {topicsNeedingSupport.map((topic) => (
              <div
                key={topic.topic_id}
                className="bg-gray-950 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold">
                      Topic ID {topic.topic_id}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {toNumber(topic.not_understood_count)} support signal(s)
                    </p>
                  </div>
                  <span className="bg-blue-600/20 border border-blue-500/30
                    text-blue-300 rounded-lg px-2 py-1 text-xs font-semibold">
                    Topic needing support
                  </span>
                </div>
                <div className="space-y-2 mt-4">
                  {toSafeArray(topic.latest_confusion_examples).map((example, index) => (
                    <p
                      key={`${topic.topic_id}-${index}`}
                      className="text-gray-300 text-sm border-t border-gray-800 pt-2
                      first:border-t-0 first:pt-0"
                    >
                      {example}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Students to Support
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Use this as a support opportunity list, not a ranking.
            </p>
          </div>

          {studentsNeedingSupport.length === 0 ? (
            <EmptyState>No student support signals yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {studentsNeedingSupport.map((student) => (
                <div
                  key={student.student_id}
                  className="bg-gray-950 border border-gray-800 rounded-lg p-4"
                >
                  <h3 className="text-white font-semibold">
                    Student ID {student.student_id}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <StatCard
                      label="Open confusions"
                      value={student.open_confusions_count}
                    />
                    <StatCard
                      label="Pending revisions"
                      value={student.pending_revisions_count}
                    />
                    <StatCard
                      label="Memory rescue"
                      value={student.overdue_revisions_count}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">
            Suggested Teacher Actions
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Small actions can protect confidence and revision health.
          </p>
          {teacherActions.length === 0 ? (
            <EmptyState>No suggested actions yet.</EmptyState>
          ) : (
            <div className="space-y-3 mt-4">
              {teacherActions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="bg-gray-950 border border-gray-800 rounded-lg p-4"
                >
                  <p className="text-gray-300 text-sm">{action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white">Demo Helper Note</h2>
        <p className="text-gray-400 text-sm mt-2">
          For local demo data, use Swagger {'->'} POST /api/v1/dev/seed-demo-data.
        </p>
      </section>
    </div>
  )
}

export default TeacherDashboard
