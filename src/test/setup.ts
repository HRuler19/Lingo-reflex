// Runs before any test module is imported.
//
// Dexie captures the global `indexedDB` when the database object is
// constructed, which happens at import time in src/db/schema.ts. Importing
// fake-indexeddb from inside a test file is therefore too late — the schema
// module has already been evaluated by then. A setup file is the only place
// early enough.
import 'fake-indexeddb/auto'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Testing Library only auto-registers its cleanup when a global `afterEach`
// exists, which this project doesn't have (vitest `globals` is off, so tests
// import their own). Without this, every render stacks up in the same
// document and queries start matching elements from earlier tests.
afterEach(() => {
  cleanup()
})

// jsdom has no ResizeObserver, and the charts measure their container with one
// (see components/dashboard/chart-math.ts). A stub keeps the measurement at 0,
// which is exactly what a chart renders as before its first measurement — so
// the surrounding page still mounts and can be asserted on.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub
}

// jsdom implements no media queries, and useIsMobile asks for one to decide
// between the sidebar rail and the mobile drawer. Report "not mobile", which
// is the desktop layout these tests assert against.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
