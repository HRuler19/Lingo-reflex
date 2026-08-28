import { beforeEach, describe, expect, it } from 'vitest'
import {
  decodeTranslations,
  encodeTranslations,
  exportCsv,
  exportJson,
  importCsv,
  importJson,
} from './backup'
import { db, type GameSession, type Word } from '@/db/schema'
import { resetDatabase, seedPair, seedWord } from '@/test/setup-db'

describe('encodeTranslations / decodeTranslations', () => {
  it('round-trips plain translations', () => {
    const translations = ['Yadawsyz', 'Amansyz']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('preserves a literal semicolon inside a translation (regression)', () => {
    // Previously encoded via `.join('; ')` and decoded via `.split(';')` with
    // no escaping, so this would come back as two translations instead of one.
    const translations = ['wait; then go']
    const encoded = encodeTranslations(translations)
    expect(decodeTranslations(encoded)).toEqual(translations)
  })

  it('preserves a literal backslash', () => {
    const translations = ['C:\\Users\\path']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('round-trips a mix of translations, some with semicolons and backslashes', () => {
    const translations = ['a; b', 'c\\d', 'plain', 'semi;colon\\and\\backslash']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('still splits plain unescaped semicolons the old export format used', () => {
    // Backward compatibility: a file exported before escaping existed has no
    // backslash sequences, so decoding it must behave like a plain split.
    expect(decodeTranslations('Yadawsyz; Amansyz')).toEqual(['Yadawsyz', 'Amansyz'])
  })
})

function backupSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 's_1',
    pairId: 'pair_test',
    mode: 'HYBRID',
    direction: 'MIXED',
    totalDurationSec: 300,
    usedDurationSec: 120,
    timePerItemSec: 10,
    totalItems: 5,
    correctCount: 4,
    wrongCount: 1,
    avgResponseTimeMs: 2000,
    timestamp: 1_700_000_000_000,
    ...overrides,
  }
}

function backupWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'w_1',
    pairId: 'pair_test',
    term: 'Relentless',
    translations: ['Yadawsyz'],
    createdAt: 1_700_000_000_000,
    stats: { correct: 0, wrong: 0 },
    ...overrides,
  }
}

describe('importJson', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('restores a backup this app produced', async () => {
    const pairId = await seedPair('English', 'Turkmen')
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const backup = await exportJson()

    await resetDatabase()
    const summary = await importJson(backup)

    expect(summary.skipped).toBe(0)
    expect(await db.languagePairs.count()).toBe(1)
    const [word] = await db.words.toArray()
    expect(word).toMatchObject({ term: 'Relentless', translations: ['Yadawsyz'] })
  })

  it('is idempotent — reimporting the same backup does not duplicate anything', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const backup = await exportJson()

    await importJson(backup)
    await importJson(backup)

    expect(await db.words.count()).toBe(1)
    expect(await db.languagePairs.count()).toBe(1)
  })

  /*
   * Everything below guards one regression: whatever JSON.parse returned used
   * to be written straight into IndexedDB. Nothing else in the app re-checks
   * the shape of what comes back out, so a single malformed record could
   * crash the Library on render or the practice pool builder on read — with
   * no way back except clearing the database.
   */

  it('rejects a file that is not JSON at all', async () => {
    await expect(importJson('not json{')).rejects.toThrow(/not valid JSON/i)
  })

  it('rejects JSON that is not an object', async () => {
    await expect(importJson('[1, 2, 3]')).rejects.toThrow(/does not look like/i)
  })

  it('rejects a file with no recognisable records instead of writing nothing quietly', async () => {
    await expect(importJson(JSON.stringify({ words: [] }))).rejects.toThrow(/no LexiPulse data/i)
  })

  it('drops a word with no stats rather than storing one that crashes the pool builder', async () => {
    const backup = {
      words: [backupWord(), { id: 'w_2', pairId: 'pair_test', term: 'Broken', translations: ['x'] }],
    }
    const summary = await importJson(JSON.stringify(backup))

    expect(summary).toEqual({ imported: 1, skipped: 1 })
    expect((await db.words.toArray()).map((w) => w.term)).toEqual(['Relentless'])
  })

  it('drops a word whose translations are not a list of strings', async () => {
    const backup = {
      words: [
        backupWord(),
        backupWord({ id: 'w_2', term: 'NotAnArray', translations: 'Yadawsyz' as never }),
        backupWord({ id: 'w_3', term: 'Empty', translations: [] }),
        backupWord({ id: 'w_4', term: 'Blanks', translations: ['   ', ''] }),
      ],
    }
    const summary = await importJson(JSON.stringify(backup))

    expect(summary).toEqual({ imported: 1, skipped: 3 })
    expect((await db.words.toArray()).map((w) => w.term)).toEqual(['Relentless'])
  })

  it('normalizes what it does accept, so nothing downstream has to', async () => {
    const backup = {
      words: [backupWord({ term: '  Relentless  ', translations: ['  Yadawsyz  ', 'Yadawsyz'] })],
    }
    await importJson(JSON.stringify(backup))

    const [word] = await db.words.toArray()
    expect(word.term).toBe('Relentless')
    // Trimmed, and the duplicate that trimming created was folded away.
    expect(word.translations).toEqual(['Yadawsyz'])
  })

  it('drops a session with an unknown mode or direction', async () => {
    const backup = {
      sessions: [
        backupSession(),
        backupSession({ id: 's_2', mode: 'SOMETHING_ELSE' as never }),
        backupSession({ id: 's_3', direction: 'BACKWARDS' as never }),
      ],
    }
    const summary = await importJson(JSON.stringify(backup))

    expect(summary).toEqual({ imported: 1, skipped: 2 })
    expect((await db.sessions.toArray()).map((s) => s.id)).toEqual(['s_1'])
  })

  it('drops a session with no usable timestamp rather than dating it today', async () => {
    // Defaulting it to "now" would date an imported history to today and
    // inflate the day streak and heatmap with practice that never happened.
    const backup = { sessions: [backupSession({ timestamp: undefined as never })] }
    await expect(importJson(JSON.stringify(backup))).rejects.toThrow(/no LexiPulse data/i)
    expect(await db.sessions.count()).toBe(0)
  })

  it('drops a session with negative or non-numeric counts', async () => {
    const backup = {
      sessions: [
        backupSession(),
        backupSession({ id: 's_2', correctCount: -5 }),
        backupSession({ id: 's_3', avgResponseTimeMs: 'fast' as never }),
      ],
    }
    const summary = await importJson(JSON.stringify(backup))
    expect(summary).toEqual({ imported: 1, skipped: 2 })
  })
})

describe('CSV export -> import round trip', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('returns spreadsheet-guarded text exactly as it was (regression)', async () => {
    // Export prefixes anything a spreadsheet would evaluate with a quote.
    // Import used to keep that quote, so a phrase like "- so what" came back
    // as "'- so what" and gained another quote on every further round trip.
    const pairId = await seedPair('English', 'Turkmen')
    await db.phrases.add({
      id: 'p_1',
      pairId,
      phrase: '- so what',
      translations: ['=nämä görä', "'tis"],
      createdAt: 1_700_000_000_000,
      stats: { correct: 0, wrong: 0 },
    })

    const csv = await exportCsv()
    await resetDatabase()
    await importCsv(csv)

    const [phrase] = await db.phrases.toArray()
    expect(phrase.phrase).toBe('- so what')
    expect(phrase.translations).toEqual(['=nämä görä', "'tis"])
  })

  it('counts the rows it could not read', async () => {
    const csv = [
      'type,sourceLanguage,targetLanguage,text,translations,correct,wrong,createdAt',
      'word,English,Turkmen,Water,Suw,0,0,0',
      'word,English,Turkmen,NoTranslations,,0,0,0',
      'sandwich,English,Turkmen,WrongType,Suw,0,0,0',
    ].join('\r\n')

    expect(await importCsv(csv)).toEqual({ imported: 1, skipped: 2 })
  })
})
