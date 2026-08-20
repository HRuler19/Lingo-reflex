import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildActivityHeatmapData,
  buildMasteryData,
  buildTrendData,
  filterSessionsByPeriod,
} from './analytics'
import type { GameSession, Phrase, Word } from '@/db/schema'

const DAY_MS = 24 * 60 * 60 * 1000

function session(overrides: Partial<GameSession>): GameSession {
  return {
    id: 's1',
    pairId: 'pair1',
    mode: 'HYBRID',
    direction: 'SOURCE_TO_TARGET',
    totalDurationSec: 300,
    usedDurationSec: 300,
    timePerItemSec: 10,
    totalItems: 10,
    correctCount: 8,
    wrongCount: 2,
    avgResponseTimeMs: 2000,
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('buildActivityHeatmapData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns exactly `days` entries ending today, oldest first', () => {
    const data = buildActivityHeatmapData([], 5)
    expect(data).toHaveLength(5)
    expect(data.map((d) => d.date)).toEqual([...data.map((d) => d.date)].sort())
    expect(data[data.length - 1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('fills days with no sessions as count 0', () => {
    const data = buildActivityHeatmapData([], 3)
    expect(data.every((d) => d.count === 0)).toBe(true)
  })

  it('counts multiple sessions on the same day', () => {
    const today = Date.now()
    const data = buildActivityHeatmapData(
      [session({ timestamp: today }), session({ timestamp: today + 1000 })],
      1,
    )
    expect(data[0].count).toBe(2)
  })
})

describe('buildTrendData', () => {
  it('sorts sessions chronologically', () => {
    const later = session({ timestamp: 2000, correctCount: 1, wrongCount: 0 })
    const earlier = session({ timestamp: 1000, correctCount: 0, wrongCount: 1 })
    const trend = buildTrendData([later, earlier])
    expect(trend.map((t) => t.accuracy)).toEqual([0, 100])
  })

  it('computes accuracy as a rounded percentage of correct attempts', () => {
    const [point] = buildTrendData([session({ correctCount: 1, wrongCount: 2 })])
    expect(point.accuracy).toBe(33)
  })

  it('reports 0% accuracy when there were no attempts', () => {
    const [point] = buildTrendData([session({ correctCount: 0, wrongCount: 0 })])
    expect(point.accuracy).toBe(0)
  })

  it('passes avgResponseTimeMs through unchanged', () => {
    const [point] = buildTrendData([session({ avgResponseTimeMs: 4321 })])
    expect(point.avgResponseMs).toBe(4321)
  })
})

describe('buildMasteryData', () => {
  it('sums correct/wrong stats separately for words and phrases', () => {
    const words: Word[] = [
      { id: 'w1', pairId: 'p', term: 'a', translations: ['x'], createdAt: 0, stats: { correct: 3, wrong: 1 } },
      { id: 'w2', pairId: 'p', term: 'b', translations: ['y'], createdAt: 0, stats: { correct: 2, wrong: 0 } },
    ]
    const phrases: Phrase[] = [
      { id: 'p1', pairId: 'p', phrase: 'a b', translations: ['x y'], createdAt: 0, stats: { correct: 1, wrong: 4 } },
    ]

    expect(buildMasteryData(words, phrases)).toEqual([
      { category: 'Words', correct: 5, wrong: 1 },
      { category: 'Phrases', correct: 1, wrong: 4 },
    ])
  })

  it('returns zeroed rows for empty input', () => {
    expect(buildMasteryData([], [])).toEqual([
      { category: 'Words', correct: 0, wrong: 0 },
      { category: 'Phrases', correct: 0, wrong: 0 },
    ])
  })
})

describe('filterSessionsByPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const now = () => Date.now()

  it('returns every session for All Time', () => {
    const sessions = [session({ timestamp: now() - 400 * DAY_MS })]
    expect(filterSessionsByPeriod(sessions, 'All Time')).toEqual(sessions)
  })

  it('excludes sessions older than the selected window', () => {
    const withinWeek = session({ id: 'a', timestamp: now() - 2 * DAY_MS })
    const beforeWeek = session({ id: 'b', timestamp: now() - 10 * DAY_MS })
    const result = filterSessionsByPeriod([withinWeek, beforeWeek], 'Week')
    expect(result.map((s) => s.id)).toEqual(['a'])
  })

  it('includes a session exactly at the window boundary', () => {
    const atBoundary = session({ timestamp: now() - DAY_MS })
    expect(filterSessionsByPeriod([atBoundary], 'Day')).toHaveLength(1)
  })
})
