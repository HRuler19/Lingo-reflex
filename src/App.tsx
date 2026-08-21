import { lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Route-level code splitting: Recharts (Dashboard) and the Practice Arena
// game engine are the heaviest pages, so keep them out of the initial bundle.
// The loading fallback for these lives inside AppLayout, wrapping only the
// routed content — not here — so a not-yet-fetched chunk doesn't blank out
// the sidebar/header along with the page.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const AddWord = lazy(() => import('@/pages/AddWord').then((m) => ({ default: m.AddWord })))
const AddPhrase = lazy(() => import('@/pages/AddPhrase').then((m) => ({ default: m.AddPhrase })))
const PracticeArena = lazy(() =>
  import('@/pages/PracticeArena').then((m) => ({ default: m.PracticeArena })),
)
const Library = lazy(() => import('@/pages/Library').then((m) => ({ default: m.Library })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))

function App() {
  return (
    // HashRouter, not BrowserRouter: the app now ships as a static SPA
    // across several hosts that can't all be given a server-side rewrite
    // rule — a Capacitor native shell, a packaged Electron app loading
    // dist/index.html over file://, and the PWA's offline service-worker
    // cache all need every route to resolve from the exact same on-disk
    // entry point. A hash route never asks the host to resolve "/practice"
    // as a real path in the first place, so it works identically everywhere
    // without per-host routing config.
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="add-word" element={<AddWord />} />
          <Route path="add-phrase" element={<AddPhrase />} />
          <Route path="practice" element={<PracticeArena />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
