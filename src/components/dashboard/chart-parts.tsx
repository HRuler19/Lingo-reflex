import type { ReactNode } from 'react'

interface ChartTooltipProps {
  /** Position within the chart container, in pixels. */
  x: number
  y: number
  /** Container width, used to flip the tooltip before it clips the right edge. */
  containerWidth: number
  children: ReactNode
}

/**
 * Floating value readout. Deliberately `pointer-events-none` so it can sit
 * under the cursor without stealing the hover that produced it.
 */
export function ChartTooltip({ x, y, containerWidth, children }: ChartTooltipProps) {
  const flip = x > containerWidth - 96
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? '-100%' : '0'}, -50%) translateX(${flip ? -8 : 8}px)`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Screen-reader equivalent of a chart: the same numbers as a real table.
 * Visual users get the plot, assistive tech gets something it can actually
 * read — which an <svg> full of <path>s is not.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={cellIndex}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
