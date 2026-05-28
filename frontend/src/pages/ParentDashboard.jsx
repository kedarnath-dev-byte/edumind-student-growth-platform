/**
 * @file ParentDashboard.jsx
 * @description Parent growth dashboard for emotionally safe learning signals.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const STUDENT_ID = 1
const SCHOOL_ID = 1
const CLASSROOM_ID = 1
const SUBJECT_ID = 1

const defaultSummary = {
  student_id: STUDENT_ID,
  message: 'Parent growth summary for your child.',
  learning_logs_count: 0,
  latest_learning_logs: [],
  honest_confusion_count: 0,
  revision_summary: {
    pending_revisions_count: 0,
    overdue_revisions_count: 0,
    completed_revisions_count: 0,
    on_time_revision_completed_count: 0,
    memory_rescue_completed_count: 0,
  },
  habit_summary: {
    daily_learning_logs_count: 0,
    honest_confusion_count: 0,
    revision_completed_count: 0,
    memory_rescue_completed_count: 0,
    total_reward_points: 0,
    today_habit_status: 'NO_REVISION_DUE',
  },
  peer_learning_summary: {
    help_requests_created_count: 0,
    help_offers_created_count: 0,
    peer_sessions_as_requester_count: 0,
    peer_sessions_as_helper_count: 0,
    peer_sessions_completed_count: 0,
  },
  topics_needing_support: [],
  parent_support_suggestions: [],
}

const toSafeArray = (value) => Array.isArray(value) ? value : []

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatDate = (value) => {
  if (!value) return 'Not recorded yet'
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeSummary = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultSummary

  const revision = payload.revision_summary || {}
  const habit = payload.habit_summary || {}
  const peer = payload.peer_learning_summary || {}

  return {
    ...defaultSummary,
    ...payload,
    student_id: toNumber(payload.student_id || STUDENT_ID),
    learning_logs_count: toNumber(payload.learning_logs_count),
    latest_learning_logs: toSafeArray(payload.latest_learning_logs),
    honest_confusion_count: toNumber(payload.honest_confusion_count),
    revision_summary: {
      pending_revisions_count: toNumber(revision.pending_revisions_count),
      overdue_revisions_count: toNumber(revision.overdue_revisions_count),
      completed_revisions_count: toNumber(revision.completed_revisions_count),
      on_time_revision_completed_count: toNumber(
        revision.on_time_revision_completed_count
      ),
      memory_rescue_completed_count: toNumber(
        revision.memory_rescue_completed_count
      ),
    },
    habit_summary: {
      daily_learning_logs_count: toNumber(habit.daily_learning_logs_count),
      honest_confusion_count: toNumber(habit.honest_confusion_count),
      revision_completed_count: toNumber(habit.revision_completed_count),
      memory_rescue_completed_count: toNumber(habit.memory_rescue_completed_count),
      total_reward_points: toNumber(habit.total_reward_points),
      today_habit_status: habit.today_habit_status || 'NO_REVISION_DUE',
    },
    peer_learning_summary: {
      help_requests_created_count: toNumber(peer.help_requests_created_count),
      help_offers_created_count: toNumber(peer.help_offers_created_count),
      peer_sessions_as_requester_count: toNumber(
        peer.peer_sessions_as_requester_count
      ),
      peer_sessions_as_helper_count: toNumber(peer.peer_sessions_as_helper_count),
      peer_sessions_completed_count: toNumber(peer.peer_sessions_completed_count),
    },
    topics_needing_support: toSafeArray(payload.topics_needing_support),
    parent_support_suggestions: toSafeArray(payload.parent_support_suggestions),
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

const ParentDashboard = () => {
  const [summary, setSummary] = useState(defaultSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await studentGrowthService.getParentStudentSummary(
          STUDENT_ID,
          {
            school_id: SCHOOL_ID,
            classroom_id: CLASSROOM_ID,
            subject_id: SUBJECT_ID,
          }
        )
        setSummary(normalizeSummary(data))
      } catch (err) {
        console.error('Failed to load parent dashboard:', err)
        setError('Backend is not reachable. Please start the backend server.')
        setSummary(defaultSummary)
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [])

  const latestLogs = useMemo(() => (
    toSafeArray(summary.latest_learning_logs)
  ), [summary])
  const topicsToSupport = useMemo(() => (
    toSafeArray(summary.topics_needing_support)
  ), [summary])
  const suggestions = useMemo(() => (
    toSafeArray(summary.parent_support_suggestions)
  ), [summary])
  const revision = summary.revision_summary
  const habit = summary.habit_summary
  const peer = summary.peer_learning_summary

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-blue-300 text-sm font-semibold mb-2">
          Parent growth view
        </p>
        <h1 className="text-3xl font-bold text-white">Parent Dashboard</h1>
        <p className="text-gray-400 text-sm mt-2">
          See your child's learning growth without marks pressure.
        </p>
        <p className="text-gray-300 text-sm mt-4">
          {summary.message || 'Parent growth summary for your child.'}
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
            Child Learning Summary
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Honest confusion is not failure. It is the starting point of real support.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading child growth signals...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard
              label="Learning logs"
              value={summary.learning_logs_count}
            />
            <StatCard
              label="Honest confusions shared"
              value={summary.honest_confusion_count}
            />
            <StatCard
              label="Reward points"
              value={habit.total_reward_points}
              helper="Healthy effort signals"
            />
            <StatCard
              label="Today habit status"
              value={habit.today_habit_status}
            />
          </div>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Latest Learning Logs
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            See what your child learned, understood, and needs support with.
          </p>
        </div>

        {latestLogs.length === 0 ? (
          <EmptyState>
            No learning logs yet. Ask your child to submit a daily learning log.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {latestLogs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-950 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold">
                      Topic ID {log.topic_id || 'Not selected'}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <span className="bg-blue-600/20 border border-blue-500/30
                    text-blue-300 rounded-lg px-2 py-1 text-xs font-semibold">
                    {log.confidence_level || 'MEDIUM'}
                  </span>
                </div>
                <div className="space-y-3 mt-4">
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500">What was taught: </span>
                    {log.taught_today}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500">What child understood: </span>
                    {log.understood}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500">Where child needs support: </span>
                    {log.not_understood || 'No support need shared in this log.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">Revision Summary</h2>
          <p className="text-gray-400 text-sm mt-1">
            Overdue revisions are Memory Rescue opportunities, not reasons to scold.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            <StatCard label="Pending" value={revision.pending_revisions_count} />
            <StatCard
              label="Memory rescue"
              value={revision.overdue_revisions_count}
            />
            <StatCard
              label="Completed"
              value={revision.completed_revisions_count}
            />
            <StatCard
              label="On-time completed"
              value={revision.on_time_revision_completed_count}
            />
            <StatCard
              label="Memory rescue completed"
              value={revision.memory_rescue_completed_count}
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white">Successful Habits</h2>
          <p className="text-gray-400 text-sm mt-1">
            Habit growth matters because it protects long-term learning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <StatCard
              label="Daily learning logs"
              value={habit.daily_learning_logs_count}
            />
            <StatCard
              label="Honest reflection"
              value={habit.honest_confusion_count}
            />
            <StatCard
              label="Revision completions"
              value={habit.revision_completed_count}
            />
            <StatCard
              label="Memory rescue"
              value={habit.memory_rescue_completed_count}
            />
            <StatCard
              label="Reward points"
              value={habit.total_reward_points}
            />
            <StatCard
              label="Today habit status"
              value={habit.today_habit_status}
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white">
          Peer Learning Participation
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Helping and asking for support both build confidence.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-5">
          <StatCard
            label="Support requests"
            value={peer.help_requests_created_count}
          />
          <StatCard
            label="Help offers"
            value={peer.help_offers_created_count}
          />
          <StatCard
            label="Sessions as requester"
            value={peer.peer_sessions_as_requester_count}
          />
          <StatCard
            label="Sessions as helper"
            value={peer.peer_sessions_as_helper_count}
          />
          <StatCard
            label="Completed sessions"
            value={peer.peer_sessions_completed_count}
          />
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Topics to Support</h2>
          <p className="text-gray-400 text-sm mt-1">
            These topics can guide supportive conversations at home.
          </p>
        </div>

        {topicsToSupport.length === 0 ? (
          <EmptyState>No topic support signals yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {topicsToSupport.map((topic) => (
              <div
                key={topic.topic_id}
                className="bg-gray-950 border border-gray-800 rounded-lg p-4"
              >
                <h3 className="text-white font-semibold">
                  Topic ID {topic.topic_id}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {toNumber(topic.not_understood_count)} support signal(s)
                </p>
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

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white">
          Parent Support Suggestions
        </h2>
        {suggestions.length === 0 ? (
          <EmptyState>No suggestions yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                className="bg-gray-950 border border-gray-800 rounded-lg p-4"
              >
                <p className="text-gray-300 text-sm">{suggestion}</p>
              </div>
            ))}
          </div>
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

export default ParentDashboard
