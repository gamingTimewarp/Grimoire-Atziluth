import { describe, it, expect } from 'vitest'
import { getPlanetPositions } from '../astro-engine'

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
