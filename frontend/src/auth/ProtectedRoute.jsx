import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const LoadingAccess = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex
        items-center justify-center text-white text-2xl font-bold">
        E
      </div>
      <p className="text-gray-300 text-sm mt-4">
        Checking your EduMind access...
      </p>
    </div>
  </div>
)

const ProtectedRoute = ({
  allowedRoles,
  allowUnlinkedProfile = false,
  children,
}) => {
  const location = useLocation()
  const {
    loading,
    profile,
    profileError,
    profileLoading,
    session,
    user,
  } = useAuth()

  if (loading || profileLoading) {
    return <LoadingAccess />
  }

  if (!user || !session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!profile) {
    if (allowUnlinkedProfile) {
      return children
    }

    return (
      <Navigate
        to="/profile-status"
        replace
        state={{
          message: profileError
            || 'Your EduMind profile is not linked yet. Please contact EduMind admin.',
        }}
      />
    )
  }

  const role = String(profile.app_user?.role || '').toUpperCase()
  const normalizedAllowedRoles = allowedRoles?.map((item) => item.toUpperCase())

  if (
    normalizedAllowedRoles?.length
    && !normalizedAllowedRoles.includes(role)
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
