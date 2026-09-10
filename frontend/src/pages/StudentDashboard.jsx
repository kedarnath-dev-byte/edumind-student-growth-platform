/**
 * @file StudentDashboard.jsx
 * @description Student home dashboard connecting the MVP learning flows.
 */
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const STUDENT_ID = 1
const TOPIC_ID = 1

const defaultHabitSummary = {
  daily_learning_logs_count: 0,
  honest_confusion_count: 0,
  revision_completed_count: 0,
  memory_rescue_completed_count: 0,
  total_reward_points: 0,
  today_habit_status: 'NO_REVISION_DUE',
}

const defaultTopicCircle = {
  open_requests_count: 0,
  available_helpers_count: 0,
}

const actionCards = [
  {
    title: 'Daily Learning Log',
    path: '/student-growth',
    label: 'Open learning log',
    copy: 'Write what you learned, what you understood, and where you need support.',
  },
  {
    title: "Today's Revision",
    path: '/student-revisions',
    label: 'Open revisions',
    copy: "Protect your memory with today's revision mission.",
  },
  {
    title: 'Successful Habits',
    path: '/student-habits',
    label: 'Open habits',
    copy: 'See your daily learning, reflection, revision, and memory rescue habits.',
  },
  {
    title: 'Peer Learning Circle',
    path: '/student-peer-learning',
    label: 'Open peer learning',
    copy: 'Ask for support or offer help. Both build learning.',
  },
  {
    title: 'Courage Loop',
    path: '/student-courage-loop',
    label: 'Open Courage Loop',
    copy: 'Safely name a fear, find clarity, take one small brave step. Private by default.',
  },
  {
    title: 'Upload Proof',
    path: '/student-upload-proof',
    label: 'Upload to Drive',
    copy: 'Upload revision proofs or documents securely to EduMind Drive.',
  },
]

const toSafeArray = (value) => Array.isArray(value) ? value : []

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const startOfDay = (date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const toLocalDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDueDateKey = (value) => {
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateOnly) return dateOnly[1]
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return toLocalDateKey(parsed)
}

const formatDateKey = (dateKey) => {
  if (!dateKey) return ''

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const normalizeHabitSummary = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultHabitSummary

  return {
    daily_learning_logs_count: toNumber(payload.daily_learning_logs_count),
    honest_confusion_count: toNumber(payload.honest_confusion_count),
    revision_completed_count: toNumber(payload.revision_completed_count),
    memory_rescue_completed_count: toNumber(payload.memory_rescue_completed_count),
    total_reward_points: toNumber(payload.total_reward_points),
    today_habit_status: payload.today_habit_status || 'NO_REVISION_DUE',
  }
}

const normalizeTopicCircle = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultTopicCircle

  return {
    open_requests_count: toNumber(payload.open_requests_count),
    available_helpers_count: toNumber(payload.available_helpers_count),
  }
}

const getHabitStatusMessage = (status) => {
  if (status === 'NOT_STARTED') {
    return "Today's revision habit has not started yet. Begin gently."
  }
  if (status === 'IN_PROGRESS') {
    return "You have started today's revision habit. Complete the remaining tasks."
  }
  if (status === 'DONE') {
    return "Today's revision habit is complete. Memory protected."
  }
  return 'No revision due today. Your habit is protected.'
}

const categorizeRevisions = (tasks) => {
  const todayKey = toLocalDateKey(startOfDay(new Date()))

  return toSafeArray(tasks).reduce((counts, task) => {
    if (task.status === 'COMPLETED') {
      counts.completed += 1
      return counts
    }

    if (task.status !== 'PENDING') {
      return counts
    }

    const dueDateKey = getDueDateKey(task.due_at)
    if (!dueDateKey) {
      counts.upcoming += 1
      return counts
    }

    if (dueDateKey < todayKey) {
      counts.overduePending += 1
    } else if (dueDateKey === todayKey) {
      counts.dueTodayPending += 1
    } else {
      counts.upcoming += 1
      if (!counts.nextUpcomingDateKey || dueDateKey < counts.nextUpcomingDateKey) {
        counts.nextUpcomingDateKey = dueDateKey
      }
    }

    return counts
  }, {
    dueTodayPending: 0,
    overduePending: 0,
    upcoming: 0,
    completed: 0,
    nextUpcomingDateKey: '',
  })
}

const getRevisionStatusMessage = (snapshot) => {
  if (snapshot.overduePending > 0) {
    return "You have revision tasks waiting. Let's rescue your memory."
  }
  if (snapshot.dueTodayPending > 0) {
    return 'You have revision tasks ready for today.'
  }
  return 'You are on track. Your next revision is planned ahead.'
}

const StatCard = ({ label, value, helper }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
    <p className="text-gray-500 text-xs">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {helper && <p className="text-gray-500 text-xs mt-2">{helper}</p>}
  </div>
)

const StudentDashboard = () => {
  const [habitSummary, setHabitSummary] = useState(defaultHabitSummary)
  const [revisions, setRevisions] = useState([])
  const [topicCircle, setTopicCircle] = useState(defaultTopicCircle)
  const [habitsLoading, setHabitsLoading] = useState(true)
  const [revisionsLoading, setRevisionsLoading] = useState(true)
  const [peerLearningLoading, setPeerLearningLoading] = useState(true)
  const [warning, setWarning] = useState('')
  const [sectionWarnings, setSectionWarnings] = useState({
    habits: '',
    revisions: '',
    peerLearning: '',
  })

  useEffect(() => {
    let isMounted = true
    let completedRequests = 0
    let failedRequests = 0

    const markRequestDone = (failed = false) => {
      completedRequests += 1
      if (failed) failedRequests += 1

      if (isMounted && completedRequests === 3 && failedRequests === 3) {
        setWarning('Backend is not reachable. Please start the backend server.')
      }
    }

    const loadHabits = async () => {
      setHabitsLoading(true)
      setSectionWarnings((current) => ({ ...current, habits: '' }))

      try {
        const payload = await studentGrowthService.getHabitSummary(STUDENT_ID)
        if (!isMounted) return
        setHabitSummary(normalizeHabitSummary(payload))
        markRequestDone(false)
      } catch (error) {
        console.error('Failed to load habit snapshot:', error)
        if (!isMounted) return
        setHabitSummary(defaultHabitSummary)
        setSectionWarnings((current) => ({
          ...current,
          habits: 'Habit snapshot could not refresh.',
        }))
        markRequestDone(true)
      } finally {
        if (isMounted) setHabitsLoading(false)
      }
    }

    const loadRevisions = async () => {
      setRevisionsLoading(true)
      setSectionWarnings((current) => ({ ...current, revisions: '' }))

      try {
        const tasks = await studentGrowthService.getRevisionsForStudent(STUDENT_ID)
        if (!isMounted) return
        setRevisions(toSafeArray(tasks))
        markRequestDone(false)
      } catch (error) {
        console.error('Failed to load revision snapshot:', error)
        if (!isMounted) return
        setRevisions([])
        setSectionWarnings((current) => ({
          ...current,
          revisions: 'Revision snapshot could not refresh.',
        }))
        markRequestDone(true)
      } finally {
        if (isMounted) setRevisionsLoading(false)
      }
    }

    const loadPeerLearning = async () => {
      setPeerLearningLoading(true)
      setSectionWarnings((current) => ({ ...current, peerLearning: '' }))

      try {
        const payload = await studentGrowthService.getPeerLearningTopicCircle(TOPIC_ID)
        if (!isMounted) return
        setTopicCircle(normalizeTopicCircle(payload))
        markRequestDone(false)
      } catch (error) {
        console.error('Failed to load peer learning snapshot:', error)
        if (!isMounted) return
        setTopicCircle(defaultTopicCircle)
        setSectionWarnings((current) => ({
          ...current,
          peerLearning: 'Peer learning snapshot could not refresh.',
        }))
        markRequestDone(true)
      } finally {
        if (isMounted) setPeerLearningLoading(false)
      }
    }

    setWarning('')
    loadRevisions()
    loadHabits()
    loadPeerLearning()

    return () => {
      isMounted = false
    }
  }, [])

  const revisionSnapshot = useMemo(() => categorizeRevisions(revisions), [revisions])
  const hasRevisionTasks = revisions.length > 0
  const revisionStatusMessage = getRevisionStatusMessage(revisionSnapshot)
  const revisionCtaLabel = revisionSnapshot.dueTodayPending > 0
    || revisionSnapshot.overduePending > 0
    ? "Start Today's Revision"
    : 'View Revision Plan'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-blue-300 text-sm font-semibold mb-2">
          Student MVP home
        </p>
        <p className="text-green-300 text-sm font-semibold mb-2">
          Start here: this dashboard connects learning, revision, habits, and peer help.
        </p>
        <h1 className="text-3xl font-bold text-white">
          EduMind Student Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-2 max-w-3xl">
          Build successful habits through learning, revision, honesty, and
          helping others.
        </p>
        <p className="text-gray-300 text-sm mt-4">
          There are no permanently successful people. There are only successful habits.
        </p>
      </section>

      {warning && (
        <div className="bg-amber-500/10 border border-amber-500/30
          text-amber-200 text-sm px-4 py-3 rounded-lg">
          {warning} Navigation cards are still available.
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">
            Today's Action Cards
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Choose the next helpful action for your learning.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {actionCards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5
              hover:border-blue-500/60 hover:bg-gray-900/80 transition-colors"
            >
              <h3 className="text-white font-semibold">{card.title}</h3>
              <p className="text-gray-400 text-sm mt-2 min-h-16">{card.copy}</p>
              <span className="inline-block text-blue-300 text-sm font-semibold mt-4">
                {card.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Habit Snapshot</h2>
              <p className="text-gray-400 text-sm mt-1">
                Successful habits are built through small honest actions.
              </p>
            </div>
            <span className="self-start bg-gray-950 border border-gray-700 text-blue-300
              rounded-lg px-3 py-2 text-sm font-semibold">
              {habitSummary.today_habit_status}
            </span>
          </div>

          {habitsLoading ? (
            <p className="text-gray-400 text-sm">Loading habit snapshot...</p>
          ) : (
            <>
              {sectionWarnings.habits && (
                <p className="text-amber-200 text-sm mb-4">
                  {sectionWarnings.habits}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard
                  label="Learning logs"
                  value={habitSummary.daily_learning_logs_count}
                />
                <StatCard
                  label="Honest reflections"
                  value={habitSummary.honest_confusion_count}
                />
                <StatCard
                  label="Revisions completed"
                  value={habitSummary.revision_completed_count}
                />
                <StatCard
                  label="Memory rescue"
                  value={habitSummary.memory_rescue_completed_count}
                />
                <StatCard
                  label="Reward points"
                  value={habitSummary.total_reward_points}
                />
              </div>
              <p className="text-gray-300 text-sm mt-4">
                {getHabitStatusMessage(habitSummary.today_habit_status)}
              </p>
            </>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">Peer Learning Snapshot</h2>
          <p className="text-gray-400 text-sm mt-1">
            If you understand, explain. If you need support, ask.
          </p>

          {peerLearningLoading ? (
            <p className="text-gray-400 text-sm mt-5">Loading help circle...</p>
          ) : (
            <>
              {sectionWarnings.peerLearning && (
                <p className="text-amber-200 text-sm mt-4">
                  {sectionWarnings.peerLearning}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <StatCard
                  label="Open requests"
                  value={topicCircle.open_requests_count}
                  helper="Needs support"
                />
                <StatCard
                  label="Ready helpers"
                  value={topicCircle.available_helpers_count}
                  helper="Ready to explain"
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {revisionsLoading ? (
          <div>
            <h2 className="text-lg font-semibold text-white">Today's Revision</h2>
            <p className="text-gray-400 text-sm mt-2">
              Loading today's revision plan...
            </p>
          </div>
        ) : (
          <>
            {sectionWarnings.revisions && (
              <p className="text-amber-200 text-sm mb-4">
                {sectionWarnings.revisions}
              </p>
            )}

            {!hasRevisionTasks ? (
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Today's Revision</h2>
                  <p className="text-gray-400 text-sm mt-2">
                    No revision tasks yet. Submit a daily learning log to create your
                    24H, 7D, 1M, 3M, and 6M revision plan.
                  </p>
                </div>
                <Link
                  to="/student-revisions"
                  aria-label="View Revision Plan"
                  className="self-start lg:self-center bg-blue-600 hover:bg-blue-500
                  text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  View Revision Plan
                </Link>
              </div>
            ) : (
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Today's Revision</h2>
                    <p className="text-gray-300 text-sm mt-2">
                      {revisionStatusMessage}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-500 text-xs">Today pending</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {revisionSnapshot.dueTodayPending}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">Ready for attention</p>
                    </div>

                    {revisionSnapshot.overduePending > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-200 text-xs">Memory Rescue</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {revisionSnapshot.overduePending}
                        </p>
                        <p className="text-amber-100/80 text-xs mt-2">
                          Recover gently
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-500 text-xs">Completed</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {revisionSnapshot.completed}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">Memory protected</p>
                    </div>
                  </div>

                  {revisionSnapshot.nextUpcomingDateKey && (
                    <p className="text-gray-400 text-sm">
                      Next upcoming revision:{' '}
                      <span className="text-white font-semibold">
                        {formatDateKey(revisionSnapshot.nextUpcomingDateKey)}
                      </span>
                    </p>
                  )}
                </div>

                <Link
                  to="/student-revisions"
                  aria-label={revisionCtaLabel}
                  className="self-start xl:self-center bg-blue-600 hover:bg-blue-500
                  text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                >
                  {revisionCtaLabel}
                </Link>
              </div>
            )}
          </>
        )}
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

export default StudentDashboard
