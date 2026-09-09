import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './providers/AuthProvider.tsx'
import { AuthGate } from './features/auth/AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode><AuthProvider><AuthGate><BrowserRouter><App /></BrowserRouter></AuthGate></AuthProvider></StrictMode>,
)
