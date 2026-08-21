import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Electron loads the built app straight off disk via file://, where an
// absolute asset path like "/assets/x.js" resolves against the filesystem
// root instead of dist/ — so that build needs relative ("./assets/x.js")
// paths instead. Every other target (a real web host, Capacitor's local
// server) wants root-absolute paths, so this only flips for the dedicated
// `build:electron` script, never the default build.
const isElectron = process.env.BUILD_TARGET === 'electron'

// https://vite.dev/config/
export default defineConfig({
  base: isElectron ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    // No service worker in the Electron build: the whole app is already
    // bundled on disk with nothing to fetch over a network, so there's
    // nothing for a SW to usefully cache — just another moving part that
    // could fight with file:// loading for no benefit.
    !isElectron && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LexiPulse',
        short_name: 'LexiPulse',
        description:
          'Local-first vocabulary and phrase trainer with time-pressured typing practice.',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is bundled at build time (Dexie/IndexedDB
        // is local, there's no API), so precaching the build output is
        // enough for the app shell to load with no network at all.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
