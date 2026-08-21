import { Mascot } from '@/components/Mascot'

interface ChartEmptyStateProps {
  label: string
  height?: number
}

export function ChartEmptyState({ label, height = 160 }: ChartEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
      style={{ height }}
    >
      <Mascot mood="sad" className="size-10 opacity-80" />
      {label}
    </div>
  )
}
