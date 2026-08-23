import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deliberately separate from vite.config.ts: the app config carries the PWA
// build plugin, which has no business running during a test pass.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Pure-logic tests run in 'node' (fast); component tests opt into jsdom
    // per-file with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // Undo vi.spyOn between tests. Without this a spy installed to simulate a
    // failed write stays attached and leaks into whatever runs next, which
    // shows up as order-dependent flakiness rather than an obvious error.
    restoreMocks: true,
    // Component tests drive a real Dexie schema over fake-indexeddb, which is
    // slower than the 5s default once several live queries are settling.
    testTimeout: 15000,
  },
})
