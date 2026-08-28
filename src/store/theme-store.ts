import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from './persist-storage'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

function applyThemeClass(theme: Theme) {
  // Rehydration runs at import time, which for a non-DOM test environment is
  // before (and without) any document at all — the class is simply not
  // applicable there, rather than an error.
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Light is the "home" look: the flat, bright, high-contrast palette
      // this app is designed around reads best on a white surface, the way
      // Duolingo's own app does. Dark mode is a fully-supported option, just
      // not the first impression.
      theme: 'light',
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyThemeClass(next)
        set({ theme: next })
      },
      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme })
      },
    }),
    {
      name: 'lexipulse-theme',
      storage: createJSONStorage(safeLocalStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme)
      },
    },
  ),
)
