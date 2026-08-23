import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { useToastStore } from '@/store/toast-store'

/**
 * Test support for anything that touches the database.
 *
 * Deliberately runs the real Dexie schema against an in-memory IndexedDB
 * (`fake-indexeddb`) rather than mocking Dexie. Mocking the database would
 * make these tests assert that the component called a stub, which proves
 * nothing about whether the query, the compound index, or the transaction is
 * actually right — the exact things most likely to break.
 */

/** Wipes every table and resets global stores, so tests can't leak into each other. */
export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
    await Promise.all([
      db.languagePairs.clear(),
      db.words.clear(),
      db.phrases.clear(),
      db.sessions.clear(),
    ])
  })
  useLanguagePairStore.setState({ selectedPairId: null })
  useToastStore.setState({ toasts: [] })
}

/** Creates a language pair and makes it the active one, as the header would. */
export async function seedPair(
  sourceLanguage = 'English',
  targetLanguage = 'Turkmen',
): Promise<string> {
  const id = 'pair_test'
  await db.languagePairs.add({ id, sourceLanguage, targetLanguage, createdAt: Date.now() })
  useLanguagePairStore.setState({ selectedPairId: id })
  return id
}

export async function seedWord(pairId: string, term: string, translations: string[]) {
  await db.words.add({
    id: `w_${term}`,
    pairId,
    term,
    translations,
    createdAt: Date.now(),
    stats: { correct: 0, wrong: 0 },
  })
}

export async function seedPhrase(pairId: string, phrase: string, translations: string[]) {
  await db.phrases.add({
    id: `p_${phrase.slice(0, 12)}`,
    pairId,
    phrase,
    translations,
    createdAt: Date.now(),
    stats: { correct: 0, wrong: 0 },
  })
}
