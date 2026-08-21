import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lexipulse.app',
  appName: 'LexiPulse',
  // The native shells load the built static site straight from disk —
  // everything the app needs (Dexie/IndexedDB, no API) already works
  // offline in the browser build, so there's no dev server URL to point at.
  webDir: 'dist',
}

export default config
