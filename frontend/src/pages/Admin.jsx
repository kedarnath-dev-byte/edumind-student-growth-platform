/**
 * Admin Control Center — academic-ops command center for monitoring students.
 * Landing tab: Student Pulse / At-Risk board.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../services/api'

const TABS = [
  { id: 'pulse', label: 'Student Pulse' },
  { id: 'setup', label: 'Schools & Curriculum' },
  { id: 'people', label: 'People & Roles' },
  { id: 'support', label: 'Support Graph' },
  { id: 'coverage', label: 'Activity & Coverage' },
]

const riskBadge = (level) => {
  const map = {
    critical: 'bg-red-600/30 text-red-300 border-red-500/40',
    high: 'bg-orange-600/30 text-orange-300 border-orange-500/40',
    medium: 'bg-amber-600/30 text-amber-200 border-amber-500/40',
    low: 'bg-yellow-600/20 text-yellow-200 border-yellow-500/30',
    ok: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
  }
  return map[level] || map.ok
}

const fieldClass = `mt-1 w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2
  focus:outline-none focus:border-blue-500 text-sm`
const btnPrimary = `bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm
  font-semibold rounded-lg px-4 py-2 transition-colors`
const btnSecondary = `bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium
  rounded-lg px-3 py-2 border border-gray-700`

const SectionCard = ({ title, children, actions }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-white font-semibold">{title}</h2>
      {actions}
    </div>
    {children}
  </div>
)

const Admin = () => {
  const { profile, getAccessToken } = useAuth()
  const [tab, setTab] = useState('pulse')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Pulse
  const [students, setStudents] = useState([])
  const [riskOnly, setRiskOnly] = useState(true)
  const [filterSchoolId, setFilterSchoolId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [timeline, setTimeline] = useState(null)

  // Setup
  const [schools, setSchools] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '' })
  const [classroomForm, setClassroomForm] = useState({
    name: '', grade: '', section: '', academic_year: '',
  })
  const [subjectForm, setSubjectForm] = useState({ name: '' })
  const [topicForm, setTopicForm] = useState({ name: '' })

  // People
  const [users, setUsers] = useState([])
  const [roleFilter, setRoleFilter] = useState('')
  const [userForm, setUserForm] = useState({
    full_name: '', email: '', phone: '', role: 'STUDENT',
  })
  const [studentProfileForm, setStudentProfileForm] = useState({
    user_id: '', display_name: '', school_id: '', classroom_id: '',
  })
  const [teacherProfileForm, setTeacherProfileForm] = useState({
    user_id: '', display_name: '', school_id: '',
  })
  const [parentProfileForm, setParentProfileForm] = useState({
    user_id: '', display_name: '', phone: '',
  })

  // Support
  const [peers, setPeers] = useState(null)
  const [parentLinks, setParentLinks] = useState([])
  const [teacherClassrooms, setTeacherClassrooms] = useState([])
  const [classroomStudents, setClassroomStudents] = useState([])
  const [linkForm, setLinkForm] = useState({
    parent_profile_id: '', student_profile_id: '', relationship: 'guardian',
  })
  const [tcForm, setTcForm] = useState({ teacher_profile_id: '', classroom_id: '' })
  const [csForm, setCsForm] = useState({ classroom_id: '', student_profile_id: '' })
  const [teacherProfiles, setTeacherProfiles] = useState([])
  const [parentProfiles, setParentProfiles] = useState([])

  // Coverage
  const [coverage, setCoverage] = useState(null)

  const ADMIN_TIMEOUT_MS = 90000
  const tabRef = useRef(tab)
  tabRef.current = tab
  const requestIdRef = useRef(0)

  const formatErr = (err, fallback) => {
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
      return `${fallback} (backend slow — tap Refresh)`
    }
    const detail = err?.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    return err?.message || fallback
  }

  const apiGet = useCallback(async (url, params) => {
    const token = getAccessToken() || localStorage.getItem('edumind_token')
    const res = await api.get(url, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: ADMIN_TIMEOUT_MS,
    })
    return res.data
  }, [getAccessToken])

  const apiPost = useCallback(async (url, body) => {
    const token = getAccessToken() || localStorage.getItem('edumind_token')
    const res = await api.post(url, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: ADMIN_TIMEOUT_MS,
    })
    return res.data
  }, [getAccessToken])

  const apiPut = useCallback(async (url, body) => {
    const token = getAccessToken() || localStorage.getItem('edumind_token')
    const res = await api.put(url, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: ADMIN_TIMEOUT_MS,
    })
    return res.data
  }, [getAccessToken])

  const apiDelete = useCallback(async (url) => {
    const token = getAccessToken() || localStorage.getItem('edumind_token')
    const res = await api.delete(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: ADMIN_TIMEOUT_MS,
    })
    return res.data
  }, [getAccessToken])

  const settledValue = (result, fallback) => (
    result.status === 'fulfilled' ? result.value : fallback
  )

  const loadSchools = useCallback(async () => {
    const data = await apiGet('/api/v1/schools')
    setSchools(data || [])
  }, [apiGet])

  const loadPulse = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      const params = { risk_only: riskOnly }
      if (filterSchoolId) params.school_id = Number(filterSchoolId)
      const data = await apiGet('/api/v1/admin/students/overview', params)
      if (reqId !== requestIdRef.current) return
      setStudents(data || [])
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(formatErr(err, 'Failed to load student pulse'))
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [apiGet, riskOnly, filterSchoolId])

  const openTimeline = async (studentId) => {
    const reqId = ++requestIdRef.current
    setSelectedStudentId(studentId)
    setTimeline(null)
    setError('')
    try {
      const data = await apiGet(`/api/v1/admin/students/${studentId}/timeline`)
      if (reqId !== requestIdRef.current) return
      setTimeline(data)
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(formatErr(err, 'Failed to load student timeline'))
    }
  }

  const loadSetupForSchool = useCallback(async (schoolId) => {
    if (!schoolId) {
      setClassrooms([])
      setSubjects([])
      setTopics([])
      return
    }
    const results = await Promise.allSettled([
      apiGet(`/api/v1/classrooms/school/${schoolId}`),
      apiGet(`/api/v1/subjects/school/${schoolId}`),
    ])
    setClassrooms(settledValue(results[0], []) || [])
    setSubjects(settledValue(results[1], []) || [])
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length) {
      setError(formatErr(failed[0].reason, 'Failed to load school setup'))
    }
  }, [apiGet])

  const loadTopics = useCallback(async (subjectId) => {
    if (!subjectId) {
      setTopics([])
      return
    }
    const data = await apiGet(`/api/v1/topics/subject/${subjectId}`)
    setTopics(data || [])
  }, [apiGet])

  const loadPeople = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      loadSchools().catch(() => {})
      const params = roleFilter ? { role: roleFilter } : undefined
      const results = await Promise.allSettled([
        apiGet('/api/v1/users', params),
        apiGet('/api/v1/admin/teacher-profiles'),
        apiGet('/api/v1/admin/parent-profiles'),
      ])
      if (reqId !== requestIdRef.current) return
      setUsers(settledValue(results[0], []) || [])
      setTeacherProfiles(settledValue(results[1], []) || [])
      setParentProfiles(settledValue(results[2], []) || [])
      if (results[0].status === 'rejected') {
        setError(formatErr(results[0].reason, 'Failed to load people'))
      } else if (results.some((r) => r.status === 'rejected')) {
        setInfo('People loaded; some profile lists failed — retry if needed')
      }
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(formatErr(err, 'Failed to load people'))
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [apiGet, roleFilter, loadSchools])

  const loadSupport = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError('')
    setPeers(null)
    const emptyPeers = {
      open_requests: [],
      available_offers: [],
      recent_sessions: [],
      open_request_count: 0,
      available_offer_count: 0,
      session_count: 0,
    }
    try {
      loadSchools().catch(() => {})
      const results = await Promise.allSettled([
        apiGet('/api/v1/admin/peers/overview'),
        apiGet('/api/v1/admin/parent-student-links'),
        apiGet('/api/v1/admin/teacher-classrooms'),
        apiGet('/api/v1/admin/classroom-students'),
        apiGet('/api/v1/admin/teacher-profiles'),
        apiGet('/api/v1/admin/parent-profiles'),
        apiGet('/api/v1/users', { role: 'STUDENT' }),
      ])
      if (reqId !== requestIdRef.current) return
      setPeers(settledValue(results[0], emptyPeers) || emptyPeers)
      setParentLinks(settledValue(results[1], []) || [])
      setTeacherClassrooms(settledValue(results[2], []) || [])
      setClassroomStudents(settledValue(results[3], []) || [])
      setTeacherProfiles(settledValue(results[4], []) || [])
      setParentProfiles(settledValue(results[5], []) || [])
      if (results[6].status === 'fulfilled') {
        setUsers(settledValue(results[6], []) || [])
      }
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length === results.length) {
        setError(formatErr(failed[0].reason, 'Failed to load support graph'))
      } else if (failed.length) {
        setInfo(`Support graph partial (${failed.length} section(s) failed) — tap Refresh`)
      }
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(formatErr(err, 'Failed to load support graph'))
      setPeers(emptyPeers)
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [apiGet, loadSchools])

  const loadCoverage = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError('')
    setCoverage(null)
    try {
      const data = await apiGet('/api/v1/admin/coverage/overview')
      if (reqId !== requestIdRef.current) return
      setCoverage(data)
    } catch (err) {
      if (reqId !== requestIdRef.current) return
      setError(formatErr(err, 'Failed to load coverage'))
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [apiGet])

  // Keep latest loaders in refs so the tab effect does not re-fire when
  // apiGet identity changes (e.g. auth profile refresh) — that was abandoning
  // in-flight requests and leaving tabs stuck on Loading forever.
  const loadPulseRef = useRef(loadPulse)
  const loadPeopleRef = useRef(loadPeople)
  const loadSupportRef = useRef(loadSupport)
  const loadCoverageRef = useRef(loadCoverage)
  const loadSetupRef = useRef(loadSetupForSchool)
  loadPulseRef.current = loadPulse
  loadPeopleRef.current = loadPeople
  loadSupportRef.current = loadSupport
  loadCoverageRef.current = loadCoverage
  loadSetupRef.current = loadSetupForSchool

  useEffect(() => {
    loadSchools().catch(() => {})
  }, [loadSchools])

  useEffect(() => {
    setError('')
    setInfo('')
    if (tab === 'pulse') loadPulseRef.current()
    if (tab === 'people') loadPeopleRef.current()
    if (tab === 'support') loadSupportRef.current()
    if (tab === 'coverage') loadCoverageRef.current()
    if (tab === 'setup' && selectedSchoolId) {
      loadSetupRef.current(selectedSchoolId).catch((err) => {
        setError(formatErr(err, 'Failed to load school setup'))
      })
    }
  }, [tab, riskOnly, filterSchoolId, roleFilter, selectedSchoolId])

  useEffect(() => {
    if (selectedSubjectId) {
      loadTopics(selectedSubjectId).catch(() => {})
    }
  }, [selectedSubjectId, loadTopics])

  const pulseStats = useMemo(() => {
    const critical = students.filter((s) => s.risk_level === 'critical').length
    const high = students.filter((s) => s.risk_level === 'high').length
    const medium = students.filter((s) => s.risk_level === 'medium').length
    return { critical, high, medium, total: students.length }
  }, [students])

  const createSchool = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await apiPost('/api/v1/schools', {
        name: schoolForm.name.trim(),
        city: schoolForm.city.trim() || null,
      })
      setSchoolForm({ name: '', city: '' })
      setInfo('School created')
      await loadSchools()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create school')
    }
  }

  const deleteSchool = async (school) => {
    const label = school.city ? `${school.name} · ${school.city}` : school.name
    const ok = window.confirm(
      `Delete school "${label}"?\n\nThis also removes its classrooms, subjects, and topics. Students linked to it will be unassigned (not deleted).`,
    )
    if (!ok) return
    setError('')
    setInfo('')
    try {
      await apiDelete(`/api/v1/schools/${school.id}`)
      if (String(selectedSchoolId) === String(school.id)) {
        setSelectedSchoolId('')
        setSelectedSubjectId('')
        setClassrooms([])
        setSubjects([])
        setTopics([])
      }
      setInfo(`Deleted school "${school.name}"`)
      await loadSchools()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete school')
    }
  }

  const createClassroom = async (e) => {
    e.preventDefault()
    if (!selectedSchoolId) return setError('Select a school first')
    try {
      await apiPost('/api/v1/classrooms', {
        school_id: Number(selectedSchoolId),
        name: classroomForm.name.trim(),
        grade: classroomForm.grade.trim(),
        section: classroomForm.section.trim(),
        academic_year: classroomForm.academic_year.trim(),
      })
      setClassroomForm({ name: '', grade: '', section: '', academic_year: '' })
      setInfo('Classroom created')
      await loadSetupForSchool(selectedSchoolId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create classroom')
    }
  }

  const createSubject = async (e) => {
    e.preventDefault()
    if (!selectedSchoolId) return setError('Select a school first')
    try {
      await apiPost('/api/v1/subjects', {
        school_id: Number(selectedSchoolId),
        name: subjectForm.name.trim(),
      })
      setSubjectForm({ name: '' })
      setInfo('Subject created')
      await loadSetupForSchool(selectedSchoolId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create subject')
    }
  }

  const createTopic = async (e) => {
    e.preventDefault()
    if (!selectedSubjectId) return setError('Select a subject first')
    try {
      await apiPost('/api/v1/topics', {
        subject_id: Number(selectedSubjectId),
        name: topicForm.name.trim(),
      })
      setTopicForm({ name: '' })
      setInfo('Topic created')
      await loadTopics(selectedSubjectId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create topic')
    }
  }

  const createUser = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users', {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim() || null,
        phone: userForm.phone.trim() || null,
        role: userForm.role,
      })
      setUserForm({ full_name: '', email: '', phone: '', role: 'STUDENT' })
      setInfo('User created')
      await loadPeople()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user')
    }
  }

  const studentUsers = (() => {
    const studentsOnly = users.filter((u) => u.role === 'STUDENT')
    return studentsOnly.length ? studentsOnly : users
  })()

  const assignClassrooms = (() => {
    if (!studentProfileForm.school_id) return classrooms
    const sid = Number(studentProfileForm.school_id)
    return classrooms.filter((c) => Number(c.school_id) === sid)
  })()

  const assignStudentToSchool = async (e) => {
    e.preventDefault()
    try {
      const result = await apiPut('/api/v1/users/student-profiles/assign', {
        user_id: Number(studentProfileForm.user_id),
        display_name: studentProfileForm.display_name.trim() || null,
        school_id: studentProfileForm.school_id
          ? Number(studentProfileForm.school_id) : null,
        classroom_id: studentProfileForm.classroom_id
          ? Number(studentProfileForm.classroom_id) : null,
      })
      setInfo('Student assigned to school')
      setStudentProfileForm({
        user_id: '', display_name: '', school_id: '', classroom_id: '',
      })
      await loadPeople()
      loadPulse().catch(() => {})
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign student to school')
    }
  }

  const createSupportStudentUser = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users', {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim() || null,
        phone: null,
        role: 'STUDENT',
      })
      setUserForm({ full_name: '', email: '', phone: '', role: 'STUDENT' })
      setInfo('Student user created')
      const data = await apiGet('/api/v1/users', { role: 'STUDENT' })
      setUsers(data || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create student user')
    }
  }

  const onAssignUserChange = (userId) => {
    const selected = users.find((u) => String(u.id) === String(userId))
    setStudentProfileForm((prev) => ({
      ...prev,
      user_id: userId,
      display_name: prev.display_name.trim()
        ? prev.display_name
        : (selected?.full_name || ''),
    }))
  }

  const onAssignSchoolChange = (schoolId) => {
    setStudentProfileForm((prev) => ({
      ...prev,
      school_id: schoolId,
      classroom_id: '',
    }))
    if (schoolId) loadSetupForSchool(schoolId)
    else loadSetupForSchool(null)
  }

  const renderAssignStudentForm = () => (
    <form onSubmit={assignStudentToSchool} className="space-y-2">
      <select
        className={fieldClass}
        value={studentProfileForm.user_id}
        onChange={(e) => onAssignUserChange(e.target.value)}
        required
      >
        <option value="">Select student user</option>
        {studentUsers.map((u) => (
          <option key={u.id} value={u.id}>
            #{u.id} · {u.full_name} · {u.email || 'no email'}
          </option>
        ))}
      </select>
      <input
        className={fieldClass}
        placeholder="display_name"
        value={studentProfileForm.display_name}
        onChange={(e) => setStudentProfileForm({
          ...studentProfileForm,
          display_name: e.target.value,
        })}
      />
      <select
        className={fieldClass}
        value={studentProfileForm.school_id}
        onChange={(e) => onAssignSchoolChange(e.target.value)}
      >
        <option value="">Select school (optional)</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>#{s.id} · {s.name}</option>
        ))}
      </select>
      <select
        className={fieldClass}
        value={studentProfileForm.classroom_id}
        onChange={(e) => setStudentProfileForm({
          ...studentProfileForm,
          classroom_id: e.target.value,
        })}
        disabled={!studentProfileForm.school_id}
      >
        <option value="">Select classroom (optional)</option>
        {assignClassrooms.map((c) => (
          <option key={c.id} value={c.id}>#{c.id} · {c.name}</option>
        ))}
      </select>
      <button type="submit" className={btnPrimary}>Assign / update school</button>
      <p className="text-xs text-gray-500">
        Updates existing profile if student already has one (no more duplicate error).
      </p>
    </form>
  )

  const createTeacherProfile = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users/teacher-profiles', {
        user_id: Number(teacherProfileForm.user_id),
        display_name: teacherProfileForm.display_name.trim(),
        school_id: teacherProfileForm.school_id
          ? Number(teacherProfileForm.school_id) : null,
      })
      setInfo('Teacher profile created')
      setTeacherProfileForm({ user_id: '', display_name: '', school_id: '' })
      await loadPeople()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create teacher profile')
    }
  }

  const createParentProfile = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users/parent-profiles', {
        user_id: Number(parentProfileForm.user_id),
        display_name: parentProfileForm.display_name.trim(),
        phone: parentProfileForm.phone.trim() || null,
      })
      setInfo('Parent profile created')
      setParentProfileForm({ user_id: '', display_name: '', phone: '' })
      await loadPeople()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create parent profile')
    }
  }

  const createParentLink = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users/parent-student-links', {
        parent_profile_id: Number(linkForm.parent_profile_id),
        student_profile_id: Number(linkForm.student_profile_id),
        relationship: linkForm.relationship || null,
      })
      setInfo('Parent↔student link created')
      await loadSupport()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create link')
    }
  }

  const createTeacherClassroom = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users/teacher-classrooms', {
        teacher_profile_id: Number(tcForm.teacher_profile_id),
        classroom_id: Number(tcForm.classroom_id),
      })
      setInfo('Teacher↔classroom link created')
      await loadSupport()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to link teacher classroom')
    }
  }

  const createClassroomStudent = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/api/v1/users/classroom-students', {
        classroom_id: Number(csForm.classroom_id),
        student_profile_id: Number(csForm.student_profile_id),
      })
      setInfo('Classroom membership created')
      await loadSupport()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add classroom student')
    }
  }

  const adminName = profile?.app_user?.full_name || profile?.email || 'Admin'

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Control Center</h1>
        <p className="text-gray-400 text-sm mt-1">
          Welcome, {adminName}. Monitor every student — who is struggling, where, and what support they need.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === item.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {info}
        </div>
      )}

      {/* ─── STUDENT PULSE ─── */}
      {tab === 'pulse' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Shown', value: pulseStats.total, color: 'blue' },
              { label: 'Critical', value: pulseStats.critical, color: 'red' },
              { label: 'High risk', value: pulseStats.high, color: 'orange' },
              { label: 'Medium', value: pulseStats.medium, color: 'amber' },
            ].map((card) => (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold text-${card.color}-400 mt-1`}>{card.value}</p>
              </div>
            ))}
          </div>

          <SectionCard
            title="At-risk board"
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={fieldClass + ' !mt-0 w-40'}
                  value={filterSchoolId}
                  onChange={(e) => setFilterSchoolId(e.target.value)}
                >
                  <option value="">All schools</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <label className="text-xs text-gray-400 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={riskOnly}
                    onChange={(e) => setRiskOnly(e.target.checked)}
                  />
                  Risk only
                </label>
                <button type="button" className={btnSecondary} onClick={loadPulse}>
                  Refresh
                </button>
              </div>
            )}
          >
            {loading && <p className="text-gray-400 text-sm">Loading pulse…</p>}
            {!loading && students.length === 0 && (
              <p className="text-gray-500 text-sm">
                No students match. Create people/profiles in People tab, or turn off “Risk only”.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">Risk</th>
                    <th className="py-2 pr-3">Signals</th>
                    <th className="py-2 pr-3">Suggested support</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/80 align-top">
                      <td className="py-3 pr-3">
                        <p className="text-white font-medium">{s.display_name}</p>
                        <p className="text-xs text-gray-500">
                          #{s.id} · school {s.school_id ?? '—'} · class {s.classroom_id ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500">{s.app_user_email || 'no email'}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${riskBadge(s.risk_level)}`}>
                          {s.risk_level} ({s.risk_score})
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          logs {s.learning_log_count} · overdue {s.overdue_revision_count}
                          {s.days_since_last_log != null ? ` · ${s.days_since_last_log}d silent` : ' · never logged'}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <ul className="space-y-1">
                          {(s.risk_flags || []).map((f) => (
                            <li key={f.code} className="text-xs text-gray-300">
                              <span className="text-gray-500">[{f.severity}]</span> {f.label}
                            </li>
                          ))}
                          {(!s.risk_flags || s.risk_flags.length === 0) && (
                            <li className="text-xs text-emerald-400">No risk flags</li>
                          )}
                        </ul>
                      </td>
                      <td className="py-3 pr-3">
                        <ul className="space-y-1">
                          {(s.suggested_support || []).map((item) => (
                            <li key={item} className="text-xs text-blue-200">• {item}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => openTimeline(s.id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {/* ─── SETUP ─── */}
      {tab === 'setup' && (
        <>
          <SectionCard title="Create school">
            <form onSubmit={createSchool} className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input className={fieldClass} value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-gray-400">City</label>
                <input className={fieldClass} value={schoolForm.city}
                  onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })} />
              </div>
              <button type="submit" className={btnPrimary}>Add school</button>
            </form>
          </SectionCard>

          <SectionCard title="Schools">
            <div className="flex flex-wrap gap-2 mb-4">
              {schools.map((s) => (
                <div key={s.id} className="inline-flex items-stretch rounded-lg overflow-hidden border border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchoolId(String(s.id))
                      setSelectedSubjectId('')
                    }}
                    className={`px-3 py-2 text-sm ${
                      String(s.id) === String(selectedSchoolId)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-950 text-gray-300 hover:bg-gray-900'
                    }`}
                  >
                    #{s.id} {s.name}{s.city ? ` · ${s.city}` : ''}
                  </button>
                  <button
                    type="button"
                    title="Delete school"
                    onClick={() => deleteSchool(s)}
                    className="px-2.5 py-2 text-xs font-semibold bg-red-950/80 text-red-300
                      hover:bg-red-900 border-l border-gray-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {schools.length === 0 && <p className="text-sm text-gray-500">No schools yet.</p>}
            </div>

            {selectedSchoolId && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Classrooms</h3>
                  <ul className="text-sm text-gray-300 mb-3 space-y-1 max-h-40 overflow-auto">
                    {classrooms.map((c) => (
                      <li key={c.id}>#{c.id} {c.name} · {c.grade}-{c.section} · {c.academic_year}</li>
                    ))}
                  </ul>
                  <form onSubmit={createClassroom} className="space-y-2">
                    {['name', 'grade', 'section', 'academic_year'].map((key) => (
                      <input
                        key={key}
                        className={fieldClass}
                        placeholder={key.replace('_', ' ')}
                        value={classroomForm[key]}
                        onChange={(e) => setClassroomForm({ ...classroomForm, [key]: e.target.value })}
                        required
                      />
                    ))}
                    <button type="submit" className={btnPrimary}>Add classroom</button>
                  </form>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Subjects & topics</h3>
                  <ul className="text-sm text-gray-300 mb-3 space-y-1 max-h-32 overflow-auto">
                    {subjects.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={`text-left ${String(s.id) === String(selectedSubjectId) ? 'text-blue-300' : ''}`}
                          onClick={() => setSelectedSubjectId(String(s.id))}
                        >
                          #{s.id} {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={createSubject} className="flex gap-2 mb-4">
                    <input className={fieldClass + ' !mt-0'} placeholder="Subject name"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({ name: e.target.value })} required />
                    <button type="submit" className={btnPrimary}>Add</button>
                  </form>
                  {selectedSubjectId && (
                    <>
                      <p className="text-xs text-gray-500 mb-2">Topics for subject #{selectedSubjectId}</p>
                      <ul className="text-sm text-gray-300 mb-2 space-y-1 max-h-28 overflow-auto">
                        {topics.map((t) => (
                          <li key={t.id}>#{t.id} {t.name}</li>
                        ))}
                      </ul>
                      <form onSubmit={createTopic} className="flex gap-2">
                        <input className={fieldClass + ' !mt-0'} placeholder="Topic name"
                          value={topicForm.name}
                          onChange={(e) => setTopicForm({ name: e.target.value })} required />
                        <button type="submit" className={btnPrimary}>Add topic</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ─── PEOPLE ─── */}
      {tab === 'people' && (
        <>
          <SectionCard
            title="App users"
            actions={(
              <select
                className={fieldClass + ' !mt-0 w-40'}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All roles</option>
                {['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          >
            <div className="overflow-x-auto mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2">ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/70 text-gray-300">
                      <td className="py-2">{u.id}</td>
                      <td>{u.full_name}</td>
                      <td>{u.role}</td>
                      <td>{u.email || '—'}</td>
                      <td>{u.supabase_user_id ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-gray-500 text-sm">
                        No users yet. Create one below, or Refresh if the list failed to load.
                      </td>
                    </tr>
                  )}
                  {loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-gray-500 text-sm">Loading users…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <form onSubmit={createUser} className="grid md:grid-cols-5 gap-2 items-end">
              <input className={fieldClass} placeholder="Full name" value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
              <input className={fieldClass} placeholder="Email" value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <input className={fieldClass} placeholder="Phone" value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              <select className={fieldClass} value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                {['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button type="submit" className={btnPrimary}>Create user</button>
            </form>
          </SectionCard>

          <div className="grid lg:grid-cols-3 gap-4">
            <SectionCard title="Assign student to school">
              {renderAssignStudentForm()}
            </SectionCard>
            <SectionCard title="Teacher profile">
              <form onSubmit={createTeacherProfile} className="space-y-2">
                <input className={fieldClass} placeholder="user_id" value={teacherProfileForm.user_id}
                  onChange={(e) => setTeacherProfileForm({ ...teacherProfileForm, user_id: e.target.value })} required />
                <input className={fieldClass} placeholder="display_name" value={teacherProfileForm.display_name}
                  onChange={(e) => setTeacherProfileForm({ ...teacherProfileForm, display_name: e.target.value })} required />
                <input className={fieldClass} placeholder="school_id" value={teacherProfileForm.school_id}
                  onChange={(e) => setTeacherProfileForm({ ...teacherProfileForm, school_id: e.target.value })} />
                <button type="submit" className={btnPrimary}>Create</button>
              </form>
              <p className="text-xs text-gray-500 mt-3">{teacherProfiles.length} teacher profiles</p>
            </SectionCard>
            <SectionCard title="Parent profile">
              <form onSubmit={createParentProfile} className="space-y-2">
                <input className={fieldClass} placeholder="user_id" value={parentProfileForm.user_id}
                  onChange={(e) => setParentProfileForm({ ...parentProfileForm, user_id: e.target.value })} required />
                <input className={fieldClass} placeholder="display_name" value={parentProfileForm.display_name}
                  onChange={(e) => setParentProfileForm({ ...parentProfileForm, display_name: e.target.value })} required />
                <input className={fieldClass} placeholder="phone" value={parentProfileForm.phone}
                  onChange={(e) => setParentProfileForm({ ...parentProfileForm, phone: e.target.value })} />
                <button type="submit" className={btnPrimary}>Create</button>
              </form>
              <p className="text-xs text-gray-500 mt-3">{parentProfiles.length} parent profiles</p>
            </SectionCard>
          </div>
        </>
      )}

      {/* ─── SUPPORT GRAPH ─── */}
      {tab === 'support' && (
        <>
          <SectionCard
            title="Onboard / assign student to school"
            actions={<span className="text-xs text-emerald-400/80 border border-emerald-700/40 rounded px-2 py-1">Not peer matching</span>}
          >
            <p className="text-xs text-gray-500 mb-3">
              Create a student user and assign them to a school here. This is separate from peer/parent/teacher link cards below.
            </p>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="border border-gray-800 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Create student user</h3>
                <form onSubmit={createSupportStudentUser} className="space-y-2">
                  <input
                    className={fieldClass}
                    placeholder="Full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value, role: 'STUDENT' })}
                    required
                  />
                  <input
                    className={fieldClass}
                    placeholder="Email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value, role: 'STUDENT' })}
                  />
                  <input className={fieldClass} value="STUDENT" disabled readOnly />
                  <button type="submit" className={btnPrimary}>Create student user</button>
                </form>
              </div>
              <div className="border border-blue-900/50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Assign student to school</h3>
                {renderAssignStudentForm()}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Open peer help needing helpers">
            {!peers && <p className="text-sm text-gray-500">Loading…</p>}
            {peers && (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  Open requests: {peers.open_request_count} · Available offers: {peers.available_offer_count} · Sessions: {peers.session_count}
                </p>
                <ul className="space-y-2 max-h-56 overflow-auto text-sm">
                  {(peers.open_requests || []).map((r) => (
                    <li key={r.id} className="border border-gray-800 rounded-lg p-3 text-gray-300">
                      <span className="text-amber-300 font-medium">#{r.id}</span>
                      {' '}student {r.requester_student_id} · topic {r.topic_id} · {r.status}
                      <p className="text-xs text-gray-500 mt-1">{r.message}</p>
                    </li>
                  ))}
                  {(peers.open_requests || []).length === 0 && (
                    <li className="text-gray-500">No open peer requests.</li>
                  )}
                </ul>
              </>
            )}
          </SectionCard>

          <div className="grid lg:grid-cols-3 gap-4">
            <SectionCard title="Parent ↔ student">
              <ul className="text-xs text-gray-400 mb-3 max-h-32 overflow-auto space-y-1">
                {parentLinks.map((l) => (
                  <li key={l.id}>P{l.parent_profile_id} → S{l.student_profile_id} ({l.relationship || '—'})</li>
                ))}
              </ul>
              <form onSubmit={createParentLink} className="space-y-2">
                <input className={fieldClass} placeholder="parent_profile_id" value={linkForm.parent_profile_id}
                  onChange={(e) => setLinkForm({ ...linkForm, parent_profile_id: e.target.value })} required />
                <input className={fieldClass} placeholder="student_profile_id" value={linkForm.student_profile_id}
                  onChange={(e) => setLinkForm({ ...linkForm, student_profile_id: e.target.value })} required />
                <input className={fieldClass} placeholder="relationship" value={linkForm.relationship}
                  onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })} />
                <button type="submit" className={btnPrimary}>Link</button>
              </form>
            </SectionCard>
            <SectionCard title="Teacher ↔ classroom">
              <ul className="text-xs text-gray-400 mb-3 max-h-32 overflow-auto space-y-1">
                {teacherClassrooms.map((l) => (
                  <li key={l.id}>T{l.teacher_profile_id} → C{l.classroom_id}</li>
                ))}
              </ul>
              <form onSubmit={createTeacherClassroom} className="space-y-2">
                <input className={fieldClass} placeholder="teacher_profile_id" value={tcForm.teacher_profile_id}
                  onChange={(e) => setTcForm({ ...tcForm, teacher_profile_id: e.target.value })} required />
                <input className={fieldClass} placeholder="classroom_id" value={tcForm.classroom_id}
                  onChange={(e) => setTcForm({ ...tcForm, classroom_id: e.target.value })} required />
                <button type="submit" className={btnPrimary}>Link</button>
              </form>
            </SectionCard>
            <SectionCard title="Classroom membership">
              <ul className="text-xs text-gray-400 mb-3 max-h-32 overflow-auto space-y-1">
                {classroomStudents.map((l) => (
                  <li key={l.id}>C{l.classroom_id} ← S{l.student_profile_id}</li>
                ))}
              </ul>
              <form onSubmit={createClassroomStudent} className="space-y-2">
                <input className={fieldClass} placeholder="classroom_id" value={csForm.classroom_id}
                  onChange={(e) => setCsForm({ ...csForm, classroom_id: e.target.value })} required />
                <input className={fieldClass} placeholder="student_profile_id" value={csForm.student_profile_id}
                  onChange={(e) => setCsForm({ ...csForm, student_profile_id: e.target.value })} required />
                <button type="submit" className={btnPrimary}>Add</button>
              </form>
            </SectionCard>
          </div>
        </>
      )}

      {/* ─── COVERAGE ─── */}
      {tab === 'coverage' && (
        <SectionCard title="Activity & coverage" actions={(
          <button type="button" className={btnSecondary} onClick={loadCoverage}>Refresh</button>
        )}
        >
          {!coverage && <p className="text-sm text-gray-500">Loading…</p>}
          {coverage && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  ['Students', coverage.total_students],
                  ['No school', coverage.students_without_school],
                  ['No classroom', coverage.students_without_classroom],
                  ['Inactive 7d', coverage.inactive_7d],
                  ['Inactive 14d', coverage.inactive_14d],
                  ['Overdue revisions', coverage.with_overdue_revisions],
                  ['Open peer asks', coverage.open_peer_requests],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Struggle themes (30d not_understood)</h3>
              <ul className="space-y-2 max-h-80 overflow-auto">
                {(coverage.struggle_themes || []).map((t, idx) => (
                  <li key={`${t.text}-${idx}`} className="text-sm text-gray-300 border-b border-gray-800 pb-2">
                    <span className="text-amber-300 font-semibold">{t.count}×</span>{' '}
                    {t.text}
                    <span className="text-xs text-gray-500 ml-2">
                      subject {t.subject_id ?? '—'} · topic {t.topic_id ?? '—'}
                    </span>
                  </li>
                ))}
                {(coverage.struggle_themes || []).length === 0 && (
                  <li className="text-gray-500 text-sm">No struggle themes yet.</li>
                )}
              </ul>
            </>
          )}
        </SectionCard>
      )}

      {/* ─── TIMELINE DRAWER ─── */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setSelectedStudentId(null)}>
          <div
            className="w-full max-w-lg h-full bg-gray-950 border-l border-gray-800 overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Student #{selectedStudentId}</h2>
              <button type="button" className={btnSecondary} onClick={() => setSelectedStudentId(null)}>Close</button>
            </div>
            {!timeline && <p className="text-gray-400 text-sm">Loading timeline…</p>}
            {timeline && (
              <>
                <div className={`inline-block px-2 py-1 rounded border text-xs font-semibold mb-3 ${riskBadge(timeline.student.risk_level)}`}>
                  {timeline.student.risk_level} · score {timeline.student.risk_score}
                </div>
                <p className="text-white font-medium">{timeline.student.display_name}</p>
                <p className="text-xs text-gray-500 mb-4">{timeline.student.app_user_email}</p>
                <p className="text-sm text-blue-200 mb-4">
                  Support: {(timeline.student.suggested_support || []).join(' · ') || '—'}
                </p>

                <h3 className="text-sm font-semibold text-white mt-4 mb-2">Recent learning logs</h3>
                <ul className="space-y-2 mb-4">
                  {(timeline.learning_logs || []).slice(0, 10).map((log) => (
                    <li key={log.id} className="text-xs text-gray-300 border border-gray-800 rounded p-2">
                      <span className="text-gray-500">{log.created_at}</span> · conf {log.confidence_level}
                      <p>Understood: {log.understood}</p>
                      {log.not_understood && <p className="text-amber-200">Gap: {log.not_understood}</p>}
                    </li>
                  ))}
                </ul>

                <h3 className="text-sm font-semibold text-white mb-2">Revisions</h3>
                <ul className="space-y-1 mb-4 text-xs text-gray-300">
                  {(timeline.revision_tasks || []).slice(0, 15).map((r) => (
                    <li key={r.id}>#{r.id} {r.revision_stage} · {r.status} · due {r.due_at}</li>
                  ))}
                </ul>

                <h3 className="text-sm font-semibold text-white mb-2">Peer</h3>
                <ul className="space-y-1 mb-4 text-xs text-gray-300">
                  {(timeline.peer_requests || []).map((r) => (
                    <li key={`req-${r.id}`}>Ask #{r.id} {r.status}: {r.message}</li>
                  ))}
                  {(timeline.peer_sessions || []).map((s) => (
                    <li key={`ses-${s.id}`}>Session #{s.id} helper {s.helper_student_id} · {s.status}</li>
                  ))}
                </ul>

                <h3 className="text-sm font-semibold text-white mb-2">Uploads</h3>
                <ul className="space-y-1 text-xs text-gray-300">
                  {(timeline.uploads || []).map((u) => (
                    <li key={u.id}>
                      {u.category}: {u.file_name}{' '}
                      {u.web_view_link && (
                        <a className="text-blue-400" href={u.web_view_link} target="_blank" rel="noreferrer">open</a>
                      )}
                    </li>
                  ))}
                  {(timeline.uploads || []).length === 0 && <li className="text-gray-500">No uploads</li>}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
