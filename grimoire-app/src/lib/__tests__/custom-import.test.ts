import { describe, it, expect } from 'vitest'
import { isValidImportCanonicalName, validateEntityRow, dedupeAndValidate } from '../custom-import'

describe('isValidImportCanonicalName', () => {
  it('accepts lowercase letters, numbers, hyphens, and dots', () => {
    expect(isValidImportCanonicalName('custom.deity.example-name')).toBe(true)
    expect(isValidImportCanonicalName('a1')).toBe(true)
  })

  it('rejects uppercase, spaces, and a leading dot/hyphen', () => {
    expect(isValidImportCanonicalName('Custom.Deity')).toBe(false)
    expect(isValidImportCanonicalName('custom deity')).toBe(false)
    expect(isValidImportCanonicalName('.custom.deity')).toBe(false)
    expect(isValidImportCanonicalName('-custom.deity')).toBe(false)
    expect(isValidImportCanonicalName('')).toBe(false)
  })
})

describe('validateEntityRow', () => {
  it('accepts a minimal valid row and fills in defaults', () => {
    const result = validateEntityRow({
      canonicalName: 'custom.herb.mint',
      entityType: 'herb',
      displayName: 'Mint',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.userNotes).toBe('')
      expect(result.value.tags).toEqual([])
      expect(result.value.extendedData).toEqual({})
      expect(result.value.links).toEqual([])
    }
  })

  it('accepts a full row including arbitrary extendedData and links', () => {
    const result = validateEntityRow({
      canonicalName: 'custom.deity.example',
      entityType: 'deity',
      displayName: 'Example',
      description: 'desc',
      userNotes: 'notes',
      tags: ['a', 'b'],
      extendedData: { domain: 'wisdom', count: 3, nested: { x: true } },
      links: [{ target: 'astrology.planet.mercury', label: 'associated-with', bidirectional: true, note: 'n' }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.extendedData).toEqual({ domain: 'wisdom', count: 3, nested: { x: true } })
      expect(result.value.links).toEqual([
        { target: 'astrology.planet.mercury', label: 'associated-with', bidirectional: true, note: 'n' },
      ])
    }
  })

  it('rejects a row missing required fields', () => {
    expect(validateEntityRow({ entityType: 'herb', displayName: 'Mint' }).ok).toBe(false)
    expect(validateEntityRow({ canonicalName: 'custom.herb.mint', displayName: 'Mint' }).ok).toBe(false)
    expect(validateEntityRow({ canonicalName: 'custom.herb.mint', entityType: 'herb' }).ok).toBe(false)
  })

  it('rejects a malformed canonicalName', () => {
    const result = validateEntityRow({ canonicalName: 'Not Valid!', entityType: 'herb', displayName: 'Mint' })
    expect(result.ok).toBe(false)
  })

  it('rejects non-object rows', () => {
    expect(validateEntityRow('a string').ok).toBe(false)
    expect(validateEntityRow(null).ok).toBe(false)
    expect(validateEntityRow(['array']).ok).toBe(false)
  })

  it('drops individual links missing target or label instead of failing the whole row', () => {
    const result = validateEntityRow({
      canonicalName: 'custom.herb.mint',
      entityType: 'herb',
      displayName: 'Mint',
      links: [
        { target: 'astrology.planet.mercury', label: 'associated-with' },
        { target: 'astrology.planet.mercury' },   // missing label — dropped
        { label: 'associated-with' },              // missing target — dropped
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.links).toHaveLength(1)
  })
})

describe('dedupeAndValidate', () => {
  it('reports the second occurrence of a repeated canonicalName as skipped', () => {
    const { valid, results } = dedupeAndValidate([
      { canonicalName: 'custom.herb.mint', entityType: 'herb', displayName: 'Mint' },
      { canonicalName: 'custom.herb.mint', entityType: 'herb', displayName: 'Mint (dup)' },
    ])
    expect(valid).toHaveLength(1)
    expect(valid[0]?.displayName).toBe('Mint')
    expect(results).toEqual([
      { canonicalName: 'custom.herb.mint', status: 'skipped', message: 'Duplicate canonical name in this file.' },
    ])
  })

  it('reports invalid rows individually without dropping the rest of the batch', () => {
    const { valid, results } = dedupeAndValidate([
      { canonicalName: 'custom.herb.mint', entityType: 'herb', displayName: 'Mint' },
      { canonicalName: 'custom.herb.sage' }, // missing entityType/displayName
      { canonicalName: 'custom.herb.thyme', entityType: 'herb', displayName: 'Thyme' },
    ])
    expect(valid.map(v => v.canonicalName)).toEqual(['custom.herb.mint', 'custom.herb.thyme'])
    expect(results).toHaveLength(1)
    expect(results[0]?.canonicalName).toBe('custom.herb.sage')
    expect(results[0]?.status).toBe('skipped')
  })

  it('recovers the canonicalName for reporting even when other fields are invalid', () => {
    const { results } = dedupeAndValidate([
      { canonicalName: 'custom.herb.sage', entityType: '', displayName: 'Sage' },
    ])
    expect(results[0]?.canonicalName).toBe('custom.herb.sage')
  })
})
