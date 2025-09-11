import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize Microsoft Clarity
const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID || 't5jmqu5mb4'
if (typeof window !== 'undefined' && clarityProjectId) {
  // Use dynamic import for Clarity to avoid build issues
  import('@microsoft/clarity').then((module) => {
    const clarity = module.default || module
    if (clarity && typeof clarity.init === 'function') {
      clarity.init(clarityProjectId)
    } else {
    }
  }).catch((error) => {
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
