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
  },
})
