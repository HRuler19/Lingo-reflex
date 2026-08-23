import { useEffect, useState } from 'react'

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 *
 * Used to keep per-keystroke work off the critical path — the Add Word /
 * Add Phrase duplicate check runs an indexed IndexedDB lookup, and without
 * this it fired once per character typed, so entering a ten-letter word cost
 * ten queries to answer one question.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // Each new value cancels the pending update, so only the final value in a
    // burst of typing is ever committed.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
