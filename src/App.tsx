import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { AddWord } from '@/pages/AddWord'
import { AddPhrase } from '@/pages/AddPhrase'
import { PracticeArena } from '@/pages/PracticeArena'
import { Library } from '@/pages/Library'
import { Settings } from '@/pages/Settings'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
