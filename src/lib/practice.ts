import type { GameDirection, GameMode, ItemStats, Phrase, Word } from '@/db/schema'

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
  { label: 'Mixed (Both Directions)', value: 'MIXED' },
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
  // MIXED: each item independently rolls source->target or target->source,
  // so a single session interleaves both instead of picking one up front.
  const effectiveDirection =
    direction === 'MIXED'
      ? (Math.random() < 0.5 ? 'SOURCE_TO_TARGET' : 'TARGET_TO_SOURCE')
      : direction

  if (effectiveDirection === 'SOURCE_TO_TARGET') {
    return { id, kind, prompt: source, answers: translations }
  }
  // TARGET_TO_SOURCE: show a random known translation, expect the source term/phrase back.
  const prompt = translations[Math.floor(Math.random() * translations.length)]
  return { id, kind, prompt, answers: [source] }
}

/** A word or phrase flattened into the shape the pool builder works with. */
interface PoolCandidate {
  id: string
  kind: 'word' | 'phrase'
  source: string
  translations: string[]
  createdAt: number
  stats: ItemStats
}

export type PoolScope = 'ALL' | 'RECENT' | 'STRUGGLING'

export const SCOPE_OPTIONS: { label: string; value: PoolScope }[] = [
  { label: 'Entire library', value: 'ALL' },
  { label: 'Most recently added', value: 'RECENT' },
  { label: 'Most often wrong', value: 'STRUGGLING' },
]

export interface PoolSelection {
  scope: PoolScope
  /** How many entries to keep. Ignored when the scope is the whole library. */
  limit: number
}

export const WHOLE_LIBRARY: PoolSelection = { scope: 'ALL', limit: 0 }

/** True once an entry has been answered wrong at least once. */
function hasMistakes(stats: ItemStats): boolean {
  return stats.wrong > 0
}

/**
 * How many entries the "most often wrong" scope has to work with.
 *
 * Exposed so the configuration screen can say up front whether the scope has
 * anything to offer, rather than letting the user start and find out.
 */
export function countWithMistakes(words: Word[], phrases: Phrase[], mode: GameMode): number {
  const words_ = mode === 'PHRASES_ONLY' ? [] : words
  const phrases_ = mode === 'WORDS_ONLY' ? [] : phrases
  return (
    words_.filter((w) => hasMistakes(w.stats)).length +
    phrases_.filter((p) => hasMistakes(p.stats)).length
  )
}

/**
 * Keeps the `limit` most recently added candidates.
 *
 * Words and phrases compete on one timeline rather than being trimmed
 * separately — "the last 20 things I added" is what the count means, so in
 * Hybrid mode a burst of new phrases can legitimately crowd out older words.
 * Ties break on id so a session's contents never depend on input order.
 */
function takeMostRecent(candidates: PoolCandidate[], limit: number): PoolCandidate[] {
  return [...candidates]
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
    .slice(0, limit)
}

/** Share of attempts answered wrong, for entries that have been attempted. */
function wrongRate(stats: ItemStats): number {
  const attempts = stats.correct + stats.wrong
  return attempts === 0 ? 0 : stats.wrong / attempts
}

/**
 * Keeps the `limit` entries answered wrong most often.
 *
 * Ranked by the share of attempts missed rather than the raw miss count, so
 * an entry missed 3 of 3 times outranks one missed 5 of 50 — the second is
 * mostly known. Among equal rates the more-attempted entry wins, since it is
 * the better-evidenced weakness.
 *
 * Entries with a clean record are excluded outright: an entry never answered
 * wrong is not a weakness, and one never practised at all is unknown rather
 * than weak. That means the scope can legitimately come back empty.
 */
function takeWeakest(candidates: PoolCandidate[], limit: number): PoolCandidate[] {
  return candidates
    .filter((candidate) => hasMistakes(candidate.stats))
    .sort(
      (a, b) =>
        wrongRate(b.stats) - wrongRate(a.stats) ||
        b.stats.wrong - a.stats.wrong ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit)
}

/**
 * Builds the pool of practice items for a session.
 *
 * `selection` narrows the pool to the newest N entries or the N answered
 * wrong most often, or draws from the whole library. It applies *after* the
 * game mode filter, so asking for the last 20 in Words Only means the last 20
 * words rather than whatever words survive the last 20 entries overall. A
 * limit larger than the library is not an error — it simply selects
 * everything.
 */
export function buildPracticePool(
  words: Word[],
  phrases: Phrase[],
  mode: GameMode,
  direction: GameDirection,
  selection: PoolSelection = WHOLE_LIBRARY,
): PracticeItem[] {
  const candidates: PoolCandidate[] = []

  if (mode !== 'PHRASES_ONLY') {
    for (const word of words) {
      candidates.push({
        id: word.id,
        kind: 'word',
        source: word.term,
        translations: word.translations,
        createdAt: word.createdAt,
        stats: word.stats,
      })
    }
  }
  if (mode !== 'WORDS_ONLY') {
    for (const phrase of phrases) {
      candidates.push({
        id: phrase.id,
        kind: 'phrase',
        source: phrase.phrase,
        translations: phrase.translations,
        createdAt: phrase.createdAt,
        stats: phrase.stats,
      })
    }
  }

  const selected =
    selection.scope === 'RECENT'
      ? takeMostRecent(candidates, selection.limit)
      : selection.scope === 'STRUGGLING'
        ? takeWeakest(candidates, selection.limit)
        : candidates
  return selected.map((candidate) =>
    toPracticeItem(
      candidate.id,
      candidate.kind,
      candidate.source,
      candidate.translations,
      direction,
    ),
  )
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase()
}

export function isCorrectAnswer(value: string, answers: string[]): boolean {
  const normalized = normalizeAnswer(value)
  if (!normalized) return false
  return answers.some((answer) => normalizeAnswer(answer) === normalized)
}
