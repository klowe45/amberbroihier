import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// A tab opened before a deploy still runs the old bundle, whose lazy chunks
// (Login, Admin, the editor) the deploy deleted. Reload into the new build
// instead of failing with "Failed to fetch dynamically imported module".
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
