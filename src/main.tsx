import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary scope="LexiPulse">
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>,
)
