const KEY = 'edumind_offline_learning_logs'
const DASH_KEY = 'edumind_last_dashboard'

export const readQueue = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const enqueueLearningLog = (payload) => {
  const next = [...readQueue(), { id: Date.now(), payload, createdAt: new Date().toISOString() }]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next.length
}

export const replaceQueue = (items) => {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export const cacheDashboard = (data) => {
  localStorage.setItem(DASH_KEY, JSON.stringify({ savedAt: Date.now(), data }))
}

export const readCachedDashboard = () => {
  try {
    const raw = localStorage.getItem(DASH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const flushLearningLogs = async (createFn) => {
  const items = readQueue()
  const kept = []
  for (const item of items) {
    try { await createFn(item.payload) } catch { kept.push(item) }
  }
  replaceQueue(kept)
  return { flushed: items.length - kept.length, remaining: kept.length }
}
