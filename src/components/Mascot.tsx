import { MASCOT_POSES, type MascotPose } from '@/assets/mascot'
import { cn } from '@/lib/utils'

interface MascotProps {
  pose?: MascotPose
  className?: string
}

/**
 * LexiPulse's mascot — a 21-pose character set (see src/assets/mascot),
 * one pose reserved per spot it appears in across the app rather than a
 * handful of moods reused everywhere.
 */
export function Mascot({ pose = 'armsCrossed', className }: MascotProps) {
  return (
    <img
      src={MASCOT_POSES[pose]}
      alt=""
      aria-hidden="true"
      className={cn('object-contain', className)}
    />
  )
}
