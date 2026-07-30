import { describe, it, expect } from 'vitest'
import { validateSpreadRow, dedupeAndValidateSpreads } from '../spread-import'

describe('validateSpreadRow', () => {
  it('accepts a minimal free-form row and fills in defaults', () => {
    const result = validateSpreadRow({ displayName: 'Free Form' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.positions).toEqual([])
    }
  })

  it('accepts a full row including positions', () => {
    const result = validateSpreadRow({
      displayName: 'Three Card',
      description: 'desc',
      positions: [
        { name: 'Past', meaning: 'm1', drawOrder: 1, orientationRule: 'upright-reversed', x: 0, y: 0, z: 0 },
        { name: 'Future', meaning: 'm2', drawOrder: 2, orientationRule: 'none', x: 1, y: 0, z: 0 },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.positions).toHaveLength(2)
      expect(result.value.positions?.[0]).toEqual({ name: 'Past', meaning: 'm1', drawOrder: 1, orientationRule: 'upright-reversed', x: 0, y: 0, z: 0 })
    }
  })

  it('rejects a row missing displayName', () => {
    expect(validateSpreadRow({}).ok).toBe(false)
    expect(validateSpreadRow({ description: 'no name' }).ok).toBe(false)
  })

  it('rejects non-object rows', () => {
    expect(validateSpreadRow('a string').ok).toBe(false)
    expect(validateSpreadRow(null).ok).toBe(false)
    expect(validateSpreadRow(['array']).ok).toBe(false)
  })

  it('drops individual positions missing a name instead of failing the whole row', () => {
    const result = validateSpreadRow({
      displayName: 'Spread',
      positions: [
        { name: 'Valid' },
        { meaning: 'no name here' },
        {},
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.positions).toHaveLength(1)
  })

  it('drops an invalid orientationRule rather than accepting it', () => {
    const result = validateSpreadRow({
      displayName: 'Spread',
      positions: [{ name: 'Pos', orientationRule: 'sideways' }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.positions?.[0]?.orientationRule).toBeUndefined()
  })
})

describe('dedupeAndValidateSpreads', () => {
  it('reports the second occurrence of a repeated displayName (case-insensitive) as skipped', () => {
    const { valid, results } = dedupeAndValidateSpreads([
      { displayName: 'Three Card' },
      { displayName: 'three card' },
    ])
    expect(valid).toHaveLength(1)
    expect(results).toEqual([
      { displayName: 'three card', status: 'skipped', message: 'Duplicate display name in this file.' },
    ])
  })

  it('reports invalid rows individually without dropping the rest of the batch', () => {
    const { valid, results } = dedupeAndValidateSpreads([
      { displayName: 'A' },
      { description: 'missing displayName' },
      { displayName: 'C' },
    ])
    expect(valid.map(v => v.displayName)).toEqual(['A', 'C'])
    expect(results).toHaveLength(1)
    expect(results[0]?.status).toBe('skipped')
  })
})
