import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthHomeRedirect from './auth/AuthHomeRedirect'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

import Admin from './pages/Admin'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import FineTuning from './pages/FineTuning'
import Login from './pages/Login'
import ParentDashboard from './pages/ParentDashboard'
import ProfileStatus from './pages/ProfileStatus'
import StudentDashboard from './pages/StudentDashboard'
import StudentHabits from './pages/StudentHabits'
import StudentLearningLog from './pages/StudentLearningLog'
import StudentPeerLearning from './pages/StudentPeerLearning'
import StudentRevisions from './pages/StudentRevisions'
import TeacherDashboard from './pages/TeacherDashboard'
import Unauthorized from './pages/Unauthorized'
import Upload from './pages/Upload'

import Layout from './components/layout/Layout'

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route path="/" element={<Layout />}>
      <Route index element={<AuthHomeRedirect />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="chat" element={<Chat />} />
      <Route path="upload" element={<Upload />} />
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
      <Route path="student-growth" element={<StudentLearningLog />} />
      <Route path="student-revisions" element={<StudentRevisions />} />
      <Route path="student-habits" element={<StudentHabits />} />
      <Route path="student-peer-learning" element={<StudentPeerLearning />} />
      <Route path="finetuning" element={<FineTuning />} />
      <Route path="admin" element={<Admin />} />
    </Route>

    <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
)

export default App
