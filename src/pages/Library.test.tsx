// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Library } from './Library'
import { db } from '@/db/schema'
import { resetDatabase, seedPair, seedPhrase, seedWord } from '@/test/setup-db'

const DB_TIMEOUT = { timeout: 5000 }

describe('Library', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('asks for the library to be scoped to a pair first', async () => {
    render(<Library />)
    expect(await screen.findByText(/select a language pair/i)).toBeTruthy()
  })

  it('lists the saved words with their translations', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz', 'Amansyz'])
    render(<Library />)

    expect(await screen.findByText('Relentless')).toBeTruthy()
    expect(screen.getByText('Yadawsyz')).toBeTruthy()
    expect(screen.getByText('Amansyz')).toBeTruthy()
  })

  it('filters by search across words, and reports the filtered count', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    await seedWord(pairId, 'Water', ['Suw'])
    const user = userEvent.setup()
    render(<Library />)

    expect(await screen.findByText('Relentless')).toBeTruthy()
    await user.type(screen.getByPlaceholderText(/search/i), 'wat')

    await waitFor(() => {
      expect(screen.queryByText('Relentless')).toBeNull()
    })
    expect(screen.getByText('Water')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /words \(1\)/i })).toBeTruthy()
  })

  it('matches search case-insensitively', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<Library />)

    expect(await screen.findByText('Relentless')).toBeTruthy()
    await user.type(screen.getByPlaceholderText(/search/i), 'RELENT')
    expect(screen.getByText('Relentless')).toBeTruthy()
  })

  it('does not delete until the confirmation is accepted', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<Library />)

    await user.click(await screen.findByRole('button', { name: /delete word/i }))

    // A dialog naming the word appears, and nothing is gone yet.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/delete "Relentless"\?/i)).toBeTruthy()
    expect(await db.words.count()).toBe(1)

    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await db.words.count()).toBe(1)
  })

  it('deletes the word once confirmed', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    render(<Library />)

    await user.click(await screen.findByRole('button', { name: /delete word/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(async () => {
      expect(await db.words.count()).toBe(0)
    }, DB_TIMEOUT)
    await waitFor(() => expect(screen.queryByText('Relentless')).toBeNull())
  })

  it('keeps words and phrases in separate tabs', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    await seedPhrase(pairId, 'As far as I know', ['Meň bilşime görä'])
    const user = userEvent.setup()
    render(<Library />)

    expect(await screen.findByRole('tab', { name: /words \(1\)/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /phrases \(1\)/i })).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: /phrases/i }))
    expect(await screen.findByText('As far as I know')).toBeTruthy()
  })

  it('distinguishes an empty library from an empty search result', async () => {
    const pairId = await seedPair()
    render(<Library />)
    expect(await screen.findByText(/no words yet/i)).toBeTruthy()

    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByText('Relentless')).toBeTruthy())

    await user.type(screen.getByPlaceholderText(/search/i), 'zzzz')
    expect(await screen.findByText(/no words match your search/i)).toBeTruthy()
  })
})
