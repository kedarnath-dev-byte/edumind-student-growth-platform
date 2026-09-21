import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: vite-plugin-pwa injects the virtual module in production builds.
// Guarded import keeps local/dev safe if the plugin virtual module is absent.
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
    .catch(() => {
      // Fallback: register public/sw.js if present
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
    })
}
