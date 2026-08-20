import type { GameSession, Phrase, Word } from '@/db/schema'

export type DashboardFilter = 'Day' | 'Week' | 'Month' | 'Year' | 'All Time'

const FILTER_WINDOW_MS: Record<Exclude<DashboardFilter, 'All Time'>, number> = {
  Day: 24 * 60 * 60 * 1000,
  Week: 7 * 24 * 60 * 60 * 1000,
  Month: 30 * 24 * 60 * 60 * 1000,
  Year: 365 * 24 * 60 * 60 * 1000,
}

/** Sessions within the trailing window for the selected Dashboard filter. */
export function filterSessionsByPeriod(
  sessions: GameSession[],
  filter: DashboardFilter,
): GameSession[] {
  if (filter === 'All Time') return sessions
  const cutoff = Date.now() - FILTER_WINDOW_MS[filter]
  return sessions.filter((session) => session.timestamp >= cutoff)
}

export interface DailyActivity {
  date: string // YYYY-MM-DD
  count: number
}

function toDateKey(timestampMs: number): string {
  const d = new Date(timestampMs)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** One entry per day for the trailing `days` window, oldest first, gaps filled with count 0. */
export function buildActivityHeatmapData(sessions: GameSession[], days = 91): DailyActivity[] {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    const key = toDateKey(session.timestamp)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const result: DailyActivity[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    const key = toDateKey(day.getTime())
    result.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return result
}

export interface TrendPoint {
  label: string
  accuracy: number
  avgResponseMs: number
}

/** One point per session, chronological, for the accuracy/speed trend charts. */
export function buildTrendData(sessions: GameSession[]): TrendPoint[] {
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp)
  return sorted.map((session) => {
    const total = session.correctCount + session.wrongCount
    return {
      label: new Date(session.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      accuracy: total ? Math.round((session.correctCount / total) * 100) : 0,
      avgResponseMs: session.avgResponseTimeMs,
    }
  })
}

export interface MasteryDatum {
  category: 'Words' | 'Phrases'
  correct: number
  wrong: number
}

function sumStats(items: { stats: { correct: number; wrong: number } }[]) {
  return items.reduce(
    (acc, item) => ({
      correct: acc.correct + item.stats.correct,
      wrong: acc.wrong + item.stats.wrong,
    }),
    { correct: 0, wrong: 0 },
  )
}

/** Aggregated correct/wrong attempt counts for words vs. phrases. */
export function buildMasteryData(words: Word[], phrases: Phrase[]): MasteryDatum[] {
  const wordStats = sumStats(words)
  const phraseStats = sumStats(phrases)
  return [
    { category: 'Words', ...wordStats },
    { category: 'Phrases', ...phraseStats },
  ]
}
