import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthHomeRedirect from './auth/AuthHomeRedirect'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

const Install = lazy(() => import('./pages/Install'))
const Admin = lazy(() => import('./pages/Admin'))
const Chat = legacyAiEnabled ? lazy(() => import('./pages/Chat')) : null
const Dashboard = legacyAiEnabled ? lazy(() => import('./pages/Dashboard')) : null
const FineTuning = legacyAiEnabled ? lazy(() => import('./pages/FineTuning')) : null
const Login = lazy(() => import('./pages/Login'))
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'))
const ProfileStatus = lazy(() => import('./pages/ProfileStatus'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const StudentHabits = lazy(() => import('./pages/StudentHabits'))
const StudentLearningLog = lazy(() => import('./pages/StudentLearningLog'))
const StudentPeerLearning = lazy(() => import('./pages/StudentPeerLearning'))
const StudentRevisions = lazy(() => import('./pages/StudentRevisions'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const Upload = legacyAiEnabled ? lazy(() => import('./pages/Upload')) : null

import Layout from './components/layout/Layout'
import { legacyAiEnabled } from './config/features'

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/install" element={<div className="p-6"><Install /></div>} />

    <Route path="/" element={<Layout />}>
      <Route index element={<AuthHomeRedirect />} />
      {legacyAiEnabled && <Route path="dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><Dashboard /></ProtectedRoute>} />}
      {legacyAiEnabled && <Route path="chat" element={<ProtectedRoute allowedRoles={['ADMIN']}><Chat /></ProtectedRoute>} />}
      {legacyAiEnabled && <Route path="upload" element={<ProtectedRoute allowedRoles={['ADMIN']}><Upload /></ProtectedRoute>} />}
      {/* STUDENT only */}
      <Route
        path="student-dashboard"
        element={(
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        )}
      />
      {/* TEACHER only */}
      <Route
        path="teacher-dashboard"
        element={(
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <TeacherDashboard />
          </ProtectedRoute>
        )}
      />
      {/* PARENT only */}
      <Route
        path="parent-dashboard"
        element={(
          <ProtectedRoute allowedRoles={['PARENT']}>
            <ParentDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="profile-status"
        element={(
          <ProtectedRoute allowUnlinkedProfile>
            <ProfileStatus />
          </ProtectedRoute>
        )}
      />
      <Route path="unauthorized" element={<Unauthorized />} />
      <Route path="student-growth" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentLearningLog /></ProtectedRoute>} />
      <Route path="student-revisions" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentRevisions /></ProtectedRoute>} />
      <Route path="student-habits" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentHabits /></ProtectedRoute>} />
      <Route path="student-peer-learning" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentPeerLearning /></ProtectedRoute>} />
      {legacyAiEnabled && <Route path="finetuning" element={<ProtectedRoute allowedRoles={['ADMIN']}><FineTuning /></ProtectedRoute>} />}
      <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Admin /></ProtectedRoute>} />
    </Route>

    <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<p className="p-6 text-white">Loading EduMind…</p>}><AppRoutes /></Suspense>
    </AuthProvider>
  </BrowserRouter>
)

export default App
