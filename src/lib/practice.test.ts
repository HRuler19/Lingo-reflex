import { describe, expect, it } from 'vitest'
import { buildPracticePool, isCorrectAnswer, shuffle } from './practice'
import type { Phrase, Word } from '@/db/schema'

const word: Word = {
  id: 'w1',
  pairId: 'pair1',
  term: 'Relentless',
  translations: ['Yadawsyz', 'Amansyz'],
  createdAt: 0,
  stats: { correct: 0, wrong: 0 },
}

const phrase: Phrase = {
  id: 'p1',
  pairId: 'pair1',
  phrase: 'As far as I know',
  translations: ['Meň bilşime görä'],
  createdAt: 0,
  stats: { correct: 0, wrong: 0 },
}

describe('buildPracticePool', () => {
  it('includes only words for WORDS_ONLY', () => {
    const pool = buildPracticePool([word], [phrase], 'WORDS_ONLY', 'SOURCE_TO_TARGET')
    expect(pool).toHaveLength(1)
    expect(pool[0].kind).toBe('word')
  })

  it('includes only phrases for PHRASES_ONLY', () => {
    const pool = buildPracticePool([word], [phrase], 'PHRASES_ONLY', 'SOURCE_TO_TARGET')
    expect(pool).toHaveLength(1)
    expect(pool[0].kind).toBe('phrase')
  })

  it('includes both for HYBRID', () => {
    const pool = buildPracticePool([word], [phrase], 'HYBRID', 'SOURCE_TO_TARGET')
    expect(pool).toHaveLength(2)
  })

  it('prompts with the source term and accepts any translation for SOURCE_TO_TARGET', () => {
    const [item] = buildPracticePool([word], [], 'WORDS_ONLY', 'SOURCE_TO_TARGET')
    expect(item.prompt).toBe('Relentless')
    expect(item.answers).toEqual(['Yadawsyz', 'Amansyz'])
  })

  it('prompts with a translation and accepts only the source term for TARGET_TO_SOURCE', () => {
    const [item] = buildPracticePool([word], [], 'WORDS_ONLY', 'TARGET_TO_SOURCE')
    expect(item.answers).toEqual(['Relentless'])
    expect(word.translations).toContain(item.prompt)
  })

  it('produces both directions for MIXED across enough items', () => {
    const words = Array.from({ length: 40 }, (_, i) => ({ ...word, id: `w${i}` }))
    const pool = buildPracticePool(words, [], 'WORDS_ONLY', 'MIXED')
    const sourceToTarget = pool.filter((item) => item.prompt === word.term)
    const targetToSource = pool.filter((item) => item.answers[0] === word.term)
    // Each item is independently randomized, so with 40 items both
    // directions should show up — this isn't flaky in practice.
    expect(sourceToTarget.length).toBeGreaterThan(0)
    expect(targetToSource.length).toBeGreaterThan(0)
  })
})

describe('buildPracticePool with a recent-entries limit', () => {
  /** Words numbered oldest (w0) to newest, one day apart. */
  const timeline = Array.from({ length: 10 }, (_, i) => ({
    ...word,
    id: `w${i}`,
    term: `term${i}`,
    createdAt: i * 86_400_000,
  }))

  it('draws only from the newest N entries', () => {
    const pool = buildPracticePool(timeline, [], 'WORDS_ONLY', 'SOURCE_TO_TARGET', 3)
    expect(pool.map((item) => item.prompt).sort()).toEqual(['term7', 'term8', 'term9'])
  })

  it('takes everything when the limit exceeds the library', () => {
    // Asking for more than exists is a normal thing to do, not an error.
    const pool = buildPracticePool(timeline, [], 'WORDS_ONLY', 'SOURCE_TO_TARGET', 500)
    expect(pool).toHaveLength(10)
  })

  it('takes everything when there is no limit', () => {
    expect(buildPracticePool(timeline, [], 'WORDS_ONLY', 'SOURCE_TO_TARGET', null)).toHaveLength(10)
  })

  it('ranks words and phrases on one timeline', () => {
    // "The last 2 things I added" spans both tables, so a recent phrase
    // outranks an older word rather than each being trimmed separately.
    const oldWord = { ...word, id: 'w_old', term: 'old', createdAt: 1 }
    const newPhrase = { ...phrase, id: 'p_new', phrase: 'new phrase', createdAt: 100 }
    const newWord = { ...word, id: 'w_new', term: 'new', createdAt: 99 }

    const pool = buildPracticePool(
      [oldWord, newWord],
      [newPhrase],
      'HYBRID',
      'SOURCE_TO_TARGET',
      2,
    )
    expect(pool.map((item) => item.prompt).sort()).toEqual(['new', 'new phrase'])
  })

  it('applies the limit after the game type filter', () => {
    // Words Only + "last 2" means the last 2 words, not the words left over
    // from the last 2 entries overall.
    const phrases = Array.from({ length: 5 }, (_, i) => ({
      ...phrase,
      id: `p${i}`,
      phrase: `phrase${i}`,
      // Newer than every word, so they would swallow an unfiltered limit.
      createdAt: 999_000_000 + i,
    }))

    const pool = buildPracticePool(timeline, phrases, 'WORDS_ONLY', 'SOURCE_TO_TARGET', 2)
    expect(pool.map((item) => item.prompt).sort()).toEqual(['term8', 'term9'])
  })

  it('breaks ties on id so a session does not depend on input order', () => {
    const sameInstant = [
      { ...word, id: 'w_b', term: 'b', createdAt: 5 },
      { ...word, id: 'w_a', term: 'a', createdAt: 5 },
      { ...word, id: 'w_c', term: 'c', createdAt: 5 },
    ]
    const forwards = buildPracticePool(sameInstant, [], 'WORDS_ONLY', 'SOURCE_TO_TARGET', 2)
    const backwards = buildPracticePool(
      [...sameInstant].reverse(),
      [],
      'WORDS_ONLY',
      'SOURCE_TO_TARGET',
      2,
    )
    expect(forwards.map((i) => i.id)).toEqual(backwards.map((i) => i.id))
  })
})

describe('isCorrectAnswer', () => {
  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(isCorrectAnswer('  YadawSYZ  ', ['Yadawsyz'])).toBe(true)
  })

  it('matches any of several accepted answers', () => {
    expect(isCorrectAnswer('amansyz', ['Yadawsyz', 'Amansyz'])).toBe(true)
  })

  it('rejects a non-matching answer', () => {
    expect(isCorrectAnswer('wrong', ['Yadawsyz'])).toBe(false)
  })

  it('rejects an empty or whitespace-only answer', () => {
    expect(isCorrectAnswer('   ', ['Yadawsyz'])).toBe(false)
  })
})

describe('shuffle', () => {
  it('preserves length and the original elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input)
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })
})
