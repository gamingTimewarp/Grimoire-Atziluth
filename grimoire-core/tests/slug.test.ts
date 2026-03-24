import { describe, it, expect } from 'vitest'
import {
  isValidSegment,
  isValidCanonicalName,
  assertValidCanonicalName,
  toSegment,
  buildCanonicalName,
  parseCanonicalName,
  getNamespace,
} from '../src/slugs/slug.js'
import { InvalidCanonicalNameError } from '../src/utils/errors.js'

describe('isValidSegment', () => {
  it('accepts lowercase alphanumeric', () => {
    expect(isValidSegment('the-fool')).toBe(true)
    expect(isValidSegment('kether')).toBe(true)
    expect(isValidSegment('mars')).toBe(true)
    expect(isValidSegment('elder-futhark')).toBe(true)
  })

  it('rejects uppercase', () => {
    expect(isValidSegment('The-Fool')).toBe(false)
  })

  it('rejects leading/trailing hyphens', () => {
    expect(isValidSegment('-foo')).toBe(false)
    expect(isValidSegment('foo-')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidSegment('')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isValidSegment('the fool')).toBe(false)
  })
})

describe('isValidCanonicalName', () => {
  it('accepts valid namespaced slugs', () => {
    expect(isValidCanonicalName('tarot.major.the-fool')).toBe(true)
    expect(isValidCanonicalName('tradition.golden-dawn')).toBe(true)
    expect(isValidCanonicalName('qabalah.sephira.kether')).toBe(true)
  })

  it('rejects single-segment names', () => {
    expect(isValidCanonicalName('thefool')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidCanonicalName('')).toBe(false)
  })

  it('rejects names with invalid segments', () => {
    expect(isValidCanonicalName('Tarot.major.the-fool')).toBe(false)
    expect(isValidCanonicalName('tarot..the-fool')).toBe(false)
  })
})

describe('assertValidCanonicalName', () => {
  it('throws InvalidCanonicalNameError for invalid names', () => {
    expect(() => assertValidCanonicalName('')).toThrow(InvalidCanonicalNameError)
    expect(() => assertValidCanonicalName('single')).toThrow(InvalidCanonicalNameError)
    expect(() => assertValidCanonicalName('Bad.Name')).toThrow(InvalidCanonicalNameError)
  })

  it('does not throw for valid names', () => {
    expect(() => assertValidCanonicalName('tarot.major.the-fool')).not.toThrow()
  })
})

describe('toSegment', () => {
  it('lowercases and slugifies', () => {
    expect(toSegment('The Fool')).toBe('the-fool')
    expect(toSegment('Kether')).toBe('kether')
  })

  it('strips diacritics', () => {
    expect(toSegment('Atzilúth')).toBe('atziluth')
  })

  it('collapses multiple spaces/specials to single hyphen', () => {
    expect(toSegment('The  High  Priestess')).toBe('the-high-priestess')
  })

  it('strips leading/trailing hyphens', () => {
    expect(toSegment('  Foo  ')).toBe('foo')
  })
})

describe('buildCanonicalName', () => {
  it('joins valid segments with dots', () => {
    expect(buildCanonicalName('tarot', 'major', 'the-fool')).toBe('tarot.major.the-fool')
  })

  it('throws if fewer than two segments', () => {
    expect(() => buildCanonicalName('tarot')).toThrow(InvalidCanonicalNameError)
  })

  it('throws if any segment is invalid', () => {
    expect(() => buildCanonicalName('Tarot', 'major')).toThrow(InvalidCanonicalNameError)
  })
})

describe('parseCanonicalName', () => {
  it('returns the segments array', () => {
    expect(parseCanonicalName('tarot.major.the-fool')).toEqual(['tarot', 'major', 'the-fool'])
  })

  it('throws for invalid names', () => {
    expect(() => parseCanonicalName('invalid')).toThrow(InvalidCanonicalNameError)
  })
})

describe('getNamespace', () => {
  it('returns the first segment', () => {
    expect(getNamespace('tarot.major.the-fool')).toBe('tarot')
    expect(getNamespace('tradition.golden-dawn')).toBe('tradition')
  })
})
