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

export interface MascotAsset {
  src: string
  /** Intrinsic pixel size, so the `<img>` reserves its box before the bytes land. */
  width: number
  height: number
}

const asset = (src: string, width: number, height: number): MascotAsset => ({
  src,
  width,
  height,
})

/**
 * The full 21-pose mascot set, cropped to content and re-encoded from the
 * ~10MB-each PNG-in-SVG originals down to ~10-18KB WebP cutouts apiece —
 * the source renders were 3000x3000 with a transparent backdrop, displayed
 * nowhere larger than ~150px, so nothing here trades visible quality for
 * the ~700x size cut.
 *
 * Cropping to content left every pose a different width, which is why the
 * intrinsic size travels with each one: the mascots are sized by height with
 * an automatic width, so without it the browser has no aspect ratio to work
 * from and each image lays out at zero width until it decodes.
 */
export const MASCOT_POSES = {
  talkTip: asset(talkTip, 223, 340),
  jumpCheer: asset(jumpCheer, 264, 340),
  pointUpConfident: asset(pointUpConfident, 216, 340),
  faceplant: asset(faceplant, 340, 191),
  scratchHead: asset(scratchHead, 166, 340),
  pointUpEager: asset(pointUpEager, 268, 340),
  chinThink: asset(chinThink, 223, 340),
  explain: asset(explain, 210, 340),
  reachUp: asset(reachUp, 190, 340),
  trudge: asset(trudge, 207, 340),
  leanWalk: asset(leanWalk, 213, 340),
  hipLookUp: asset(hipLookUp, 189, 340),
  cheerArmsUp: asset(cheerArmsUp, 199, 340),
  fistPump: asset(fistPump, 183, 340),
  armsCrossed: asset(armsCrossed, 146, 340),
  presentSide: asset(presentSide, 282, 340),
  hipPointSide: asset(hipPointSide, 189, 340),
  runDash: asset(runDash, 319, 340),
  reachAttention: asset(reachAttention, 199, 340),
  stride: asset(stride, 242, 340),
  pointSideConfident: asset(pointSideConfident, 233, 340),
} as const satisfies Record<string, MascotAsset>

export type MascotPose = keyof typeof MASCOT_POSES
