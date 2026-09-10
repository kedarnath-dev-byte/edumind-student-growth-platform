import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { normalizeRole } from '../../auth/roleRoutes'

const NAV_ITEMS = [
  { path: '/student-dashboard', label: 'Student Dashboard', icon: 'SD', roles: ['STUDENT'] },
  { path: '/student-growth', label: 'Daily Learning Log', icon: 'DL', roles: ['STUDENT'] },
  { path: '/student-revisions', label: "Today's Revision", icon: 'TR', roles: ['STUDENT'] },
  { path: '/student-habits', label: 'Successful Habits', icon: 'SH', roles: ['STUDENT'] },
  { path: '/student-peer-learning', label: 'Peer Learning Circle', icon: 'PL', roles: ['STUDENT'] },
  { path: '/student-upload-proof', label: 'Upload Proof', icon: 'UP', roles: ['STUDENT'] },
  { path: '/teacher-dashboard', label: 'Teacher Dashboard', icon: 'TD', roles: ['TEACHER'] },
  { path: '/parent-dashboard', label: 'Parent Dashboard', icon: 'PD', roles: ['PARENT'] },
  { path: '/profile-status', label: 'Profile Status', icon: 'PS' },
  { path: '/dashboard', label: 'Dashboard', icon: 'DB', roles: ['ADMIN'] },
  { path: '/chat', label: 'AI Tutor', icon: 'AI' },
  { path: '/upload', label: 'Upload Docs', icon: 'UP', roles: ['ADMIN', 'TEACHER'] },
  { path: '/finetuning', label: 'Fine-Tuning', icon: 'FT', roles: ['ADMIN'] },
  { path: '/admin', label: 'Admin Control', icon: 'AD', roles: ['ADMIN'] },
]

const Layout = () => {
  const {
    isAuthenticated,
    profile,
    profileError,
    profileLoading,
    signOut,
    user,
  } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const role = normalizeRole(profile?.app_user?.role)

  const visibleNavItems = useMemo(() => {
    if (!isAuthenticated) {
      return NAV_ITEMS.filter((item) => !item.roles)
    }
    if (!role) {
      return NAV_ITEMS.filter((item) => !item.roles || item.path === '/profile-status')
    }
    return NAV_ITEMS.filter(
      (item) => !item.roles || item.roles.includes(role)
    )
  }, [isAuthenticated, role])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-16'}
        bg-gray-900 border-r border-gray-800
        flex flex-col transition-all duration-300
      `}>
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center
            justify-center text-white font-bold">
            E
          </span>
          {sidebarOpen && (
            <span className="font-bold text-blue-400 text-lg">EduMind AI</span>
          )}
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors duration-200 text-sm font-medium
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <span className="text-xs font-bold w-6 text-center">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-gray-800">
            {isAuthenticated ? (
              <>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                {profileLoading ? (
                  <p className="mt-2 text-xs text-blue-200">
                    Loading profile…
                  </p>
                ) : role ? (
                  <p className="mt-2 inline-block rounded bg-blue-500/10 px-2 py-1
                  text-xs font-semibold text-blue-300">
                    {role}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-amber-200">
                    {profileError || 'Profile not linked'}
                  </p>
                )}
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full text-xs text-red-400
                  hover:text-red-300 text-left transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-xs text-blue-300 hover:text-blue-200
                transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4
          flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors text-xl"
            aria-label="Toggle navigation"
          >
            =
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {isAuthenticated ? user.email : 'Demo mode'}
            </span>
            {isAuthenticated && role && (
              <span className="rounded bg-blue-500/10 px-2 py-1 text-xs
              font-semibold text-blue-300">
                {role}
              </span>
            )}
            <div className="w-8 h-8 bg-blue-600 rounded-full
              flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || 'E'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
