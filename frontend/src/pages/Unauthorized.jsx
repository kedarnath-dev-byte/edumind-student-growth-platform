import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultRouteForRole, normalizeRole } from '../auth/roleRoutes'

const Unauthorized = () => {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const role = normalizeRole(profile?.app_user?.role)
  const dashboardPath = getDefaultRouteForRole(role)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-white">Access not allowed</h1>
        <p className="text-gray-400 text-sm mt-2">
          Your account does not have access to this page.
        </p>
        {role && (
          <p className="text-blue-300 text-sm font-semibold mt-4">
            Detected role: {role}
          </p>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          to={dashboardPath}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm
          font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Go to your dashboard
        </Link>
        <Link
          to="/profile-status"
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm
          font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          View profile status
        </Link>
        <button
          onClick={handleLogout}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm
          font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Logout
        </button>
      </section>
    </div>
  )
}

export default Unauthorized
