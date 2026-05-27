/**
 * @file StudentPeerLearning.jsx
 * @description Frontend page for EduMind Peer Learning Circle.
 */
import { useEffect, useMemo, useState } from 'react'
import studentGrowthService from '../services/studentGrowthService'

const REQUESTER_STUDENT_ID = 1
const HELPER_STUDENT_ID = 2
const SCHOOL_ID = 1
const CLASSROOM_ID = 1
const SUBJECT_ID = 1
const TOPIC_ID = 1
const LEARNING_LOG_ID = 1

const defaultCircle = {
  topic_id: TOPIC_ID,
  open_requests_count: 0,
  available_helpers_count: 0,
  open_requests: [],
  available_offers: [],
}

const toSafeArray = (value) => Array.isArray(value) ? value : []

const normalizeCircle = (payload) => {
  if (!payload || typeof payload !== 'object') return defaultCircle

  return {
    ...defaultCircle,
    ...payload,
    open_requests: toSafeArray(payload.open_requests),
    available_offers: toSafeArray(payload.available_offers),
    open_requests_count: Number(payload.open_requests_count || 0),
    available_helpers_count: Number(payload.available_helpers_count || 0),
  }
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

const EmptyState = ({ children }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-center">
    <p className="text-gray-400 text-sm">{children}</p>
  </div>
)

const StatusPill = ({ children }) => (
  <span className="bg-blue-600/20 border border-blue-500/30 text-blue-300
    rounded-lg px-2 py-1 text-xs font-semibold">
    {children}
  </span>
)

const TextAreaField = ({ label, value, onChange, placeholder, rows = 4 }) => (
  <div>
    <label className="block text-sm font-medium text-gray-200 mb-2">
      {label}
    </label>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-gray-950 border border-gray-700 rounded-lg
      text-white px-3 py-3 text-sm resize-none focus:outline-none
      focus:border-blue-500 placeholder-gray-500"
    />
  </div>
)

const RequestCard = ({ request, onAccept, accepting }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-white text-sm font-semibold">
          Student {request.requester_student_id} needs support
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Topic #{request.topic_id} • {formatDate(request.created_at)}
        </p>
      </div>
      <StatusPill>{request.status}</StatusPill>
    </div>
    <p className="text-gray-300 text-sm mt-3">{request.message}</p>
    <button
      type="button"
      onClick={() => onAccept(request)}
      disabled={accepting}
      className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
      disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg
      py-2.5 transition-colors"
    >
      {accepting ? 'Starting session...' : 'I can help'}
    </button>
  </div>
)

const OfferCard = ({ offer }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-white text-sm font-semibold">
          Student {offer.helper_student_id} is ready to explain
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Topic #{offer.topic_id} • {formatDate(offer.created_at)}
        </p>
      </div>
      <StatusPill>{offer.status}</StatusPill>
    </div>
    <p className="text-gray-300 text-sm mt-3">{offer.message}</p>
  </div>
)

const SessionCard = ({
  session,
  draft,
  onDraftChange,
  onComplete,
  completing,
}) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-white font-semibold">Peer learning session</h3>
        <p className="text-gray-500 text-xs mt-1">
          Requester {session.requester_student_id} • Helper {session.helper_student_id}
          {' '}• Topic #{session.topic_id}
        </p>
      </div>
      <StatusPill>{session.status}</StatusPill>
    </div>

    {session.requester_feedback && (
      <p className="text-gray-300 text-sm mt-3">
        Requester feedback: {session.requester_feedback}
      </p>
    )}
    {session.helper_reflection && (
      <p className="text-gray-300 text-sm mt-2">
        Helper reflection: {session.helper_reflection}
      </p>
    )}

    {session.status === 'ACTIVE' && (
      <div className="mt-4 bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
        <TextAreaField
          label="Requester feedback"
          value={draft.requester_feedback}
          onChange={(value) => onDraftChange(session.id, 'requester_feedback', value)}
          placeholder="I understood better after my friend explained."
          rows={3}
        />
        <TextAreaField
          label="Helper reflection"
          value={draft.helper_reflection}
          onChange={(value) => onDraftChange(session.id, 'helper_reflection', value)}
          placeholder="Explaining helped me revise the concept again."
          rows={3}
        />
        <button
          type="button"
          onClick={() => onComplete(session.id)}
          disabled={completing}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
          disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg
          py-2.5 transition-colors"
        >
          {completing ? 'Completing session...' : 'Complete Help Session'}
        </button>
      </div>
    )}
  </div>
)

const StudentPeerLearning = () => {
  const [supportMessage, setSupportMessage] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [circle, setCircle] = useState(defaultCircle)
  const [openRequests, setOpenRequests] = useState([])
  const [availableOffers, setAvailableOffers] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionDrafts, setSessionDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [acceptingId, setAcceptingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const circleRequests = useMemo(() => (
    toSafeArray(circle.open_requests)
  ), [circle])
  const circleOffers = useMemo(() => (
    toSafeArray(circle.available_offers)
  ), [circle])

  const loadPeerLearning = async () => {
    setError('')
    try {
      const [circleData, requestData, offerData, requesterSessions, helperSessions] = (
        await Promise.all([
          studentGrowthService.getPeerLearningTopicCircle(TOPIC_ID),
          studentGrowthService.getOpenPeerHelpRequests({ topic_id: TOPIC_ID }),
          studentGrowthService.getAvailablePeerHelpOffers({ topic_id: TOPIC_ID }),
          studentGrowthService.getPeerLearningSessionsForStudent(REQUESTER_STUDENT_ID),
          studentGrowthService.getPeerLearningSessionsForStudent(HELPER_STUDENT_ID),
        ])
      )

      const mergedSessions = [
        ...toSafeArray(requesterSessions),
        ...toSafeArray(helperSessions),
      ].reduce((items, session) => {
        if (!items.some((item) => item.id === session.id)) items.push(session)
        return items
      }, [])

      setCircle(normalizeCircle(circleData))
      setOpenRequests(toSafeArray(requestData))
      setAvailableOffers(toSafeArray(offerData))
      setSessions(mergedSessions)
    } catch (err) {
      console.error('Failed to load peer learning circle:', err)
      setError(
        err.message || 'Backend is not reachable. Please start the backend server.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeerLearning()
  }, [])

  const handleCreateRequest = async (event) => {
    event.preventDefault()
    if (!supportMessage.trim()) {
      setError('Please write what you need support with.')
      return
    }

    setSaving('request')
    setError('')
    setSuccess('')
    try {
      await studentGrowthService.createPeerHelpRequest({
        requester_student_id: REQUESTER_STUDENT_ID,
        school_id: SCHOOL_ID,
        classroom_id: CLASSROOM_ID,
        subject_id: SUBJECT_ID,
        topic_id: TOPIC_ID,
        learning_log_id: LEARNING_LOG_ID,
        message: supportMessage.trim(),
      })
      setSupportMessage('')
      setSuccess('Support request shared safely in the help circle.')
      await loadPeerLearning()
    } catch (err) {
      console.error('Failed to create peer help request:', err)
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  const handleCreateOffer = async (event) => {
    event.preventDefault()
    if (!offerMessage.trim()) {
      setError('Please write what you are ready to explain.')
      return
    }

    setSaving('offer')
    setError('')
    setSuccess('')
    try {
      await studentGrowthService.createPeerHelpOffer({
        helper_student_id: HELPER_STUDENT_ID,
        school_id: SCHOOL_ID,
        classroom_id: CLASSROOM_ID,
        subject_id: SUBJECT_ID,
        topic_id: TOPIC_ID,
        message: offerMessage.trim(),
      })
      setOfferMessage('')
      setSuccess('Help offer shared. Explaining helps memory grow.')
      await loadPeerLearning()
    } catch (err) {
      console.error('Failed to create peer help offer:', err)
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  const handleAcceptRequest = async (request) => {
    const matchingOffer = availableOffers.find((offer) => (
      offer.topic_id === request.topic_id &&
      offer.helper_student_id === HELPER_STUDENT_ID
    )) || availableOffers.find((offer) => offer.topic_id === request.topic_id)

    setAcceptingId(request.id)
    setError('')
    setSuccess('')
    try {
      await studentGrowthService.acceptPeerHelpRequest(request.id, {
        helper_student_id: HELPER_STUDENT_ID,
        help_offer_id: matchingOffer?.id || null,
      })
      setSuccess('Peer learning session started. Helping each other builds memory.')
      await loadPeerLearning()
    } catch (err) {
      console.error('Failed to accept peer help request:', err)
      setError(err.message)
    } finally {
      setAcceptingId(null)
    }
  }

  const updateSessionDraft = (sessionId, field, value) => {
    setSessionDrafts((prev) => ({
      ...prev,
      [sessionId]: {
        requester_feedback: '',
        helper_reflection: '',
        ...(prev[sessionId] || {}),
        [field]: value,
      },
    }))
  }

  const handleCompleteSession = async (sessionId) => {
    const draft = sessionDrafts[sessionId] || {
      requester_feedback: '',
      helper_reflection: '',
    }

    setCompletingId(sessionId)
    setError('')
    setSuccess('')
    try {
      await studentGrowthService.completePeerHelpSession(sessionId, {
        requester_feedback: draft.requester_feedback.trim() || null,
        helper_reflection: draft.helper_reflection.trim() || null,
      })
      setSuccess('Peer help completed. Both students grow when learning is shared.')
      await loadPeerLearning()
    } catch (err) {
      console.error('Failed to complete peer help session:', err)
      setError(err.message)
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Peer Learning Circle</h1>
        <p className="text-gray-400 text-sm mt-1">
          If you understand, explain. If you do not understand, ask. Both are
          successful habits.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30
          text-red-300 text-sm px-4 py-3 rounded-lg">
          {error.includes('Could not reach') ? (
            'Backend is not reachable. Please start the backend server.'
          ) : error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30
          text-green-300 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {loading ? (
        <EmptyState>Loading peer learning circle...</EmptyState>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleCreateRequest}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <h2 className="text-lg font-semibold text-white">Ask for Support</h2>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Asking safely is a strong learning habit.
              </p>
              <TextAreaField
                label="What do you need support with?"
                value={supportMessage}
                onChange={setSupportMessage}
                placeholder="I need support with inertia and the bus sudden-stop example."
              />
              <button
                type="submit"
                disabled={saving === 'request'}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
                disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg
                transition-colors"
              >
                {saving === 'request' ? 'Sharing request...' : 'Ask for Support'}
              </button>
            </form>

            <form
              onSubmit={handleCreateOffer}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <h2 className="text-lg font-semibold text-white">Offer Help</h2>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Helping others strengthens your own understanding.
              </p>
              <TextAreaField
                label="What are you ready to explain?"
                value={offerMessage}
                onChange={setOfferMessage}
                placeholder="I can explain Newton's first law with practical examples."
              />
              <button
                type="submit"
                disabled={saving === 'offer'}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60
                disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg
                transition-colors"
              >
                {saving === 'offer' ? 'Sharing offer...' : 'Offer Help'}
              </button>
            </form>
          </div>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Topic Support Circle
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  A topic can have students who need support and students ready
                  to explain.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Open requests</p>
                  <p className="text-white font-bold mt-1">
                    {circle.open_requests_count}
                  </p>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Ready helpers</p>
                  <p className="text-white font-bold mt-1">
                    {circle.available_helpers_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
              <div>
                <h3 className="text-white text-sm font-semibold mb-3">
                  Open support requests
                </h3>
                {circleRequests.length === 0 ? (
                  <EmptyState>No open support requests yet.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {circleRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onAccept={handleAcceptRequest}
                        accepting={acceptingId === request.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-white text-sm font-semibold mb-3">
                  Available helpers
                </h3>
                {circleOffers.length === 0 ? (
                  <EmptyState>No helpers available yet. You can offer help.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {circleOffers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white">
                Open Help Requests
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Choose a request when you are ready to explain with care.
              </p>
            </div>
            {openRequests.length === 0 ? (
              <EmptyState>No open support requests yet.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {openRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    accepting={acceptingId === request.id}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white">
                My Peer Learning Sessions
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Mutual growth continues after the session is started.
              </p>
            </div>
            {sessions.length === 0 ? (
              <EmptyState>No peer learning sessions yet.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    draft={sessionDrafts[session.id] || {
                      requester_feedback: '',
                      helper_reflection: '',
                    }}
                    onDraftChange={updateSessionDraft}
                    onComplete={handleCompleteSession}
                    completing={completingId === session.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default StudentPeerLearning
