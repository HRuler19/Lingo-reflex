# LexiPulse

LexiPulse is a local-first, offline-capable, serverless vocabulary and phrase
trainer. It combines active recall with time-pressured typing practice
("Practice Arena") and tracks progress entirely in the browser — there is no
backend and no account; everything lives in IndexedDB.

The full product specification lives in [Doc.md](./Doc.md).

## Stack

- **Framework:** React 19 + TypeScript, built with Vite
- **Routing:** react-router
- **Styling / UI:** Tailwind CSS v4 + shadcn/ui (Base UI primitives)
- **State:** Zustand (theme, active language pair)
- **Database:** Dexie.js over IndexedDB — see [src/db/schema.ts](./src/db/schema.ts)
- **Charts:** Recharts
- **Native shells:** Capacitor (iOS/Android), Electron (macOS/Windows) — see
  [Running on other platforms](#running-on-other-platforms)

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint      # oxlint
npm run test      # run the Vitest suite once
npm run test:watch  # ...or in watch mode
```

## Project layout

```
src/
  db/schema.ts          Dexie database: language pairs, words, phrases, sessions
  store/                 Zustand stores (theme, active language pair)
  lib/
    practice.ts          Practice Arena pool building / answer checking
    analytics.ts          Dashboard chart/KPI data derivation
    csv.ts, backup.ts     JSON/CSV export & import
  hooks/
    use-practice-session.ts  Practice Arena game loop (timers, scoring)
  components/
    layout/               Sidebar + header app shell
    dashboard/             Chart components
    practice/               Pre-game config, game screen, results
    library/                Word/phrase edit dialog
    ui/                     shadcn/ui primitives
  pages/                  One file per route (Dashboard, Add Word, Add Phrase,
                          Practice Arena, Library, Settings)
```

## Data model

Everything is scoped to a **language pair** (e.g. English → Turkmen). Words
and phrases each carry a list of accepted translations and a running
correct/wrong count; a completed Practice Arena session is stored as a
`GameSession` record and rolls its per-item outcomes back into those counts.
See [src/db/schema.ts](./src/db/schema.ts) for the exact shape.

## Running on other platforms

The web build (`dist/`) is the single source of truth for every platform
below — none of them fork the app's logic, they just load the same built
site inside a different shell.

### iOS / Android (Capacitor)

```bash
npm run ios:open       # build, sync, open the Xcode project
npm run android:open   # build, sync, open the Android Studio project
```

Each opens the native project (`ios/`, `android/`) in its respective IDE —
run/debug from there like any native app. `npm run cap:sync` alone rebuilds
the web app and copies it into both native projects without opening
anything, for when you just changed source and already have the IDE open.

Both native projects are checked into the repo (they're config, not build
output — their own `.gitignore`s exclude the actual build artifacts:
Pods/DerivedData for iOS, `.gradle`/`build/` for Android). Building Android
requires Android Studio (which installs the SDK); iOS requires Xcode.

App icons/splash screens for both platforms are generated from
[assets/icon-only.png](./assets/icon-only.png) and
[assets/splash.png](./assets/splash.png) via `npx capacitor-assets generate`
— rerun that after changing either source image.

### Desktop (Electron — macOS & Windows)

```bash
npm run electron:dev    # run against the Vite dev server, with reload
npm run electron:pack   # build + package an unpacked app (fastest, for testing)
npm run electron:dist   # build + package installers (dmg/zip on macOS, nsis on Windows)
```

Desktop has its own build step (`build:electron`, used internally by the
`pack`/`dist` scripts) rather than reusing the plain `build` output: Electron
loads `dist/index.html` directly over `file://`, where the regular build's
root-absolute asset paths (`/assets/…`) resolve against the filesystem root
instead of `dist/`. The Electron build passes `--base ./` so asset paths are
relative, and skips the PWA service worker entirely (there is no network to
cache against inside a bundled desktop app). See
[vite.config.ts](./vite.config.ts) and [electron/main.cjs](./electron/main.cjs).

Producing a Windows build from macOS works but is unsigned; producing a
notarized macOS build needs an Apple Developer ID (electron-builder will
skip notarization if none is configured, same as it did for the unsigned
`--dir` build).

Routing note: the app uses `HashRouter`, not `BrowserRouter`, specifically
because of this multi-shell setup — a hash route never asks the host to
resolve e.g. `/practice` as a real path, so the same build works identically
whether it's served by a real web server, Capacitor's local scheme handler,
or loaded cold from `file://` in Electron.

## Data portability

Settings → Data Portability supports:

- **JSON** — a full backup (every pair, word, phrase, session) for restoring
  on this same app.
- **CSV** — words and phrases only, keyed by language name rather than
  internal id, for moving vocabulary to or from spreadsheets and other
  tools. Language pairs are matched or created by name on import, and
  matching words/phrases are merged rather than duplicated.
