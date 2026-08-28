# LexiPulse Project Instructions

## Project Overview

**LexiPulse** is a local-first, offline-capable, serverless universal language
learning and speed-reflex typing web application. The core objective is to
build vocabulary and daily phrases using active recall and time-pressured
typing exercises, combined with deep analytics to foster discipline and
obsession.

---

## Technical Stack & Architecture

As built (this section records what was chosen, not what was on the menu):

- **Framework:** React + Vite, routed with HashRouter so every shell resolves
  routes from one on-disk entry point
- **Styling:** Tailwind CSS + Shadcn UI (on Base UI) + Lucide Icons
- **State Management:** Zustand
- **Database (Local NoSQL):** IndexedDB via Dexie.js
  (strictly client-side, offline, no backend server)
- **Charts/Analytics:** hand-rolled SVG (`components/dashboard/chart-math.ts`).
  Recharts was the original pick and was dropped — it cost ~110KB gzip, about
  95% of the Dashboard bundle, to draw two area charts and one bar chart.
- **Theme:** Dark/Light mode toggle in Header (persisted in LocalStorage)
- **Packaging:** PWA for the web, Capacitor for iOS/Android, Tauri for desktop

---

## Core Data Schema (NoSQL Document Structure)

### 1. Language Pair Collection

```json
{
  "id": "pair_en_tk",
  "sourceLanguage": "English",
  "targetLanguage": "Turkmen",
  "createdAt": 1775836800000
}
```

### 2. Words Collection

```json
{
  "id": "w_101",
  "pairId": "pair_en_tk",
  "term": "Relentless",
  "translations": ["Yadawsyz", "Amansyz"],
  "createdAt": 1775836800000,
  "stats": { "correct": 0, "wrong": 0 }
}
```

### 3. Phrases Collection

```json
{
  "id": "p_201",
  "pairId": "pair_en_tk",
  "phrase": "As far as I know",
  "translations": ["Meň bilşime görä"],
  "createdAt": 1775836800000,
  "stats": { "correct": 0, "wrong": 0 }
}
```

### 4. Game Sessions Collection

```json
{
  "id": "s_301",
  "pairId": "pair_en_tk",
  "mode": "WORDS_ONLY" | "PHRASES_ONLY" | "HYBRID",
  "direction": "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE" | "MIXED",
  "totalDurationSec": 300,
  "usedDurationSec": 300,
  "timePerItemSec": 10,
  "totalItems": 25,
  "correctCount": 22,
  "wrongCount": 3,
  "avgResponseTimeMs": 3400,
  "timestamp": 1775836800000
}
```

---

## Navigation & Page Requirements

### 1. Header Area

- Global Language Pair Selector (switch between EN-TK, DE-EN, etc.)
- Dark/Light Mode instant toggle

### 2. Navigation Items (Sidebar)

#### [1] 📊 Dashboard (Analytics & Discipline Hub)

- KPI Cards: Total Words Count, Total Phrases Count, Total Practice Time,
  Overall Accuracy %, Day Streak.
- Filters: Day, Week, Month, Year, All Time.
- Charts:
  - Activity Heatmap (GitHub-style consistency map).
  - Accuracy & Speed Trends.
  - Words vs. Phrases Mastery comparison.

#### [2] ➕ Add Word

- Inputs: English Word and Translation (Turkmen/Turkish).
- Real-time Duplicate Checking: as the user types, check local database. If
  the word exists, show a warning badge with existing translations and allow
  appending a new translation.

#### [3] 💬 Add Phrase

- Inputs: English Phrase/Sentence and Translation.
- Same real-time duplicate check mechanics as the Add Word page.

#### [4] ⚡ Speed Practice Arena

- **Pre-Game Configuration Modal:**
  - Game Type: Words Only, Phrases Only, or Hybrid (Words + Phrases).
  - Direction: Source -> Target, Target -> Source (Reverse), or Mixed, which
    rolls the direction independently per item.
  - Session Duration: 3m, 5m, 10m, 15m, 30m, 1h.
  - Per-Item Time Limit (Difficulty): 5s, 10s, 20s, 30s, 1m.
  - Practice Scope: the whole library, the N most recently added entries, or
    the N answered wrong most often.
- **Game Screen:**
  - Clean focus mode. Auto-focused input field.
  - Real-time countdown timer bar.
  - Immediate skip to next item upon typing the correct answer without delay.
  - Keyboard shortcuts: Enter (Submit/Next), Esc (End game early and save
    stats).
- **Post-Game Result View:** detailed stats including correct/wrong
  breakdown, avg response time, and accuracy rate.

#### [5] 📚 Library

- Tabbed list view for Words and Phrases with search, filter, and delete
  capabilities.

#### [6] ⚙️ Settings (Portability & Management)

- Universal Language Pair Manager (add/remove pairs like EN-TK, DE-EN).
- Export Data: one-click JSON full backup export and CSV export.
- Import Data: JSON/CSV upload parser to restore or transfer database across
  devices without data loss. The file is untrusted input — every record is
  validated before it is written, and the import confirms first, because it
  merges over (and can overwrite) what is already stored.
- Clear/Reset database option.

---

## Development Principles & Guidelines

- **Zero External Backend Dependencies:** all storage operations must use
  client-side NoSQL (IndexedDB/RxDB/Dexie).
- **Keyboard-First Experience:** Practice Arena must operate seamlessly via
  keyboard without requiring mouse clicks.
- **Performance First:** typing verification and next-item transitions must
  execute instantly (sub-10ms delay).
- **Clean Modular UI:** use Tailwind CSS with clean, modern components and
  clear visual feedback for correct/incorrect inputs.
