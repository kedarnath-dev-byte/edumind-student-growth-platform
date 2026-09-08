import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import service from '../services/studentGrowthService'
import TopicPicker from '../components/growth/TopicPicker'

export default function StudentLearningLog() {
  const { profile, user } = useAuth()
  const student = profile.student_profile
  const draftKey = `edumind:draft:${user.id}`
  const fresh = () => ({ subject_id: '', topic_id: '', taught_today: '', understood: '', not_understood: '', confidence_level: 'MEDIUM', requestKey: crypto.randomUUID() })
  const [form, setForm] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey)) || fresh() } catch { return fresh() }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const [draftWarning, setDraftWarning] = useState('')
  const update = patch => {
    const next = { ...form, ...patch, requestKey: crypto.randomUUID() }
    setForm(next); setSaved(null)
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)) } catch { setDraftWarning('Draft storage is unavailable. Keep this page open until you submit.') }
  }
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const { requestKey, ...content } = form
      const result = await service.createLearningLog({ ...content, student_id: student.id,
        school_id: student.school_id, classroom_id: student.classroom_id,
        subject_id: Number(form.subject_id), topic_id: Number(form.topic_id),
        understood: form.understood.trim() || "I don't understand this yet.",
      }, requestKey)
      setSaved(result); setForm(fresh())
      try { sessionStorage.removeItem(draftKey) } catch { /* The server save succeeded. */ }
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (!student?.school_id || !student?.classroom_id) return <p>Your school needs to assign your class before you start.</p>
  return <div className="growth-page"><h1>What did you learn today?</h1><p>Explain it in your own words. It is okay to need help.</p>
    {saved && <div role="status" className="notice">Saved. Your {saved.revision_tasks.length} revisions are scheduled. <Link to="/student-revisions">View your revision plan</Link></div>}
    {error && <p role="alert" className="error">{error} Your writing is still here; you can retry.</p>}
    {draftWarning && <p role="status">{draftWarning}</p>}
    <form onSubmit={submit} className="panel space-y-5"><fieldset disabled={busy} className="space-y-5">
      <TopicPicker schoolId={student.school_id} subjectId={form.subject_id} topicId={form.topic_id} onChange={(subject_id, topic_id) => update({ subject_id, topic_id })} />
      <label>What was taught?<textarea required maxLength={5000} value={form.taught_today} onChange={e => update({ taught_today: e.target.value })} /></label>
      <label>What do you understand?<textarea maxLength={5000} value={form.understood} onChange={e => update({ understood: e.target.value })} placeholder="Leave blank if you don't understand yet." /></label>
      <label>Where do you need help?<textarea maxLength={5000} value={form.not_understood} onChange={e => update({ not_understood: e.target.value })} /></label>
      <label>How confident do you feel?<select value={form.confidence_level} onChange={e => update({ confidence_level: e.target.value })}><option value="LOW">Need support</option><option value="MEDIUM">Getting there</option><option value="HIGH">Ready to explain</option></select></label>
      <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save my learning'}</button>
    </fieldset></form><p className="muted">Your draft stays in this tab until you submit or sign out. On a shared phone, sign out when finished.</p>
  </div>
}
