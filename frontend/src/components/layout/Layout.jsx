
/**
 * @file Layout.jsx
 * @description Main layout shell for EduMind AI dashboard.
 *              Wraps all pages with Sidebar + Navbar structure.
 *              All authenticated pages render inside this layout.
 *              Follows Single Responsibility — only handles page structure.
 */
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ─── Navigation Items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',   icon: '🏠' },
  { path: '/student-dashboard', label: 'Student Dashboard', icon: '🎓' },
  { path: '/student-growth', label: 'Daily Learning Log', icon: '📝' },
  { path: '/student-revisions', label: "Today's Revision", icon: '🧠' },
  { path: '/student-habits', label: 'Successful Habits', icon: '✨' },
  { path: '/student-peer-learning', label: 'Peer Learning Circle', icon: '🤝' },
  { path: '/chat',        label: 'AI Tutor',    icon: '🤖' },
  { path: '/upload',      label: 'Upload Docs', icon: '📄' },
  { path: '/finetuning',  label: 'Fine-Tuning', icon: '⚙️'  },
  { path: '/admin',       label: 'Admin',       icon: '👑' },
]

// ─── Layout Component ─────────────────────────────────────────────────────────
const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">

      {/* ── Sidebar ── */}
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-16'}
        bg-gray-900 border-r border-gray-800
        flex flex-col transition-all duration-300
      `}>

        {/* Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          {sidebarOpen && (
            <span className="font-bold text-blue-400 text-lg">EduMind AI</span>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
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
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        {sidebarOpen && user && (
          <div className="p-4 border-t border-gray-800">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <button
              onClick={handleLogout}
              className="mt-2 w-full text-xs text-red-400
              hover:text-red-300 text-left transition-colors"
            >
              → Logout
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4
          flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ☰
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Welcome, {user?.name || 'Student'}
            </span>
            <div className="w-8 h-8 bg-blue-600 rounded-full
              flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-950">
          <Outlet />
        </main>

      </div>
    </div>
  )
}

export default Layout
