import { db, newId, type GameSession, type LanguagePair, type Phrase, type Word } from '@/db/schema'
import { parseCsv, toCsv } from './csv'

export interface BackupData {
  languagePairs: LanguagePair[]
  words: Word[]
  phrases: Phrase[]
  sessions: GameSession[]
  exportedAt: number
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

export async function importJson(text: string): Promise<void> {
  const data = JSON.parse(text) as Partial<BackupData>
  await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
    if (data.languagePairs) await db.languagePairs.bulkPut(data.languagePairs)
    if (data.words) await db.words.bulkPut(data.words)
    if (data.phrases) await db.phrases.bulkPut(data.phrases)
    if (data.sessions) await db.sessions.bulkPut(data.sessions)
  })
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
export async function importCsv(text: string): Promise<void> {
  const rows = parseCsv(text)
  if (rows.length === 0) return

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

  await db.transaction('rw', db.languagePairs, db.words, db.phrases, async () => {
    const pairIdByName = new Map<string, string>()
    for (const pair of await db.languagePairs.toArray()) {
      pairIdByName.set(`${pair.sourceLanguage}|${pair.targetLanguage}`, pair.id)
    }

    for (const row of dataRows) {
      const type = row[typeIdx]?.trim().toLowerCase()
      const sourceLanguage = row[sourceIdx]?.trim()
      const targetLanguage = row[targetIdx]?.trim()
      const text = row[textIdx]?.trim()
      if ((type !== 'word' && type !== 'phrase') || !sourceLanguage || !targetLanguage || !text) {
        continue
      }

      const translations = decodeTranslations(row[translationsIdx] ?? '')
      if (translations.length === 0) continue

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
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
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
