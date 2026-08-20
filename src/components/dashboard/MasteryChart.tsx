import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MasteryDatum } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'

interface MasteryChartProps {
  data: MasteryDatum[]
}

const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }

export function MasteryChart({ data }: MasteryChartProps) {
  const isEmpty = data.every((d) => d.correct === 0 && d.wrong === 0)
  if (isEmpty) {
    return <ChartEmptyState label="No practice attempts yet" height={200} />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="category" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="correct" name="Correct" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="wrong" name="Wrong" fill="var(--info)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
