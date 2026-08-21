import type { CSSProperties } from 'react'

/** Shared Recharts styling for the Dashboard's charts — kept in one place so tick size and
 *  tooltip theming stay in sync across TrendLineChart and MasteryChart instead of drifting. */

export const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }

export const tooltipContentStyle: CSSProperties = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
}
