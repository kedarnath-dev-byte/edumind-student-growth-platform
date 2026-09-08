/**
 * @file Dashboard.jsx
 * @description Main dashboard home page for EduMind AI.
 *              Shows student stats, recent activity, and quick actions.
 *              First page student sees after Gmail OAuth login.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

// ─── Stats Card Component ─────────────────────────────────────────────────────
const StatsCard = ({ icon, label, value, color }) => (
  <div className={`
    bg-gray-900 border border-gray-800 rounded-xl p-5
    flex items-center gap-4 hover:border-${color}-500
    transition-colors duration-200
  `}>
    <div className={`
      w-12 h-12 bg-${color}-500/10 rounded-lg
      flex items-center justify-center text-2xl
    `}>
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  </div>
)

// ─── Quick Action Card ────────────────────────────────────────────────────────
const ActionCard = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    className={`
      bg-gray-900 border border-gray-800 rounded-xl p-5
      hover:border-${color}-500 hover:bg-gray-800
      transition-all duration-200 text-left w-full
    `}
  >
    <span className="text-3xl">{icon}</span>
    <h3 className="text-white font-semibold mt-3">{title}</h3>
    <p className="text-gray-400 text-sm mt-1">{description}</p>
  </button>
)

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats] = useState({
    documents: "—",
    queries: "—",
    pipelines: 16,
    agents: 7,
  })

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.name || 'Student'} 👋
        </h1>
        <p className="text-gray-400 mt-1">
          Your AI-powered study companion is ready.
        </p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon="📄"
          label="Documents"
          value={stats.documents}
          color="blue"
        />
        <StatsCard
          icon="💬"
          label="Queries Made"
          value={stats.queries}
          color="green"
        />
        <StatsCard
          icon="🔀"
          label="RAG Pipelines"
          value={stats.pipelines}
          color="purple"
        />
        <StatsCard
          icon="🤖"
          label="AI Agents"
          value={stats.agents}
          color="orange"
        />
      </div>

      {/* ── Quick Actions ── */}
      <h2 className="text-xl font-semibold text-white mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ActionCard
          icon="🤖"
          title="Ask AI Tutor"
          description="Chat with your personalized AI tutor using RAG"
          onClick={() => navigate('/chat')}
          color="blue"
        />
        <ActionCard
          icon="📄"
          title="Upload Document"
          description="Upload PDF, DOCX, or TXT study materials"
          onClick={() => navigate('/upload')}
          color="green"
        />
        <ActionCard
          icon="⚙️"
          title="Fine-Tuning"
          description="Monitor and manage model fine-tuning jobs"
          onClick={() => navigate('/finetuning')}
          color="purple"
        />
      </div>

      {/* ── RAG Pipelines Banner ── */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20
        border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mb-2">
          🚀 16 RAG Pipelines Active
        </h2>
        <p className="text-gray-300 text-sm mb-4">
          Naive · HyDE · Fusion · Speculative · Sentence Window ·
          ReRank · Contextual · GraphRAG · and 8 more...
        </p>
        <button
          onClick={() => navigate('/chat')}
          className="bg-blue-600 hover:bg-blue-500 text-white
          text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Start Learning →
        </button>
      </div>

    </div>
  )
}

export default Dashboard