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
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_3px_0_0_color-mix(in_oklch,var(--primary),black_25%)] dark:shadow-[0_3px_0_0_color-mix(in_oklch,var(--primary),black_35%)]">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
