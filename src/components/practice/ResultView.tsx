import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Timer, Target } from 'lucide-react'
import type { SessionResult } from '@/hooks/use-practice-session'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResultViewProps {
  result: SessionResult
  onRestart: () => void
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border p-4 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function ResultView({ result, onRestart }: ResultViewProps) {
  const accuracy = result.totalItems
    ? Math.round((result.correctCount / result.totalItems) * 100)
    : 0

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Session Results</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={CheckCircle2} label="Correct" value={result.correctCount} />
            <StatTile icon={XCircle} label="Wrong" value={result.wrongCount} />
            <StatTile icon={Target} label="Accuracy" value={`${accuracy}%`} />
            <StatTile
              icon={Timer}
              label="Avg. Response"
              value={`${(result.avgResponseTimeMs / 1000).toFixed(1)}s`}
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
            <Link to="/" className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}>
              Back to Dashboard
            </Link>
            <Button className="flex-1" onClick={onRestart}>
              Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
