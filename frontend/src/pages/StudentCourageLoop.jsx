/**
 * Courage Loop — vulnerability → clarity → courage
 * Calm en-IN + simple Hindi labels. Privacy default: private.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import studentGrowthService from '../services/studentGrowthService'

const DEMO_STUDENT_ID = 1

const FEAR_TYPES = [
  { id: 'exam_fear', en: 'Exam fear', hi: 'परीक्षा का डर' },
  { id: 'asking_help', en: 'Afraid to ask for help', hi: 'मदद मांगने का डर' },
  { id: 'speaking_up', en: 'Speaking up in class', hi: 'क्लास में बोलने का डर' },
  { id: 'making_mistakes', en: 'Making mistakes', hi: 'गलती करने का डर' },
  { id: 'falling_behind', en: 'Falling behind', hi: 'पीछे रहने का डर' },
  { id: 'other', en: 'Something else', hi: 'कुछ और' },
]

const VISIBILITY = [
  {
    id: 'private',
    en: 'Only me + counsellor',
    hi: 'केवल मैं और काउंसलर',
  },
  {
    id: 'trusted',
    en: 'Me + counsellor + class teacher',
    hi: 'मैं, काउंसलर और क्लास टीचर',
  },
]

const stageLabel = {
  vulnerable: { en: 'Sharing', hi: 'साझा करना' },
  clarifying: { en: 'Finding clarity', hi: 'स्पष्टता' },
  courage: { en: 'Small courage', hi: 'छोटा साहस' },
  done: { en: 'Done for now', hi: 'अभी के लिए पूरा' },
}

const StudentCourageLoop = () => {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const studentProfile = profile?.student_profile || null
  const studentId = studentProfile?.id || DEMO_STUDENT_ID

  const [loops, setLoops] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [fearType, setFearType] = useState('exam_fear')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [clarityPath, setClarityPath] = useState('')
  const [courageAction, setCourageAction] = useState('')
  const [activeId, setActiveId] = useState(null)

  const prefillSubject = searchParams.get('subject_id')
  const prefillTopic = searchParams.get('topic_id')
  const prefillLog = searchParams.get('learning_log_id')

  const active = useMemo(
    () => loops.find((l) => l.id === activeId) || loops.find((l) => l.stage !== 'done') || null,
    [loops, activeId],
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await studentGrowthService.listMyCourageLoops(studentId)
      setLoops(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load Courage Loop')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const startLoop = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const created = await studentGrowthService.createCourageLoop({
        student_id: studentId,
        subject_id: prefillSubject ? Number(prefillSubject) : undefined,
        topic_id: prefillTopic ? Number(prefillTopic) : undefined,
        learning_log_id: prefillLog ? Number(prefillLog) : undefined,
        fear_type: fearType,
        note: note.trim() || undefined,
        visibility,
      })
      setInfo('Saved privately. You are brave for naming it. / निजी रूप से सेव — नाम देना साहस है।')
      setNote('')
      setActiveId(created.id)
      await load()
    } catch (err) {
      setError(err.message || 'Could not start Courage Loop')
    } finally {
      setLoading(false)
    }
  }

  const advance = async () => {
    if (!active) return
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const updated = await studentGrowthService.advanceCourageLoop(active.id, studentId, {
        clarity_path: clarityPath.trim() || undefined,
        courage_action: courageAction.trim() || undefined,
      })
      setActiveId(updated.id)
      setInfo(`Moved to: ${stageLabel[updated.stage]?.en || updated.stage}`)
      await load()
    } catch (err) {
      setError(err.message || 'Could not advance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Courage Loop</h1>
        <p className="text-gray-400 text-sm mt-1">
          साहस चक्र — Share safely → find clarity → take one small brave step.
        </p>
        <p className="text-xs text-emerald-300/90 mt-2">
          Default privacy: only you + counsellor. Never posted to Subject Worlds or peer feed.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-100 text-sm rounded-lg p-3">
          {info}
        </div>
      )}

      <form onSubmit={startLoop} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">I&apos;m stuck / I&apos;m scared · मैं अटक गया / मुझे डर लग रहा है</h2>
        <div>
          <label className="block text-sm text-gray-300 mb-2">What feels hard? / क्या मुश्किल लग रहा है?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEAR_TYPES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFearType(f.id)}
                className={`text-left rounded-lg border px-3 py-2.5 text-sm ${
                  fearType === f.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-950 border-gray-700 text-gray-300'
                }`}
              >
                <span className="font-semibold">{f.en}</span>
                <span className="block text-xs opacity-80">{f.hi}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Private note (optional) / निजी नोट — only counsellor/trusted teacher
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="You can write softly. This stays private."
            className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Who can see tags (not your raw note by default)?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VISIBILITY.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVisibility(v.id)}
                className={`text-left rounded-lg border px-3 py-2.5 text-sm ${
                  visibility === v.id
                    ? 'bg-emerald-700 border-emerald-500 text-white'
                    : 'bg-gray-950 border-gray-700 text-gray-300'
                }`}
              >
                <span className="font-semibold">{v.en}</span>
                <span className="block text-xs opacity-80">{v.hi}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg"
        >
          {loading ? 'Saving…' : 'Start Courage Loop · साहस चक्र शुरू करें'}
        </button>
        <Link to="/student-growth" className="block text-center text-sm text-blue-300 hover:text-blue-200">
          Back to Learning Log · लर्निंग लॉग
        </Link>
      </form>

      {active && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-white font-semibold">
              Current: {stageLabel[active.stage]?.en} · {stageLabel[active.stage]?.hi}
            </h2>
            <span className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300">
              {active.visibility}
            </span>
          </div>
          <p className="text-sm text-gray-400">Fear tag: {active.fear_type}</p>

          {(active.stage === 'vulnerable' || active.stage === 'clarifying') && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Clarity path / स्पष्ट रास्ता — one gentle next step
              </label>
              <textarea
                value={clarityPath}
                onChange={(e) => setClarityPath(e.target.value)}
                rows={3}
                placeholder="e.g. Ask teacher one doubt tomorrow / कल एक डाउट पूछूँगा"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-3 text-sm"
              />
            </div>
          )}

          {(active.stage === 'clarifying' || active.stage === 'courage') && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Courage micro-action / छोटा साहस कदम
              </label>
              <textarea
                value={courageAction}
                onChange={(e) => setCourageAction(e.target.value)}
                rows={2}
                placeholder="e.g. Open the book for 10 minutes / 10 मिनट किताब खोलूँगा"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-3 text-sm"
              />
            </div>
          )}

          {active.stage !== 'done' ? (
            <button
              type="button"
              onClick={advance}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? 'Updating…' : 'Advance stage · अगला चरण'}
            </button>
          ) : (
            <p className="text-emerald-300 text-sm">
              Well done. Rest is also courage. / बहुत अच्छा — आराम भी साहस है।
            </p>
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">My loops · मेरे चक्र</h2>
        {loading && loops.length === 0 && <p className="text-gray-500 text-sm">Loading…</p>}
        <ul className="space-y-2">
          {loops.map((loop) => (
            <li key={loop.id}>
              <button
                type="button"
                onClick={() => setActiveId(loop.id)}
                className="w-full text-left border border-gray-800 rounded-lg px-3 py-2 hover:border-blue-500/50"
              >
                <span className="text-sm text-white">{loop.fear_type}</span>
                <span className="text-xs text-gray-500 ml-2">{loop.stage}</span>
              </button>
            </li>
          ))}
          {loops.length === 0 && !loading && (
            <li className="text-gray-500 text-sm">No loops yet — start when you feel stuck.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default StudentCourageLoop
