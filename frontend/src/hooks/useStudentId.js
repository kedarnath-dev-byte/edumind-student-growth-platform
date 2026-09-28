/**
 * Profile-derived student id for Launch integrity (P0).
 * Never silently fall back to demo id=1 when the user is authenticated.
 */
import { useAuth } from '../auth/AuthContext'

const DEMO_STUDENT_ID = 1

/**
 * @returns {{
 *   studentId: number | null,
 *   studentProfile: object | null,
 *   isLinked: boolean,
 *   isAuthenticated: boolean,
 *   profileLoading: boolean,
 *   demoFallbackAllowed: boolean,
 *   effectiveStudentId: number | null,
 * }}
 */
export function useStudentId() {
  const { isAuthenticated, profile, profileLoading } = useAuth()
  const studentProfile = profile?.student_profile || null
  const linkedId = studentProfile?.id != null ? Number(studentProfile.id) : null
  const isLinked = Number.isFinite(linkedId) && linkedId > 0

  // Demo/local only: unauthenticated shell may use id=1 for offline demos.
  const demoFallbackAllowed = !isAuthenticated
  const effectiveStudentId = isLinked
    ? linkedId
    : demoFallbackAllowed
      ? DEMO_STUDENT_ID
      : null

  return {
    studentId: isLinked ? linkedId : null,
    studentProfile,
    isLinked,
    isAuthenticated: !!isAuthenticated,
    profileLoading: !!profileLoading,
    demoFallbackAllowed,
    effectiveStudentId,
  }
}

export default useStudentId
