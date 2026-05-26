/**
 * @file App.jsx
 * @description Root component for EduMind AI frontend.
 *              Configures React Router with all page routes.
 *              Wraps entire app with AuthProvider for global auth state.
 *              Protected routes redirect to login if not authenticated.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// ─── Pages ───────────────────────────────────────────────────────────────────
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Chat       from './pages/Chat'
import Upload     from './pages/Upload'
import FineTuning from './pages/FineTuning'
import Admin      from './pages/Admin'
import StudentLearningLog from './pages/StudentLearningLog'

// ─── Layout ──────────────────────────────────────────────────────────────────
import Layout from './components/layout/Layout'

// ─── Protected Route ──────────────────────────────────────────────────────────
// Redirects to /login if user is not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🧠</span>
          <p className="text-gray-400 mt-4 text-sm">Loading EduMind AI...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ─── App Routes ───────────────────────────────────────────────────────────────
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes — all inside Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />}  />
        <Route path="chat"       element={<Chat />}       />
        <Route path="upload"     element={<Upload />}     />
        <Route path="student-growth" element={<StudentLearningLog />} />
        <Route path="finetuning" element={<FineTuning />} />
        <Route path="admin"      element={<Admin />}      />
      </Route>

      {/* Catch all — redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ─── Root App Component ───────────────────────────────────────────────────────
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
