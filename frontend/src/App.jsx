import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'

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
import Upload from './pages/Upload'

import Layout from './components/layout/Layout'

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route path="/" element={<Layout />}>
      <Route index element={<Navigate to="/student-dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="chat" element={<Chat />} />
      <Route path="upload" element={<Upload />} />
      <Route path="student-dashboard" element={<StudentDashboard />} />
      <Route path="teacher-dashboard" element={<TeacherDashboard />} />
      <Route path="parent-dashboard" element={<ParentDashboard />} />
      <Route path="profile-status" element={<ProfileStatus />} />
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
