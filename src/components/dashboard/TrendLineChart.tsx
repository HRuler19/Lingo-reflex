import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'

interface TrendLineChartProps {
  data: TrendPoint[]
  dataKey: 'accuracy' | 'avgResponseMs'
  valueLabel: string
  formatValue: (value: number) => string
  yDomain?: [number, number]
  emptyLabel: string
}

const tooltipContentStyle: React.CSSProperties = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
}

const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }

export function TrendLineChart({
  data,
  dataKey,
  valueLabel,
  formatValue,
  yDomain,
  emptyLabel,
}: TrendLineChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState label={emptyLabel} />
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis domain={yDomain} tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [formatValue(Number(value)), valueLabel]}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="var(--chart-accent)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--chart-accent)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
