import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const NAV_ITEMS = [
  { path: '/student-dashboard', label: 'Student Dashboard', icon: 'SD' },
  { path: '/student-growth', label: 'Daily Learning Log', icon: 'DL' },
  { path: '/student-revisions', label: "Today's Revision", icon: 'TR' },
  { path: '/student-habits', label: 'Successful Habits', icon: 'SH' },
  { path: '/student-peer-learning', label: 'Peer Learning Circle', icon: 'PL' },
  { path: '/teacher-dashboard', label: 'Teacher Dashboard', icon: 'TD' },
  { path: '/parent-dashboard', label: 'Parent Dashboard', icon: 'PD' },
  { path: '/dashboard', label: 'Dashboard', icon: 'DB' },
  { path: '/chat', label: 'AI Tutor', icon: 'AI' },
  { path: '/upload', label: 'Upload Docs', icon: 'UP' },
  { path: '/finetuning', label: 'Fine-Tuning', icon: 'FT' },
  { path: '/admin', label: 'Admin', icon: 'AD' },
]

const Layout = () => {
  const { isAuthenticated, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          {NAV_ITEMS.map((item) => (
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
