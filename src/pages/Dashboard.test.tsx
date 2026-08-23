// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from './Dashboard'
import { db, type GameSession } from '@/db/schema'
import { resetDatabase, seedPair, seedPhrase, seedWord } from '@/test/setup-db'

const DAY = 24 * 60 * 60 * 1000

/**
 * Reads a KPI's number by anchoring on its label.
 *
 * Scoped to the "Key statistics" group because some labels — "Accuracy" —
 * also appear as chart labels elsewhere on the page. Within the group, the
 * value is the label's immediately preceding sibling.
 */
function kpiValue(label: string): string {
  const group = screen.getByRole('group', { name: 'Key statistics' })
  const labelNode = within(group).getByText(label)
  return labelNode.previousElementSibling?.textContent ?? ''
}

async function seedSession(
  pairId: string,
  overrides: Partial<GameSession> & { id: string },
) {
  await db.sessions.add({
    pairId,
    mode: 'HYBRID',
    direction: 'SOURCE_TO_TARGET',
    totalDurationSec: 300,
    usedDurationSec: 60,
    timePerItemSec: 10,
    totalItems: 10,
    correctCount: 8,
    wrongCount: 2,
    avgResponseTimeMs: 2000,
    timestamp: Date.now(),
    ...overrides,
  })
}

describe('Dashboard', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('shows zeroes rather than blanks when no pair is selected', async () => {
    render(<Dashboard />)
    expect(await screen.findByText('Total Words')).toBeTruthy()
    expect(kpiValue('Total Words')).toBe('0')
    expect(kpiValue('Accuracy')).toBe('0%')
  })

  it('counts the words and phrases of the active pair', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    await seedWord(pairId, 'Fire', ['Ot'])
    await seedPhrase(pairId, 'See you', ['Görüşeris'])

    render(<Dashboard />)

    await waitFor(() => {
      expect(kpiValue('Total Words')).toBe('2')
      expect(kpiValue('Total Phrases')).toBe('1')
    })
  })

  it('does not count another pair\'s content', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Mine', ['Meniňki'])
    await db.languagePairs.add({
      id: 'pair_other',
      sourceLanguage: 'German',
      targetLanguage: 'Turkish',
      createdAt: Date.now(),
    })
    await seedWord('pair_other', 'Theirs', ['Olaryňky'])

    render(<Dashboard />)
    await waitFor(() => expect(kpiValue('Total Words')).toBe('1'))
  })

  it('derives accuracy from attempts across sessions, not a plain average', async () => {
    // 8/10 and 1/10 is 9 correct of 20 = 45%, whereas averaging the two
    // session percentages would give 45% only by coincidence — use lopsided
    // sizes so the two differ.
    const pairId = await seedPair()
    await seedSession(pairId, { id: 's1', correctCount: 8, wrongCount: 2 })
    await seedSession(pairId, { id: 's2', correctCount: 1, wrongCount: 89 })

    render(<Dashboard />)

    // 9 correct out of 100 attempts.
    await waitFor(() => expect(kpiValue('Accuracy')).toBe('9%'))
  })

  it('totals practice time in whole minutes', async () => {
    const pairId = await seedPair()
    await seedSession(pairId, { id: 's1', usedDurationSec: 90 })
    await seedSession(pairId, { id: 's2', usedDurationSec: 150 })

    render(<Dashboard />)
    // 240s -> 4m
    await waitFor(() => expect(kpiValue('Practice Time')).toBe('4m'))
  })

  it('scopes the KPIs to the selected period', async () => {
    const pairId = await seedPair()
    await seedSession(pairId, { id: 'recent', usedDurationSec: 60, timestamp: Date.now() })
    await seedSession(pairId, {
      id: 'old',
      usedDurationSec: 600,
      timestamp: Date.now() - 40 * DAY,
    })

    const user = userEvent.setup()
    render(<Dashboard />)

    // All Time is the default and includes both sessions: 660s -> 11m.
    await waitFor(() => expect(kpiValue('Practice Time')).toBe('11m'))

    await user.click(screen.getByRole('tab', { name: 'Week' }))
    // Only the recent session falls inside a week: 60s -> 1m.
    await waitFor(() => expect(kpiValue('Practice Time')).toBe('1m'))
  })

  it('leaves the day streak alone when the period filter changes', async () => {
    // The streak is inherently "as of today" and deliberately ignores the
    // Day/Week/Month filter, unlike the session-derived KPIs.
    const pairId = await seedPair()
    await seedSession(pairId, { id: 'today', timestamp: Date.now() })
    await seedSession(pairId, { id: 'old', timestamp: Date.now() - 40 * DAY })

    const user = userEvent.setup()
    render(<Dashboard />)
    await waitFor(() => expect(kpiValue('Day Streak')).toBe('1'))

    await user.click(screen.getByRole('tab', { name: 'Day' }))
    expect(kpiValue('Day Streak')).toBe('1')
  })

  it('shows empty states for the charts until there is data', async () => {
    await seedPair()
    render(<Dashboard />)

    expect(await screen.findByText(/no activity in the last 13 weeks/i)).toBeTruthy()
    expect(await screen.findByText(/no practice attempts yet/i)).toBeTruthy()
  })

  it('reports no sessions for the chosen period, not just overall', async () => {
    const pairId = await seedPair()
    await seedSession(pairId, { id: 'old', timestamp: Date.now() - 40 * DAY })

    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('tab', { name: 'Week' }))
    expect(await screen.findAllByText(/no sessions in the last week/i)).toBeTruthy()
  })
})
