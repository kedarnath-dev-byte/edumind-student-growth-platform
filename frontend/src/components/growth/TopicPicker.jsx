import { useEffect, useState } from 'react'
import service from '../../services/studentGrowthService'

export default function TopicPicker({ schoolId, subjectId, topicId, onChange }) {
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (schoolId) service.getSubjectsBySchool(schoolId).then(data => { if (active) setSubjects(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [schoolId])
  useEffect(() => {
    let active = true
    if (subjectId) service.getTopicsBySubject(subjectId).then(data => { if (active) setTopics(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [subjectId])
  return <div className="grid gap-4 sm:grid-cols-2">
    <label>Subject<select required value={subjectId} onChange={e => onChange(e.target.value, '')}><option value="">Choose subject</option>{subjects.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label>Topic<select required disabled={!subjectId} value={topicId} onChange={e => onChange(subjectId, e.target.value)}><option value="">Choose topic</option>{subjectId && topics.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}
  </div>
}
