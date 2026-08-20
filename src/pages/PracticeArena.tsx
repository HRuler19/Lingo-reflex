import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useLanguagePairStore } from '@/store/language-pair-store'
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

const GAME_TYPES = ['Words Only', 'Phrases Only', 'Hybrid'] as const
const DIRECTIONS = ['Source → Target', 'Target → Source'] as const
const DURATIONS = ['3m', '5m', '10m', '15m', '30m', '1h'] as const
const PER_ITEM_LIMITS = ['5s', '10s', '20s', '30s', '1m'] as const

function ConfigField({
  label,
  options,
}: {
  label: string
  options: readonly string[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select defaultValue={options[0]}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PracticeArena() {
  const { selectedPairId } = useLanguagePairStore()
  const [started] = useState(false)

  if (started) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        Game screen coming soon.
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Zap className="size-5" /> Practice Arena
      </h1>

      {!selectedPairId && (
        <p className="text-sm text-muted-foreground">
          Select a language pair in the header before starting a session.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pre-Game Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ConfigField label="Game Type" options={GAME_TYPES} />
          <ConfigField label="Direction" options={DIRECTIONS} />
          <ConfigField label="Session Duration" options={DURATIONS} />
          <ConfigField label="Per-Item Time Limit" options={PER_ITEM_LIMITS} />
          <Button disabled={!selectedPairId} className="mt-2">
            Start Session
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
