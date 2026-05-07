import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { checkAndResetIfNeeded } from './lib/dataVersion.js'

// React 렌더 전에 실행 — 버전이 다른 기기는 localStorage 초기화
checkAndResetIfNeeded()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
