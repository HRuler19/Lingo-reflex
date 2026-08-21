import talkTip from './01-talk-tip.webp'
import jumpCheer from './02-jump-cheer.webp'
import pointUpConfident from './03-point-up-confident.webp'
import faceplant from './04-faceplant.webp'
import scratchHead from './05-scratch-head.webp'
import pointUpEager from './06-point-up-eager.webp'
import chinThink from './07-chin-think.webp'
import explain from './08-explain.webp'
import reachUp from './09-reach-up.webp'
import trudge from './10-trudge.webp'
import leanWalk from './11-lean-walk.webp'
import hipLookUp from './12-hip-look-up.webp'
import cheerArmsUp from './13-cheer-arms-up.webp'
import fistPump from './14-fist-pump.webp'
import armsCrossed from './15-arms-crossed.webp'
import presentSide from './16-present-side.webp'
import hipPointSide from './17-hip-point-side.webp'
import runDash from './18-run-dash.webp'
import reachAttention from './19-reach-attention.webp'
import stride from './20-stride.webp'
import pointSideConfident from './21-point-side-confident.webp'

/**
 * The full 21-pose mascot set, cropped to content and re-encoded from the
 * ~10MB-each PNG-in-SVG originals down to ~10-18KB WebP cutouts apiece —
 * the source renders were 3000x3000 with a transparent backdrop, displayed
 * nowhere larger than ~150px, so nothing here trades visible quality for
 * the ~700x size cut.
 */
export const MASCOT_POSES = {
  talkTip,
  jumpCheer,
  pointUpConfident,
  faceplant,
  scratchHead,
  pointUpEager,
  chinThink,
  explain,
  reachUp,
  trudge,
  leanWalk,
  hipLookUp,
  cheerArmsUp,
  fistPump,
  armsCrossed,
  presentSide,
  hipPointSide,
  runDash,
  reachAttention,
  stride,
  pointSideConfident,
} as const

export type MascotPose = keyof typeof MASCOT_POSES
