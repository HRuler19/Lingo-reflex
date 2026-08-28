import { describe, expect, it } from 'vitest'
import { safeLocalStorage } from './persist-storage'
import { useLanguagePairStore } from './language-pair-store'
import { useThemeStore } from './theme-store'

describe('safeLocalStorage', () => {
  it('behaves like a store even where localStorage is unavailable', () => {
    // This file runs in the 'node' environment, which has no usable
    // localStorage — exactly the condition the fallback exists for.
    const storage = safeLocalStorage()
    expect(storage.getItem('absent')).toBeNull()

    storage.setItem('lexipulse-probe', 'value')
    expect(storage.getItem('lexipulse-probe')).toBe('value')

    storage.removeItem('lexipulse-probe')
    expect(storage.getItem('lexipulse-probe')).toBeNull()
  })

  it('resolves to the same storage every time, so stores agree on where state lives', () => {
    expect(safeLocalStorage()).toBe(safeLocalStorage())
  })
})

describe('persisted stores with no usable localStorage', () => {
  // The regression: zustand's default JSON storage guards only a *throwing*
  // localStorage getter. Where the global exists but is undefined — Node's
  // own `localStorage` without --localstorage-file, which the jsdom test
  // environment inherits — it built itself around that undefined value and
  // every write died on `undefined.setItem`, taking the app down before it
  // could render anything.
  it('accepts a write to the language pair store', () => {
    expect(() => useLanguagePairStore.setState({ selectedPairId: 'pair_test' })).not.toThrow()
    expect(useLanguagePairStore.getState().selectedPairId).toBe('pair_test')
    useLanguagePairStore.setState({ selectedPairId: null })
  })

  it('accepts a write to the theme store', () => {
    expect(() => useThemeStore.getState().setTheme('dark')).not.toThrow()
    expect(useThemeStore.getState().theme).toBe('dark')
    useThemeStore.getState().setTheme('light')
  })
})
