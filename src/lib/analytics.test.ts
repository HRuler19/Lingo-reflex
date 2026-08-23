/// <reference types="node" />
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildActivityHeatmapData,
  buildMasteryData,
  buildTrendData,
  filterSessionsByPeriod,
  getWeekdayOfDateKey,
  computeDayStreak,
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

describe('getWeekdayOfDateKey', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('is stable across timezones on both sides of UTC (regression: date-only strings parse as UTC)', () => {
    // 2026-01-10 is a Saturday. `new Date("2026-01-10").getDay()` gives the
    // wrong answer west of UTC because the bare string parses as UTC
    // midnight, which is still Friday evening in e.g. America/New_York.
    for (const tz of ['UTC', 'America/New_York', 'Pacific/Kiritimati', 'Asia/Tokyo']) {
      process.env.TZ = tz
      expect(getWeekdayOfDateKey('2026-01-10')).toBe(6) // Saturday
    }
  })

  it('matches a known Sunday and a known Monday', () => {
    process.env.TZ = 'UTC'
    expect(getWeekdayOfDateKey('2026-01-11')).toBe(0) // Sunday
    expect(getWeekdayOfDateKey('2026-01-12')).toBe(1) // Monday
  })
})


describe('computeDayStreak', () => {
  const DAY = 24 * 60 * 60 * 1000

  /** A timestamp `daysAgo` days back, at midday to stay clear of DST edges. */
  function daysAgo(n: number): { timestamp: number } {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return { timestamp: d.getTime() - n * DAY }
  }

  it('is zero with no sessions at all', () => {
    expect(computeDayStreak([])).toBe(0)
  })

  it('counts a session today', () => {
    expect(computeDayStreak([daysAgo(0)])).toBe(1)
  })

  it('still counts when today has no session but yesterday does', () => {
    // The grace day: a streak shouldn't read as broken just because the user
    // hasn't practised yet today.
    expect(computeDayStreak([daysAgo(1)])).toBe(1)
  })

  it('is broken once a whole day has been missed', () => {
    expect(computeDayStreak([daysAgo(2)])).toBe(0)
  })

  it('counts a run of consecutive days', () => {
    expect(computeDayStreak([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(4)
  })

  it('counts a consecutive run that ends yesterday', () => {
    expect(computeDayStreak([daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(3)
  })

  it('stops at the first gap rather than counting every active day', () => {
    // Active on 0,1,3,4 — the streak is 2, not 4.
    expect(computeDayStreak([daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)])).toBe(2)
  })

  it('counts a day once however many sessions it holds', () => {
    expect(computeDayStreak([daysAgo(0), daysAgo(0), daysAgo(0), daysAgo(1)])).toBe(2)
  })

  it('is unaffected by the order sessions arrive in', () => {
    const shuffled = [daysAgo(2), daysAgo(0), daysAgo(3), daysAgo(1)]
    expect(computeDayStreak(shuffled)).toBe(4)
  })

  it('ignores sessions dated in the future rather than counting them', () => {
    // Clock skew or an edited import shouldn't inflate the streak.
    expect(computeDayStreak([daysAgo(-3), daysAgo(0)])).toBe(1)
  })
})
