import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { GameDirection, GameMode } from '@/db/schema'
import type { PracticeConfig } from '@/hooks/use-practice-session'
import {
  DIRECTION_OPTIONS,
  DURATION_OPTIONS,
  GAME_MODE_OPTIONS,
  PER_ITEM_OPTIONS,
} from '@/lib/practice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PreGameConfigProps {
  disabled: boolean
  error: string | null
  wordCount: number
  phraseCount: number
  onStart: (config: PracticeConfig) => void
}

type Scope = 'ALL' | 'RECENT'

const SCOPE_OPTIONS: { label: string; value: Scope }[] = [
  { label: 'Entire library', value: 'ALL' },
  { label: 'Most recently added', value: 'RECENT' },
]

/** Starting point for the count — small enough to be a focused drill. */
const DEFAULT_RECENT_LIMIT = 20

// Base UI's <Select.Value> renders the raw value by default; look up the
// human label for these enum/seconds values instead of showing e.g. "HYBRID".
function labelFor(options: readonly { label: string; value?: string; seconds?: number }[]) {
  return (value: string) =>
    options.find((opt) => (opt.value ?? String(opt.seconds)) === value)?.label ?? value
}

export function PreGameConfig({
  disabled,
  error,
  wordCount,
  phraseCount,
  onStart,
}: PreGameConfigProps) {
  const [mode, setMode] = useState<GameMode>('HYBRID')
  const [direction, setDirection] = useState<GameDirection>('SOURCE_TO_TARGET')
  const [durationSec, setDurationSec] = useState<number>(DURATION_OPTIONS[1].seconds)
  const [perItemSec, setPerItemSec] = useState<number>(PER_ITEM_OPTIONS[1].seconds)
  const [scope, setScope] = useState<Scope>('ALL')
  // Held as text, not a number: clearing the field mid-edit has to be allowed,
  // and an empty box is not the number zero.
  const [recentText, setRecentText] = useState(String(DEFAULT_RECENT_LIMIT))

  const available =
    mode === 'WORDS_ONLY' ? wordCount : mode === 'PHRASES_ONLY' ? phraseCount : wordCount + phraseCount
  const parsedLimit = Number.parseInt(recentText, 10)
  const limitIsValid = Number.isInteger(parsedLimit) && parsedLimit > 0
  const recentLimit = scope === 'RECENT' && limitIsValid ? parsedLimit : null

  const entries = `${available} ${available === 1 ? 'entry' : 'entries'}`
  const scopeHint =
    scope === 'ALL'
      ? `Every one of your ${entries} can come up.`
      : !limitIsValid
        ? 'Enter how many recent entries to practise — 1 or more.'
        : parsedLimit >= available
          ? `You have ${entries} in total, so this practises all of them.`
          : `Only the ${parsedLimit} newest of your ${entries}.`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onStart({
      mode,
      direction,
      totalDurationSec: durationSec,
      timePerItemSec: perItemSec,
      recentLimit,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Pre-Game Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Game Type</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as GameMode)}>
                <SelectTrigger className="w-full" aria-label="Game Type">
                  <SelectValue>{labelFor(GAME_MODE_OPTIONS)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GAME_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as GameDirection)}>
                <SelectTrigger className="w-full" aria-label="Direction">
                  <SelectValue>{labelFor(DIRECTION_OPTIONS)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Session Duration</Label>
              <Select value={String(durationSec)} onValueChange={(v) => setDurationSec(Number(v))}>
                <SelectTrigger className="w-full" aria-label="Session Duration">
                  <SelectValue>{labelFor(DURATION_OPTIONS)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.seconds} value={String(opt.seconds)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Per-Item Time Limit</Label>
              <Select value={String(perItemSec)} onValueChange={(v) => setPerItemSec(Number(v))}>
                <SelectTrigger className="w-full" aria-label="Per-Item Time Limit">
                  <SelectValue>{labelFor(PER_ITEM_OPTIONS)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PER_ITEM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.seconds} value={String(opt.seconds)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="recent-limit">Practice Scope</Label>
              <div className="flex gap-3">
                <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                  <SelectTrigger className="flex-1" aria-label="Practice Scope">
                    <SelectValue>{labelFor(SCOPE_OPTIONS)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scope === 'RECENT' && (
                  <Input
                    id="recent-limit"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="w-24 tabular-nums"
                    value={recentText}
                    onChange={(e) => setRecentText(e.target.value)}
                    aria-label="How many recent entries"
                    aria-invalid={!limitIsValid}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {scopeHint}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={disabled || (scope === 'RECENT' && !limitIsValid)}
            className="mt-1"
          >
            Start Session
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
