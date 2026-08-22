import { create } from 'zustand'

export type ToastKind = 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

/** Errors linger long enough to actually read; confirmations don't need to. */
const DISMISS_AFTER_MS: Record<ToastKind, number> = {
  success: 3500,
  error: 7000,
}

interface ToastState {
  toasts: Toast[]
  notify: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

/**
 * A short, human-readable reason for a failure.
 *
 * Prefers the error's `name` when it is specific (`QuotaExceededError`,
 * `NotFoundError`) since that is the part worth putting in a bug report, and
 * falls back to the message for plain `Error`s that carry the detail there.
 */
function describeError(error: unknown): string {
  if (error instanceof Error || (typeof error === 'object' && error !== null && 'name' in error)) {
    const { name, message } = error as { name?: string; message?: string }
    if (name && name !== 'Error') return name
    if (message) return message
  }
  return String(error)
}

let nextId = 0

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  notify: (kind, message) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }))
    // Bare setTimeout, not window.setTimeout: this store is otherwise pure
    // state and shouldn't require a DOM global to be importable.
    setTimeout(() => get().dismiss(id), DISMISS_AFTER_MS[kind])
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

/**
 * Runs a database mutation, surfacing any failure to the user instead of
 * leaving it as an unhandled rejection.
 *
 * IndexedDB is not the reliable local store it looks like: writes reject when
 * the origin is over quota, when Safari is in private mode, and when the
 * browser evicts storage under pressure. Without this, a failed save looked
 * exactly like a successful one — the click simply did nothing.
 *
 * Returns true when the action committed, so callers can avoid clearing a form
 * whose contents were never actually saved.
 */
export async function runDbAction(
  action: () => Promise<unknown>,
  options: { errorMessage: string; successMessage?: string } = {
    errorMessage: 'Something went wrong.',
  },
): Promise<boolean> {
  const { notify } = useToastStore.getState()
  try {
    await action()
    if (options.successMessage) notify('success', options.successMessage)
    return true
  } catch (error) {
    // The full error goes to the console for debugging; the toast gets a short
    // reason. Dexie wraps failures and its `message` often repeats the name
    // ("QuotaExceededError: QuotaExceededError: ..."), which is noise on screen.
    console.error(options.errorMessage, error)
    notify('error', `${options.errorMessage} (${describeError(error)})`)
    return false
  }
}
