import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PracticeItem } from '@/lib/practice'
import {
  usePracticeSession,
  type PracticeConfig,
  type SessionResult,
} from '@/hooks/use-practice-session'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface GameScreenProps {
  pool: PracticeItem[]
  config: PracticeConfig
  onFinish: (result: SessionResult) => void
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

interface AnswerFormProps {
  shake: boolean
  onSubmit: (value: string) => void
}

/**
 * Owns its own input value so a fresh instance (keyed by item id in the
 * parent) resets and refocuses on every new prompt for free, instead of an
 * effect reaching back to clear state imperatively.
 */
function AnswerForm({ shake, onSubmit }: AnswerFormProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Input
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type the translation…"
        className={cn(
          'h-14 rounded-xl text-center text-xl',
          shake && 'border-destructive ring-3 ring-destructive/20',
        )}
      />
    </form>
  )
}

export function GameScreen({ pool, config, onFinish }: GameScreenProps) {
  const {
    currentItem,
    itemSeq,
    sessionSecondsLeft,
    itemSecondsLeft,
    correctCount,
    wrongCount,
    shake,
    submitAnswer,
    endEarly,
  } = usePracticeSession({ pool, config, onFinish })

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Time Left</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatClock(sessionSecondsLeft)}</span>
            <Button variant="ghost" size="icon-xs" aria-label="End session" onClick={endEarly}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <Progress value={(sessionSecondsLeft / config.totalDurationSec) * 100} />
      </div>

      <div className="flex items-center justify-center gap-6 text-sm font-medium tabular-nums">
        <span className="flex items-center gap-1 text-success">
          <Check className="size-4" /> {correctCount}
        </span>
        <span className="flex items-center gap-1 text-destructive">
          <X className="size-4" /> {wrongCount}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7">
        <span className="text-center text-4xl font-bold tracking-tight text-balance">
          {currentItem?.prompt ?? '…'}
        </span>

        <AnswerForm key={itemSeq} shake={shake} onSubmit={submitAnswer} />

        <Progress
          value={(itemSecondsLeft / config.timePerItemSec) * 100}
          className="h-1.5 w-full max-w-xs"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Enter to submit · Esc (or ✕ above) to end session
      </p>
    </div>
  )
}
