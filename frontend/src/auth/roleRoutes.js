export const getDefaultRouteForRole = (role) => {
  const normalizedRole = String(role || '').toUpperCase()

  if (normalizedRole === 'TEACHER') return '/teacher-dashboard'
  if (normalizedRole === 'PARENT') return '/parent-dashboard'
  if (normalizedRole === 'STUDENT') return '/student-dashboard'
  if (normalizedRole === 'ADMIN') return '/student-dashboard'

  return '/student-dashboard'
}
