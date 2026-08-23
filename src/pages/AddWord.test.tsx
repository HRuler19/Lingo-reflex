// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddWord } from './AddWord'
import { db } from '@/db/schema'
import { useToastStore } from '@/store/toast-store'
import { resetDatabase, seedPair, seedWord } from '@/test/setup-db'

// fake-indexeddb plus several live queries settling is slower than the 1s
// Testing Library default, and a premature assertion here reads as a product
// bug rather than a timing one.
const DB_TIMEOUT = { timeout: 5000 }

async function typeWord(
  user: ReturnType<typeof userEvent.setup>,
  term: string,
  translation: string,
) {
  await user.type(screen.getByLabelText('Word'), term)
  await user.type(screen.getByLabelText('Translation'), translation)
  const save = screen.getByRole('button', { name: /save word/i })
  // The submit button is disabled until both fields have content; typing is
  // async, so wait for it to actually be clickable.
  await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false))
  await user.click(save)
}

describe('AddWord', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('will not let you save without a language pair selected', async () => {
    render(<AddWord />)
    expect(await screen.findByText(/select a language pair/i)).toBeTruthy()
    expect(screen.getByLabelText('Word').hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /save word/i }).hasAttribute('disabled')).toBe(true)
  })

  it('saves a word to the database and clears the form', async () => {
    const pairId = await seedPair()
    const user = userEvent.setup()
    render(<AddWord />)

    await typeWord(user, 'Relentless', 'Yadawsyz')

    await waitFor(async () => {
      const saved = await db.words.where('pairId').equals(pairId).toArray()
      expect(saved).toHaveLength(1)
      expect(saved[0]).toMatchObject({ term: 'Relentless', translations: ['Yadawsyz'] })
    }, DB_TIMEOUT)
    await waitFor(() => {
      expect((screen.getByLabelText('Word') as HTMLInputElement).value).toBe('')
    }, DB_TIMEOUT)
  })

  it('trims surrounding whitespace rather than storing it', async () => {
    const pairId = await seedPair()
    const user = userEvent.setup()
    render(<AddWord />)

    await typeWord(user, '  Relentless  ', '  Yadawsyz  ')

    await waitFor(async () => {
      const [saved] = await db.words.where('pairId').equals(pairId).toArray()
      expect(saved?.term).toBe('Relentless')
      expect(saved?.translations).toEqual(['Yadawsyz'])
    }, DB_TIMEOUT)
  })

  it('warns about a duplicate and appends the translation instead of creating a second row', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<AddWord />)

    await user.type(screen.getByLabelText('Word'), 'Relentless')
    expect(await screen.findByText(/this word already exists/i)).toBeTruthy()

    await user.type(screen.getByLabelText('Translation'), 'Amansyz')
    await user.click(screen.getByRole('button', { name: /save word/i }))

    await waitFor(async () => {
      const rows = await db.words.where('pairId').equals(pairId).toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0].translations).toEqual(['Yadawsyz', 'Amansyz'])
    }, DB_TIMEOUT)
  })

  it('does not duplicate a translation that is already recorded', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<AddWord />)

    await typeWord(user, 'Relentless', 'Yadawsyz')

    await waitFor(async () => {
      const [row] = await db.words.where('pairId').equals(pairId).toArray()
      expect(row.translations).toEqual(['Yadawsyz'])
    }, DB_TIMEOUT)
  })

  it('does not create a duplicate when submitted before the debounced check catches up', async () => {
    // The duplicate warning is debounced, so a fast typist can submit while it
    // still reads "new word". The write path has to re-check for itself.
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<AddWord />)

    await user.type(screen.getByLabelText('Word'), 'Relentless')
    await user.type(screen.getByLabelText('Translation'), 'Amansyz')
    const save = screen.getByRole('button', { name: /save word/i })
    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false))
    // Submit immediately, without waiting for the debounce to settle.
    await user.click(save)

    await waitFor(async () => {
      const rows = await db.words.where('pairId').equals(pairId).toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0].translations).toEqual(['Yadawsyz', 'Amansyz'])
    }, DB_TIMEOUT)
  })

  it('keeps what you typed when the write fails, and says so', async () => {
    // Regression guard: a rejected IndexedDB write used to clear the form and
    // report nothing, so the word was simply lost.
    await seedPair()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(db.words, 'add').mockRejectedValueOnce(
      Object.assign(new Error('quota'), { name: 'QuotaExceededError' }),
    )

    const user = userEvent.setup()
    render(<AddWord />)
    await typeWord(user, 'Relentless', 'Yadawsyz')

    await waitFor(() => {
      const [toast] = useToastStore.getState().toasts
      expect(toast?.kind).toBe('error')
      expect(toast?.message).toContain('Could not save "Relentless"')
    }, DB_TIMEOUT)
    expect((screen.getByLabelText('Word') as HTMLInputElement).value).toBe('Relentless')
    expect((screen.getByLabelText('Translation') as HTMLInputElement).value).toBe('Yadawsyz')
  })

  it('lists recently added words, newest first', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Older', ['Köne'])
    await new Promise((r) => setTimeout(r, 5))
    await seedWord(pairId, 'Newer', ['Täze'])

    render(<AddWord />)

    // Assert on document order of the rendered entries rather than walking up
    // to a container by DOM shape, which breaks whenever the markup nests
    // differently.
    const newer = await screen.findByText('Newer')
    const older = await screen.findByText('Older')
    const position = newer.compareDocumentPosition(older)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
