import { useState } from 'react'
import type { MasteryDatum } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'
import { AXIS_LABEL_PROPS, niceTicks, useChartWidth } from './chart-math'
import { ChartDataTable, ChartTooltip } from './chart-parts'

interface MasteryChartProps {
  data: MasteryDatum[]
}

const HEIGHT = 200
/** Reserved for the legend row, which sits below the plot in normal flow. */
const LEGEND_HEIGHT = 22
const PLOT_HEIGHT = HEIGHT - LEGEND_HEIGHT
const PADDING = { top: 10, right: 14, bottom: 24, left: 38 }
const BAR_GAP = 4
/** Share of each category's slot taken by its bar pair; the rest is gutter. */
const GROUP_FILL = 0.55

const SERIES = [
  { key: 'correct', label: 'Correct', color: 'var(--success)' },
  { key: 'wrong', label: 'Wrong', color: 'var(--info)' },
] as const

interface HoveredBar {
  category: string
  label: string
  value: number
  x: number
  y: number
}

export function MasteryChart({ data }: MasteryChartProps) {
  const [containerRef, width] = useChartWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<HoveredBar | null>(null)

  const isEmpty = data.every((datum) => datum.correct === 0 && datum.wrong === 0)
  if (isEmpty) {
    return <ChartEmptyState label="No practice attempts yet" height={HEIGHT} pose="reachUp" />
  }

  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const innerHeight = PLOT_HEIGHT - PADDING.top - PADDING.bottom

  const ticks = niceTicks(Math.max(...data.flatMap((d) => [d.correct, d.wrong])))
  const domainMax = ticks[ticks.length - 1] || 1

  const slotWidth = data.length > 0 ? innerWidth / data.length : 0
  const groupWidth = slotWidth * GROUP_FILL
  const barWidth = Math.max(1, (groupWidth - BAR_GAP) / SERIES.length)

  const yAt = (value: number) => innerHeight - (value / domainMax) * innerHeight

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={PLOT_HEIGHT}
          role="img"
          aria-label="Correct and wrong attempts for words versus phrases"
        >
          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <text
                  {...AXIS_LABEL_PROPS}
                  x={-8}
                  y={yAt(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {tick}
                </text>
              </g>
            ))}

            {data.map((datum, categoryIndex) => {
              const slotCenter = slotWidth * (categoryIndex + 0.5)
              const groupLeft = slotCenter - groupWidth / 2

              return (
                <g key={datum.category}>
                  {SERIES.map((series, seriesIndex) => {
                    const value = datum[series.key]
                    const x = groupLeft + seriesIndex * (barWidth + BAR_GAP)
                    const y = yAt(value)
                    return (
                      <rect
                        key={series.key}
                        x={x}
                        y={y}
                        width={barWidth}
                        // A zero-height rect renders nothing at all, which
                        // reads as missing data rather than a real zero.
                        height={Math.max(0, innerHeight - y)}
                        rx={4}
                        fill={series.color}
                        opacity={hovered && hovered.category !== datum.category ? 0.55 : 1}
                        onPointerEnter={() =>
                          setHovered({
                            category: datum.category,
                            label: series.label,
                            value,
                            x: PADDING.left + x + barWidth / 2,
                            y: PADDING.top + y,
                          })
                        }
                        onPointerLeave={() => setHovered(null)}
                      />
                    )
                  })}
                  <text
                    {...AXIS_LABEL_PROPS}
                    x={slotCenter}
                    y={innerHeight + 16}
                    textAnchor="middle"
                  >
                    {datum.category}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {hovered && (
        <ChartTooltip x={hovered.x} y={hovered.y} containerWidth={width}>
          <span className="text-muted-foreground">
            {hovered.category} · {hovered.label}
          </span>{' '}
          <span className="font-medium tabular-nums">{hovered.value}</span>
        </ChartTooltip>
      )}

      <div
        className="pointer-events-none flex items-center justify-center gap-4 text-xs"
        style={{ height: LEGEND_HEIGHT }}
      >
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
            <span className="text-muted-foreground">{series.label}</span>
          </span>
        ))}
      </div>

      <ChartDataTable
        caption="Correct and wrong attempts for words versus phrases"
        columns={['Category', 'Correct', 'Wrong']}
        rows={data.map((datum) => [datum.category, datum.correct, datum.wrong])}
      />
    </div>
  )
}
