import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Info, MessageSquareText, Target, Zap } from 'lucide-react'
import { db, newId } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { buildPracticePool, type PracticeItem } from '@/lib/practice'
import {
  type ItemOutcome,
  type PracticeConfig,
  type SessionResult,
} from '@/hooks/use-practice-session'
import { PageHeader } from '@/components/PageHeader'
import { PreGameConfig } from '@/components/practice/PreGameConfig'
import { GameScreen } from '@/components/practice/GameScreen'
import { ResultView } from '@/components/practice/ResultView'
import { Mascot } from '@/components/Mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Phase = 'config' | 'playing' | 'results'

async function applyOutcomesToStats(outcomes: ItemOutcome[]) {
  const deltas = new Map<string, { kind: ItemOutcome['kind']; correct: number; wrong: number }>()
  for (const outcome of outcomes) {
    const delta = deltas.get(outcome.id) ?? { kind: outcome.kind, correct: 0, wrong: 0 }
    if (outcome.correct) delta.correct += 1
    else delta.wrong += 1
    deltas.set(outcome.id, delta)
  }

  await db.transaction('rw', db.words, db.phrases, async () => {
    // Each delta targets a distinct id, so these get+update round trips are
    // independent — run them concurrently within the transaction rather
    // than serializing every item in the session one at a time.
    await Promise.all(
      Array.from(deltas, async ([id, delta]) => {
        const table = delta.kind === 'word' ? db.words : db.phrases
        const record = await table.get(id)
        if (!record) return
        await table.update(id, {
          stats: {
            correct: record.stats.correct + delta.correct,
            wrong: record.stats.wrong + delta.wrong,
          },
        })
      }),
    )
  })
}

export function PracticeArena() {
  const { selectedPairId } = useLanguagePairStore()
  const [phase, setPhase] = useState<Phase>('config')
  const [config, setConfig] = useState<PracticeConfig | null>(null)
  const [pool, setPool] = useState<PracticeItem[] | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Captured at handleStart, not re-read live at handleFinish: the header's
  // pair selector stays interactive during a session, so `selectedPairId`
  // could otherwise point at a different pair by the time the session ends.
  const [sessionPairId, setSessionPairId] = useState<string | null>(null)

  const words = useLiveQuery(
    () => (selectedPairId ? db.words.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )
  const phrases = useLiveQuery(
    () => (selectedPairId ? db.phrases.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )
  const lastSession = useLiveQuery(async () => {
    if (!selectedPairId) return undefined
    const sorted = await db.sessions.where('pairId').equals(selectedPairId).sortBy('timestamp')
    return sorted.at(-1)
  }, [selectedPairId])

  function handleStart(cfg: PracticeConfig) {
    const builtPool = buildPracticePool(words ?? [], phrases ?? [], cfg.mode, cfg.direction)
    if (builtPool.length === 0) {
      setError('Add some words or phrases for this game type before starting.')
      return
    }
    setError(null)
    setConfig(cfg)
    setPool(builtPool)
    setSessionPairId(selectedPairId)
    setPhase('playing')
  }

  async function handleFinish(sessionResult: SessionResult) {
    setResult(sessionResult)
    setPhase('results')
    if (!sessionPairId || !config) return

    await db.sessions.add({
      id: newId('s'),
      pairId: sessionPairId,
      mode: config.mode,
      direction: config.direction,
      totalDurationSec: sessionResult.totalDurationSec,
      usedDurationSec: sessionResult.usedDurationSec,
      timePerItemSec: sessionResult.timePerItemSec,
      totalItems: sessionResult.totalItems,
      correctCount: sessionResult.correctCount,
      wrongCount: sessionResult.wrongCount,
      avgResponseTimeMs: sessionResult.avgResponseTimeMs,
      timestamp: Date.now(),
    })

    await applyOutcomesToStats(sessionResult.outcomes)
  }

  function handleRestart() {
    setPhase('config')
    setConfig(null)
    setPool(null)
    setResult(null)
    setSessionPairId(null)
  }

  if (phase === 'playing' && config && pool) {
    return <GameScreen pool={pool} config={config} onFinish={handleFinish} />
  }

  if (phase === 'results' && result) {
    return <ResultView result={result} onRestart={handleRestart} />
  }

  const lastAccuracy =
    lastSession && lastSession.correctCount + lastSession.wrongCount > 0
      ? Math.round(
          (lastSession.correctCount / (lastSession.correctCount + lastSession.wrongCount)) * 100,
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Zap}
        title="Practice Arena"
        description="Time-pressured recall — type fast, type right."
      />

      {!selectedPairId && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Mascot pose="runDash" className="h-20 w-auto shrink-0" />
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" />
            Select a language pair in the header before starting a session.
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <PreGameConfig disabled={!selectedPairId} error={error} onStart={handleStart} />

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <Mascot pose="fistPump" className="h-24 w-auto shrink-0" />
            <CardTitle className="text-sm font-semibold">Ready to Practice</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="size-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums">{words?.length ?? 0}</span>
                <span className="text-xs text-muted-foreground">Words available</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareText className="size-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums">{phrases?.length ?? 0}</span>
                <span className="text-xs text-muted-foreground">Phrases available</span>
              </div>
            </div>
            {lastAccuracy !== null && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Target className="size-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tabular-nums">{lastAccuracy}%</span>
                  <span className="text-xs text-muted-foreground">Accuracy last session</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
