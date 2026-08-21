/** Minimal RFC 4180-ish CSV encode/decode — no external dependency needed for this. */

// Cell values are free-text words/phrases/translations — including ones a
// user imported from someone else's file. Spreadsheet apps treat a cell
// starting with any of these as a formula, so a shared "vocab list" could
// smuggle in something like `=HYPERLINK(...)` that runs when the *victim*
// later re-exports their own library and opens it in Excel/Sheets. Prefixing
// with a single quote is the standard CSV/formula-injection mitigation
// (OWASP) — spreadsheet apps display it but don't evaluate the cell.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function toCsvField(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(toCsvField).join(',')).join('\r\n')
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
    } else if (char === ',') {
      row.push(field)
      field = ''
      i += 1
    } else if (char === '\r') {
      i += 1
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
    } else {
      field += char
      i += 1
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell !== ''))
}
