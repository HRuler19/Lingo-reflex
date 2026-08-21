import { Mascot } from '@/components/Mascot'
import type { MascotPose } from '@/assets/mascot'

interface ChartEmptyStateProps {
  label: string
  height?: number
  pose?: MascotPose
}

export function ChartEmptyState({ label, height = 160, pose = 'chinThink' }: ChartEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
      style={{ height }}
    >
      <Mascot pose={pose} className="h-14 w-auto opacity-90" />
      {label}
    </div>
  )
}
