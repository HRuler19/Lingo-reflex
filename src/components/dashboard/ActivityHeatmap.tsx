import { useMemo } from 'react'
import { CalendarCheck, Flame, Zap } from 'lucide-react'
import { getWeekdayOfDateKey, toDateKey, type DailyActivity } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'

// Bucket boundaries for the sequential color ramp: 1, 2, 3-4, 5+ sessions/day.
// A day with zero sessions doesn't use this ramp at all — see CELL_EMPTY.
const LEVEL_OPACITY = [0.32, 0.55, 0.78, 1]

function getTodayKey(): string {
  return toDateKey(Date.now())
}

function levelFor(count: number): number {
  if (count <= 1) return 0
  if (count === 2) return 1
  if (count <= 4) return 2
  return 3
}

// Explicit pixel radius rather than a `rounded-*` utility: those are pulled
// from the theme's --radius scale (see index.css), which is tuned for cards
// and buttons, not calendar cells — at this size it rounds the cell into a
// near-circle instead of the small-square GitHub look this wants.
const CELL_RADIUS = '3px'
const CELL_CLASS = 'size-4'
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function cellStyle(count: number | undefined, isPadding: boolean, isToday = false): React.CSSProperties {
  return {
    borderRadius: CELL_RADIUS,
    backgroundColor: isPadding
      ? 'transparent'
      : count! > 0
        ? `color-mix(in oklch, var(--chart-accent) ${Math.round(LEVEL_OPACITY[levelFor(count!)] * 100)}%, transparent)`
        : 'var(--muted)',
    outline: isPadding ? 'none' : isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
    outlineOffset: isToday ? '-2px' : '-1px',
  }
}

interface ActivityHeatmapProps {
  data: DailyActivity[]
}

/** GitHub-style consistency map: one column per week, one cell per day. */
export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    if (data.length === 0) return []
    const leadingBlanks = getWeekdayOfDateKey(data[0].date) // 0 = Sunday
    const padded: (DailyActivity | null)[] = [...Array(leadingBlanks).fill(null), ...data]
    const cols: (DailyActivity | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7))
    }
    return cols
  }, [data])

  // One month label per column, only where a new month actually starts in
  // that column — mirrors GitHub's contribution graph instead of repeating
  // the same label 13 times.
  const monthLabels = useMemo(() => {
    let lastMonth = -1
    return weeks.map((week) => {
      const firstRealDay = week.find((d): d is DailyActivity => d !== null)
      if (!firstRealDay) return null
      const month = Number(firstRealDay.date.slice(5, 7)) - 1
      const dayOfMonth = Number(firstRealDay.date.slice(8, 10))
      if (month !== lastMonth && dayOfMonth <= 7) {
        lastMonth = month
        return MONTH_ABBR[month]
      }
      return null
    })
  }, [weeks])

  // Computed once per mount rather than inline at render time — Date.now()
  // is impure, and "today" doesn't need to update mid-session anyway.
  const todayKey = useMemo(() => getTodayKey(), [])

  const hasActivity = data.some((d) => d.count > 0)
  if (!hasActivity) {
    return <ChartEmptyState label="No activity in the last 13 weeks" pose="chinThink" />
  }

  const totalSessions = data.reduce((sum, d) => sum + d.count, 0)
  const activeDays = data.filter((d) => d.count > 0).length
  let bestStreak = 0
  let running = 0
  for (const d of data) {
    running = d.count > 0 ? running + 1 : 0
    bestStreak = Math.max(bestStreak, running)
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex pl-8">
          {weeks.map((_, weekIndex) => (
            <div key={weekIndex} className="w-5 text-xs text-muted-foreground">
              {monthLabels[weekIndex]}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col justify-between gap-1 pr-1 text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex h-4 items-center">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    title={
                      day
                        ? `${day.date}${day.date === todayKey ? ' (today)' : ''} — ${day.count} session${day.count === 1 ? '' : 's'}`
                        : undefined
                    }
                    className={CELL_CLASS}
                    style={cellStyle(day?.count, !day, day?.date === todayKey)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-8 text-xs text-muted-foreground">
          <span>Less</span>
          <div className={CELL_CLASS} style={cellStyle(0, false)} />
          {LEVEL_OPACITY.map((opacity, i) => (
            <div key={opacity} className={CELL_CLASS} style={cellStyle(i === 3 ? 5 : i === 2 ? 3 : i + 1, false)} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* grid, not flex: three equal columns that shrink together on a
          narrow viewport instead of overflowing the card horizontally. */}
      <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:auto-cols-max sm:grid-flow-col">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-border px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
            <Zap className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-lg leading-tight tabular-nums">{totalSessions}</span>
            <span className="truncate text-xs text-muted-foreground">Sessions</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-border px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 text-amber-500">
            <Flame className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-lg leading-tight tabular-nums">{bestStreak}</span>
            <span className="truncate text-xs text-muted-foreground">Best streak</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-border px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-info text-info">
            <CalendarCheck className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-lg leading-tight tabular-nums">{activeDays}</span>
            <span className="truncate text-xs text-muted-foreground">Active days</span>
          </div>
        </div>
      </div>
    </div>
  )
}
