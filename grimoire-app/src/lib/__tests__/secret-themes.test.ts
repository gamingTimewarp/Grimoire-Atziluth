import { describe, it, expect } from 'vitest'
import { getRevealedSeasonalThemeId, SEASONAL_THEME_PRESETS, SECRET_THEME_PRESETS } from '../secret-themes'
import { getSabbatsForYear } from '../astro-engine'

describe('SECRET_THEME_PRESETS', () => {
  it('has one entry per seasonal Sabbat plus Ain, with no duplicate ids', () => {
    const ids = SECRET_THEME_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['ostara', 'litha', 'mabon', 'yule', 'ain']))
  })

  it('every seasonal preset id matches a real solar Sabbat canonical-name segment', () => {
    const solarIds = getSabbatsForYear(2026).filter(s => s.type === 'solar').map(s => s.canonicalName.split('.').pop())
    for (const preset of SEASONAL_THEME_PRESETS) {
      expect(solarIds).toContain(preset.id)
    }
  })
})

describe('getRevealedSeasonalThemeId', () => {
  it('returns null on an ordinary day', () => {
    // Early January is nowhere near any of the four solar quarter-days.
    const midJanuary = new Date('2026-01-10T12:00:00.000Z')
    expect(getRevealedSeasonalThemeId('America/Chicago', midJanuary)).toBeNull()
  })

  it('returns "ostara" on the day of the vernal equinox, in the given zone', () => {
    const equinox = getSabbatsForYear(2026).find(s => s.canonicalName === 'calendar.sabbat.ostara')!
    expect(getRevealedSeasonalThemeId('UTC', equinox.time)).toBe('ostara')
  })

  it('returns "yule" on the day of the winter solstice', () => {
    const solstice = getSabbatsForYear(2026).find(s => s.canonicalName === 'calendar.sabbat.yule')!
    expect(getRevealedSeasonalThemeId('UTC', solstice.time)).toBe('yule')
  })

  it('returns null the day before a Sabbat, even though it is close', () => {
    const equinox = getSabbatsForYear(2026).find(s => s.canonicalName === 'calendar.sabbat.ostara')!
    const dayBefore = new Date(equinox.time.getTime() - 24 * 60 * 60 * 1000)
    expect(getRevealedSeasonalThemeId('UTC', dayBefore)).toBeNull()
  })
})
