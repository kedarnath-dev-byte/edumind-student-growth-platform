export const normalizeRole = (role) => String(role || '').trim().toUpperCase()

export const getDefaultRouteForRole = (role) => {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === 'TEACHER') return '/teacher-dashboard'
  if (normalizedRole === 'PARENT') return '/parent-dashboard'
  if (normalizedRole === 'STUDENT') return '/student-dashboard'
  if (normalizedRole === 'ADMIN') return '/student-dashboard'

  return '/student-dashboard'
}
