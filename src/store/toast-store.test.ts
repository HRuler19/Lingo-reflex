import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runDbAction, useToastStore } from './toast-store'

function reset() {
  useToastStore.setState({ toasts: [] })
}

describe('runDbAction', () => {
  beforeEach(() => {
    reset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports success and raises no toast when nothing is asked for', async () => {
    const ok = await runDbAction(async () => 'written', { errorMessage: 'nope' })
    expect(ok).toBe(true)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('shows a success toast when one is requested', async () => {
    await runDbAction(async () => undefined, {
      errorMessage: 'nope',
      successMessage: 'Saved.',
    })
    const [toast] = useToastStore.getState().toasts
    expect(toast.kind).toBe('success')
    expect(toast.message).toBe('Saved.')
  })

  it('surfaces a rejected write instead of letting it become an unhandled rejection', async () => {
    // The regression this guards: IndexedDB rejects on quota/private-mode, and
    // the UI used to carry on as though the write had committed.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = await runDbAction(async () => {
      throw new Error('disk is full')
    }, { errorMessage: 'Could not save "Relentless".' })

    expect(ok).toBe(false)
    const [toast] = useToastStore.getState().toasts
    expect(toast.kind).toBe('error')
    expect(toast.message).toContain('Could not save "Relentless".')
    // The underlying cause is kept so a bug report can say what actually failed.
    expect(toast.message).toContain('disk is full')
  })

  it('names the failure by its error name, not a doubled-up message', () => {
    // Dexie wraps IndexedDB failures and its `message` frequently repeats the
    // name ("QuotaExceededError: QuotaExceededError: ..."), which read as
    // noise on screen. A DOMException-shaped error should report just its name.
    const quota = Object.assign(new Error('QuotaExceededError: quota exceeded'), {
      name: 'QuotaExceededError',
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    return runDbAction(() => Promise.reject(quota), { errorMessage: 'Save failed.' }).then(() => {
      expect(useToastStore.getState().toasts[0].message).toBe(
        'Save failed. (QuotaExceededError)',
      )
    })
  })

  it('handles a non-Error rejection without producing "[object Object]"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await runDbAction(async () => Promise.reject('plain string'), {
      errorMessage: 'Failed.',
    })
    expect(useToastStore.getState().toasts[0].message).toContain('plain string')
  })

  it('auto-dismisses, and keeps errors on screen longer than confirmations', () => {
    const { notify } = useToastStore.getState()
    notify('success', 'ok')
    notify('error', 'bad')
    expect(useToastStore.getState().toasts).toHaveLength(2)

    vi.advanceTimersByTime(3500)
    expect(useToastStore.getState().toasts.map((t) => t.kind)).toEqual(['error'])

    vi.advanceTimersByTime(3500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('gives concurrent toasts distinct ids so React keys stay stable', () => {
    const { notify } = useToastStore.getState()
    notify('error', 'first')
    notify('error', 'second')
    const ids = useToastStore.getState().toasts.map((t) => t.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('dismisses only the toast asked for', () => {
    const { notify } = useToastStore.getState()
    notify('error', 'first')
    notify('error', 'second')
    const [first] = useToastStore.getState().toasts
    useToastStore.getState().dismiss(first.id)
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['second'])
  })
})
