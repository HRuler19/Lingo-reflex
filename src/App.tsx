import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Route-level code splitting: Recharts (Dashboard) and the Practice Arena
// game engine are the heaviest pages, so keep them out of the initial bundle.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const AddWord = lazy(() => import('@/pages/AddWord').then((m) => ({ default: m.AddWord })))
const AddPhrase = lazy(() => import('@/pages/AddPhrase').then((m) => ({ default: m.AddPhrase })))
const PracticeArena = lazy(() =>
  import('@/pages/PracticeArena').then((m) => ({ default: m.PracticeArena })),
)
const Library = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Library })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))

function RouteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="add-word" element={<AddWord />} />
            <Route path="add-phrase" element={<AddPhrase />} />
            <Route path="practice" element={<PracticeArena />} />
            <Route path="library" element={<Library />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
