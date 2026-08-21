import { describe, expect, it } from 'vitest'
import { decodeTranslations, encodeTranslations } from './backup'

describe('encodeTranslations / decodeTranslations', () => {
  it('round-trips plain translations', () => {
    const translations = ['Yadawsyz', 'Amansyz']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('preserves a literal semicolon inside a translation (regression)', () => {
    // Previously encoded via `.join('; ')` and decoded via `.split(';')` with
    // no escaping, so this would come back as two translations instead of one.
    const translations = ['wait; then go']
    const encoded = encodeTranslations(translations)
    expect(decodeTranslations(encoded)).toEqual(translations)
  })

  it('preserves a literal backslash', () => {
    const translations = ['C:\\Users\\path']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('round-trips a mix of translations, some with semicolons and backslashes', () => {
    const translations = ['a; b', 'c\\d', 'plain', 'semi;colon\\and\\backslash']
    expect(decodeTranslations(encodeTranslations(translations))).toEqual(translations)
  })

  it('still splits plain unescaped semicolons the old export format used', () => {
    // Backward compatibility: a file exported before escaping existed has no
    // backslash sequences, so decoding it must behave like a plain split.
    expect(decodeTranslations('Yadawsyz; Amansyz')).toEqual(['Yadawsyz', 'Amansyz'])
  })
})
