import { MASCOT_POSES, type MascotPose } from '@/assets/mascot'
import { cn } from '@/lib/utils'

interface MascotProps {
  pose?: MascotPose
  className?: string
  /**
   * Load immediately instead of on approach. Reserved for the persistent
   * chrome — anything that is on screen the moment the app paints and would
   * visibly pop in if it waited its turn.
   */
  priority?: boolean
}

/**
 * LexiPulse's mascot — a 21-pose character set (see src/assets/mascot),
 * one pose reserved per spot it appears in across the app rather than a
 * handful of moods reused everywhere.
 *
 * Every pose is decorative, so it is hidden from assistive technology; the
 * surrounding copy always carries the meaning.
 */
export function Mascot({ pose = 'armsCrossed', className, priority = false }: MascotProps) {
  const { src, width, height } = MASCOT_POSES[pose]

  return (
    <img
      src={src}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      // Most mascots sit in empty states well below the fold — deferring them
      // keeps a cold page load to the handful actually in view.
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('object-contain', className)}
    />
  )
}
