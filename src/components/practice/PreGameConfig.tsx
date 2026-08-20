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
  onStart: (config: PracticeConfig) => void
}

export function PreGameConfig({ disabled, error, onStart }: PreGameConfigProps) {
  const [mode, setMode] = useState<GameMode>('HYBRID')
  const [direction, setDirection] = useState<GameDirection>('SOURCE_TO_TARGET')
  const [durationSec, setDurationSec] = useState<number>(DURATION_OPTIONS[1].seconds)
  const [perItemSec, setPerItemSec] = useState<number>(PER_ITEM_OPTIONS[1].seconds)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onStart({
      mode,
      direction,
      totalDurationSec: durationSec,
      timePerItemSec: perItemSec,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pre-Game Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label>Game Type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as GameMode)}>
              <SelectTrigger>
                <SelectValue />
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
              <SelectTrigger>
                <SelectValue />
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
            <Select
              value={String(durationSec)}
              onValueChange={(v) => setDurationSec(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
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
              <SelectTrigger>
                <SelectValue />
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

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={disabled} className="mt-2">
            Start Session
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
