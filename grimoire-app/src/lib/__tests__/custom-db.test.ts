import { describe, it, expect } from 'vitest'
import { generateDeckCanonicalName } from '../custom-db'

describe('generateDeckCanonicalName', () => {
  it('produces a valid custom.deck.* canonical name from a display name', () => {
    const cn = generateDeckCanonicalName('My Majors + Runes')
    expect(cn).toMatch(/^custom\.deck\.my-majors-runes-[a-z0-9]+$/)
  })

  it('falls back to a plain slug when the display name has no usable characters', () => {
    const cn = generateDeckCanonicalName('!!!')
    expect(cn).toMatch(/^custom\.deck\.deck-[a-z0-9]+$/)
  })

  it('generates a different canonical name on each call, even for the same display name', () => {
    const a = generateDeckCanonicalName('My Deck')
    const b = generateDeckCanonicalName('My Deck')
    expect(a).not.toBe(b)
  })

  it('never contains uppercase letters, spaces, or consecutive hyphens', () => {
    const cn = generateDeckCanonicalName('Weird   Name -- With Spaces')
    expect(cn).toBe(cn.toLowerCase())
    expect(cn).not.toMatch(/\s/)
    expect(cn).not.toMatch(/--/)
  })
})
