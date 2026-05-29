import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultRouteForRole } from '../auth/roleRoutes'

const ProfileStatus = () => {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    profile,
    profileError,
    profileLoading,
    refreshProfile,
    signOut,
    user,
  } = useAuth()

  const role = profile?.app_user?.role
  const defaultRoute = getDefaultRouteForRole(role)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-white">Profile Status</h1>
        <p className="text-gray-400 text-sm mt-2">
          Check whether your Supabase login is connected to an EduMind profile.
        </p>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs">Auth status</p>
            <p className="text-white font-semibold">
              {isAuthenticated ? 'Signed in' : 'Demo mode / not signed in'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Supabase email</p>
            <p className="text-white font-semibold">
              {user?.email || 'Not signed in'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">EduMind profile linked</p>
            <p className="text-white font-semibold">
              {profile ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Role</p>
            <p className="text-white font-semibold">{role || 'Not available'}</p>
          </div>
        </div>

        {profileError && (
          <div className="mt-5 bg-amber-500/10 border border-amber-500/30
          text-amber-200 text-sm rounded-lg p-3">
            {profileError}
          </div>
        )}
      </section>

      {profile && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">
            EduMind Profile
          </h2>
          <div className="space-y-3 text-sm">
            <p className="text-gray-300">
              Name: {profile.app_user?.full_name || 'Not available'}
            </p>
            {profile.student_profile && (
              <p className="text-gray-300">
                Student: {profile.student_profile.display_name}
              </p>
            )}
            {profile.teacher_profile && (
              <p className="text-gray-300">
                Teacher: {profile.teacher_profile.display_name}
              </p>
            )}
            {profile.parent_profile && (
              <p className="text-gray-300">
                Parent: {profile.parent_profile.display_name}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        {profile && (
          <Link
            to={defaultRoute}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm
            font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            Go to dashboard
          </Link>
        )}
        {isAuthenticated && (
          <button
            onClick={() => refreshProfile()}
            disabled={profileLoading}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800
            disabled:text-gray-500 text-white text-sm font-semibold rounded-lg
            px-4 py-2 transition-colors"
          >
            {profileLoading ? 'Refreshing...' : 'Refresh profile'}
          </button>
        )}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm
            font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm
            font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            Login
          </Link>
        )}
      </section>
    </div>
  )
}

export default ProfileStatus
