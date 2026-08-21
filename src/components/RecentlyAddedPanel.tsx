import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mascot } from '@/components/Mascot'
import type { MascotPose } from '@/assets/mascot'

export interface RecentItem {
  id: string
  text: string
  translations: string[]
}

interface RecentlyAddedPanelProps {
  title: string
  items: RecentItem[] | undefined
  emptyLabel: string
  emptyPose: MascotPose
}

/**
 * Fills the space next to a narrow add-form on wide screens with something
 * actually useful — a live look at what you just saved, so the page doesn't
 * end up as a form floating in an otherwise empty page.
 */
export function RecentlyAddedPanel({ title, items, emptyLabel, emptyPose }: RecentlyAddedPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items?.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
            >
              <span className="font-medium">{item.text}</span>
              <div className="flex flex-wrap gap-1">
                {item.translations.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Mascot pose={emptyPose} className="h-28 w-auto opacity-90" />
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
