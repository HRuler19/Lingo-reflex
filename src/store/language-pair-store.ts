import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    { name: 'lexipulse-selected-pair' },
  ),
)
