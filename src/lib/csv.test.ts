import { describe, expect, it } from 'vitest'
import { parseCsv, toCsv } from './csv'

describe('toCsv', () => {
  it('joins rows with CRLF and fields with commas', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv([['plain', 'has,comma', 'has"quote', 'has\nnewline']])
    expect(csv).toBe('plain,"has,comma","has""quote","has\nnewline"')
  })
})

describe('parseCsv', () => {
  it('parses a simple grid', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('unescapes quoted fields with embedded commas and doubled quotes', () => {
    const rows = parseCsv('plain,"has,comma","has""quote"""')
    expect(rows).toEqual([['plain', 'has,comma', 'has"quote"']])
  })

  it('handles a trailing row with no final newline', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('round-trips arbitrary values through toCsv -> parseCsv', () => {
    const original = [
      ['type', 'text', 'translations'],
      ['word', 'As far as I know', 'Meň bilşime görä, komma test'],
      ['phrase', 'Quote "test"', 'multi\nline'],
    ]
    expect(parseCsv(toCsv(original))).toEqual(original)
  })

  it('drops fully blank lines', () => {
    expect(parseCsv('a,b\n\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })
})
