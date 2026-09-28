/**
 * @file StudentDashboard.jsx
 * @description Student home dashboard connecting the MVP learning flows.
 */
import { Link } from 'react-router-dom'
import InstallHint from '../components/InstallHint'
import StudentDiscoverTip from '../components/StudentDiscoverTip'
import { useEffect, useMemo, useState } from 'react'
import { useStudentId } from '../hooks/useStudentId'
import studentGrowthService from '../services/studentGrowthService'
import { istDateKey, formatIstDate } from '../utils/istTime'

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
    title: "Today's Revision",
    path: '/student-revisions',
    label: 'Open revisions',
    copy: "Protect your memory with today's revision mission.",
    featured: true,
  },
  {
    title: 'Daily Learning Log',
    path: '/student-growth',
    label: 'Open learning log',
    copy: 'Write what you learned, what you understood, and where you need support.',
    featured: true,
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
    title: 'Subject Worlds',
    path: '/student-subjects',
    label: 'Explore Worlds',
    copy: 'After your log: scroll classmate posts by subject (supporting, not the main job).',
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

const getDueDateKey = (value) => istDateKey(value)

const formatDateKey = (dateKey) => {
  if (!dateKey) return ''
  return formatIstDate(`${dateKey}T00:00:00+05:30`, dateKey)
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
  const todayKey = istDateKey(new Date())

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
  const {
    effectiveStudentId,
    isLinked,
    isAuthenticated,
    profileLoading,
  } = useStudentId()
  const [habitSummary, setHabitSummary] = useState(defaultHabitSummary)
  const [revisions, setRevisions] = useState([])
  const [topicCircle, setTopicCircle] = useState(defaultTopicCircle)
  const [habitsLoading, setHabitsLoading] = useState(true)
  const [revisionsLoading, setRevisionsLoading] = useState(true)
  const [peerLearningLoading, setPeerLearningLoading] = useState(true)
  const [warning, setWarning] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [sectionWarnings, setSectionWarnings] = useState({
    habits: '',
    revisions: '',
    peerLearning: '',
  })

  useEffect(() => {
    let isMounted = true
    let completedRequests = 0
    let failedRequests = 0
    let peerTimer = null

    if (profileLoading) {
      return () => {
        isMounted = false
      }
    }

    if (isAuthenticated && !isLinked) {
      setHabitsLoading(false)
      setRevisionsLoading(false)
      setPeerLearningLoading(false)
      setWarning('Your student profile is not linked yet. Open Profile to connect — we will not load another student’s data.')
      return () => {
        isMounted = false
      }
    }

    if (!effectiveStudentId) {
      setHabitsLoading(false)
      setRevisionsLoading(false)
      setPeerLearningLoading(false)
      return () => {
        isMounted = false
      }
    }

    const studentId = effectiveStudentId

    const markRequestDone = (failed = false) => {
      completedRequests += 1
      if (failed) failedRequests += 1

      // Primary wedge = revisions + habits. Peer is deferred and optional.
      if (isMounted && completedRequests >= 2 && failedRequests >= 2) {
        setWarning('Backend is waking or unreachable. Wait 30–60s (cold start) and tap Retry — Log and Revisions stay available.')
      }
    }

    const loadHabits = async () => {
      setHabitsLoading(true)
      setSectionWarnings((current) => ({ ...current, habits: '' }))

      try {
        const payload = await studentGrowthService.getHabitSummary(studentId)
        if (!isMounted) return
        setHabitSummary(normalizeHabitSummary(payload))
        markRequestDone(false)
      } catch (error) {
        console.error('Failed to load habit snapshot:', error)
        if (!isMounted) return
        setHabitSummary(defaultHabitSummary)
        setSectionWarnings((current) => ({
          ...current,
          habits: error?.message || 'Habit snapshot could not refresh.',
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
        const tasks = await studentGrowthService.getRevisionsForStudent(studentId)
        if (!isMounted) return
        setRevisions(toSafeArray(tasks))
        markRequestDone(false)
      } catch (error) {
        console.error('Failed to load revision snapshot:', error)
        if (!isMounted) return
        setRevisions([])
        setSectionWarnings((current) => ({
          ...current,
          revisions: error?.message || 'Revision snapshot could not refresh.',
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
      } catch (error) {
        console.error('Failed to load peer learning snapshot:', error)
        if (!isMounted) return
        setTopicCircle(defaultTopicCircle)
        setSectionWarnings((current) => ({
          ...current,
          peerLearning: error?.message || 'Peer learning snapshot could not refresh.',
        }))
      } finally {
        if (isMounted) setPeerLearningLoading(false)
      }
    }

    setWarning('')
    // Primary wedge first (parallel). Defer peer circle so it does not contend
    // with Log/Revision on a cold or single-CPU free Render instance.
    loadRevisions()
    loadHabits()
    peerTimer = setTimeout(() => {
      if (isMounted) loadPeerLearning()
    }, 250)

    return () => {
      isMounted = false
      if (peerTimer) clearTimeout(peerTimer)
    }
  }, [effectiveStudentId, isAuthenticated, isLinked, profileLoading, reloadKey])

  const revisionSnapshot = useMemo(() => categorizeRevisions(revisions), [revisions])
  const hasRevisionTasks = revisions.length > 0
  const revisionStatusMessage = getRevisionStatusMessage(revisionSnapshot)
  const revisionCtaLabel = revisionSnapshot.dueTodayPending > 0
    || revisionSnapshot.overduePending > 0
    ? "Start Today's Revision"
    : 'View Revision Plan'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <InstallHint className="mb-2" />
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-blue-300 text-sm font-semibold mb-2">
          Launch wedge · Log + revision
        </p>
        <p className="text-green-300 text-sm font-semibold mb-2">
          Primary job today: honest Learning Log + Today’s Revision Mission. Worlds and Shorts support — they are not the scoreboard.
        </p>
        <h1 className="text-3xl font-bold text-white">
          EduMind Student Home
        </h1>
        <p className="text-gray-400 text-sm mt-2 max-w-3xl">
          Build successful habits through learning, revision, honesty, and
          helping others.
        </p>
        <p className="text-gray-300 text-sm mt-4">
          There are no permanently successful people. There are only successful habits.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/student-revisions"
          className="rounded-2xl border border-violet-500/45 bg-gradient-to-br from-violet-600/25 to-gray-900
            p-5 hover:border-violet-400/70 transition-colors"
        >
          <p className="text-violet-300 text-xs font-semibold uppercase tracking-wide">Primary · Revision</p>
          <h2 className="text-white text-xl font-bold mt-1">Today’s Revision Mission</h2>
          <p className="text-gray-300 text-sm mt-2">
            Protect memory with today’s spaced practice and Memory Rescue — no ranking.
          </p>
          <span className="inline-block text-violet-300 text-sm font-semibold mt-4">Open revisions →</span>
        </Link>
        <Link
          to="/student-growth"
          className="rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-600/20 to-gray-900
            p-5 hover:border-emerald-400/60 transition-colors"
        >
          <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wide">Primary · Log</p>
          <h2 className="text-white text-xl font-bold mt-1">Learning Log</h2>
          <p className="text-gray-300 text-sm mt-2">
            Capture what you learned today and unlock your 24H–6M revision plan.
          </p>
          <span className="inline-block text-emerald-300 text-sm font-semibold mt-4">Open Log →</span>
        </Link>
      </section>

      <StudentDiscoverTip className="mb-2" />

      {warning && (
        <div className="bg-amber-500/10 border border-amber-500/30
          text-amber-200 text-sm px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1">{warning} Navigation cards are still available.</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="shrink-0 rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-amber-50 text-xs font-semibold hover:bg-amber-500/30"
          >
            Retry home data
          </button>
        </div>
      )}

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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <p className="text-amber-200 text-sm flex-1">
                  {sectionWarnings.revisions}
                </p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="self-start rounded-lg bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-amber-100 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
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


      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">
            More helpful actions
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
          <h2 className="text-lg font-semibold text-white">Peer help (supporting)</h2>
          <p className="text-gray-400 text-sm mt-1">
            Optional. If you understand, explain. If you need support, ask — after today’s revision.
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

      <section className="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
        <p className="text-gray-500 text-xs">
          Supporting: Subject Worlds stay in the bottom tab after your Log. Face Shorts need a quick privacy acknowledgment on the Log screen.
        </p>
      </section>
    </div>
  )
}

export default StudentDashboard
