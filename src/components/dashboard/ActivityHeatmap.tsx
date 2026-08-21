import { useMemo } from 'react'
import { getWeekdayOfDateKey, type DailyActivity } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'

// Bucket boundaries for the sequential color ramp: 1, 2, 3-4, 5+ sessions/day.
// A day with zero sessions doesn't use this ramp at all — see CELL_EMPTY.
const LEVEL_OPACITY = [0.32, 0.55, 0.78, 1]

function levelFor(count: number): number {
  if (count <= 1) return 0
  if (count === 2) return 1
  if (count <= 4) return 2
  return 3
}

// Explicit pixel radius rather than a `rounded-*` utility: those are pulled
// from the theme's --radius scale (see index.css), which is tuned for cards
// and buttons, not 14px calendar cells — at this size it rounds the cell
// into a near-circle instead of the small-square GitHub look this wants.
const CELL_RADIUS = '3px'

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

  const hasActivity = data.some((d) => d.count > 0)
  if (!hasActivity) {
    return <ChartEmptyState label="No activity in the last 13 weeks" />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-0.75 overflow-x-auto pb-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.75">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                title={
                  day
                    ? `${day.date} — ${day.count} session${day.count === 1 ? '' : 's'}`
                    : undefined
                }
                className="size-3.5"
                style={{
                  borderRadius: CELL_RADIUS,
                  backgroundColor: !day
                    ? 'transparent'
                    : day.count > 0
                      ? `color-mix(in oklch, var(--chart-accent) ${Math.round(
                          LEVEL_OPACITY[levelFor(day.count)] * 100,
                        )}%, transparent)`
                      : 'var(--muted)',
                  outline: day ? '1px solid var(--border)' : 'none',
                  outlineOffset: '-1px',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        <div
          className="size-3.5"
          style={{ borderRadius: CELL_RADIUS, backgroundColor: 'var(--muted)', outline: '1px solid var(--border)', outlineOffset: '-1px' }}
        />
        {LEVEL_OPACITY.map((opacity) => (
          <div
            key={opacity}
            className="size-3.5"
            style={{
              borderRadius: CELL_RADIUS,
              backgroundColor: `color-mix(in oklch, var(--chart-accent) ${Math.round(opacity * 100)}%, transparent)`,
              outline: '1px solid var(--border)',
              outlineOffset: '-1px',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
