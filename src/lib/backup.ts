import {
  db,
  newId,
  type GameDirection,
  type GameMode,
  type GameSession,
  type ItemStats,
  type LanguagePair,
  type Phrase,
  type Word,
} from '@/db/schema'
import { parseCsv, stripFormulaGuard, toCsv } from './csv'

export interface BackupData {
  languagePairs: LanguagePair[]
  words: Word[]
  phrases: Phrase[]
  sessions: GameSession[]
  exportedAt: number
}

/** What an import actually did, so the user is told rather than left guessing. */
export interface ImportSummary {
  /** Records written to the database. */
  imported: number
  /** Records rejected because they were not shaped like LexiPulse data. */
  skipped: number
}

export async function exportJson(): Promise<string> {
  const data: BackupData = {
    languagePairs: await db.languagePairs.toArray(),
    words: await db.words.toArray(),
    phrases: await db.phrases.toArray(),
    sessions: await db.sessions.toArray(),
    exportedAt: Date.now(),
  }
  return JSON.stringify(data, null, 2)
}

/*
 * Import validation.
 *
 * A backup file is untrusted input: it is whatever the user picked from disk,
 * possibly hand-edited, from a different app, or truncated mid-download.
 * Writing it in unchecked put every later read at risk, because nothing else
 * in the app re-checks the shape of what comes out of IndexedDB — a word
 * missing `stats` crashed the practice pool builder, and one whose
 * `translations` was not an array crashed the Library on render. A bad import
 * could therefore leave the app permanently broken, with no way back except
 * clearing the database.
 *
 * So each record is parsed rather than trusted: anything that does not match
 * is dropped and counted, and the parsers normalize while they are at it
 * (trimming text, discarding blank translations) so nothing downstream has to.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function asTimestamp(value: unknown): number {
  // A missing or nonsensical creation date is not worth discarding a word
  // over; "now" keeps it in the library and merely sorts it as newest.
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : Date.now()
}

function asStats(value: unknown): ItemStats | null {
  if (!isRecord(value)) return null
  const correct = asCount(value.correct)
  const wrong = asCount(value.wrong)
  return correct === null || wrong === null ? null : { correct, wrong }
}

/** At least one non-blank translation, since an entry with none can't be practised. */
function asTranslations(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const translations = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
  return translations.length === 0 ? null : Array.from(new Set(translations))
}

function parseLanguagePair(value: unknown): LanguagePair | null {
  if (!isRecord(value)) return null
  const id = asText(value.id)
  const sourceLanguage = asText(value.sourceLanguage)
  const targetLanguage = asText(value.targetLanguage)
  if (!id || !sourceLanguage || !targetLanguage) return null
  return { id, sourceLanguage, targetLanguage, createdAt: asTimestamp(value.createdAt) }
}

function parseWord(value: unknown): Word | null {
  if (!isRecord(value)) return null
  const id = asText(value.id)
  const pairId = asText(value.pairId)
  const term = asText(value.term)
  const translations = asTranslations(value.translations)
  const stats = asStats(value.stats)
  if (!id || !pairId || !term || !translations || !stats) return null
  return { id, pairId, term, translations, createdAt: asTimestamp(value.createdAt), stats }
}

function parsePhrase(value: unknown): Phrase | null {
  if (!isRecord(value)) return null
  const id = asText(value.id)
  const pairId = asText(value.pairId)
  const phrase = asText(value.phrase)
  const translations = asTranslations(value.translations)
  const stats = asStats(value.stats)
  if (!id || !pairId || !phrase || !translations || !stats) return null
  return { id, pairId, phrase, translations, createdAt: asTimestamp(value.createdAt), stats }
}

const GAME_MODES: GameMode[] = ['WORDS_ONLY', 'PHRASES_ONLY', 'HYBRID']
const GAME_DIRECTIONS: GameDirection[] = ['SOURCE_TO_TARGET', 'TARGET_TO_SOURCE', 'MIXED']

function parseSession(value: unknown): GameSession | null {
  if (!isRecord(value)) return null
  const id = asText(value.id)
  const pairId = asText(value.pairId)
  // Unlike a word, a session is an event at a point in time. Defaulting a
  // missing timestamp to "now" would date the whole import to today and
  // inflate the day streak and heatmap with practice that never happened, so
  // a session without a real one is dropped.
  const timestamp = asCount(value.timestamp)
  if (!id || !pairId || !timestamp) return null
  if (!GAME_MODES.includes(value.mode as GameMode)) return null
  if (!GAME_DIRECTIONS.includes(value.direction as GameDirection)) return null

  const numbers = {
    totalDurationSec: asCount(value.totalDurationSec),
    usedDurationSec: asCount(value.usedDurationSec),
    timePerItemSec: asCount(value.timePerItemSec),
    totalItems: asCount(value.totalItems),
    correctCount: asCount(value.correctCount),
    wrongCount: asCount(value.wrongCount),
    avgResponseTimeMs: asCount(value.avgResponseTimeMs),
  }
  if (Object.values(numbers).some((entry) => entry === null)) return null

  return {
    id,
    pairId,
    mode: value.mode as GameMode,
    direction: value.direction as GameDirection,
    ...(numbers as { [K in keyof typeof numbers]: number }),
    timestamp,
  }
}

/** Parses each element of what should be an array, counting what didn't survive. */
function parseAll<T>(value: unknown, parse: (entry: unknown) => T | null): [T[], number] {
  if (!Array.isArray(value)) return [[], value === undefined ? 0 : 1]
  const parsed: T[] = []
  let skipped = 0
  for (const entry of value) {
    const record = parse(entry)
    if (record) parsed.push(record)
    else skipped += 1
  }
  return [parsed, skipped]
}

/**
 * Restores a JSON backup, merging it over what is already stored.
 *
 * Records are matched by id, so re-importing the same backup is a no-op rather
 * than a way to end up with everything twice. Anything not shaped like
 * LexiPulse data is dropped and reported instead of being written.
 */
export async function importJson(text: string): Promise<ImportSummary> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isRecord(parsed)) {
    throw new Error('This file does not look like a LexiPulse backup.')
  }

  const [languagePairs, skippedPairs] = parseAll(parsed.languagePairs, parseLanguagePair)
  const [words, skippedWords] = parseAll(parsed.words, parseWord)
  const [phrases, skippedPhrases] = parseAll(parsed.phrases, parsePhrase)
  const [sessions, skippedSessions] = parseAll(parsed.sessions, parseSession)

  const imported =
    languagePairs.length + words.length + phrases.length + sessions.length
  const skipped = skippedPairs + skippedWords + skippedPhrases + skippedSessions

  if (imported === 0) {
    throw new Error('This file contains no LexiPulse data to import.')
  }

  await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
    if (languagePairs.length) await db.languagePairs.bulkPut(languagePairs)
    if (words.length) await db.words.bulkPut(words)
    if (phrases.length) await db.phrases.bulkPut(phrases)
    if (sessions.length) await db.sessions.bulkPut(sessions)
  })

  return { imported, skipped }
}

// A cell can only hold one string, so a word/phrase's translation list is
// packed into it delimited by "; ". A translation that itself contains a
// literal semicolon (plausible for a phrase, e.g. "wait; then go") would
// otherwise silently split into extra translations on export → reimport, so
// escape/unescape the delimiter rather than just joining/splitting on it raw.
export function encodeTranslations(translations: string[]): string {
  return translations.map((t) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;')).join('; ')
}

export function decodeTranslations(field: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < field.length; i++) {
    if (field[i] === '\\' && i + 1 < field.length) {
      current += field[i + 1]
      i += 1
    } else if (field[i] === ';') {
      parts.push(current)
      current = ''
    } else {
      current += field[i]
    }
  }
  parts.push(current)
  return parts.map((t) => t.trim()).filter(Boolean)
}

const CSV_HEADER = [
  'type',
  'sourceLanguage',
  'targetLanguage',
  'text',
  'translations',
  'correct',
  'wrong',
  'createdAt',
]

/**
 * Words and phrases (across every language pair) as a single flat CSV.
 * Language pairs are referenced by name rather than id, and game sessions
 * are omitted, so this format is meant for moving vocabulary between
 * devices/tools rather than a byte-for-byte backup — use the JSON export
 * for that.
 */
export async function exportCsv(): Promise<string> {
  const pairs = await db.languagePairs.toArray()
  const pairById = new Map(pairs.map((pair) => [pair.id, pair]))
  const words = await db.words.toArray()
  const phrases = await db.phrases.toArray()

  const rows: string[][] = [CSV_HEADER]

  for (const word of words) {
    const pair = pairById.get(word.pairId)
    if (!pair) continue
    rows.push([
      'word',
      pair.sourceLanguage,
      pair.targetLanguage,
      word.term,
      encodeTranslations(word.translations),
      String(word.stats.correct),
      String(word.stats.wrong),
      String(word.createdAt),
    ])
  }

  for (const phrase of phrases) {
    const pair = pairById.get(phrase.pairId)
    if (!pair) continue
    rows.push([
      'phrase',
      pair.sourceLanguage,
      pair.targetLanguage,
      phrase.phrase,
      encodeTranslations(phrase.translations),
      String(phrase.stats.correct),
      String(phrase.stats.wrong),
      String(phrase.createdAt),
    ])
  }

  return toCsv(rows)
}

/**
 * Imports words/phrases from a CSV export. Language pairs are matched (or
 * created) by source/target language name, and items are matched by exact
 * text within that pair — existing entries get their translations merged
 * and stats added rather than duplicated.
 */
export async function importCsv(text: string): Promise<ImportSummary> {
  const rows = parseCsv(text)
  if (rows.length === 0) return { imported: 0, skipped: 0 }

  const [header, ...dataRows] = rows
  const col = (name: string) => header.indexOf(name)
  const typeIdx = col('type')
  const sourceIdx = col('sourceLanguage')
  const targetIdx = col('targetLanguage')
  const textIdx = col('text')
  const translationsIdx = col('translations')
  const correctIdx = col('correct')
  const wrongIdx = col('wrong')
  const createdAtIdx = col('createdAt')

  if ([typeIdx, sourceIdx, targetIdx, textIdx, translationsIdx].some((i) => i === -1)) {
    throw new Error('This CSV file is missing required columns.')
  }

  let imported = 0
  let skipped = 0

  await db.transaction('rw', db.languagePairs, db.words, db.phrases, async () => {
    const pairIdByName = new Map<string, string>()
    for (const pair of await db.languagePairs.toArray()) {
      pairIdByName.set(`${pair.sourceLanguage}|${pair.targetLanguage}`, pair.id)
    }

    // Every free-text cell goes through stripFormulaGuard first: export adds a
    // leading quote to anything a spreadsheet would treat as a formula, and
    // reading it back without removing that is how the guard turned into
    // permanent corruption of the user's own vocabulary.
    for (const row of dataRows) {
      const type = row[typeIdx]?.trim().toLowerCase()
      const sourceLanguage = stripFormulaGuard(row[sourceIdx] ?? '').trim()
      const targetLanguage = stripFormulaGuard(row[targetIdx] ?? '').trim()
      const text = stripFormulaGuard(row[textIdx] ?? '').trim()
      if ((type !== 'word' && type !== 'phrase') || !sourceLanguage || !targetLanguage || !text) {
        skipped += 1
        continue
      }

      const translations = decodeTranslations(stripFormulaGuard(row[translationsIdx] ?? ''))
      if (translations.length === 0) {
        skipped += 1
        continue
      }
      imported += 1

      const correct = Number(row[correctIdx]) || 0
      const wrong = Number(row[wrongIdx]) || 0
      const createdAt = Number(row[createdAtIdx]) || Date.now()

      const cacheKey = `${sourceLanguage}|${targetLanguage}`
      let pairId = pairIdByName.get(cacheKey)
      if (!pairId) {
        pairId = newId('pair')
        await db.languagePairs.add({
          id: pairId,
          sourceLanguage,
          targetLanguage,
          createdAt: Date.now(),
        })
        pairIdByName.set(cacheKey, pairId)
      }

      if (type === 'word') {
        const existing = await db.words.where('[pairId+term]').equals([pairId, text]).first()
        if (existing) {
          await db.words.update(existing.id, {
            translations: Array.from(new Set([...existing.translations, ...translations])),
            stats: {
              correct: existing.stats.correct + correct,
              wrong: existing.stats.wrong + wrong,
            },
          })
        } else {
          await db.words.add({
            id: newId('w'),
            pairId,
            term: text,
            translations,
            createdAt,
            stats: { correct, wrong },
          })
        }
      } else {
        const existing = await db.phrases.where('[pairId+phrase]').equals([pairId, text]).first()
        if (existing) {
          await db.phrases.update(existing.id, {
            translations: Array.from(new Set([...existing.translations, ...translations])),
            stats: {
              correct: existing.stats.correct + correct,
              wrong: existing.stats.wrong + wrong,
            },
          })
        } else {
          await db.phrases.add({
            id: newId('p'),
            pairId,
            phrase: text,
            translations,
            createdAt,
            stats: { correct, wrong },
          })
        }
      }
    }
  })

  return { imported, skipped }
}

/** True inside the Tauri desktop shell, false on web/PWA/Capacitor. */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function browserDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Some browsers (Firefox in particular) only honor a click on an <a> with
  // `download` set if it's actually attached to the document.
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Saves generated text to a file the user chooses.
 *
 * The blob + `<a download>` trick works in a browser but is inert in the
 * desktop webview, which has no download manager to hand the blob to — the
 * click would silently do nothing. So the Tauri build goes through a real
 * native save dialog instead, and the plugin modules are imported lazily so
 * the web bundle never pulls them in.
 *
 * Returns false if the user cancelled the dialog, true otherwise.
 */
export async function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
): Promise<boolean> {
  if (!isTauri()) {
    browserDownload(content, filename, mimeType)
    return true
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])

  const extension = filename.split('.').pop() ?? 'txt'
  const path = await save({
    defaultPath: filename,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  })
  if (!path) return false

  await writeTextFile(path, content)
  return true
}
