// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PracticeArena } from './PracticeArena'
import { db } from '@/db/schema'
import { useToastStore } from '@/store/toast-store'
import { resetDatabase, seedPair, seedPhrase, seedWord } from '@/test/setup-db'
import { renderWithRouter } from '@/test/render'

const DB_TIMEOUT = { timeout: 5000 }

/**
 * Plays one prompt by reading whatever the screen is asking for and typing the
 * matching translation, rather than assuming an order — the pool is shuffled.
 */
async function answerCurrentPrompt(
  user: ReturnType<typeof userEvent.setup>,
  answers: Record<string, string>,
) {
  const input = await screen.findByPlaceholderText(/type the translation/i)
  const prompt = document.querySelector('.text-4xl')?.textContent?.trim() ?? ''
  await user.type(input, answers[prompt] ?? 'definitely-wrong')
  await user.keyboard('{Enter}')
  return prompt
}

describe('PracticeArena', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('cannot start without a language pair', async () => {
    renderWithRouter(<PracticeArena />)
    expect(await screen.findByText(/select a language pair/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /start session/i }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('refuses to start when the chosen game type has nothing to draw from', async () => {
    // A pair with only words, asked for phrases only, has an empty pool.
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)

    await user.click(await screen.findByRole('combobox', { name: 'Game Type' }))
    await user.click(await screen.findByRole('option', { name: /phrases only/i }))
    await user.click(screen.getByRole('button', { name: /start session/i }))

    expect(await screen.findByText(/add some words or phrases/i)).toBeTruthy()
    // Still on the configuration screen, not in a session.
    expect(screen.queryByPlaceholderText(/type the translation/i)).toBeNull()
  })

  it('shows how much material is available to practise', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    await seedWord(pairId, 'Fire', ['Ot'])
    await seedPhrase(pairId, 'See you', ['Görüşeris'])
    renderWithRouter(<PracticeArena />)

    expect(await screen.findByText('Words available')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy()
      expect(screen.getByText('1')).toBeTruthy()
    })
  })

  it('records the session and folds its outcomes back into per-word stats', async () => {
    // This is the part with no other coverage: applyOutcomesToStats runs a
    // transaction that increments each practised item's correct/wrong counts.
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)

    await user.click(await screen.findByRole('button', { name: /start session/i }))
    await answerCurrentPrompt(user, { Water: 'Suw' })

    // End early rather than waiting out the clock.
    await user.keyboard('{Escape}')

    await waitFor(async () => {
      const sessions = await db.sessions.where('pairId').equals(pairId).toArray()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].correctCount).toBe(1)
    }, DB_TIMEOUT)

    await waitFor(async () => {
      const [word] = await db.words.where('pairId').equals(pairId).toArray()
      expect(word.stats.correct).toBe(1)
      expect(word.stats.wrong).toBe(0)
    }, DB_TIMEOUT)
  })

  it('adds to existing stats rather than overwriting them', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    await db.words.update('w_Water', { stats: { correct: 7, wrong: 3 } })

    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)
    await user.click(await screen.findByRole('button', { name: /start session/i }))
    await answerCurrentPrompt(user, { Water: 'Suw' })
    await user.keyboard('{Escape}')

    await waitFor(async () => {
      const [word] = await db.words.where('pairId').equals(pairId).toArray()
      expect(word.stats).toEqual({ correct: 8, wrong: 3 })
    }, DB_TIMEOUT)
  })

  it('shows the results screen when the session ends', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)

    await user.click(await screen.findByRole('button', { name: /start session/i }))
    await answerCurrentPrompt(user, { Water: 'Suw' })
    await user.keyboard('{Escape}')

    expect(await screen.findByText(/here's how that round went/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /play again/i })).toBeTruthy()
  })

  it('returns to configuration on "Play Again"', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)

    await user.click(await screen.findByRole('button', { name: /start session/i }))
    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: /play again/i }))

    expect(await screen.findByText(/pre-game configuration/i)).toBeTruthy()
  })

  it('practises only the most recently added entries when scoped to a count', async () => {
    // The point of the scope: in a large library a word added today is
    // otherwise drowned out. Seed old entries plus two new ones and check
    // that a session scoped to 2 can only ever show the new ones.
    const pairId = await seedPair()
    for (let i = 0; i < 8; i++) {
      await seedWord(pairId, `old${i}`, [`köne${i}`])
      await db.words.update(`w_old${i}`, { createdAt: 1_000 + i })
    }
    await seedWord(pairId, 'Newest', ['Iň täze'])
    await db.words.update('w_Newest', { createdAt: 9_000_000 })
    await seedWord(pairId, 'Newer', ['Täze'])
    await db.words.update('w_Newer', { createdAt: 8_000_000 })

    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)
    await waitFor(() => expect(screen.getByText('10')).toBeTruthy())

    await user.click(await screen.findByRole('combobox', { name: 'Practice Scope' }))
    await user.click(await screen.findByRole('option', { name: /most recently added/i }))

    const count = await screen.findByRole('spinbutton', { name: /how many recent entries/i })
    await user.clear(count)
    await user.type(count, '2')

    await user.click(screen.getByRole('button', { name: /start session/i }))

    // Answer correctly to advance — a wrong answer deliberately re-asks the
    // same item — and collect everything the session put in front of us.
    const answers = { Newest: 'Iň täze', Newer: 'Täze' }
    const asked = new Set<string>()
    for (let turn = 0; turn < 6; turn++) {
      asked.add(await answerCurrentPrompt(user, answers))
    }
    await user.keyboard('{Escape}')

    expect([...asked].sort()).toEqual(['Newer', 'Newest'])
  })

  it('refuses to start on a scope count that is not a positive number', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])

    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)

    await user.click(await screen.findByRole('combobox', { name: 'Practice Scope' }))
    await user.click(await screen.findByRole('option', { name: /most recently added/i }))
    await user.clear(await screen.findByRole('spinbutton', { name: /how many recent entries/i }))

    expect(screen.getByRole('button', { name: /start session/i }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(await screen.findByText(/1 or more/i)).toBeTruthy()
  })

  it('tells the user when the session could not be saved', async () => {
    // A silent failure here would throw away a completed session.
    const pairId = await seedPair()
    await seedWord(pairId, 'Water', ['Suw'])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(db.sessions, 'add').mockRejectedValueOnce(new Error('disk full'))

    const user = userEvent.setup()
    renderWithRouter(<PracticeArena />)
    await user.click(await screen.findByRole('button', { name: /start session/i }))
    await user.keyboard('{Escape}')

    await waitFor(() => {
      const [toast] = useToastStore.getState().toasts
      expect(toast?.kind).toBe('error')
      expect(toast?.message).toContain('Could not save this session')
    }, DB_TIMEOUT)
  })
})
