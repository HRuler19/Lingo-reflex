// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from './Settings'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { resetDatabase, seedPair, seedPhrase, seedWord } from '@/test/setup-db'

const DB_TIMEOUT = { timeout: 5000 }

async function seedSession(pairId: string) {
  await db.sessions.add({
    id: 's_test',
    pairId,
    mode: 'HYBRID',
    direction: 'SOURCE_TO_TARGET',
    totalDurationSec: 300,
    usedDurationSec: 120,
    timePerItemSec: 10,
    totalItems: 5,
    correctCount: 4,
    wrongCount: 1,
    avgResponseTimeMs: 2000,
    timestamp: Date.now(),
  })
}

describe('Settings', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('adds a language pair and selects it when none was active', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await user.type(screen.getByLabelText('Source'), 'English')
    await user.type(screen.getByLabelText('Target'), 'Turkmen')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(async () => {
      const pairs = await db.languagePairs.toArray()
      expect(pairs).toHaveLength(1)
      expect(pairs[0]).toMatchObject({ sourceLanguage: 'English', targetLanguage: 'Turkmen' })
    }, DB_TIMEOUT)

    // First pair becomes the active one, so the rest of the app has a scope.
    await waitFor(() => {
      expect(useLanguagePairStore.getState().selectedPairId).toBeTruthy()
    })
  })

  it('does not steal the active pair when one is already selected', async () => {
    const firstId = await seedPair('English', 'Turkmen')
    const user = userEvent.setup()
    render(<Settings />)

    await user.type(screen.getByLabelText('Source'), 'German')
    await user.type(screen.getByLabelText('Target'), 'Turkish')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(async () => {
      expect(await db.languagePairs.count()).toBe(2)
    }, DB_TIMEOUT)
    expect(useLanguagePairStore.getState().selectedPairId).toBe(firstId)
  })

  it('clears the form after adding, so the next pair starts blank', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await user.type(screen.getByLabelText('Source'), 'English')
    await user.type(screen.getByLabelText('Target'), 'Turkmen')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect((screen.getByLabelText('Source') as HTMLInputElement).value).toBe('')
      expect((screen.getByLabelText('Target') as HTMLInputElement).value).toBe('')
    }, DB_TIMEOUT)
  })

  it('will not add a pair with only one side filled in', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    await user.type(screen.getByLabelText('Source'), 'English')
    expect(screen.getByRole('button', { name: /^add$/i }).hasAttribute('disabled')).toBe(true)
  })

  it('deletes a pair only after confirmation, and cascades to its content', async () => {
    // The cascade is the point: orphaned words/phrases/sessions would otherwise
    // linger invisibly and keep counting toward the Dashboard totals.
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    await seedPhrase(pairId, 'As far as I know', ['Meň bilşime görä'])
    await seedSession(pairId)

    const user = userEvent.setup()
    render(<Settings />)

    await user.click(await screen.findByRole('button', { name: /delete pair/i }))
    const dialog = await screen.findByRole('dialog')

    // Nothing removed while the dialog is merely open.
    expect(await db.languagePairs.count()).toBe(1)
    expect(await db.words.count()).toBe(1)

    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(async () => {
      expect(await db.languagePairs.count()).toBe(0)
      expect(await db.words.count()).toBe(0)
      expect(await db.phrases.count()).toBe(0)
      expect(await db.sessions.count()).toBe(0)
    }, DB_TIMEOUT)

    // The deleted pair must not stay selected, or the app scopes to nothing.
    await waitFor(() => {
      expect(useLanguagePairStore.getState().selectedPairId).toBeNull()
    })
  })

  it('leaves other pairs untouched when deleting one', async () => {
    const keepId = await seedPair('English', 'Turkmen')
    await seedWord(keepId, 'Keep', ['Sakla'])
    await db.languagePairs.add({
      id: 'pair_other',
      sourceLanguage: 'German',
      targetLanguage: 'Turkish',
      createdAt: Date.now(),
    })
    await seedWord('pair_other', 'Drop', ['Düş'])

    const user = userEvent.setup()
    render(<Settings />)

    // Target the pair by what it says, not by list position: pairs come back
    // in primary-key order, which is not the order they were created in.
    const germanRow = (await screen.findByText(/German/)).closest('div') as HTMLElement
    await user.click(within(germanRow).getByRole('button', { name: /delete pair/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    await waitFor(async () => {
      expect(await db.languagePairs.count()).toBe(1)
    }, DB_TIMEOUT)
    const words = await db.words.toArray()
    expect(words.map((w) => w.term)).toEqual(['Keep'])
  })

  it('wipes everything on a confirmed reset', async () => {
    const pairId = await seedPair()
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])
    await seedSession(pairId)

    const user = userEvent.setup()
    render(<Settings />)

    await user.click(screen.getByRole('button', { name: /clear \/ reset database/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /delete everything/i }))

    await waitFor(async () => {
      expect(await db.languagePairs.count()).toBe(0)
      expect(await db.words.count()).toBe(0)
      expect(await db.sessions.count()).toBe(0)
    }, DB_TIMEOUT)
    expect(useLanguagePairStore.getState().selectedPairId).toBeNull()
  })

  /**
   * Picks a file in the hidden input. The input is visually hidden and driven
   * by a button, so the change is dispatched directly rather than by clicking
   * an element the user can't see.
   */
  function chooseFile(container: HTMLElement, file: File) {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
  }

  async function confirmImport(user: ReturnType<typeof userEvent.setup>) {
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^import$/i }))
  }

  it('imports a CSV, creating the pair and merging into existing words', async () => {
    const pairId = await seedPair('English', 'Turkmen')
    await seedWord(pairId, 'Relentless', ['Yadawsyz'])

    const csv = [
      'type,sourceLanguage,targetLanguage,text,translations,correct,wrong,createdAt',
      'word,English,Turkmen,Relentless,Amansyz,2,1,0',
      'word,English,Turkmen,Water,Suw,0,0,0',
    ].join('\r\n')

    const user = userEvent.setup()
    const { container } = render(<Settings />)
    chooseFile(container, new File([csv], 'vocab.csv', { type: 'text/csv' }))
    await confirmImport(user)

    await waitFor(async () => {
      const words = await db.words.where('pairId').equals(pairId).toArray()
      expect(words).toHaveLength(2)
      const relentless = words.find((w) => w.term === 'Relentless')
      // Merged, not duplicated, and the imported counts were added on.
      expect(relentless?.translations).toEqual(['Yadawsyz', 'Amansyz'])
      expect(relentless?.stats).toEqual({ correct: 2, wrong: 1 })
    }, DB_TIMEOUT)

    expect(await screen.findByText(/imported vocab\.csv/i)).toBeTruthy()
  })

  it('does not touch the database until the import is confirmed', async () => {
    // An import merges over what is already stored and a JSON backup
    // overwrites outright, which makes it as destructive as the deletes on
    // this page — and those all confirm first.
    await seedPair('English', 'Turkmen')
    const csv = [
      'type,sourceLanguage,targetLanguage,text,translations,correct,wrong,createdAt',
      'word,English,Turkmen,Water,Suw,0,0,0',
    ].join('\r\n')

    const user = userEvent.setup()
    const { container } = render(<Settings />)
    chooseFile(container, new File([csv], 'vocab.csv', { type: 'text/csv' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/import "vocab\.csv"\?/i)).toBeTruthy()
    expect(await db.words.count()).toBe(0)

    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await db.words.count()).toBe(0)
  })

  it('reports a malformed CSV instead of failing silently', async () => {
    await seedPair()
    const user = userEvent.setup()
    const { container } = render(<Settings />)
    chooseFile(container, new File(['nonsense,header\r\n1,2'], 'bad.csv', { type: 'text/csv' }))
    await confirmImport(user)

    expect(await screen.findByText(/missing required columns/i)).toBeTruthy()
  })

  it('refuses a JSON file that is not a backup rather than writing it', async () => {
    // The regression: whatever JSON.parse returned was written straight into
    // IndexedDB. A word with no `stats` then crashed the practice pool
    // builder, and one whose `translations` was not an array crashed the
    // Library on render — a bad import could break the app for good.
    await seedPair()
    const user = userEvent.setup()
    const { container } = render(<Settings />)
    const junk = JSON.stringify({ words: [{ id: 'w1', pairId: 'p1', term: 'Broken' }] })
    chooseFile(container, new File([junk], 'not-a-backup.json', { type: 'application/json' }))
    await confirmImport(user)

    expect(await screen.findByText(/no LexiPulse data to import/i)).toBeTruthy()
    expect(await db.words.count()).toBe(0)
  })

  it('picks the parser from the file contents, not its extension', async () => {
    // A CSV saved as .txt used to be handed to the JSON parser and reported
    // as a raw syntax error.
    await seedPair('English', 'Turkmen')
    const csv = [
      'type,sourceLanguage,targetLanguage,text,translations,correct,wrong,createdAt',
      'word,English,Turkmen,Water,Suw,0,0,0',
    ].join('\r\n')

    const user = userEvent.setup()
    const { container } = render(<Settings />)
    chooseFile(container, new File([csv], 'vocab.txt', { type: 'text/plain' }))
    await confirmImport(user)

    await waitFor(async () => {
      expect(await db.words.count()).toBe(1)
    }, DB_TIMEOUT)
  })

  it('says how many records an import refused rather than reporting a clean run', async () => {
    await seedPair('English', 'Turkmen')
    const csv = [
      'type,sourceLanguage,targetLanguage,text,translations,correct,wrong,createdAt',
      'word,English,Turkmen,Water,Suw,0,0,0',
      'word,English,Turkmen,Missing translations,,0,0,0',
    ].join('\r\n')

    const user = userEvent.setup()
    const { container } = render(<Settings />)
    chooseFile(container, new File([csv], 'partial.csv', { type: 'text/csv' }))
    await confirmImport(user)

    expect(await screen.findByText(/1 entry.*1 skipped/i)).toBeTruthy()
  })
})
