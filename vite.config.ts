import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The desktop shell (Tauri) serves the bundle from its own protocol at the
// root, so asset paths stay absolute exactly like the web and Capacitor
// builds. What it doesn't want is the service worker: everything is already
// on disk with nothing to fetch, so a SW would only add a caching layer that
// can go stale against a bundled app.
const isTauri = process.env.BUILD_TARGET === 'tauri'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    !isTauri && VitePWA({
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
