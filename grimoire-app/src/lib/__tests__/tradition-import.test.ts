import { describe, it, expect } from 'vitest'
import { validateTraditionRow, dedupeAndValidateTraditions } from '../tradition-import'

describe('validateTraditionRow', () => {
  it('accepts a minimal valid row and fills in defaults', () => {
    const result = validateTraditionRow({
      canonicalName: 'tradition.example',
      displayName: 'Example',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.relTypes).toEqual([])
    }
  })

  it('accepts a full row including relTypes', () => {
    const result = validateTraditionRow({
      canonicalName: 'tradition.example',
      displayName: 'Example',
      description: 'desc',
      relTypes: [
        { linkLabel: 'rules-over', displayName: 'Rules Over', targetEntityType: 'custom.deity', allowMultiple: true },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.relTypes).toEqual([
        { linkLabel: 'rules-over', displayName: 'Rules Over', targetEntityType: 'custom.deity', allowMultiple: true },
      ])
    }
  })

  it('rejects a row missing required fields', () => {
    expect(validateTraditionRow({ displayName: 'Example' }).ok).toBe(false)
    expect(validateTraditionRow({ canonicalName: 'tradition.example' }).ok).toBe(false)
  })

  it('rejects a malformed canonicalName', () => {
    expect(validateTraditionRow({ canonicalName: 'Not Valid!', displayName: 'Example' }).ok).toBe(false)
  })

  it('rejects non-object rows', () => {
    expect(validateTraditionRow('a string').ok).toBe(false)
    expect(validateTraditionRow(null).ok).toBe(false)
    expect(validateTraditionRow(['array']).ok).toBe(false)
  })

  it('drops individual relTypes missing linkLabel or displayName instead of failing the whole row', () => {
    const result = validateTraditionRow({
      canonicalName: 'tradition.example',
      displayName: 'Example',
      relTypes: [
        { linkLabel: 'rules-over', displayName: 'Rules Over' },
        { linkLabel: 'rules-over' },           // missing displayName — dropped
        { displayName: 'Rules Over' },          // missing linkLabel — dropped
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.relTypes).toHaveLength(1)
  })
})

describe('dedupeAndValidateTraditions', () => {
  it('reports the second occurrence of a repeated canonicalName as skipped', () => {
    const { valid, results } = dedupeAndValidateTraditions([
      { canonicalName: 'tradition.example', displayName: 'Example' },
      { canonicalName: 'tradition.example', displayName: 'Example (dup)' },
    ])
    expect(valid).toHaveLength(1)
    expect(valid[0]?.displayName).toBe('Example')
    expect(results).toEqual([
      { canonicalName: 'tradition.example', status: 'skipped', message: 'Duplicate canonical name in this file.' },
    ])
  })

  it('reports invalid rows individually without dropping the rest of the batch', () => {
    const { valid, results } = dedupeAndValidateTraditions([
      { canonicalName: 'tradition.a', displayName: 'A' },
      { canonicalName: 'tradition.b' }, // missing displayName
      { canonicalName: 'tradition.c', displayName: 'C' },
    ])
    expect(valid.map(v => v.canonicalName)).toEqual(['tradition.a', 'tradition.c'])
    expect(results).toHaveLength(1)
    expect(results[0]?.canonicalName).toBe('tradition.b')
    expect(results[0]?.status).toBe('skipped')
  })
})
