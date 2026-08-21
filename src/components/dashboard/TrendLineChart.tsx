import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'
import { axisTick, tooltipContentStyle } from './chart-style'

interface TrendLineChartProps {
  data: TrendPoint[]
  dataKey: 'accuracy' | 'avgResponseMs'
  valueLabel: string
  formatValue: (value: number) => string
  yDomain?: [number, number]
  emptyLabel: string
  /** Hides the x-axis labels — for a chart stacked above another one that
   *  shares the same categories, so the dates aren't printed twice. */
  hideXAxisLabels?: boolean
}

export function TrendLineChart({
  data,
  dataKey,
  valueLabel,
  formatValue,
  yDomain,
  emptyLabel,
  hideXAxisLabels = false,
}: TrendLineChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState label={emptyLabel} pose={dataKey === 'accuracy' ? 'explain' : 'talkTip'} />
  }

  // Distinct gradient id per metric — two <AreaChart>s on the same page
  // would otherwise collide on the SVG def id and one chart's fill would
  // silently win for both.
  const gradientId = `trend-fill-${dataKey}`

  return (
    <ResponsiveContainer width="100%" height={hideXAxisLabels ? 150 : 168}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={hideXAxisLabels ? false : axisTick}
          tickLine={false}
          axisLine={false}
          height={hideXAxisLabels ? 4 : undefined}
        />
        <YAxis domain={yDomain} tick={axisTick} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [formatValue(Number(value)), valueLabel]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="var(--chart-accent)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: 'var(--chart-accent)' }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
