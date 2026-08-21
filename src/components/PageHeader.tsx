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
 * Sticky rather than scrolling away with the page: the scroll container (in
 * AppLayout) deliberately carries no top padding of its own, only px-6 pb-6,
 * so this can pin flush at its top with zero gap; -mx-6 bleeds this out to
 * full width to cancel the container's horizontal padding (that part is
 * unaffected by the sticky-offset quirk below, so a plain negative margin
 * works fine), and its own pt-6 stands in for the container's usual top
 * padding. Deliberately not also using a negative top margin to bleed
 * vertically — a sticky element's `top` offset pins its *margin* edge to the
 * scrollport, not its border edge, so a negative top margin here would push
 * the visible box *down* by that same amount once stuck instead of flush,
 * reopening exactly the gap this is meant to close.
 */
export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 -mx-6 flex flex-wrap items-center justify-between gap-4 bg-background/95 px-6 pt-6 pb-4 backdrop-blur-sm">
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
