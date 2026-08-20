interface ChartEmptyStateProps {
  label: string
  height?: number
}

export function ChartEmptyState({ label, height = 160 }: ChartEmptyStateProps) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {label}
    </div>
  )
}
