import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { GameDirection, GameMode, Phrase, Word } from '@/db/schema'
import type { PracticeConfig } from '@/hooks/use-practice-session'
import {
  DIRECTION_OPTIONS,
  DURATION_OPTIONS,
  GAME_MODE_OPTIONS,
  PER_ITEM_OPTIONS,
  SCOPE_OPTIONS,
  WHOLE_LIBRARY,
  countWithMistakes,
  type PoolScope,
} from '@/lib/practice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NumberField } from '@/components/ui/number-field'
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
  words: Word[]
  phrases: Phrase[]
  onStart: (config: PracticeConfig) => void
}

/** Starting point for the count — small enough to be a focused drill. */
const DEFAULT_LIMIT = 20

// Base UI's <Select.Value> renders the raw value by default; look up the
// human label for these enum/seconds values instead of showing e.g. "HYBRID".
function labelFor(options: readonly { label: string; value?: string; seconds?: number }[]) {
  return (value: string) =>
    options.find((opt) => (opt.value ?? String(opt.seconds)) === value)?.label ?? value
}

/** Pluralises a count of library entries for the hint line. */
function entryCount(n: number): string {
  return `${n} ${n === 1 ? 'entry' : 'entries'}`
}

export function PreGameConfig({ disabled, error, words, phrases, onStart }: PreGameConfigProps) {
  const [mode, setMode] = useState<GameMode>('HYBRID')
  const [direction, setDirection] = useState<GameDirection>('SOURCE_TO_TARGET')
  const [durationSec, setDurationSec] = useState<number>(DURATION_OPTIONS[1].seconds)
  const [perItemSec, setPerItemSec] = useState<number>(PER_ITEM_OPTIONS[1].seconds)
  const [scope, setScope] = useState<PoolScope>('ALL')
  // Held as text, not a number: clearing the field mid-edit has to be allowed,
  // and an empty box is not the number zero.
  const [limitText, setLimitText] = useState(String(DEFAULT_LIMIT))

  const wordCount = mode === 'PHRASES_ONLY' ? 0 : words.length
  const phraseCount = mode === 'WORDS_ONLY' ? 0 : phrases.length
  const available = wordCount + phraseCount
  const withMistakes = countWithMistakes(words, phrases, mode)

  const parsedLimit = Number.parseInt(limitText, 10)
  const limitIsValid = Number.isInteger(parsedLimit) && parsedLimit > 0
  const needsLimit = scope !== 'ALL'
  // A scope that can only produce an empty pool is blocked here rather than
  // failing at Start, so the reason sits next to the control that caused it.
  const scopeIsEmpty = scope === 'STRUGGLING' && withMistakes === 0

  const scopeHint =
    scope === 'ALL'
      ? `Every one of your ${entryCount(available)} can come up.`
      : !limitIsValid
        ? 'Enter how many entries to practise — 1 or more.'
        : scope === 'RECENT'
          ? parsedLimit >= available
            ? `You have ${entryCount(available)} in total, so this practises all of them.`
            : `Only the ${parsedLimit} newest of your ${entryCount(available)}.`
          : withMistakes === 0
            ? 'Nothing to drill yet — this scope uses entries you have answered wrong at least once.'
            : parsedLimit >= withMistakes
              ? `All ${entryCount(withMistakes)} you have answered wrong so far.`
              : `The ${parsedLimit} you miss most often, of ${entryCount(withMistakes)} with mistakes.`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onStart({
      mode,
      direction,
      totalDurationSec: durationSec,
      timePerItemSec: perItemSec,
      selection: needsLimit && limitIsValid ? { scope, limit: parsedLimit } : WHOLE_LIBRARY,
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
              <Label htmlFor="scope-limit">Practice Scope</Label>
              <div className="flex gap-3">
                <Select value={scope} onValueChange={(v) => setScope(v as PoolScope)}>
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
                {needsLimit && (
                  <NumberField
                    id="scope-limit"
                    label="How many entries"
                    min={1}
                    className="w-32"
                    value={limitText}
                    onValueChange={setLimitText}
                    invalid={!limitIsValid}
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
            disabled={disabled || scopeIsEmpty || (needsLimit && !limitIsValid)}
            className="mt-1"
          >
            Start Session
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
