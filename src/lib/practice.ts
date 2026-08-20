import type { GameDirection, GameMode, Phrase, Word } from '@/db/schema'

export interface PracticeItem {
  id: string
  kind: 'word' | 'phrase'
  prompt: string
  answers: string[]
}

export const DURATION_OPTIONS = [
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
] as const

export const PER_ITEM_OPTIONS = [
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '20s', seconds: 20 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
] as const

export const GAME_MODE_OPTIONS: { label: string; value: GameMode }[] = [
  { label: 'Words Only', value: 'WORDS_ONLY' },
  { label: 'Phrases Only', value: 'PHRASES_ONLY' },
  { label: 'Hybrid (Words + Phrases)', value: 'HYBRID' },
]

export const DIRECTION_OPTIONS: { label: string; value: GameDirection }[] = [
  { label: 'Source → Target', value: 'SOURCE_TO_TARGET' },
  { label: 'Target → Source', value: 'TARGET_TO_SOURCE' },
]

/** Fisher-Yates shuffle. Returns a new array, does not mutate the input. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function toPracticeItem(
  id: string,
  kind: 'word' | 'phrase',
  source: string,
  translations: string[],
  direction: GameDirection,
): PracticeItem {
  if (direction === 'SOURCE_TO_TARGET') {
    return { id, kind, prompt: source, answers: translations }
  }
  // TARGET_TO_SOURCE: show a random known translation, expect the source term/phrase back.
  const prompt = translations[Math.floor(Math.random() * translations.length)]
  return { id, kind, prompt, answers: [source] }
}

/** Builds the pool of practice items for a session, respecting the selected game mode. */
export function buildPracticePool(
  words: Word[],
  phrases: Phrase[],
  mode: GameMode,
  direction: GameDirection,
): PracticeItem[] {
  const items: PracticeItem[] = []

  if (mode !== 'PHRASES_ONLY') {
    for (const word of words) {
      items.push(toPracticeItem(word.id, 'word', word.term, word.translations, direction))
    }
  }
  if (mode !== 'WORDS_ONLY') {
    for (const phrase of phrases) {
      items.push(toPracticeItem(phrase.id, 'phrase', phrase.phrase, phrase.translations, direction))
    }
  }
  return items
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase()
}

export function isCorrectAnswer(value: string, answers: string[]): boolean {
  const normalized = normalizeAnswer(value)
  if (!normalized) return false
  return answers.some((answer) => normalizeAnswer(answer) === normalized)
}
