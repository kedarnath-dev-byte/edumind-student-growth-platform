import { useEffect, useState } from 'react'
import api from '../services/api'
const prefix = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'').endsWith('/api/v1') ? '' : '/api/v1'
export default function Admin() {
  const [schools,setSchools]=useState([]), [classes,setClasses]=useState([]), [subjects,setSubjects]=useState([]), [students,setStudents]=useState([])
  const [school,setSchool]=useState(''), [subject,setSubject]=useState(''), [version,setVersion]=useState(0)
  const [error,setError]=useState(''), [message,setMessage]=useState(''), [busy,setBusy]=useState(false)
  useEffect(()=>{let active=true;api.get(`${prefix}/schools`).then(r=>{if(active)setSchools(r.data)}).catch(()=>{if(active)setError('Could not load schools.')});return()=>{active=false}},[version])
  useEffect(()=>{let active=true;if(school)Promise.all([api.get(`${prefix}/classrooms/school/${school}`),api.get(`${prefix}/subjects/school/${school}`),api.get(`${prefix}/school-admin/schools/${school}/students`)]).then(([a,b,c])=>{if(active){setClasses(a.data);setSubjects(b.data);setStudents(c.data)}}).catch(()=>{if(active)setError('Could not load school details.')});return()=>{active=false}},[school,version])
  const submit = (path, extra={}, numeric=[]) => async e => {
    e.preventDefault();const form=e.currentTarget;const data={...Object.fromEntries(new FormData(form)),...extra}
    numeric.forEach(k=>{if(data[k])data[k]=Number(data[k]);else delete data[k]})
    setBusy(true);setError('');setMessage('')
    try {const r=await api.post(`${prefix}${path}`,data);setMessage(r.data.message || 'Saved.');form.reset();setVersion(v=>v+1)} catch(e){setError(typeof e.response?.data?.detail==='string'?e.response.data.detail:'Could not save. Check all fields and try again.')} finally {setBusy(false)}
  }
  return <div className="growth-page"><h1>School management</h1><p>Create a school, set up its subjects, then enroll its students, teachers and parents.</p>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
    <form className="panel space-y-3" onSubmit={submit('/schools')}><h2>Add school or learning group</h2><label>Name<input name="name" required maxLength={120}/></label><label>City<input name="city"/></label><button className="primary" disabled={busy}>Add school</button></form>
    <label>Manage school<select value={school} onChange={e=>{setSchool(e.target.value);setSubject('')}}><option value="">Choose school</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    {school&&<>
    <form className="panel space-y-3" onSubmit={submit('/classrooms',{school_id:Number(school)})}><h2>Add class</h2>{[['name','Class name'],['grade','Grade'],['section','Section'],['academic_year','Academic year']].map(([name,label])=><label key={name}>{label}<input name={name} required/></label>)}<button disabled={busy}>Add class</button></form>
    <form className="panel space-y-3" onSubmit={submit('/subjects',{school_id:Number(school)})}><h2>Add subject</h2><label>Subject name<input name="name" required/></label><button disabled={busy}>Add subject</button></form>
    <form className="panel space-y-3" onSubmit={submit('/topics',{subject_id:Number(subject)})}><h2>Add topic</h2><label>Subject<select required value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Choose subject</option>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Topic name<input name="name" required/></label><button disabled={busy||!subject}>Add topic</button></form>
    <form className="panel space-y-3" onSubmit={submit('/school-admin/enroll',{school_id:Number(school)},['classroom_id','child_id'])}><h2>Enroll a person</h2><label>Full name<input name="full_name" required maxLength={120}/></label><label>Unique email for this account<input name="email" type="email" required/></label><label>Role<select name="role"><option>STUDENT</option><option>TEACHER</option><option>PARENT</option></select></label><label>Class (student or teacher)<select name="classroom_id"><option value="">Choose class</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Child (parent only)<select name="child_id"><option value="">Choose child</option>{students.map(x=><option key={x.id} value={x.id}>{x.display_name}</option>)}</select></label><button className="primary" disabled={busy}>Enroll account</button><p className="muted">Enrollment does not send a message. Give the person the app address and ask them to activate using this email. Each sibling needs a distinct account email.</p></form>
    <section className="panel"><h2>Enrolled students</h2>{students.map(x=><p key={x.id} className="list-row">{x.display_name} · {classes.find(c=>c.id===x.classroom_id)?.name || 'Class not assigned'}</p>)}{!students.length&&<p>No students enrolled yet.</p>}</section>
    </>}
  </div>
}
