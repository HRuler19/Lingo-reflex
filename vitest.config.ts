import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Deliberately separate from vite.config.ts: the app config carries the PWA
// build plugin, which has no business running during a test pass.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
