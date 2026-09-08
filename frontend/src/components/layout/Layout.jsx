import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { legacyAiEnabled } from '../../config/features'
const menus = {
  STUDENT: [['/student-dashboard','Today'],['/student-growth','Learning log'],['/student-revisions','Revision'],['/student-peer-learning','Class support'],['/student-habits','Progress']],
  TEACHER: [['/teacher-dashboard','My classes']],
  PARENT: [['/parent-dashboard','My children']],
  ADMIN: [['/admin','School management'], ...(legacyAiEnabled ? [['/dashboard','Analytics'],['/chat','AI tools'],['/upload','Documents'],['/finetuning','Model tools']] : [])],
}
export default function Layout() {
  const {profile, user, signOut, authError} = useAuth()
  const navigate = useNavigate()
  const [open,setOpen] = useState(false)
  const role = profile?.app_user?.role
  const logout = async () => { if (await signOut()) navigate('/login') }
  return <div className="min-h-screen bg-gray-950 text-white"><header className="app-header"><NavLink to="/" className="brand">E<span>EduMind</span></NavLink><div className="flex items-center gap-3"><span className="account-name">{profile?.app_user?.full_name || user?.email}</span>{user && <button onClick={logout}>Sign out</button>}<button onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Open navigation" className="sm:hidden">Menu</button></div></header>
    <div className="app-body"><nav className={`app-nav ${open?'is-open':''}`} aria-label="Main navigation">{(menus[role] || []).map(([url,label])=><NavLink key={url} to={url} onClick={()=>setOpen(false)}>{label}</NavLink>)}<NavLink to="/install">Install on phone</NavLink><NavLink to="/profile-status">My account</NavLink></nav><main className="app-main">{authError && <p role="alert" className="error">{authError}</p>}<Outlet key={user?.id || 'signed-out'} /></main></div>
  </div>
}
