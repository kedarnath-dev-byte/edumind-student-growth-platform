/**
 * @file Chat.jsx
 * @description AI Tutor chat page for EduMind AI.
 *              Sends full conversation history to backend
 *              so AI personalizes responses per student.
 *              Chat history persists in localStorage.
 */
import { useState, useRef, useEffect } from 'react'
import ragService from '../services/ragService'

// ─── Single Message Bubble ────────────────────────────────────────────────────
const MessageBubble = ({ message }) => (
  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`
      max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed
      ${message.role === 'user'
        ? 'bg-blue-600 text-white rounded-br-sm'
        : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
      }
    `}>
      <p className={`text-xs font-semibold mb-1
        ${message.role === 'user' ? 'text-blue-200' : 'text-green-400'}`}>
        {message.role === 'user' ? '👤 You' : '🤖 EduMind AI'}
      </p>
      <p className="whitespace-pre-wrap">{message.content}</p>
    </div>
  </div>
)

// ─── Chat Page ────────────────────────────────────────────────────────────────
const Chat = () => {
  const [messages, setMessages] = useState(() => {
    // Load chat history from localStorage on first render
    try {
      const saved = localStorage.getItem('edumind_chat_history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const bottomRef                 = useRef(null)

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem('edumind_chat_history', JSON.stringify(messages))
    } catch { /* Ignore an unavailable local preference. */ }
  }, [messages])

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load uploaded documents on mount
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const result = await ragService.getDocuments()
        setDocuments(result?.documents || [])
      } catch { /* Ignore an unavailable local preference. */ }
    }
    loadDocs()
  }, [])

  // ─── Clear Chat ─────────────────────────────────────────────────────────────
  const handleClear = () => {
    setMessages([])
    localStorage.removeItem('edumind_chat_history')
  }

  // ─── Send Message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || loading) return
    setError(null)

    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Build history in format backend expects
      const history = updatedMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))

      // Call RAG with full history
      const result = await ragService.query(
        input,
        history,
        selectedDoc,
        null,  // user_id — will add after auth
        null   // session_id
      )

      const aiMessage = {
        role: 'assistant',
        content: result.answer || 'Sorry, I could not generate an answer.',
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">

      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🤖 AI Tutor</h1>
          <p className="text-gray-400 text-sm">
            Remembers your full conversation • Powered by Groq Llama-3
          </p>
        </div>
        <div className="flex gap-2">
          {/* Document selector */}
          <select
            value={selectedDoc || ''}
            onChange={(e) => setSelectedDoc(e.target.value || null)}
            className="bg-gray-800 border border-gray-700 text-white
              text-sm rounded-lg px-3 py-2 focus:outline-none
              focus:border-blue-500"
          >
            <option value="">All Documents</option>
            {documents.map(doc => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.document_id}
              </option>
            ))}
          </select>
          {/* Clear history button */}
          <button
            onClick={handleClear}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300
              text-sm px-3 py-2 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto bg-gray-900 rounded-xl
        border border-gray-800 p-4 mb-4 min-h-96">

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center
            justify-center text-center py-20">
            <span className="text-6xl mb-4">🧠</span>
            <h3 className="text-white font-semibold text-lg">
              Ask me anything!
            </h3>
            <p className="text-gray-400 text-sm mt-2 max-w-md">
              Upload your study materials and ask questions.
              I remember our full conversation to guide you personally.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 border border-gray-700
              px-4 py-3 rounded-2xl rounded-bl-sm">
              <p className="text-xs text-green-400 font-semibold mb-1">
                🤖 EduMind AI
              </p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30
            text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI tutor anything... (Enter to send)"
          rows={2}
          className="flex-1 bg-gray-900 border border-gray-800
            text-white placeholder-gray-500 rounded-xl px-4 py-3
            text-sm resize-none focus:outline-none focus:border-blue-500
            transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
            disabled:text-gray-500 text-white px-6 rounded-xl
            transition-colors font-medium text-sm"
        >
          {loading ? '...' : 'Send →'}
        </button>
      </div>

    </div>
  )
}

export default Chat