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

## Data portability

Settings → Data Portability supports:

- **JSON** — a full backup (every pair, word, phrase, session) for restoring
  on this same app.
- **CSV** — words and phrases only, keyed by language name rather than
  internal id, for moving vocabulary to or from spreadsheets and other
  tools. Language pairs are matched or created by name on import, and
  matching words/phrases are merged rather than duplicated.
