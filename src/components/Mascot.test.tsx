// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Mascot } from './Mascot'
import { MASCOT_POSES, type MascotPose } from '@/assets/mascot'

const POSES = Object.keys(MASCOT_POSES) as MascotPose[]

function renderMascot(props: Parameters<typeof Mascot>[0] = {}) {
  const { container } = render(<Mascot {...props} />)
  return container.querySelector('img') as HTMLImageElement
}

describe('Mascot', () => {
  it('carries a usable intrinsic size for every pose', () => {
    // The mascots are laid out by height with an automatic width, so a pose
    // added without its cropped dimensions would silently render at zero
    // width until it decoded.
    for (const pose of POSES) {
      const { src, width, height } = MASCOT_POSES[pose]
      expect(src, pose).toBeTruthy()
      expect(width, pose).toBeGreaterThan(0)
      expect(height, pose).toBeGreaterThan(0)
    }
  })

  it('puts those dimensions on the element the browser lays out', () => {
    const img = renderMascot({ pose: 'faceplant' })
    const { width, height } = MASCOT_POSES.faceplant
    expect(img.getAttribute('width')).toBe(String(width))
    expect(img.getAttribute('height')).toBe(String(height))
  })

  it('defers loading by default', () => {
    expect(renderMascot({ pose: 'stride' }).getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly when marked as priority', () => {
    // The sidebar brand mark is on screen from the first paint; deferring it
    // would make it pop in after everything else.
    expect(renderMascot({ pose: 'armsCrossed', priority: true }).getAttribute('loading')).toBe(
      'eager',
    )
  })

  it('is decorative, so assistive technology skips it', () => {
    const img = renderMascot({ pose: 'jumpCheer' })
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('keeps the caller\'s classes alongside its own', () => {
    expect(renderMascot({ className: 'h-28 w-auto' }).className).toContain('object-contain')
    expect(renderMascot({ className: 'h-28 w-auto' }).className).toContain('h-28')
  })
})
