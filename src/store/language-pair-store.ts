import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from './persist-storage'

interface LanguagePairState {
  selectedPairId: string | null
  selectPair: (pairId: string | null) => void
}

/** Tracks which Language Pair is globally active across the whole app (Header selector). */
export const useLanguagePairStore = create<LanguagePairState>()(
  persist(
    (set) => ({
      selectedPairId: null,
      selectPair: (pairId) => set({ selectedPairId: pairId }),
    }),
    { name: 'lexipulse-selected-pair', storage: createJSONStorage(safeLocalStorage) },
  ),
)
