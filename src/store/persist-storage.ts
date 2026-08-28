import type { StateStorage } from 'zustand/middleware'

/**
 * Backing storage for the app's persisted zustand stores.
 *
 * `persist` defaults to `createJSONStorage(() => localStorage)`, which guards
 * only against the getter *throwing* — the Safari-private-mode case. It does
 * nothing when `localStorage` resolves to `undefined` instead: the JSON
 * storage is built around that undefined value, and the next `setState` dies
 * on `undefined.setItem`, taking the whole app down on its first write.
 *
 * That is not hypothetical. Node exposes its own `localStorage` global which
 * is `undefined` unless the process was started with `--localstorage-file`,
 * and the jsdom test environment inherits it — so on a current Node every
 * component test crashed before asserting anything.
 *
 * Resolving through here instead means an unusable storage degrades to an
 * in-memory one: state stops surviving a reload, which is the right outcome
 * when the browser is refusing to store anything anyway, and is a great deal
 * better than crashing.
 */

function createMemoryStorage(): StateStorage {
  const entries = new Map<string, string>()
  return {
    getItem: (name) => entries.get(name) ?? null,
    setItem: (name, value) => {
      entries.set(name, value)
    },
    removeItem: (name) => {
      entries.delete(name)
    },
  }
}

function probeStorage(): StateStorage {
  try {
    const candidate = globalThis.localStorage
    if (!candidate) return createMemoryStorage()
    // Being present is not the same as being usable: a browser with site data
    // blocked exposes the object and throws only once you touch it, so the
    // probe has to be a real write.
    const key = '__lexipulse_storage_probe__'
    candidate.setItem(key, key)
    candidate.removeItem(key)
    return candidate
  } catch {
    return createMemoryStorage()
  }
}

let resolved: StateStorage | undefined

/**
 * The storage every persisted store should be built on. Resolved once and
 * shared, so the write probe runs a single time per session and every store
 * agrees on where state lives.
 */
export function safeLocalStorage(): StateStorage {
  resolved ??= probeStorage()
  return resolved
}
