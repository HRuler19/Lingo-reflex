import { describe, expect, it } from 'vitest'
import { parseCsv, stripFormulaGuard, toCsv } from './csv'

describe('toCsv', () => {
  it('joins rows with CRLF and fields with commas', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv([['plain', 'has,comma', 'has"quote', 'has\nnewline']])
    expect(csv).toBe('plain,"has,comma","has""quote","has\nnewline"')
  })

  it('neutralizes cells that would be read as a formula in a spreadsheet (CSV injection)', () => {
    // A field starting with = + - @ (or a leading tab/CR) is interpreted as
    // a formula by Excel/Sheets/LibreOffice when the exported CSV is opened.
    // A leading `'` is the standard mitigation: spreadsheet apps show it as
    // literal text instead of evaluating it. Check the round-tripped field
    // value rather than the raw line, since a value like `=HYPERLINK("evil")`
    // also triggers ordinary RFC 4180 quoting around the whole cell.
    for (const dangerous of ['=SUM(A1)', '+1+1', '-1+1', '@SUM(1)', '=HYPERLINK("evil")']) {
      const [[decoded]] = parseCsv(toCsv([[dangerous]]))
      expect(decoded.startsWith("'")).toBe(true)
      expect(decoded).toBe(`'${dangerous}`)
    }
  })

  it('does not touch a field that merely contains one of those characters mid-string', () => {
    expect(toCsv([['price = 5']])).toBe('price = 5')
  })
})

describe('stripFormulaGuard', () => {
  it('restores every value the export guard quoted (regression)', () => {
    // Without this the guard was not a guard but a mutation: exporting and
    // reimporting turned "- so what" into "'- so what" permanently, and each
    // further round trip added another quote.
    for (const dangerous of ['=SUM(A1)', '+1+1', '- so what', '@home', '=HYPERLINK("evil")']) {
      const [[encoded]] = parseCsv(toCsv([[dangerous]]))
      expect(stripFormulaGuard(encoded)).toBe(dangerous)
    }
  })

  it('round-trips a value that legitimately starts with an apostrophe', () => {
    // The guard covers a leading quote too, precisely so this case and a
    // guarded formula stay distinguishable on the way back in.
    for (const original of ["'tis", "''double", "'"]) {
      const [[encoded]] = parseCsv(toCsv([[original]]))
      expect(stripFormulaGuard(encoded)).toBe(original)
    }
  })

  it('leaves an unguarded value untouched', () => {
    expect(stripFormulaGuard('Relentless')).toBe('Relentless')
    expect(stripFormulaGuard('price = 5')).toBe('price = 5')
  })

  it('removes only the one quote the guard added', () => {
    expect(stripFormulaGuard("''=SUM(A1)")).toBe("'=SUM(A1)")
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
