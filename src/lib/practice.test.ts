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
