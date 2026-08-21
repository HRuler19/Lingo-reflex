import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Geometry helpers for the Dashboard's hand-rolled SVG charts.
 *
 * These charts used to be Recharts, which cost ~110KB gzip — about 95% of the
 * Dashboard bundle — to draw two area charts and one grouped bar chart. The
 * shapes are simple enough to render directly, so the whole dependency (and
 * its d3 sub-packages) is gone in favour of this plus ~200 lines of SVG.
 */

/**
 * Tracks a container's pixel width so a chart can render SVG at exact device
 * pixels instead of scaling a fixed viewBox — axis text then stays crisp and
 * at a constant size regardless of how wide the card is.
 *
 * Deliberately a *ref callback* rather than a `useEffect` + `useRef` pair. A
 * ref callback runs synchronously the moment the node attaches, so the first
 * measurement is taken directly from the element; an effect-based version has
 * to wait for ResizeObserver's first delivery, which under StrictMode's
 * mount→cleanup→mount cycle can be disconnected before it ever arrives,
 * leaving the chart stuck at width 0 and rendering nothing.
 */
export function useChartWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return

    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    observerRef.current = observer
  }, [])

  // Detaching happens through the ref callback's null call, but a hard unmount
  // of the whole tree can skip that — disconnect here too so the observer
  // never outlives the component.
  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [ref, width] as const
}

/**
 * Rounded, human-readable tick values spanning [0, max] — the 1/2/5/10
 * progression people expect on an axis, rather than raw fractions of the
 * data's maximum.
 */
export function niceTicks(max: number, targetCount = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1]

  const rawStep = max / targetCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  // Classic "nice number" thresholds. Rounding at 1.5/3/7 rather than at the
  // step values themselves keeps tick counts near the target — snapping 2.5 up
  // to 5 (as <=1/<=2/<=5 would) leaves a 100-max axis with just 0/50/100.
  const niceStep =
    (normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10) * magnitude

  // Emit ticks until one lands at or above `max`, so the top gridline always
  // sits above the tallest value. Stopping at `max` instead would leave e.g.
  // max=87 with a top tick of 80 and the data spilling past the axis.
  const ticks: number[] = []
  for (let value = 0; ; value += niceStep) {
    // toFixed trims the drift that accumulates from repeated += on fractional
    // steps (0.1 + 0.2 = 0.30000000000000004).
    ticks.push(Number(value.toFixed(10)))
    if (value >= max) break
  }
  return ticks
}

export interface ChartPoint {
  x: number
  y: number
}

/**
 * Monotone cubic Hermite spline (Fritsch–Carlson), which is what Recharts drew
 * for `type="monotone"`. Unlike a plain cubic it never overshoots the data, so
 * an accuracy line can't dip below 0% or arc above 100% between two points.
 */
export function smoothLinePath(points: ChartPoint[]): string {
  const n = points.length
  if (n === 0) return ''
  if (n === 1) return `M ${points[0].x} ${points[0].y}`

  const dx: number[] = []
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x
    slopes[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]
  }

  // Tangent at each point: the average of its neighbouring slopes, flattened
  // to zero at local extrema so the curve turns without overshooting.
  const tangents: number[] = new Array(n)
  tangents[0] = slopes[0]
  tangents[n - 1] = slopes[n - 2]
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2
  }

  // Fritsch–Carlson correction: clamp tangents into the circle of radius 3
  // around each segment's slope, which is what guarantees monotonicity.
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const alpha = tangents[i] / slopes[i]
    const beta = tangents[i + 1] / slopes[i]
    const magnitude = alpha * alpha + beta * beta
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude)
      tangents[i] = scale * alpha * slopes[i]
      tangents[i + 1] = scale * beta * slopes[i]
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const control = dx[i] / 3
    path +=
      ` C ${points[i].x + control} ${points[i].y + tangents[i] * control},` +
      ` ${points[i + 1].x - control} ${points[i + 1].y - tangents[i + 1] * control},` +
      ` ${points[i + 1].x} ${points[i + 1].y}`
  }
  return path
}

/**
 * Picks a label stride so x-axis labels never collide: with more points than
 * fit, every Nth label is drawn instead of letting them overlap into mush.
 */
export function labelStride(count: number, innerWidth: number, minLabelPx = 62): number {
  const fits = Math.max(1, Math.floor(innerWidth / minLabelPx))
  return Math.max(1, Math.ceil(count / fits))
}

/** Shared axis-label styling, so both charts stay visually in sync. */
export const AXIS_LABEL_PROPS = {
  className: 'fill-muted-foreground text-[11px]',
} as const
