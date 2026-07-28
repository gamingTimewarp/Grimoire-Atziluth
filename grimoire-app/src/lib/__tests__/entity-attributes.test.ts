import { describe, it, expect } from 'vitest'
import type { BaseEntity, StorageAdapter } from '@grimoire/core'
import {
  looksLikeCanonicalName, formatFieldLabel, formatLinkLabel,
  getAttributeEntries, resolveAttributeValue, hasSymbolicArt,
} from '../entity-attributes'

// ─── looksLikeCanonicalName ─────────────────────────────────────────────────────

describe('looksLikeCanonicalName', () => {
  it('accepts real canonical-name shapes', () => {
    expect(looksLikeCanonicalName('tarot.major.rws.the-fool')).toBe(true)
    expect(looksLikeCanonicalName('astrology.planet.mars')).toBe(true)
    expect(looksLikeCanonicalName('chakra.classical.muladhara')).toBe(true)
  })

  it('rejects plain display text', () => {
    expect(looksLikeCanonicalName('Muladhara (Root)')).toBe(false)  // spaces, parens, capitals
    expect(looksLikeCanonicalName('cattle, wealth')).toBe(false)     // comma, space
    expect(looksLikeCanonicalName('Fire')).toBe(false)               // capitalized, no dots
    expect(looksLikeCanonicalName('single-segment')).toBe(false)     // <2 dots
    expect(looksLikeCanonicalName('two.segments')).toBe(false)       // needs >=3 segments
  })
})

// ─── formatFieldLabel / formatLinkLabel ─────────────────────────────────────────

describe('formatFieldLabel', () => {
  it('splits camelCase into title case', () => {
    expect(formatFieldLabel('cardNumber')).toBe('Card Number')
    expect(formatFieldLabel('gdTarotCard')).toBe('Gd Tarot Card')
  })

  it('strips a trailing CN suffix', () => {
    expect(formatFieldLabel('elementCN')).toBe('Element')
  })

  it('capitalizes a single lowercase word', () => {
    expect(formatFieldLabel('meaning')).toBe('Meaning')
  })
})

describe('formatLinkLabel', () => {
  it('title-cases kebab-case link labels', () => {
    expect(formatLinkLabel('gd-tarot-letter')).toBe('Gd Tarot Letter')
    expect(formatLinkLabel('corresponds-to')).toBe('Corresponds To')
  })
})

// ─── getAttributeEntries ────────────────────────────────────────────────────────

describe('getAttributeEntries', () => {
  it('excludes layout-only keys', () => {
    const entries = getAttributeEntries({ treeX: 1, treeY: 2, hue: 30, meaning: 'ox' })
    expect(entries).toEqual([['meaning', 'ox']])
  })

  it('excludes null/undefined/empty-string values', () => {
    const entries = getAttributeEntries({ a: null, b: undefined, c: '', d: 'kept' })
    expect(entries).toEqual([['d', 'kept']])
  })

  it('substitutes a *CN sibling value in place of the plain field', () => {
    const entries = getAttributeEntries({ element: 'Fire', elementCN: 'astrology.element.fire' })
    expect(entries).toEqual([['element', 'astrology.element.fire']])
  })

  it('keeps the plain value when no *CN sibling exists', () => {
    const entries = getAttributeEntries({ meaning: 'ox, strength' })
    expect(entries).toEqual([['meaning', 'ox, strength']])
  })
})

// ─── resolveAttributeValue ──────────────────────────────────────────────────────

function makeEntity(overrides: Partial<BaseEntity> = {}): BaseEntity {
  return {
    id: 'id-1',
    canonicalName: 'tarot.major.rws.the-fool',
    entityType: 'tarot.card',
    primaryDisplayName: 'The Fool',
    secondaryNames: [],
    tags: [],
    extendedData: {},
    isBuiltIn: true,
    ...overrides,
  } as BaseEntity
}

function makeAdapter(entity: BaseEntity | null): StorageAdapter {
  return {
    getEntityByCanonicalName: async () => entity,
  } as unknown as StorageAdapter
}

describe('resolveAttributeValue', () => {
  it('resolves a canonical-name-shaped value to the target entity\'s display name', async () => {
    const target = makeEntity()
    const adapter = makeAdapter(target)
    const result = await resolveAttributeValue('tarot.major.rws.the-fool', adapter, {})
    expect(result).toEqual({ display: 'The Fool', linkTarget: 'tarot.major.rws.the-fool' })
  })

  it('falls back to the raw string when a canonical-name-shaped value has no matching entity', async () => {
    const adapter = makeAdapter(null)
    const result = await resolveAttributeValue('astrology.planet.made-up', adapter, {})
    expect(result).toEqual({ display: 'astrology.planet.made-up' })
  })

  it('passes plain strings through unresolved', async () => {
    const adapter = makeAdapter(null)
    const result = await resolveAttributeValue('cattle, wealth', adapter, {})
    expect(result).toEqual({ display: 'cattle, wealth' })
  })

  it('formats booleans as Yes/No', async () => {
    const adapter = makeAdapter(null)
    expect(await resolveAttributeValue(true, adapter, {})).toEqual({ display: 'Yes' })
    expect(await resolveAttributeValue(false, adapter, {})).toEqual({ display: 'No' })
  })

  it('takes the first element of an array value', async () => {
    const adapter = makeAdapter(null)
    const result = await resolveAttributeValue(['wealth', 'abundance'], adapter, {})
    expect(result).toEqual({ display: 'wealth' })
  })

  it('returns null for empty/missing values', async () => {
    const adapter = makeAdapter(null)
    expect(await resolveAttributeValue(null, adapter, {})).toBeNull()
    expect(await resolveAttributeValue(undefined, adapter, {})).toBeNull()
    expect(await resolveAttributeValue('', adapter, {})).toBeNull()
    expect(await resolveAttributeValue([], adapter, {})).toBeNull()
  })
})

// ─── hasSymbolicArt ─────────────────────────────────────────────────────────────

describe('hasSymbolicArt', () => {
  it('is true for entity types with a dedicated EntityArt renderer', () => {
    expect(hasSymbolicArt('astrology.zodiac-sign')).toBe(true)
    expect(hasSymbolicArt('letter.hebrew')).toBe(true)
    expect(hasSymbolicArt('colour.colour')).toBe(true)
    expect(hasSymbolicArt('tarot.card')).toBe(true)   // via artGroupForEntityType
    expect(hasSymbolicArt('rune')).toBe(true)
    expect(hasSymbolicArt('geomancy.figure')).toBe(true)
  })

  it('is false for entity types with no visual renderer', () => {
    expect(hasSymbolicArt('qabalah.sephira')).toBe(false)
    expect(hasSymbolicArt('goetia.demon')).toBe(false)
    expect(hasSymbolicArt('chakra')).toBe(false)
  })
})
