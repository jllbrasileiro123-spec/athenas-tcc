import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GamificationProvider } from './contexts/GamificationContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { captureInstallPrompt } from './components/InstallAppBanner'
import { registerServiceWorker } from './lib/pwa'
import App from './App'
import './index.css'

captureInstallPrompt()
registerServiceWorker()

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <LanguageProvider>
        <AuthProvider>
          <GamificationProvider>
            <App />
          </GamificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
)
