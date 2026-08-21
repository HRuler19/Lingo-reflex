import Dexie, { type EntityTable } from 'dexie'

/** A source -> target language pairing the user practices, e.g. English -> Turkmen. */
export interface LanguagePair {
  id: string
  sourceLanguage: string
  targetLanguage: string
  createdAt: number
}

export interface ItemStats {
  correct: number
  wrong: number
}

export interface Word {
  id: string
  pairId: string
  term: string
  translations: string[]
  createdAt: number
  stats: ItemStats
}

export interface Phrase {
  id: string
  pairId: string
  phrase: string
  translations: string[]
  createdAt: number
  stats: ItemStats
}

export type GameMode = 'WORDS_ONLY' | 'PHRASES_ONLY' | 'HYBRID'
export type GameDirection = 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE' | 'MIXED'

export interface GameSession {
  id: string
  pairId: string
  mode: GameMode
  direction: GameDirection
  totalDurationSec: number
  usedDurationSec: number
  timePerItemSec: number
  totalItems: number
  correctCount: number
  wrongCount: number
  avgResponseTimeMs: number
  timestamp: number
}

export const db = new Dexie('LexiPulseDB') as Dexie & {
  languagePairs: EntityTable<LanguagePair, 'id'>
  words: EntityTable<Word, 'id'>
  phrases: EntityTable<Phrase, 'id'>
  sessions: EntityTable<GameSession, 'id'>
}

db.version(1).stores({
  languagePairs: 'id, createdAt',
  words: 'id, pairId, term, createdAt, [pairId+term]',
  phrases: 'id, pairId, phrase, createdAt, [pairId+phrase]',
  sessions: 'id, pairId, timestamp',
})

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
