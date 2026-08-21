import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Timer, Target, Trophy } from 'lucide-react'
import type { SessionResult } from '@/hooks/use-practice-session'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResultViewProps {
  result: SessionResult
  onRestart: () => void
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string | number
  tint: 'success' | 'destructive' | 'primary'
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center">
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          tint === 'success' && 'bg-success/10 text-success',
          tint === 'destructive' && 'bg-destructive/10 text-destructive',
          tint === 'primary' && 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function ResultView({ result, onRestart }: ResultViewProps) {
  const accuracy = result.totalItems
    ? Math.round((result.correctCount / result.totalItems) * 100)
    : 0

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Trophy className="size-7" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Session Results</h1>
        <p className="text-sm text-muted-foreground">Here's how that round went.</p>
      </div>

      <Card className="w-full">
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={CheckCircle2} label="Correct" value={result.correctCount} tint="success" />
            <StatTile icon={XCircle} label="Wrong" value={result.wrongCount} tint="destructive" />
            <StatTile icon={Target} label="Accuracy" value={`${accuracy}%`} tint="primary" />
            <StatTile
              icon={Timer}
              label="Avg. Response"
              value={`${(result.avgResponseTimeMs / 1000).toFixed(1)}s`}
              tint="primary"
            />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {result.totalItems} items · {result.usedDurationSec}s of {result.totalDurationSec}s used
          </p>

          <div className="flex gap-2">
            {/*
              A real <Link>, not <Button render={<Link/>}>: Base UI's Button
              sets an explicit role="button" whenever nativeButton is false
              (see useButton.js), which would hide this from screen readers'
              "list of links" navigation despite it being real navigation.
            */}
            <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'flex-1')}>
              Back to Dashboard
            </Link>
            <Button size="lg" className="flex-1" onClick={onRestart}>
              Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
