import { useId, useState } from 'react'
import type { TrendPoint } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'
import {
  AXIS_LABEL_PROPS,
  labelStride,
  niceTicks,
  smoothLinePath,
  useChartWidth,
  type ChartPoint,
} from './chart-math'
import { ChartDataTable, ChartTooltip } from './chart-parts'

interface TrendLineChartProps {
  data: TrendPoint[]
  dataKey: 'accuracy' | 'avgResponseMs'
  valueLabel: string
  formatValue: (value: number) => string
  yDomain?: [number, number]
  emptyLabel: string
  /**
   * Hides the x-axis labels — for a chart stacked above another one that
   * shares the same categories, so the dates aren't printed twice.
   */
  hideXAxisLabels?: boolean
}

const PADDING = { top: 10, right: 14, left: 42 }
const BOTTOM_WITH_LABELS = 24
const BOTTOM_WITHOUT_LABELS = 8

export function TrendLineChart({
  data,
  dataKey,
  valueLabel,
  formatValue,
  yDomain,
  emptyLabel,
  hideXAxisLabels = false,
}: TrendLineChartProps) {
  const [containerRef, width] = useChartWidth<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // Gradient ids must be unique per instance: two charts on one page sharing
  // an id would make one silently adopt the other's fill.
  const gradientId = useId()

  const height = hideXAxisLabels ? 150 : 168
  const bottom = hideXAxisLabels ? BOTTOM_WITHOUT_LABELS : BOTTOM_WITH_LABELS
  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const innerHeight = height - PADDING.top - bottom

  if (data.length === 0) {
    return <ChartEmptyState label={emptyLabel} pose={dataKey === 'accuracy' ? 'explain' : 'talkTip'} />
  }

  const values = data.map((point) => point[dataKey])
  const ticks = yDomain ? [0, 25, 50, 75, 100] : niceTicks(Math.max(...values))
  const domainMax = ticks[ticks.length - 1] || 1

  const xAt = (index: number) =>
    data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth
  const yAt = (value: number) => innerHeight - (value / domainMax) * innerHeight

  const points: ChartPoint[] = data.map((point, index) => ({
    x: xAt(index),
    y: yAt(point[dataKey]),
  }))
  const linePath = smoothLinePath(points)
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${innerHeight} L ${points[0].x} ${innerHeight} Z`
    : ''

  const stride = labelStride(data.length, innerWidth)
  const hovered = hoverIndex === null ? null : data[hoverIndex]

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (innerWidth <= 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const localX = event.clientX - bounds.left - PADDING.left
    const ratio = data.length === 1 ? 0 : localX / innerWidth
    const index = Math.round(ratio * (data.length - 1))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)))
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {/* width is 0 until the ResizeObserver reports the first measurement */}
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${valueLabel} over ${data.length} session${data.length === 1 ? '' : 's'}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

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

            {!hideXAxisLabels &&
              data.map((point, index) =>
                index % stride === 0 ? (
                  <text
                    {...AXIS_LABEL_PROPS}
                    key={index}
                    x={xAt(index)}
                    y={innerHeight + 16}
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                ) : null,
              )}

            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--chart-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={hoverIndex === index ? 5 : 3}
                fill="var(--chart-accent)"
              />
            ))}

            {hoverIndex !== null && (
              <line
                x1={points[hoverIndex].x}
                x2={points[hoverIndex].x}
                y1={0}
                y2={innerHeight}
                stroke="var(--chart-accent)"
                strokeOpacity={0.35}
              />
            )}
          </g>
        </svg>
      )}

      {hovered && hoverIndex !== null && (
        <ChartTooltip
          x={PADDING.left + points[hoverIndex].x}
          y={PADDING.top + points[hoverIndex].y}
          containerWidth={width}
        >
          <span className="text-muted-foreground">{hovered.label}</span>{' '}
          <span className="font-medium">{formatValue(hovered[dataKey])}</span>
        </ChartTooltip>
      )}

      <ChartDataTable
        caption={`${valueLabel} per session`}
        columns={['Session', valueLabel]}
        rows={data.map((point) => [point.label, formatValue(point[dataKey])])}
      />
    </div>
  )
}
