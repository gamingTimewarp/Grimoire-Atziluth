import { describe, it, expect } from 'vitest'
import { getLunarEclipsesForYear, getSolarEclipsesForYear, getEclipsesForYear, eclipseLabel } from '../eclipse-engine'

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('getLunarEclipsesForYear', () => {
  it('excludes penumbral eclipses', () => {
    for (const year of [2025, 2026, 2027]) {
      for (const e of getLunarEclipsesForYear(year)) {
        expect(e.kind).not.toBe('penumbral')
      }
    }
  })

  it('matches the known 2025 total lunar eclipses (14 March, 7 September)', () => {
    const dates = getLunarEclipsesForYear(2025).map(e => dateKey(e.time))
    expect(dates).toContain('2025-03-14')
    expect(dates).toContain('2025-09-07')
  })

  it('every returned eclipse actually falls within the requested year', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      for (const e of getLunarEclipsesForYear(year)) {
        expect(e.time.getFullYear()).toBe(year)
      }
    }
  })
})

describe('getSolarEclipsesForYear', () => {
  it('matches the known 12 August 2026 total solar eclipse', () => {
    const total2026 = getSolarEclipsesForYear(2026).find(e => e.kind === 'total')
    expect(total2026).toBeDefined()
    expect(dateKey(total2026!.time)).toBe('2026-08-12')
  })

  it('every returned eclipse actually falls within the requested year', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      for (const e of getSolarEclipsesForYear(year)) {
        expect(e.time.getFullYear()).toBe(year)
      }
    }
  })

  it('reports obscuration for total/annular but not partial eclipses', () => {
    for (const year of [2025, 2026, 2027]) {
      for (const e of getSolarEclipsesForYear(year)) {
        if (e.kind === 'partial') {
          expect(e.obscuration).toBeNull()
        } else {
          expect(e.obscuration).not.toBeNull()
        }
      }
    }
  })
})

describe('getEclipsesForYear', () => {
  it('merges lunar and solar eclipses sorted chronologically', () => {
    const all = getEclipsesForYear(2026)
    expect(all.length).toBe(getLunarEclipsesForYear(2026).length + getSolarEclipsesForYear(2026).length)
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.time.getTime()).toBeGreaterThanOrEqual(all[i - 1]!.time.getTime())
    }
  })
})

describe('eclipseLabel', () => {
  it('capitalises the kind and names the eclipse type', () => {
    const e = getSolarEclipsesForYear(2026).find(x => x.kind === 'total')!
    expect(eclipseLabel(e)).toBe('Total Solar Eclipse')
  })
})

describe('EclipseInstance.visibility', () => {
  it('every lunar eclipse reports the same night-hemisphere-wide visibility', () => {
    for (const e of getLunarEclipsesForYear(2026)) {
      expect(e.visibility).toMatch(/night-side hemisphere/)
    }
  })

  it('total/annular solar eclipses give a specific peak coordinate', () => {
    for (const e of getSolarEclipsesForYear(2026)) {
      if (e.kind === 'partial') continue
      expect(e.visibility).toMatch(/°[NS], \d+°[EW]/)
    }
  })

  it('partial solar eclipses explain there is no single peak location', () => {
    for (const year of [2025, 2026, 2027]) {
      for (const e of getSolarEclipsesForYear(year)) {
        if (e.kind !== 'partial') continue
        expect(e.visibility).toMatch(/no single peak location/)
      }
    }
  })
})
