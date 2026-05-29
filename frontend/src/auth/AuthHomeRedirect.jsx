import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getDefaultRouteForRole } from './roleRoutes'

const AuthHomeRedirect = () => {
  const { loading, profile, profileLoading, session, user } = useAuth()

  if (loading || profileLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-300 text-sm">Checking your EduMind access...</p>
      </div>
    )
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return <Navigate to="/profile-status" replace />
  }

  return <Navigate to={getDefaultRouteForRole(profile.app_user?.role)} replace />
}

export default AuthHomeRedirect
