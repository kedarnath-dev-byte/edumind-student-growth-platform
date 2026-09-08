import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import service from '../services/studentGrowthService'
export default function StudentDashboard() {
  const { profile } = useAuth()
  const student = profile.student_profile
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (student?.id) service.getHabitSummary(student.id).then(x => { if (active) setSummary(x) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [student?.id])
  return <div className="growth-page"><p className="eyebrow">YOUR LEARNING TODAY</p><h1>Hello, {student?.display_name || profile.app_user.full_name}</h1><p>A little reflection. A little recall. One question when you need help.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {[['/student-growth','01','Add today’s learning','Write what you understood and what needs support.'],['/student-revisions','02','Start your revision','Recall earlier topics in your own words.'],['/student-peer-learning','03','Ask or offer help','Learn with students in your class.'],['/student-habits','04','See your progress','Look back at your learning habits.']].map(([url,n,title,copy]) => <Link className="panel action-card" key={url} to={url}><span className="eyebrow">{n}</span><h2>{title}</h2><p>{copy}</p></Link>)}
    </div>
    {summary && <section className="panel"><h2>Your activity</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">{[['Learning logs',summary.daily_learning_logs_count],['Due today',summary.today_pending_revisions_count],['Revisions completed',summary.revision_completed_count],['Honest reflections',summary.honest_confusion_count]].map(([label,value]) => <div key={label}><strong className="text-3xl">{value}</strong><p>{label}</p></div>)}</div><p className="muted mt-4">Activity shows consistency. Your explanations help you and your mentor check understanding.</p></section>}
  </div>
}
