/**
 * @file StudentHabits.jsx
 * @description Student habit summary page for healthy learning progress.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const STUDENT_ID = 1

const toSafeArray = (value) => Array.isArray(value) ? value : []

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const statusMessages = {
  NOT_STARTED: "Today's revision habit has not started yet. Begin gently.",
  IN_PROGRESS: "You have started today's revision habit. Complete the remaining tasks.",
  DONE: "Today's revision habit is complete. Memory protected.",
  NO_REVISION_DUE: 'No revision due today. Your habit is protected.',
}

const defaultSummary = {
  student_id: STUDENT_ID,
  message: 'Success is built through daily habits.',
  daily_learning_logs_count: 0,
  honest_confusion_count: 0,
  revision_completed_count: 0,
  on_time_revision_completed_count: 0,
  memory_rescue_completed_count: 0,
  total_reward_points: 0,
  today_due_revisions_count: 0,
  today_completed_revisions_count: 0,
  today_pending_revisions_count: 0,
  today_habit_status: 'NO_REVISION_DUE',
  habit_cards: [],
}

const normalizeSummary = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return defaultSummary
  }

  return {
    ...defaultSummary,
    ...payload,
    student_id: toNumber(payload.student_id || STUDENT_ID),
    daily_learning_logs_count: toNumber(payload.daily_learning_logs_count),
    honest_confusion_count: toNumber(payload.honest_confusion_count),
    revision_completed_count: toNumber(payload.revision_completed_count),
    on_time_revision_completed_count: toNumber(payload.on_time_revision_completed_count),
    memory_rescue_completed_count: toNumber(payload.memory_rescue_completed_count),
    total_reward_points: toNumber(payload.total_reward_points),
    today_due_revisions_count: toNumber(payload.today_due_revisions_count),
    today_completed_revisions_count: toNumber(payload.today_completed_revisions_count),
    today_pending_revisions_count: toNumber(payload.today_pending_revisions_count),
    today_habit_status: payload.today_habit_status || 'NO_REVISION_DUE',
    habit_cards: toSafeArray(payload.habit_cards),
  }
}

const SummaryCard = ({ label, value, helper }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <p className="text-gray-400 text-sm">{label}</p>
    <p className="text-3xl font-bold text-white mt-2">{value}</p>
    {helper && <p className="text-gray-500 text-xs mt-2">{helper}</p>}
  </div>
)

const HabitCard = ({ card }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-white font-semibold">{card.name || 'Habit growing'}</h3>
        <p className="text-gray-400 text-sm mt-2">
          {card.message || 'Consistency building through small actions.'}
        </p>
      </div>
      <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30
        rounded-lg px-3 py-1 text-sm font-bold">
        {toNumber(card.value)}
      </span>
    </div>
  </div>
)

const StudentHabits = () => {
  const [summary, setSummary] = useState(defaultSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hadUnexpectedPayload, setHadUnexpectedPayload] = useState(false)

  useEffect(() => {
    const loadHabitSummary = async () => {
      setLoading(true)
      setError('')
      setHadUnexpectedPayload(false)

      try {
        const data = await studentGrowthService.getHabitSummary(STUDENT_ID)
        setHadUnexpectedPayload(!data || typeof data !== 'object')
        setSummary(normalizeSummary(data))
      } catch (err) {
        console.error('Failed to load habit summary:', err)
        setError(
          err.message || 'Backend is not reachable. Please start the backend server.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadHabitSummary()
  }, [])

  const habitCards = useMemo(() => toSafeArray(summary.habit_cards), [summary])
  const hasNoData = (
    summary.daily_learning_logs_count === 0 &&
    summary.revision_completed_count === 0 &&
    summary.total_reward_points === 0
  )
  const todayStatusMessage = (
    statusMessages[summary.today_habit_status] ||
    'Your habit is growing through steady attention.'
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Successful Habits</h1>
        <p className="text-gray-400 text-sm mt-1">
          There are no permanently successful people. There are only successful habits.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30
          text-red-300 text-sm px-4 py-3 rounded-lg">
          Backend is not reachable. Please start the backend server.
        </div>
      )}

      {hadUnexpectedPayload && !error && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30
          text-amber-200 text-sm px-4 py-3 rounded-lg">
          Habit summary data was not in the expected shape, so safe empty values are shown.
        </div>
      )}

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <p className="text-gray-400 text-sm">Loading successful habits...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-blue-300 text-sm font-semibold">
              {summary.message || 'Success is built through daily habits.'}
            </p>
            {hasNoData && (
              <p className="text-gray-400 text-sm mt-3">
                No habit data yet. Submit a daily learning log or run demo seed data.
              </p>
            )}
          </section>

          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <SummaryCard
                label="Daily learning logs"
                value={summary.daily_learning_logs_count}
                helper="Self-awareness building"
              />
              <SummaryCard
                label="Honest confusion shared"
                value={summary.honest_confusion_count}
                helper="Honest reflection habit"
              />
              <SummaryCard
                label="Revisions completed"
                value={summary.revision_completed_count}
                helper="Memory protection"
              />
              <SummaryCard
                label="On-time revisions"
                value={summary.on_time_revision_completed_count}
                helper="Consistency building"
              />
              <SummaryCard
                label="Memory rescue completed"
                value={summary.memory_rescue_completed_count}
                helper="Needs support becomes action"
              />
              <SummaryCard
                label="Total reward points"
                value={summary.total_reward_points}
                helper="Healthy effort signals"
              />
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Today's Habit Status
                </h2>
                <p className="text-gray-400 text-sm mt-1">{todayStatusMessage}</p>
              </div>
              <span className="self-start lg:self-center bg-gray-950 border border-gray-700
                text-blue-300 rounded-lg px-3 py-2 text-sm font-semibold">
                {summary.today_habit_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Due today</p>
                <p className="text-white font-bold mt-1">
                  {summary.today_due_revisions_count}
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Completed today</p>
                <p className="text-white font-bold mt-1">
                  {summary.today_completed_revisions_count}
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Pending today</p>
                <p className="text-white font-bold mt-1">
                  {summary.today_pending_revisions_count}
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white">Habit Cards</h2>
              <p className="text-gray-400 text-sm mt-1">
                EduMind shows growing habits, not shame-based rankings.
              </p>
            </div>

            {habitCards.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-gray-400 text-sm">
                  No habit cards yet. Submit a daily learning log or run demo seed data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habitCards.map((card, index) => (
                  <HabitCard key={`${card.name || 'habit'}-${index}`} card={card} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default StudentHabits
