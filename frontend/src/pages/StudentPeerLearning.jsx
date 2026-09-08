import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import service from '../services/studentGrowthService'
import TopicPicker from '../components/growth/TopicPicker'
export default function StudentPeerLearning() {
  const { profile } = useAuth()
  const p = profile.student_profile
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [requests, setRequests] = useState([])
  const [offers, setOffers] = useState([])
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    Promise.all([service.getOpenPeerHelpRequests(), service.getAvailablePeerHelpOffers(), service.getPeerLearningSessionsForStudent(p.id)])
      .then(([a,b,c]) => { if (active) { setRequests(a); setOffers(b); setSessions(c) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [p.id, version])
  const act = async operation => {
    setBusy(true); setError('')
    try { await operation(); setVersion(x => x + 1) } catch(e) { setError(e.message) } finally { setBusy(false) }
  }
  const create = type => act(async () => {
    const common = {school_id:p.school_id,classroom_id:p.classroom_id,subject_id:Number(subject),topic_id:Number(topic),message:message.trim()}
    if (type === 'request') await service.createPeerHelpRequest({...common,requester_student_id:p.id})
    else await service.createPeerHelpOffer({...common,helper_student_id:p.id})
    setMessage('')
  })
  return <div className="growth-page"><h1>Learn with your class</h1><p>Ask a specific question or offer to explain a topic.</p>{error && <p role="alert" className="error">{error}</p>}
    <section className="panel space-y-4"><TopicPicker schoolId={p.school_id} subjectId={subject} topicId={topic} onChange={(s,t) => {setSubject(s);setTopic(t)}} /><label>Your question or offer<textarea maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} /></label><div className="flex flex-wrap gap-3"><button className="primary" disabled={busy || !topic || !message.trim()} onClick={()=>create('request')}>Ask for help</button><button disabled={busy || !topic || !message.trim()} onClick={()=>create('offer')}>Offer to explain</button></div></section>
    <section className="panel"><h2>Questions from your class</h2>{!requests.length && <p>No open questions yet.</p>}{requests.map(r=><article className="list-row" key={r.id}><p>{r.message}</p>{r.requester_student_id===p.id ? <span className="muted">Your question</span> : <button disabled={busy} onClick={()=>act(()=>service.acceptPeerHelpRequest(r.id,{helper_student_id:p.id}))}>I can help</button>}</article>)}</section>
    <section className="panel"><h2>Classmates ready to explain</h2>{!offers.length && <p>No offers yet. You can be the first.</p>}{offers.map(o=><p className="list-row" key={o.id}>{o.message}{o.helper_student_id===p.id && ' (Your offer)'}</p>)}</section>
    <section className="panel"><h2>Your learning conversations</h2>{!sessions.length && <p>Your accepted help requests will appear here.</p>}{sessions.map(s=><article className="list-row" key={s.id}><p>Conversation #{s.id} · {s.status === 'COMPLETED' ? 'Completed' : 'In progress'}</p>{s.status==='ACTIVE' && <button disabled={busy} onClick={()=>act(()=>service.completePeerHelpSession(s.id,{}))}>Mark conversation completed</button>}</article>)}</section>
  </div>
}
