import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initializes translations before the first render (no flash of untranslated text)
import './i18n'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
