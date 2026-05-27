/**
 * @file StudentRevisions.jsx
 * @description Student revision dashboard for spaced memory practice.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const STUDENT_ID = 1

const DIFFICULTY_OPTIONS = [
  { value: 'HARD', label: 'Still need support' },
  { value: 'MEDIUM', label: 'Better than before' },
  { value: 'EASY', label: 'I can explain confidently' },
]

const emptyProof = {
  revised: '',
  understoodBetter: '',
  stillNeedsSupport: '',
  difficulty: 'MEDIUM',
}

const toSafeArray = (value) => Array.isArray(value) ? value : []

const startOfDay = (date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const formatDate = (value) => {
  if (!value) return 'No due date'
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const categorizeRevisions = (tasks) => {
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  return toSafeArray(tasks).reduce((groups, task) => {
    if (task.status === 'COMPLETED') {
      groups.completed.push(task)
      return groups
    }

    const dueDate = new Date(task.due_at)
    if (Number.isNaN(dueDate.getTime())) {
      groups.future.push(task)
      return groups
    }

    if (dueDate < today) {
      groups.rescue.push(task)
    } else if (dueDate >= today && dueDate < tomorrow) {
      groups.today.push(task)
    } else if (dueDate >= tomorrow && dueDate <= sevenDaysLater) {
      groups.nextSevenDays.push(task)
    } else {
      groups.future.push(task)
    }

    return groups
  }, {
    today: [],
    rescue: [],
    nextSevenDays: [],
    future: [],
    completed: [],
  })
}

const EmptyState = ({ children }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
    <p className="text-gray-400 text-sm">{children}</p>
  </div>
)

const DifficultyPicker = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="w-full bg-gray-950 border border-gray-700 rounded-lg
    text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
  >
    {DIFFICULTY_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)

const RevisionCard = ({
  task,
  actionLabel,
  canComplete,
  lockedLabel,
  proof,
  isProofOpen,
  validationMessage,
  onOpenProof,
  onCloseProof,
  onProofChange,
  onSubmitProof,
  completing,
}) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-blue-300 text-sm font-bold">{task.revision_stage}</p>
        <p className="text-white font-semibold mt-1">
          Learning log #{task.learning_log_id}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Due: {formatDate(task.due_at)}
        </p>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
        {task.status}
      </span>
    </div>

    {canComplete ? (
      <div className="mt-4 space-y-3">
        {!isProofOpen ? (
          <button
            type="button"
            onClick={onOpenProof}
            disabled={completing}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
            disabled:cursor-not-allowed text-white text-sm font-semibold
            rounded-lg py-2.5 transition-colors"
          >
            {actionLabel}
          </button>
        ) : (
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-white text-sm font-semibold">
                Your explanation is your learning proof.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                It is okay if you still need support.
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                What did you revise?
              </label>
              <textarea
                value={proof.revised}
                onChange={(event) => onProofChange('revised', event.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg
                text-white px-3 py-2 text-sm resize-none focus:outline-none
                focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                What do you understand better now?
              </label>
              <textarea
                value={proof.understoodBetter}
                onChange={(event) => onProofChange('understoodBetter', event.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg
                text-white px-3 py-2 text-sm resize-none focus:outline-none
                focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                What still needs support?
              </label>
              <textarea
                value={proof.stillNeedsSupport}
                onChange={(event) => onProofChange('stillNeedsSupport', event.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg
                text-white px-3 py-2 text-sm resize-none focus:outline-none
                focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Clarity after revision
              </label>
              <DifficultyPicker
                value={proof.difficulty}
                onChange={(value) => onProofChange('difficulty', value)}
              />
            </div>

            {validationMessage && (
              <p className="text-amber-300 text-xs">{validationMessage}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onSubmitProof}
                disabled={completing}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60
                disabled:cursor-not-allowed text-white text-sm font-semibold
                rounded-lg py-2.5 transition-colors"
              >
                {completing ? 'Saving proof...' : 'Save Revision Proof'}
              </button>
              <button
                type="button"
                onClick={onCloseProof}
                disabled={completing}
                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-60
                disabled:cursor-not-allowed text-gray-200 text-sm font-semibold
                rounded-lg py-2.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="mt-4 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2">
        <p className="text-gray-400 text-sm">
          {lockedLabel || 'Locked until due date'}
        </p>
      </div>
    )}
  </div>
)

const RevisionSection = ({
  title,
  description,
  tasks,
  emptyText,
  actionLabel,
  canComplete,
  lockedLabel,
  proofDrafts,
  activeProofTaskId,
  proofValidation,
  onOpenProof,
  onCloseProof,
  onProofChange,
  onSubmitProof,
  completingId,
}) => (
  <section>
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && (
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      )}
    </div>
    {tasks.length === 0 ? (
      <EmptyState>{emptyText}</EmptyState>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <RevisionCard
            key={task.id}
            task={task}
            actionLabel={actionLabel}
            canComplete={canComplete}
            lockedLabel={lockedLabel}
            proof={proofDrafts[task.id] || emptyProof}
            isProofOpen={activeProofTaskId === task.id}
            validationMessage={proofValidation[task.id] || ''}
            onOpenProof={() => onOpenProof(task.id)}
            onCloseProof={onCloseProof}
            onProofChange={(field, value) => onProofChange(task.id, field, value)}
            onSubmitProof={() => onSubmitProof(task.id)}
            completing={completingId === task.id}
          />
        ))}
      </div>
    )}
  </section>
)

const RewardSummary = ({ rewards }) => {
  const safeRewards = toSafeArray(rewards)
  const totalPoints = safeRewards.reduce((sum, reward) => (
    sum + Number(reward.points || 0)
  ), 0)

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">Reward Summary</h2>
        <p className="text-gray-400 text-sm mt-1">
          Rewards celebrate consistency, honesty, and revision.
        </p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-gray-300 text-sm">Total visible points</span>
          <span className="text-green-300 font-bold">{totalPoints}</span>
        </div>
        {safeRewards.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No rewards yet. Submit a daily learning log or complete a revision.
          </p>
        ) : (
          <div className="space-y-3">
            {safeRewards.slice(0, 8).map((reward) => (
              <div
                key={reward.id}
                className="border-t border-gray-800 pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white text-sm font-medium">
                    {reward.event_type}
                  </p>
                  <span className="text-green-300 text-sm">
                    +{reward.points || 0}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-1">{reward.message}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {formatDate(reward.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const StudentRevisions = () => {
  const [revisions, setRevisions] = useState([])
  const [rewards, setRewards] = useState([])
  const [proofDrafts, setProofDrafts] = useState({})
  const [proofValidation, setProofValidation] = useState({})
  const [activeProofTaskId, setActiveProofTaskId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [completingId, setCompletingId] = useState(null)

  const grouped = useMemo(() => categorizeRevisions(revisions), [revisions])
  const hasAnyRevision = toSafeArray(revisions).length > 0

  const loadDashboard = async () => {
    setError('')
    try {
      const [revisionData, rewardData] = await Promise.all([
        studentGrowthService.getRevisionsForStudent(STUDENT_ID),
        studentGrowthService.getRewardsForStudent(STUDENT_ID),
      ])
      setRevisions(toSafeArray(revisionData))
      setRewards(toSafeArray(rewardData))
    } catch (err) {
      console.error('Failed to load revision dashboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const openProof = (taskId) => {
    setActiveProofTaskId(taskId)
    setProofValidation((prev) => ({ ...prev, [taskId]: '' }))
    setProofDrafts((prev) => ({
      ...prev,
      [taskId]: prev[taskId] || emptyProof,
    }))
  }

  const closeProof = () => {
    setActiveProofTaskId(null)
  }

  const updateProof = (taskId, field, value) => {
    setProofValidation((prev) => ({ ...prev, [taskId]: '' }))
    setProofDrafts((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || emptyProof),
        [field]: value,
      },
    }))
  }

  const buildRevisionSummary = (proof) => {
    const sections = [
      ['What I revised', proof.revised],
      ['What I understand better now', proof.understoodBetter],
      ['What still needs support', proof.stillNeedsSupport],
    ]

    return sections
      .filter(([, value]) => value.trim())
      .map(([label, value]) => `${label}: ${value.trim()}`)
      .join('\n')
  }

  const handleSubmitProof = async (taskId) => {
    const proof = proofDrafts[taskId] || emptyProof
    const hasExplanation = [
      proof.revised,
      proof.understoodBetter,
      proof.stillNeedsSupport,
    ].some((value) => value.trim())

    if (!proof.difficulty) {
      setProofValidation((prev) => ({
        ...prev,
        [taskId]: 'Please select your clarity after revision.',
      }))
      return
    }

    if (!hasExplanation) {
      setProofValidation((prev) => ({
        ...prev,
        [taskId]: 'Please write at least one sentence as your revision proof.',
      }))
      return
    }

    setCompletingId(taskId)
    setError('')
    setSuccess('')
    try {
      await studentGrowthService.completeRevision(taskId, {
        difficulty_after_revision: proof.difficulty,
        revision_text_summary: buildRevisionSummary(proof),
        revision_video_url: null,
      })
      setSuccess('Revision proof saved. You are strengthening your memory.')
      setActiveProofTaskId(null)
      await loadDashboard()
    } catch (err) {
      console.error('Failed to save revision proof:', err)
      setError(err.message)
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Today's Revision Mission
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          No shame. Each topic is waiting for your attention at the right time.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30
          text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30
          text-green-300 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {loading ? (
        <EmptyState>Loading your revision plan...</EmptyState>
      ) : !hasAnyRevision ? (
        <EmptyState>No revision tasks yet. Submit a daily learning log first.</EmptyState>
      ) : (
        <div className="space-y-8">
          <RevisionSection
            title="Today's Revision Mission"
            description="These topics are ready for revision today."
            tasks={grouped.today}
            emptyText="No revision is due today."
            actionLabel="Complete Revision"
            canComplete
            proofDrafts={proofDrafts}
            activeProofTaskId={activeProofTaskId}
            proofValidation={proofValidation}
            onOpenProof={openProof}
            onCloseProof={closeProof}
            onProofChange={updateProof}
            onSubmitProof={handleSubmitProof}
            completingId={completingId}
          />

          <RevisionSection
            title="Memory Rescue - missed/overdue revisions"
            description="No shame. This topic is waiting for your attention."
            tasks={grouped.rescue}
            emptyText="No memory rescue tasks right now."
            actionLabel="Complete Memory Rescue"
            canComplete
            proofDrafts={proofDrafts}
            activeProofTaskId={activeProofTaskId}
            proofValidation={proofValidation}
            onOpenProof={openProof}
            onCloseProof={closeProof}
            onProofChange={updateProof}
            onSubmitProof={handleSubmitProof}
            completingId={completingId}
          />

          <RevisionSection
            title="Next 7 Days Revision Plan"
            description="Visible for awareness, locked until each due date."
            tasks={grouped.nextSevenDays}
            emptyText="No revisions scheduled in the next 7 days."
            canComplete={false}
            lockedLabel="Locked until due date"
            proofDrafts={proofDrafts}
            activeProofTaskId={activeProofTaskId}
            proofValidation={proofValidation}
            onOpenProof={openProof}
            onCloseProof={closeProof}
            onProofChange={updateProof}
            onSubmitProof={handleSubmitProof}
            completingId={completingId}
          />

          <RevisionSection
            title="Future Locked Revisions"
            description="Long-term memory work is already planned."
            tasks={grouped.future}
            emptyText="No future locked revisions yet."
            canComplete={false}
            lockedLabel="Locked until due date"
            proofDrafts={proofDrafts}
            activeProofTaskId={activeProofTaskId}
            proofValidation={proofValidation}
            onOpenProof={openProof}
            onCloseProof={closeProof}
            onProofChange={updateProof}
            onSubmitProof={handleSubmitProof}
            completingId={completingId}
          />

          <RevisionSection
            title="Completed Revisions"
            description="Every completed revision strengthens memory."
            tasks={grouped.completed}
            emptyText="No completed revisions yet."
            canComplete={false}
            lockedLabel="Completed"
            proofDrafts={proofDrafts}
            activeProofTaskId={activeProofTaskId}
            proofValidation={proofValidation}
            onOpenProof={openProof}
            onCloseProof={closeProof}
            onProofChange={updateProof}
            onSubmitProof={handleSubmitProof}
            completingId={completingId}
          />

          <RewardSummary rewards={rewards} />
        </div>
      )}
    </div>
  )
}

export default StudentRevisions
