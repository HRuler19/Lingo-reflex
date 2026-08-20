import { useMemo } from 'react'
import type { DailyActivity } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'

// Bucket boundaries for the sequential color ramp: 0, 1, 2, 3-4, 5+ sessions/day.
const LEVEL_OPACITY = [0.08, 0.32, 0.55, 0.78, 1]

function levelFor(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

interface ActivityHeatmapProps {
  data: DailyActivity[]
}

/** GitHub-style consistency map: one column per week, one cell per day. */
export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    if (data.length === 0) return []
    const leadingBlanks = new Date(data[0].date).getDay() // 0 = Sunday
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
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                title={
                  day
                    ? `${day.date} — ${day.count} session${day.count === 1 ? '' : 's'}`
                    : undefined
                }
                className="size-3 rounded-sm"
                style={{
                  backgroundColor: day
                    ? `color-mix(in oklch, var(--chart-accent) ${Math.round(
                        LEVEL_OPACITY[levelFor(day.count)] * 100,
                      )}%, transparent)`
                    : 'transparent',
                  outline: day ? '1px solid var(--border)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {LEVEL_OPACITY.map((opacity) => (
          <div
            key={opacity}
            className="size-3 rounded-sm"
            style={{
              backgroundColor: `color-mix(in oklch, var(--chart-accent) ${Math.round(
                opacity * 100,
              )}%, transparent)`,
              outline: '1px solid var(--border)',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
