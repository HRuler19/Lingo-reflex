import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Zap } from 'lucide-react'
import { db, newId } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { buildPracticePool, type PracticeItem } from '@/lib/practice'
import {
  type ItemOutcome,
  type PracticeConfig,
  type SessionResult,
} from '@/hooks/use-practice-session'
import { PreGameConfig } from '@/components/practice/PreGameConfig'
import { GameScreen } from '@/components/practice/GameScreen'
import { ResultView } from '@/components/practice/ResultView'

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
    for (const [id, delta] of deltas) {
      const table = delta.kind === 'word' ? db.words : db.phrases
      const record = await table.get(id)
      if (!record) continue
      await table.update(id, {
        stats: {
          correct: record.stats.correct + delta.correct,
          wrong: record.stats.wrong + delta.wrong,
        },
      })
    }
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

      <PreGameConfig disabled={!selectedPairId} error={error} onStart={handleStart} />
    </div>
  )
}
