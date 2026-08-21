import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/**
 * Every page's title block, standardized: a tinted icon badge (matching the
 * one this page's sidebar entry uses), a real heading, and an optional
 * subtitle/action slot — instead of each page hand-rolling its own emoji +
 * text.
 *
 * Sticky rather than scrolling away with the page: `main` (in AppLayout) is
 * the scrolling ancestor and carries p-6, so the negative margin + matching
 * padding here "bleeds" this out to full width before pinning it, instead of
 * a version that sticks but keeps a visible gap down its sides.
 */
export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-4 bg-background/95 px-6 pt-6 pb-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-primary text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
