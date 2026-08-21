import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MasteryDatum } from '@/lib/analytics'
import { ChartEmptyState } from './ChartEmptyState'
import { axisTick, tooltipContentStyle } from './chart-style'

interface MasteryChartProps {
  data: MasteryDatum[]
}

export function MasteryChart({ data }: MasteryChartProps) {
  const isEmpty = data.every((d) => d.correct === 0 && d.wrong === 0)
  if (isEmpty) {
    return <ChartEmptyState label="No practice attempts yet" height={200} pose="reachUp" />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="category" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipContentStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="correct" name="Correct" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="wrong" name="Wrong" fill="var(--info)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
