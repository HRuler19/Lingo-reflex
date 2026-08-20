import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameDirection, GameMode } from '@/db/schema'
import { type PracticeItem, isCorrectAnswer, shuffle } from '@/lib/practice'

export interface PracticeConfig {
  mode: GameMode
  direction: GameDirection
  totalDurationSec: number
  timePerItemSec: number
}

export interface ItemOutcome {
  id: string
  kind: 'word' | 'phrase'
  correct: boolean
}

export interface SessionResult {
  totalDurationSec: number
  usedDurationSec: number
  timePerItemSec: number
  totalItems: number
  correctCount: number
  wrongCount: number
  avgResponseTimeMs: number
  outcomes: ItemOutcome[]
}

interface UsePracticeSessionArgs {
  pool: PracticeItem[]
  config: PracticeConfig
  onFinish: (result: SessionResult) => void
}

/**
 * Drives a single Practice Arena session: countdown timers, item sequencing,
 * scoring, and early termination (Esc). Mount this hook once per session —
 * the owning component should remount it for a new session rather than
 * reusing an instance.
 */
export function usePracticeSession({ pool, config, onFinish }: UsePracticeSessionArgs) {
  const [currentItem, setCurrentItem] = useState<PracticeItem | null>(null)
  // A small pool cycles, so the same item can come up twice in a row —
  // `currentItem.id` alone isn't a safe React key for "this is a new turn".
  // This counter always changes, one nextItem() call at a time.
  const [itemSeq, setItemSeq] = useState(0)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(config.totalDurationSec)
  const [itemSecondsLeft, setItemSecondsLeft] = useState(config.timePerItemSec)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [shake, setShake] = useState(false)

  const queueRef = useRef<PracticeItem[]>([])
  const queueIndexRef = useRef(0)
  const itemSecondsLeftRef = useRef(config.timePerItemSec)
  const itemStartRef = useRef(0)
  const startTimeRef = useRef(0)
  const intervalRef = useRef<number | undefined>(undefined)
  const responseTimesRef = useRef<number[]>([])
  const outcomesRef = useRef<ItemOutcome[]>([])
  const correctCountRef = useRef(0)
  const wrongCountRef = useRef(0)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const nextItem = useCallback(() => {
    if (queueIndexRef.current >= queueRef.current.length) {
      queueRef.current = [...queueRef.current, ...shuffle(pool)]
    }
    const item = queueRef.current[queueIndexRef.current]
    queueIndexRef.current += 1
    itemStartRef.current = Date.now()
    itemSecondsLeftRef.current = config.timePerItemSec
    setCurrentItem(item)
    setItemSeq((n) => n + 1)
    setItemSecondsLeft(config.timePerItemSec)
  }, [pool, config.timePerItemSec])

  const finish = useCallback(
    (usedDurationSec: number) => {
      if (finishedRef.current) return
      finishedRef.current = true
      if (intervalRef.current !== undefined) window.clearInterval(intervalRef.current)

      const responseTimes = responseTimesRef.current
      const avgResponseTimeMs = responseTimes.length
        ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length)
        : 0

      onFinishRef.current({
        totalDurationSec: config.totalDurationSec,
        usedDurationSec,
        timePerItemSec: config.timePerItemSec,
        totalItems: outcomesRef.current.length,
        correctCount: correctCountRef.current,
        wrongCount: wrongCountRef.current,
        avgResponseTimeMs,
        outcomes: outcomesRef.current,
      })
    },
    [config.totalDurationSec, config.timePerItemSec],
  )

  const handleTimeout = useCallback(() => {
    const item = queueRef.current[queueIndexRef.current - 1]
    if (item) {
      responseTimesRef.current.push(config.timePerItemSec * 1000)
      outcomesRef.current.push({ id: item.id, kind: item.kind, correct: false })
      wrongCountRef.current += 1
      setWrongCount(wrongCountRef.current)
    }
    nextItem()
  }, [config.timePerItemSec, nextItem])

  const submitAnswer = useCallback(
    (value: string) => {
      if (!currentItem) return
      if (isCorrectAnswer(value, currentItem.answers)) {
        responseTimesRef.current.push(Date.now() - itemStartRef.current)
        outcomesRef.current.push({ id: currentItem.id, kind: currentItem.kind, correct: true })
        correctCountRef.current += 1
        setCorrectCount(correctCountRef.current)
        nextItem()
      } else {
        setShake(true)
        window.setTimeout(() => setShake(false), 200)
      }
    },
    [currentItem, nextItem],
  )

  const endEarly = useCallback(() => {
    const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    finish(Math.min(elapsedSec, config.totalDurationSec))
  }, [finish, config.totalDurationSec])

  // Session lifecycle: runs once for the lifetime of this hook instance.
  useEffect(() => {
    startTimeRef.current = Date.now()
    nextItem()

    intervalRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current
      const sessionRemaining = Math.max(
        0,
        config.totalDurationSec - Math.floor(elapsedMs / 1000),
      )
      setSessionSecondsLeft(sessionRemaining)

      if (sessionRemaining <= 0) {
        finish(config.totalDurationSec)
        return
      }

      itemSecondsLeftRef.current -= 1
      if (itemSecondsLeftRef.current <= 0) {
        handleTimeout()
      } else {
        setItemSecondsLeft(itemSecondsLeftRef.current)
      }
    }, 1000)

    return () => {
      if (intervalRef.current !== undefined) window.clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Esc ends the session early and saves whatever progress was made.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') endEarly()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [endEarly])

  return {
    currentItem,
    itemSeq,
    sessionSecondsLeft,
    itemSecondsLeft,
    correctCount,
    wrongCount,
    shake,
    submitAnswer,
    endEarly,
  }
}
