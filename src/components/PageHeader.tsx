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
 */
export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
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
