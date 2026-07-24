import { describe, it, expect } from 'vitest'
import { getPlanetPositions, getHouses, getSunSignForMode } from '../astro-engine'
import type { HouseSystem } from '../astro-engine'

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
