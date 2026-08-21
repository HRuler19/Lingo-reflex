import { describe, expect, it } from 'vitest'
import { labelStride, niceTicks, smoothLinePath, type ChartPoint } from './chart-math'

describe('niceTicks', () => {
  it('starts at zero and covers the maximum', () => {
    const ticks = niceTicks(87)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(87)
  })

  it('puts the top tick above the max for a range of awkward values', () => {
    // Regression: the top gridline has to sit at or above the tallest bar,
    // or the data renders outside the plot area.
    for (const max of [1, 7, 13, 87, 99, 101, 349, 1001, 4321]) {
      const ticks = niceTicks(max)
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max)
    }
  })

  it('uses evenly spaced, round steps', () => {
    const ticks = niceTicks(100)
    const steps = ticks.slice(1).map((tick, i) => tick - ticks[i])
    expect(new Set(steps).size).toBe(1)
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100])
  })

  it('does not drop the top tick to floating-point drift', () => {
    // 0.1-sized steps accumulate error; the loop bound has to tolerate it.
    const ticks = niceTicks(0.4)
    expect(ticks[ticks.length - 1]).toBeCloseTo(0.4, 10)
  })

  it('falls back to a usable axis for empty or invalid data', () => {
    expect(niceTicks(0)).toEqual([0, 1])
    expect(niceTicks(-5)).toEqual([0, 1])
    expect(niceTicks(Number.NaN)).toEqual([0, 1])
  })
})

describe('smoothLinePath', () => {
  it('returns nothing for no points and a bare move for one', () => {
    expect(smoothLinePath([])).toBe('')
    expect(smoothLinePath([{ x: 5, y: 10 }])).toBe('M 5 10')
  })

  it('passes exactly through every data point', () => {
    const points: ChartPoint[] = [
      { x: 0, y: 100 },
      { x: 50, y: 20 },
      { x: 100, y: 60 },
    ]
    const path = smoothLinePath(points)
    expect(path.startsWith('M 0 100')).toBe(true)
    // Each cubic segment must terminate on the next point's coordinates.
    expect(path).toContain('50 20')
    expect(path).toContain('100 60')
  })

  it('never overshoots a local extremum (monotonicity guarantee)', () => {
    // A peak in the middle: with a naive cubic, control points would push the
    // curve above y=0 here. Fritsch-Carlson flattens the tangent instead.
    const points: ChartPoint[] = [
      { x: 0, y: 50 },
      { x: 10, y: 0 },
      { x: 20, y: 50 },
    ]
    const path = smoothLinePath(points)
    const yValues = [...path.matchAll(/-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)/g)].map((m) =>
      Number(m[1]),
    )
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(0)
  })

  it('handles duplicate x positions without producing NaN', () => {
    const path = smoothLinePath([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
    ])
    expect(path).not.toContain('NaN')
  })
})

describe('labelStride', () => {
  it('shows every label when they all fit', () => {
    expect(labelStride(4, 400)).toBe(1)
  })

  it('thins labels once they would collide', () => {
    expect(labelStride(40, 400)).toBeGreaterThan(1)
  })

  it('never returns a stride below 1, even at zero width', () => {
    expect(labelStride(10, 0)).toBeGreaterThanOrEqual(1)
  })
})
