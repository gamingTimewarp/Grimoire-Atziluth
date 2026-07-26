import { describe, it, expect } from 'vitest'
import {
  getPlanetPositions, getHouses, getSunSignForMode, getSabbatsForYear,
  getRetrogradeStrip, getRetrogradeStationInfo, RETROGRADE_STRIP_PLANETS,
  getMoonQuarterTimeline, getMoonAppearance, getNextLunarEclipse, getNextSolarEclipse,
  getMoonRiseSet, getLunarApsisTimeline, isSupermoon, getMoonConstellation,
  houseOfLongitude, getMoonHouse, getMoonAspects, getMoonIlluminationPercent,
} from '../astro-engine'
import type { HouseSystem } from '../astro-engine'
import * as Astronomy from 'astronomy-engine'

// ─── Ground truth ───────────────────────────────────────────────────────────────
//
// Geocentric apparent ecliptic-of-date longitudes for 2000-01-01T00:00:00Z,
// fetched directly from NASA/JPL Horizons (https://ssd.jpl.nasa.gov/horizons/)
// via its API (QUANTITIES=31, CENTER=500@399, EPHEM_TYPE=OBSERVER). This is the
// authoritative external reference this suite guards against regressing from —
// added after a bug shipped where every planet except the Sun used
// Astronomy.EclipticLongitude(), which the astronomy-engine library documents as
// HELIOCENTRIC ("as seen from the center of the Sun"), producing longitudes tens
// of degrees wrong for the inner planets. The fix (GeoVector + Ecliptic, and
// EclipticGeoMoon for the Moon) matches JPL to within ~11 arcseconds (0.003°) —
// see the 0.02° tolerance below, generous enough to absorb that but far tighter
// than the heliocentric bug's tens-of-degrees error.

const JPL_2000_01_01: Record<string, number> = {
  'astrology.planet.sol':     279.8592049,
  'astrology.planet.luna':    217.2933209,
  'astrology.planet.mercury': 271.1117994,
  'astrology.planet.venus':   240.9614017,
  'astrology.planet.mars':    327.5754592,
  'astrology.planet.jupiter': 25.2331086,
  'astrology.planet.saturn':  40.4058374,
  'astrology.planet.uranus':  314.7840519,
  'astrology.planet.neptune': 303.1752432,
  'astrology.planet.pluto':   251.4371500,
}

const TOLERANCE_DEG = 0.02

function angularDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360
  if (d > 180) d = 360 - d
  return d
}

describe('getPlanetPositions — JPL Horizons cross-check', () => {
  const date = new Date('2000-01-01T00:00:00Z')
  const positions = getPlanetPositions(date, 'tropical', { showNodes: false, showModernPlanets: true })
  const byCn = new Map(positions.map(p => [p.planet.canonicalName, p.longitude]))

  for (const [cn, expected] of Object.entries(JPL_2000_01_01)) {
    it(`matches JPL Horizons for ${cn}`, () => {
      const actual = byCn.get(cn)
      expect(actual).toBeDefined()
      expect(angularDiff(actual!, expected)).toBeLessThan(TOLERANCE_DEG)
    })
  }
})

// ─── House cusp ordering ────────────────────────────────────────────────────────
//
// Regression coverage for a bug where Placidus, Koch, and Campanus each had an
// independent sign error (RAMC - H instead of RAMC + H, or equivalent) that placed
// cusps 2/3/5/6/8/9/11/12 in the wrong quadrant entirely — visually, house 6 and 12
// would "swallow" the rest of their half of the chart, since the wrongly-placed
// neighbouring cusp left a ~150-330° gap instead of the normal ~15-50°. Whole-sign,
// Equal, Porphyry, Morinus, and Regiomontanus were unaffected (no diurnal/nocturnal
// quadrant branching to get backwards). This test doesn't check exact cusp values
// against an external source (house systems are an astrological convention, not an
// ephemeris quantity) — it checks the structural property that broke: every house
// must be a "normal" width and the 12 cusps must proceed monotonically around the
// circle without any single house consuming half the wheel.

const HOUSE_SYSTEMS: HouseSystem[] = [
  'whole-sign', 'equal', 'placidus', 'koch', 'regiomontanus', 'campanus', 'porphyry', 'morinus',
]

// [date, lat, lon] — spans northern/southern hemispheres and a range of latitudes.
const HOUSE_TEST_CASES: [string, number, number][] = [
  ['1990-06-15T14:30:00Z', 40.7128, -74.0060],   // New York
  ['1975-12-01T03:15:00Z', 51.5074, -0.1278],    // London
  ['2005-08-20T20:45:00Z', -33.8688, 151.2093],  // Sydney (southern hemisphere)
]

function houseWidth(cusps: number[], i: number): number {
  const next = cusps[(i + 1) % 12]
  let width = next - cusps[i]
  if (width < 0) width += 360
  return width
}

describe('getHouses — cusp ordering sanity', () => {
  for (const system of HOUSE_SYSTEMS) {
    for (const [dateStr, lat, lon] of HOUSE_TEST_CASES) {
      it(`${system} houses are sanely ordered for ${dateStr} @ (${lat}, ${lon})`, () => {
        const { cusps } = getHouses(new Date(dateStr), lat, lon, system)
        expect(cusps).toHaveLength(12)
        for (let i = 0; i < 12; i++) {
          const width = houseWidth(cusps, i)
          // No house should be a sliver or swallow half the chart. Equal-width
          // systems are exactly 30°; quadrant systems vary but stay well within this
          // band except at extreme latitudes (already exercised by the 3 cases above).
          expect(width).toBeGreaterThan(1)
          expect(width).toBeLessThan(100)
        }
      })
    }
  }
})

// ─── Sun sign mode-awareness ──────────────────────────────────────────────────
//
// Regression coverage for a bug where the Sun sign shown around the app (home
// page, journal, calendar) came from a fixed calendar date-range table that
// ignored the user's astrologyMode entirely — worse, that table was hardcoded
// to an approximation of IAU 13-sign boundaries (it unconditionally included
// Ophiuchus), so even users in plain tropical mode could see the wrong sign.
// Sidereal/Vedic shift the boundary by the ayanamsa (~24° at present) relative
// to tropical, so for a date near a sign boundary the two modes should disagree.

describe('getSunSignForMode', () => {
  // 2000-01-01T00:00:00Z: geocentric Sun longitude ~279.86° tropical (Capricorn),
  // ~255.9° sidereal/vedic (Sagittarius) after subtracting the ~24° Lahiri ayanamsa.
  const date = new Date('2000-01-01T00:00:00Z')

  it('tropical differs from sidereal/vedic by the ayanamsa shift', () => {
    expect(getSunSignForMode(date, 'tropical').name).toBe('Capricorn')
    expect(getSunSignForMode(date, 'sidereal').name).toBe('Sagittarius')
    expect(getSunSignForMode(date, 'vedic').name).toBe('Sagittarius')
  })

  it('IAU mode can diverge from both tropical and sidereal', () => {
    // Not asserting a specific sign here (IAU boundaries are irregular and this
    // is a cross-check, not a boundary test) — just that it resolves to *some*
    // valid sign from the 13-sign IAU set without throwing.
    const result = getSunSignForMode(date, 'iau')
    expect(result.name).toBeTruthy()
  })
})

// ─── Sabbats ────────────────────────────────────────────────────────────────────
//
// Regression coverage for a bug where every Sabbat past the summer solstice
// (Lughnasadh, Mabon, Samhain, Yule) silently vanished for the current year.
// Astronomy.SearchSunLongitude(targetLon, searchFrom, limitDays) brackets its
// root-find over [searchFrom, searchFrom+limitDays]; since the Sun's longitude
// offset is periodic (~365.25 days), a limitDays anywhere near a full year can
// bracket BOTH the near crossing and next year's occurrence of the same
// longitude, and the search isn't guaranteed to converge to the nearer one. The
// old code passed limitDays=400 (comfortably past the periodic danger zone) and
// would silently jump a full year ahead for every Sabbat after Litha.

describe('getSabbatsForYear', () => {
  const YEARS = [2020, 2024, 2025, 2026, 2027, 2028, 2030, 2036]

  for (const year of YEARS) {
    it(`finds all 8 Sabbats for ${year}, each dated within that year`, () => {
      const sabbats = getSabbatsForYear(year, 'northern')
      expect(sabbats).toHaveLength(8)
      for (const s of sabbats) {
        expect(s.time.getFullYear()).toBe(year)
      }
      // Chronological, no duplicates/out-of-order entries
      for (let i = 1; i < sabbats.length; i++) {
        expect(sabbats[i].time.getTime()).toBeGreaterThan(sabbats[i - 1].time.getTime())
      }
    })
  }

  it('specifically includes Yule (Winter Solstice) for 2026', () => {
    const sabbats = getSabbatsForYear(2026, 'northern')
    const yule = sabbats.find(s => s.canonicalName === 'calendar.sabbat.yule')
    expect(yule).toBeDefined()
    expect(yule!.time.getMonth()).toBe(11) // December
  })
})

// ─── Retrograde tracker ─────────────────────────────────────────────────────────
//
// Mercury's 2024 retrograde windows (Apr 2–25, Aug 5–28, Nov 26–Dec 15) are
// well-documented public ephemeris facts, cross-checked directly against this
// engine during development. Used here as a regression anchor for both the
// per-day retrograde flag and the station-to-station day-count logic.

describe('getRetrogradeStrip', () => {
  it('returns exactly the 8 tracked planets, Mercury through Pluto, in order', () => {
    const entries = getRetrogradeStrip(new Date('2024-08-15T12:00:00Z'))
    expect(entries).toHaveLength(8)
    expect(entries.map(e => e.planet.name)).toEqual([
      'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ])
    expect(RETROGRADE_STRIP_PLANETS).toHaveLength(8)
  })

  it('flags Mercury retrograde in the middle of its known Aug 2024 window, direct in early Sept', () => {
    const entries = getRetrogradeStrip(new Date('2024-08-15T12:00:00Z'))
    expect(entries.find(e => e.planet.name === 'Mercury')?.retrograde).toBe(true)

    const laterEntries = getRetrogradeStrip(new Date('2024-09-05T12:00:00Z'))
    expect(laterEntries.find(e => e.planet.name === 'Mercury')?.retrograde).toBe(false)
  })
})

describe('getRetrogradeStationInfo', () => {
  it('returns null when the planet is not retrograde on that day', () => {
    const info = getRetrogradeStationInfo(Astronomy.Body.Mercury, new Date('2024-09-05T12:00:00Z'))
    expect(info).toBeNull()
  })

  it('finds the correct station boundaries and day count for Mercury\'s Aug 2024 retrograde', () => {
    const info = getRetrogradeStationInfo(Astronomy.Body.Mercury, new Date('2024-08-15T12:00:00Z'))
    expect(info).not.toBeNull()
    // Known window (noon-UTC anchored): 2024-08-05 through 2024-08-27 inclusive
    // = 23 days; Aug 15 is day 11. (Station instants don't fall on day boundaries,
    // so the exact last day depends on the reference hour used — verified directly
    // against this engine rather than an external source's own anchor convention.)
    expect(info!.totalDays).toBe(23)
    expect(info!.dayNumber).toBe(11)
  })

  it('agrees with getRetrogradeStrip on every day through a full Mercury retrograde window', () => {
    const start = new Date('2024-08-01T12:00:00Z')
    let sawRetrograde = false
    for (let i = 0; i < 40; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      const strip = getRetrogradeStrip(d).find(e => e.planet.name === 'Mercury')!
      const info = getRetrogradeStationInfo(Astronomy.Body.Mercury, d)
      expect(info !== null).toBe(strip.retrograde)
      if (strip.retrograde) sawRetrograde = true
    }
    expect(sawRetrograde).toBe(true)
  })
})

describe('getMoonQuarterTimeline', () => {
  const SYNODIC_DAYS = 29.530588853

  it('satisfies prevNew <= date < nextNew and prevFull <= date < nextFull at every point across a lunation', () => {
    // Sample 12 points spread across a full synodic month from an arbitrary anchor —
    // this is what would have caught a too-short lookback window (the anchor must be
    // far enough back that the window always contains a previous new AND full moon).
    const anchor = new Date('2026-01-01T12:00:00Z')
    for (let i = 0; i < 12; i++) {
      const d = new Date(anchor.getTime() + i * (SYNODIC_DAYS / 12) * 86400000)
      const tl = getMoonQuarterTimeline(d)
      expect(tl.prevNew.time.getTime()).toBeLessThanOrEqual(d.getTime())
      expect(tl.nextNew.time.getTime()).toBeGreaterThan(d.getTime())
      expect(tl.prevFull.time.getTime()).toBeLessThanOrEqual(d.getTime())
      expect(tl.nextFull.time.getTime()).toBeGreaterThan(d.getTime())
      expect(tl.next.time.getTime()).toBeGreaterThan(d.getTime())
      // `next` must be the earliest of all four upcoming events.
      expect(tl.next.time.getTime()).toBeLessThanOrEqual(tl.nextNew.time.getTime())
      expect(tl.next.time.getTime()).toBeLessThanOrEqual(tl.nextFull.time.getTime())
    }
  })

  it('reports exactly the four known quarter types across next/prevNew/prevFull/nextNew/nextFull', () => {
    const tl = getMoonQuarterTimeline(new Date('2026-06-15T00:00:00Z'))
    expect(tl.prevNew.type).toBe('new')
    expect(tl.nextNew.type).toBe('new')
    expect(tl.prevFull.type).toBe('full')
    expect(tl.nextFull.type).toBe('full')
    expect(['new', 'first-quarter', 'full', 'last-quarter']).toContain(tl.next.type)
  })
})

describe('getMoonAppearance', () => {
  it('returns values within physically sane ranges', () => {
    const a = getMoonAppearance(new Date('2026-03-15T00:00:00Z'), 51.5, -0.1)
    expect(a.illuminatedFraction).toBeGreaterThanOrEqual(0)
    expect(a.illuminatedFraction).toBeLessThanOrEqual(1)
    // The Moon's apparent size varies roughly ±6% around the mean across a normal
    // orbit (perigee/apogee); allow a little extra margin for topocentric parallax.
    expect(a.relativeSize).toBeGreaterThan(0.85)
    expect(a.relativeSize).toBeLessThan(1.15)
    expect(a.distanceKm).toBeGreaterThan(356000) // below the Moon's closest-ever perigee
    expect(a.distanceKm).toBeLessThan(407000)    // above the Moon's farthest-ever apogee
    expect(a.magnitude).toBeLessThan(0) // the Moon is always far brighter than magnitude 0
    expect(a.altitudeDeg).toBeGreaterThanOrEqual(-90)
    expect(a.altitudeDeg).toBeLessThanOrEqual(90)
  })

  it('flags waxing vs waning consistently with the phase angle', () => {
    // Just after a new moon the Moon is waxing; just after a full moon it is waning.
    const tl = getMoonQuarterTimeline(new Date('2026-03-15T00:00:00Z'))
    const justAfterNew  = new Date(tl.prevNew.time.getTime() + 2 * 86400000)
    const justAfterFull = new Date(tl.prevFull.time.getTime() + 2 * 86400000)
    expect(getMoonAppearance(justAfterNew, 0, 0).waxing).toBe(true)
    expect(getMoonAppearance(justAfterFull, 0, 0).waxing).toBe(false)
  })
})

describe('getNextLunarEclipse / getNextSolarEclipse', () => {
  it('finds a future eclipse of a known kind', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const lunar = getNextLunarEclipse(date)
    const solar = getNextSolarEclipse(date)
    expect(lunar).not.toBeNull()
    expect(solar).not.toBeNull()
    expect(['penumbral', 'partial', 'annular', 'total']).toContain(lunar!.kind)
    expect(['penumbral', 'partial', 'annular', 'total']).toContain(solar!.kind)
    expect(lunar!.peak.getTime()).toBeGreaterThan(date.getTime())
    expect(solar!.peak.getTime()).toBeGreaterThan(date.getTime())
  })
})

describe('getMoonRiseSet', () => {
  it('returns a rise and set strictly after the given date, at a mid-latitude location', () => {
    const date = new Date('2026-03-15T00:00:00Z')
    const rs = getMoonRiseSet(date, 51.5, -0.1)
    expect(rs.nextRise).not.toBeNull()
    expect(rs.nextSet).not.toBeNull()
    expect(rs.nextRise!.getTime()).toBeGreaterThan(date.getTime())
    expect(rs.nextSet!.getTime()).toBeGreaterThan(date.getTime())
    // Both should occur within a couple of days — never further out than the 2-day search window.
    expect(rs.nextRise!.getTime() - date.getTime()).toBeLessThan(2 * 86400000)
    expect(rs.nextSet!.getTime() - date.getTime()).toBeLessThan(2 * 86400000)
  })
})

describe('getLunarApsisTimeline', () => {
  it('finds a future perigee and apogee with physically sane distances', () => {
    const date = new Date('2026-03-15T00:00:00Z')
    const tl = getLunarApsisTimeline(date)
    expect(tl.nextPerigee.time.getTime()).toBeGreaterThan(date.getTime())
    expect(tl.nextApogee.time.getTime()).toBeGreaterThan(date.getTime())
    expect(tl.nextPerigee.distanceKm).toBeGreaterThan(356000)
    expect(tl.nextPerigee.distanceKm).toBeLessThan(370000)
    expect(tl.nextApogee.distanceKm).toBeGreaterThan(404000)
    expect(tl.nextApogee.distanceKm).toBeLessThan(407000)
    // Perigee is always closer than apogee.
    expect(tl.nextPerigee.distanceKm).toBeLessThan(tl.nextApogee.distanceKm)
  })
})

describe('isSupermoon', () => {
  it('agrees with the raw 360,000km distance threshold', () => {
    const anchor = new Date('2026-01-01T00:00:00Z')
    for (let i = 0; i < 12; i++) {
      const d = new Date(anchor.getTime() + i * 30 * 86400000)
      expect(isSupermoon(d)).toBe(Astronomy.Libration(d).dist_km <= 360000)
    }
  })

  it('is always false at apogee, since apogee distance is always well above the threshold', () => {
    const tl = getLunarApsisTimeline(new Date('2026-03-15T00:00:00Z'))
    expect(isSupermoon(tl.nextApogee.time)).toBe(false)
  })
})

describe('getMoonConstellation', () => {
  it('reports a constellation whose entered/exits window contains the query date', () => {
    // Sample across a full sidereal month to catch anchor/window bugs at boundaries.
    const SIDEREAL_DAYS = 27.321661
    const anchor = new Date('2026-03-01T00:00:00Z')
    for (let i = 0; i < 12; i++) {
      const d = new Date(anchor.getTime() + i * (SIDEREAL_DAYS / 12) * 86400000)
      const c = getMoonConstellation(d)
      expect(c.enteredAt.getTime()).toBeLessThanOrEqual(d.getTime())
      expect(c.exitsAt.getTime()).toBeGreaterThan(d.getTime())
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.symbol.length).toBe(3)
    }
  })
})

describe('houseOfLongitude', () => {
  const evenCusps = Array.from({ length: 12 }, (_, i) => i * 30)

  it('places a longitude in the correct house for evenly spaced cusps', () => {
    expect(houseOfLongitude(5, evenCusps)).toBe(1)
    expect(houseOfLongitude(35, evenCusps)).toBe(2)
    expect(houseOfLongitude(359, evenCusps)).toBe(12)
  })

  it('handles cusp sets that wrap past 360°', () => {
    const wrapCusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]
    expect(houseOfLongitude(355, wrapCusps)).toBe(1)
    expect(houseOfLongitude(10, wrapCusps)).toBe(1)
  })
})

describe('getMoonHouse', () => {
  it('returns a house number in 1–12', () => {
    const house = getMoonHouse(new Date('2026-03-15T00:00:00Z'), 51.5, -0.1, 'placidus')
    expect(house).toBeGreaterThanOrEqual(1)
    expect(house).toBeLessThanOrEqual(12)
  })
})

describe('getMoonAspects', () => {
  it('returns only aspects involving the Moon', () => {
    const aspects = getMoonAspects(new Date('2026-03-15T00:00:00Z'), 'tropical')
    for (const a of aspects) {
      expect(
        a.planet1.canonicalName === 'astrology.planet.luna' || a.planet2.canonicalName === 'astrology.planet.luna'
      ).toBe(true)
    }
  })
})

describe('getMoonIlluminationPercent', () => {
  it('returns a whole-number percentage in 0–100, matching Astronomy.Illumination', () => {
    const date = new Date('2026-03-15T00:00:00Z')
    const pct = getMoonIlluminationPercent(date)
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
    expect(pct).toBe(Math.round(Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction * 100))
  })
})
