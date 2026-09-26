import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

export const useLinkedIds = () => {
  const { profile } = useAuth()

  return useMemo(() => {
    const role = String(profile?.app_user?.role || '').toUpperCase()
    const studentId = profile?.student_profile?.id || null
    const teacherId = profile?.teacher_profile?.id || null
    const parentId = profile?.parent_profile?.id || null
    const schoolId = profile?.student_profile?.school_id
      || profile?.teacher_profile?.school_id
      || null
    const classroomId = profile?.student_profile?.classroom_id || null
    const children = Array.isArray(profile?.parent_children) ? profile.parent_children : []
    const firstChildId = children[0]?.id || null

    return {
      role,
      studentId,
      teacherId,
      parentId,
      schoolId,
      classroomId,
      children,
      firstChildId,
    }
  }, [profile])
}

export default useLinkedIds
