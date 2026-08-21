// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePracticeSession } from './use-practice-session'
import type { PracticeItem } from '@/lib/practice'

const onlyItem: PracticeItem = {
  id: 'w1',
  kind: 'word',
  prompt: 'Relentless',
  answers: ['Yadawsyz'],
}

function setup() {
  return renderHook(() =>
    usePracticeSession({
      pool: [onlyItem],
      config: { mode: 'WORDS_ONLY', direction: 'SOURCE_TO_TARGET', totalDurationSec: 300, timePerItemSec: 10 },
      onFinish: vi.fn(),
    }),
  )
}

describe('usePracticeSession', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('bumps itemSeq on every turn even when the same item repeats (single-item pool)', () => {
    const { result } = setup()

    act(() => {
      // Let the mount effect's queueMicrotask-free nextItem() call settle.
      vi.advanceTimersByTime(0)
    })

    expect(result.current.currentItem?.id).toBe('w1')
    const firstSeq = result.current.itemSeq

    act(() => {
      result.current.submitAnswer('Yadawsyz')
    })

    // Same item comes back around (it's the only one in the pool), but the
    // turn counter must still have advanced — that's what GameScreen keys
    // its answer input on to force a fresh, empty field each turn.
    expect(result.current.currentItem?.id).toBe('w1')
    expect(result.current.itemSeq).toBe(firstSeq + 1)
    expect(result.current.correctCount).toBe(1)
  })

  it('does not advance the turn on a wrong answer', () => {
    const { result } = setup()
    act(() => vi.advanceTimersByTime(0))
    const firstSeq = result.current.itemSeq

    act(() => {
      result.current.submitAnswer('nope')
    })

    expect(result.current.itemSeq).toBe(firstSeq)
    expect(result.current.wrongCount).toBe(0)
    expect(result.current.shake).toBe(true)
  })

  it('counts the per-item timer down in wall-clock seconds', () => {
    const { result } = setup()
    act(() => vi.advanceTimersByTime(0))
    expect(result.current.itemSecondsLeft).toBe(10)

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.itemSecondsLeft).toBe(7)
  })

  it('auto-advances and counts a wrong attempt when the per-item timer runs out', () => {
    const { result } = setup()
    act(() => vi.advanceTimersByTime(0))
    const firstSeq = result.current.itemSeq

    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.wrongCount).toBe(1)
    expect(result.current.itemSeq).toBe(firstSeq + 1)
    expect(result.current.itemSecondsLeft).toBe(10) // reset for the next item
  })

  it('finishes the session once the total duration elapses', () => {
    const onFinish = vi.fn()
    renderHook(() =>
      usePracticeSession({
        pool: [onlyItem],
        config: {
          mode: 'WORDS_ONLY',
          direction: 'SOURCE_TO_TARGET',
          totalDurationSec: 5,
          timePerItemSec: 10,
        },
        onFinish,
      }),
    )
    act(() => vi.advanceTimersByTime(0))

    act(() => vi.advanceTimersByTime(5000))

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish.mock.calls[0][0]).toMatchObject({
      usedDurationSec: 5,
      correctCount: 0,
      wrongCount: 0,
    })
  })
})
