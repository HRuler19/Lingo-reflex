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
