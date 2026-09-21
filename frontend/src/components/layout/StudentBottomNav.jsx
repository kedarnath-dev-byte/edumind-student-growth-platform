/**
 * @file StudentBottomNav.jsx
 * @description Instagram-style bottom tab bar for STUDENT role only.
 * Maps core discoverability flows: Home, Subject Worlds, Learning Log, Profile.
 */
import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  {
    path: '/student-dashboard',
    label: 'Home',
    matchPrefixes: ['/student-dashboard'],
    icon: HomeIcon,
  },
  {
    path: '/student-subjects',
    label: 'Worlds',
    matchPrefixes: ['/student-subjects'],
    icon: WorldsIcon,
  },
  {
    path: '/student-growth',
    label: 'Log',
    matchPrefixes: ['/student-growth'],
    icon: LogIcon,
  },
  {
    path: '/profile-status',
    label: 'Profile',
    matchPrefixes: ['/profile-status'],
    icon: ProfileIcon,
  },
]

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

function WorldsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />
    </svg>
  )
}

function LogIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" d="M9 9h6M9 13h6" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 19.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
    </svg>
  )
}

const isTabActive = (pathname, tab) =>
  tab.matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

const StudentBottomNav = () => {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-gray-950/95 backdrop-blur-md
        pb-[env(safe-area-inset-bottom)]"
      aria-label="Student primary navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5 pb-1">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab)
          const Icon = tab.icon
          return (
            <li key={tab.path} className="flex-1">
              <NavLink
                to={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2
                  min-h-[3.25rem] text-[11px] font-semibold tracking-wide transition-colors
                  ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon active={active} />
                <span>{tab.label}</span>
                <span
                  className={`mt-0.5 h-0.5 w-5 rounded-full transition-opacity
                    ${active ? 'bg-blue-500 opacity-100' : 'opacity-0'}`}
                  aria-hidden="true"
                />
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default StudentBottomNav
export { TABS as STUDENT_BOTTOM_TABS }
