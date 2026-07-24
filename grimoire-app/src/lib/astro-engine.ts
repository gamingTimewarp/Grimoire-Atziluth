/**
 * astro-engine.ts
 * Astrological calculations using astronomy-engine (offline, no API needed).
 * Covers: planetary positions, moon events, ingresses, aspects, natal charts.
 */

import * as Astronomy from 'astronomy-engine'

// ─── Zodiac & planet data ─────────────────────────────────────────────────────

export type AstrologyMode = 'tropical' | 'sidereal' | 'iau' | 'vedic'

export const ZODIAC_SIGNS = [
  { name: 'Aries',       symbol: '♈', canonicalName: 'astrology.zodiac-sign.aries'       },
  { name: 'Taurus',      symbol: '♉', canonicalName: 'astrology.zodiac-sign.taurus'      },
  { name: 'Gemini',      symbol: '♊', canonicalName: 'astrology.zodiac-sign.gemini'      },
  { name: 'Cancer',      symbol: '♋', canonicalName: 'astrology.zodiac-sign.cancer'      },
  { name: 'Leo',         symbol: '♌', canonicalName: 'astrology.zodiac-sign.leo'         },
  { name: 'Virgo',       symbol: '♍', canonicalName: 'astrology.zodiac-sign.virgo'       },
  { name: 'Libra',       symbol: '♎', canonicalName: 'astrology.zodiac-sign.libra'       },
  { name: 'Scorpio',     symbol: '♏', canonicalName: 'astrology.zodiac-sign.scorpio'     },
  { name: 'Sagittarius', symbol: '♐', canonicalName: 'astrology.zodiac-sign.sagittarius' },
  { name: 'Capricorn',   symbol: '♑', canonicalName: 'astrology.zodiac-sign.capricorn'   },
  { name: 'Aquarius',    symbol: '♒', canonicalName: 'astrology.zodiac-sign.aquarius'    },
  { name: 'Pisces',      symbol: '♓', canonicalName: 'astrology.zodiac-sign.pisces'      },
] as const

/** IAU 13-sign zodiac — ecliptic constellation boundaries at J2000 */
export const ZODIAC_SIGNS_IAU = [
  { name: 'Aries',       symbol: '♈', canonicalName: 'astrology.zodiac-sign.aries'       },
  { name: 'Taurus',      symbol: '♉', canonicalName: 'astrology.zodiac-sign.taurus'      },
  { name: 'Gemini',      symbol: '♊', canonicalName: 'astrology.zodiac-sign.gemini'      },
  { name: 'Cancer',      symbol: '♋', canonicalName: 'astrology.zodiac-sign.cancer'      },
  { name: 'Leo',         symbol: '♌', canonicalName: 'astrology.zodiac-sign.leo'         },
  { name: 'Virgo',       symbol: '♍', canonicalName: 'astrology.zodiac-sign.virgo'       },
  { name: 'Libra',       symbol: '♎', canonicalName: 'astrology.zodiac-sign.libra'       },
  { name: 'Scorpius',    symbol: '♏', canonicalName: 'astrology.zodiac-sign.scorpio'     },
  { name: 'Ophiuchus',   symbol: '⛎', canonicalName: 'astrology.zodiac-sign.ophiuchus'  },
  { name: 'Sagittarius', symbol: '♐', canonicalName: 'astrology.zodiac-sign.sagittarius' },
  { name: 'Capricornus', symbol: '♑', canonicalName: 'astrology.zodiac-sign.capricorn'   },
  { name: 'Aquarius',    symbol: '♒', canonicalName: 'astrology.zodiac-sign.aquarius'    },
  { name: 'Pisces',      symbol: '♓', canonicalName: 'astrology.zodiac-sign.pisces'      },
] as const

export type ZodiacSign = typeof ZODIAC_SIGNS[number] | typeof ZODIAC_SIGNS_IAU[number]

/** Returns the sign array for the given astrology mode */
export function getSignsForMode(mode: AstrologyMode): readonly { name: string; symbol: string; canonicalName: string }[] {
  return mode === 'iau' ? ZODIAC_SIGNS_IAU : ZODIAC_SIGNS
}

// ─── Nakshatras ───────────────────────────────────────────────────────────────

/** 27 Vedic lunar mansions, each spanning exactly 13°20' (800') of sidereal longitude */
export const NAKSHATRAS = [
  { name: 'Ashvini',            symbol: '☊', lord: 'Ketu',    canonicalName: 'astrology.nakshatra.ashvini'             },
  { name: 'Bharani',            symbol: '♀', lord: 'Venus',   canonicalName: 'astrology.nakshatra.bharani'             },
  { name: 'Krittika',           symbol: '☼', lord: 'Sun',     canonicalName: 'astrology.nakshatra.krittika'            },
  { name: 'Rohini',             symbol: '☽', lord: 'Moon',    canonicalName: 'astrology.nakshatra.rohini'              },
  { name: 'Mrigashira',         symbol: '♂', lord: 'Mars',    canonicalName: 'astrology.nakshatra.mrigashira'          },
  { name: 'Ardra',              symbol: '☊', lord: 'Rahu',    canonicalName: 'astrology.nakshatra.ardra'               },
  { name: 'Punarvasu',          symbol: '♃', lord: 'Jupiter', canonicalName: 'astrology.nakshatra.punarvasu'           },
  { name: 'Pushya',             symbol: '♄', lord: 'Saturn',  canonicalName: 'astrology.nakshatra.pushya'              },
  { name: 'Ashlesha',           symbol: '☿', lord: 'Mercury', canonicalName: 'astrology.nakshatra.ashlesha'            },
  { name: 'Magha',              symbol: '☊', lord: 'Ketu',    canonicalName: 'astrology.nakshatra.magha'               },
  { name: 'Purva Phalguni',     symbol: '♀', lord: 'Venus',   canonicalName: 'astrology.nakshatra.purva-phalguni'      },
  { name: 'Uttara Phalguni',    symbol: '☼', lord: 'Sun',     canonicalName: 'astrology.nakshatra.uttara-phalguni'     },
  { name: 'Hasta',              symbol: '☽', lord: 'Moon',    canonicalName: 'astrology.nakshatra.hasta'               },
  { name: 'Chitra',             symbol: '♂', lord: 'Mars',    canonicalName: 'astrology.nakshatra.chitra'              },
  { name: 'Swati',              symbol: '☊', lord: 'Rahu',    canonicalName: 'astrology.nakshatra.swati'               },
  { name: 'Vishakha',           symbol: '♃', lord: 'Jupiter', canonicalName: 'astrology.nakshatra.vishakha'            },
  { name: 'Anuradha',           symbol: '♄', lord: 'Saturn',  canonicalName: 'astrology.nakshatra.anuradha'            },
  { name: 'Jyeshtha',           symbol: '☿', lord: 'Mercury', canonicalName: 'astrology.nakshatra.jyeshtha'            },
  { name: 'Moola',              symbol: '☊', lord: 'Ketu',    canonicalName: 'astrology.nakshatra.moola'               },
  { name: 'Purva Ashadha',      symbol: '♀', lord: 'Venus',   canonicalName: 'astrology.nakshatra.purva-ashadha'       },
  { name: 'Uttara Ashadha',     symbol: '☼', lord: 'Sun',     canonicalName: 'astrology.nakshatra.uttara-ashadha'      },
  { name: 'Shravana',           symbol: '☽', lord: 'Moon',    canonicalName: 'astrology.nakshatra.shravana'            },
  { name: 'Dhanishtha',         symbol: '♂', lord: 'Mars',    canonicalName: 'astrology.nakshatra.dhanishtha'          },
  { name: 'Shatabhisha',        symbol: '☊', lord: 'Rahu',    canonicalName: 'astrology.nakshatra.shatabhisha'         },
  { name: 'Purva Bhadrapada',   symbol: '♃', lord: 'Jupiter', canonicalName: 'astrology.nakshatra.purva-bhadrapada'   },
  { name: 'Uttara Bhadrapada',  symbol: '♄', lord: 'Saturn',  canonicalName: 'astrology.nakshatra.uttara-bhadrapada'  },
  { name: 'Revati',             symbol: '☿', lord: 'Mercury', canonicalName: 'astrology.nakshatra.revati'              },
] as const

export type Nakshatra = typeof NAKSHATRAS[number]

/** Returns nakshatra index (0–26) for a sidereal longitude. */
export function getNakshatraIndex(siderealLon: number): number {
  return Math.floor(normLon(siderealLon) * 27 / 360)
}

/** Returns the nakshatra for a sidereal longitude. */
export function getNakshatra(siderealLon: number): Nakshatra {
  return NAKSHATRAS[getNakshatraIndex(siderealLon)]
}

export type PlanetDef = {
  readonly name: string
  readonly body: Astronomy.Body | null  // null = computed body (lunar nodes) or no ephemeris yet
  readonly symbol: string
  readonly canonicalName: string
  readonly modernOnly?: boolean   // hidden when 'tradition.modern-astrology' is not active
  readonly nodePoint?: boolean    // hidden when showNodes is false
}

export const PLANETS: readonly PlanetDef[] = [
  { name: 'Sol',             body: Astronomy.Body.Sun,     symbol: '☉', canonicalName: 'astrology.planet.sol'              },
  { name: 'Luna',            body: Astronomy.Body.Moon,    symbol: '☽', canonicalName: 'astrology.planet.luna'             },
  { name: 'Mercury',         body: Astronomy.Body.Mercury, symbol: '☿', canonicalName: 'astrology.planet.mercury'          },
  { name: 'Venus',           body: Astronomy.Body.Venus,   symbol: '♀', canonicalName: 'astrology.planet.venus'            },
  { name: 'Mars',            body: Astronomy.Body.Mars,    symbol: '♂', canonicalName: 'astrology.planet.mars'             },
  { name: 'Jupiter',         body: Astronomy.Body.Jupiter, symbol: '♃', canonicalName: 'astrology.planet.jupiter'          },
  { name: 'Saturn',          body: Astronomy.Body.Saturn,  symbol: '♄', canonicalName: 'astrology.planet.saturn'           },
  { name: 'Uranus',          body: Astronomy.Body.Uranus,  symbol: '♅', canonicalName: 'astrology.planet.uranus',  modernOnly: true },
  { name: 'Neptune',         body: Astronomy.Body.Neptune, symbol: '♆', canonicalName: 'astrology.planet.neptune', modernOnly: true },
  { name: 'Pluto',           body: Astronomy.Body.Pluto,   symbol: '♇', canonicalName: 'astrology.planet.pluto',   modernOnly: true },
  { name: 'Rahu',            body: null,                   symbol: '☊', canonicalName: 'astrology.node.rahu',      nodePoint: true  },
  { name: 'Ketu',            body: null,                   symbol: '☋', canonicalName: 'astrology.node.ketu',      nodePoint: true  },
  { name: 'Black Moon Lilith', body: null,                 symbol: '⚸', canonicalName: 'astrology.point.black-moon-lilith', nodePoint: true },
  { name: 'Chiron',          body: null,                   symbol: '⚷', canonicalName: 'astrology.minor-body.chiron', modernOnly: true },
  { name: 'Ceres',           body: null,                   symbol: '⚳', canonicalName: 'astrology.minor-body.ceres',  modernOnly: true },
  { name: 'Pallas',          body: null,                   symbol: '⚴', canonicalName: 'astrology.minor-body.pallas', modernOnly: true },
  { name: 'Juno',            body: null,                   symbol: '⚵', canonicalName: 'astrology.minor-body.juno',   modernOnly: true },
  { name: 'Vesta',           body: null,                   symbol: '⚶', canonicalName: 'astrology.minor-body.vesta',  modernOnly: true },
  { name: 'Eris',            body: null,                   symbol: '⯰', canonicalName: 'astrology.minor-body.eris',   modernOnly: true },
]

export type Planet = PlanetDef

/** Planets fast enough to produce monthly ingresses worth showing on the calendar grid */
export const INGRESS_PLANETS = PLANETS.slice(0, 5) // Sun, Moon, Mercury, Venus, Mars

// ─── House systems ────────────────────────────────────────────────────────────

export type HouseSystem = 'whole-sign' | 'equal' | 'placidus' | 'koch' | 'regiomontanus' | 'campanus' | 'porphyry' | 'morinus'

// ─── Output types ─────────────────────────────────────────────────────────────

export type PlanetPosition = {
  planet: Planet
  longitude: number         // 0–360 ecliptic longitude
  signIndex: number         // 0–11 (0–12 for IAU)
  degree: number            // 0–29.99° within sign
  minutes: number           // 0–59 arc-minutes
  retrograde: boolean
  nakshatraIndex?: number   // 0–26, only present in vedic mode
}

export type MoonEvent = {
  type: 'new' | 'first-quarter' | 'full' | 'last-quarter'
  time: Date
  emoji: string
}

export type Ingress = {
  planet: Planet
  sign: ZodiacSign
  time: Date
}

export const ASPECT_DEFS = [
  { type: 'conjunction' as const, angle: 0,   symbol: '☌', orb: 8 },
  { type: 'sextile'     as const, angle: 60,  symbol: '⚹', orb: 6 },
  { type: 'square'      as const, angle: 90,  symbol: '□', orb: 8 },
  { type: 'trine'       as const, angle: 120, symbol: '△', orb: 8 },
  { type: 'opposition'  as const, angle: 180, symbol: '☍', orb: 8 },
] as const

export type AspectType = typeof ASPECT_DEFS[number]['type']

export type Aspect = {
  planet1: Planet
  planet2: Planet
  type: AspectType
  symbol: string
  angle: number
  orb: number
  applying: boolean
}

export type HouseData = {
  cusps: number[]     // 12 ecliptic longitudes, index 0 = house 1
  ascendant: number   // ecliptic longitude
  midheaven: number   // ecliptic longitude
  system: HouseSystem
}

export type NatalChartData = {
  planets: PlanetPosition[]
  houses: HouseData
  aspects: Aspect[]
  lots: LotPosition[]
  sect?: 'day' | 'night'
}

export type LotDef = {
  name: string
  symbol: string
  canonicalName: string
}

export type LotPosition = {
  lot: LotDef
  longitude: number    // 0–360 ecliptic longitude (mode-adjusted)
  signIndex: number
  degree: number
  minutes: number
}

// ─── Asteroid types ───────────────────────────────────────────────────────────

export type AsteroidDef = {
  name: string
  symbol: string
  canonicalName: string
  /** Swiss Ephemeris body number — for future sweph_calc Tauri command integration. */
  swephId: number
  a: number      // semi-major axis (AU)
  e: number      // eccentricity
  i: number      // inclination (degrees)
  Omega: number  // longitude of ascending node (degrees)
  omega: number  // argument of perihelion (degrees)
  M0: number     // mean anomaly at J2000.0 (degrees)
}

export type AsteroidPosition = {
  asteroid: AsteroidDef
  longitude: number   // geocentric ecliptic longitude (mode-adjusted, degrees)
  signIndex: number
  degree: number
  minutes: number
  /**
   * 'keplerian' = Keplerian two-body approximation (current implementation).
   * 'ephemeris' = Swiss Ephemeris via Tauri command (future, requires SE license).
   * UI should surface a disclaimer when 'keplerian'.
   */
  calculationMethod: 'ephemeris' | 'keplerian'
}

// ─── Mutual reception type ────────────────────────────────────────────────────

export type MutualReception = {
  planet1: Planet
  planet2: Planet
}

export const HERMETIC_LOTS: LotDef[] = [
  { name: 'Lot of Fortune',   symbol: '⊕', canonicalName: 'astrology.lot.fortune'   },
  { name: 'Lot of Spirit',    symbol: '⊗', canonicalName: 'astrology.lot.spirit'    },
  { name: 'Lot of Eros',      symbol: 'Er', canonicalName: 'astrology.lot.eros'      },
  { name: 'Lot of Necessity', symbol: 'Nc', canonicalName: 'astrology.lot.necessity' },
  { name: 'Lot of Courage',   symbol: 'Cg', canonicalName: 'astrology.lot.courage'   },
  { name: 'Lot of Victory',   symbol: 'Vc', canonicalName: 'astrology.lot.victory'   },
  { name: 'Lot of Nemesis',   symbol: 'Nm', canonicalName: 'astrology.lot.nemesis'   },
]

/**
 * Mean orbital elements at J2000.0 (JPL Horizons).
 * swephId values map to Swiss Ephemeris constants for the future SE integration:
 *   Chiron=15, Ceres=17, Pallas=18, Juno=19, Vesta=20, Eris=SE_AST_OFFSET+136199=146199
 * Eris M0 is an approximation (~±5°); update from JPL Horizons for higher precision.
 */
export const ASTEROID_BODIES: AsteroidDef[] = [
  { name: 'Chiron', symbol: '⚷', canonicalName: 'astrology.minor-body.chiron', swephId:     15, a: 13.631694, e: 0.381836, i:  6.925, Omega: 209.444, omega: 338.769, M0:   8.68 },
  { name: 'Ceres',  symbol: '⚳', canonicalName: 'astrology.minor-body.ceres',  swephId:     17, a:  2.767711, e: 0.075823, i: 10.587, Omega:  80.395, omega:  72.522, M0:  95.97 },
  { name: 'Pallas', symbol: '⚴', canonicalName: 'astrology.minor-body.pallas', swephId:     18, a:  2.772372, e: 0.230614, i: 34.833, Omega: 173.128, omega: 310.015, M0:  78.00 },
  { name: 'Juno',   symbol: '⚵', canonicalName: 'astrology.minor-body.juno',   swephId:     19, a:  2.669088, e: 0.256298, i: 12.991, Omega: 169.860, omega: 247.770, M0:  69.20 },
  { name: 'Vesta',  symbol: '⚶', canonicalName: 'astrology.minor-body.vesta',  swephId:     20, a:  2.361349, e: 0.089074, i:  7.141, Omega: 103.811, omega: 151.419, M0:  20.85 },
  { name: 'Eris',   symbol: '⯰', canonicalName: 'astrology.minor-body.eris',   swephId: 146199, a: 67.864000, e: 0.441699, i: 44.040, Omega:  35.953, omega: 151.430, M0: 197.00 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normLon(lon: number): number {
  return ((lon % 360) + 360) % 360
}

function signIndexOf(lon: number): number {
  return Math.floor(normLon(lon) / 30)
}

// IAU constellation boundary start longitudes (J2000, degrees)
// Each entry: [startLon, signIndex in ZODIAC_SIGNS_IAU]
export const IAU_BOUNDARIES: [number, number][] = [
  [29.07,  0],  // Aries
  [53.45,  1],  // Taurus
  [90.43,  2],  // Gemini
  [118.24, 3],  // Cancer
  [138.11, 4],  // Leo
  [173.46, 5],  // Virgo
  [217.85, 6],  // Libra
  [241.16, 7],  // Scorpius
  [247.74, 8],  // Ophiuchus
  [266.38, 9],  // Sagittarius
  [299.70, 10], // Capricornus
  [327.42, 11], // Aquarius
  [351.60, 12], // Pisces → wraps to 29.07
]

function iauSignIndex(lon: number): number {
  const n = normLon(lon)
  // Traverse boundaries from highest to lowest
  for (let i = IAU_BOUNDARIES.length - 1; i >= 0; i--) {
    if (n >= IAU_BOUNDARIES[i][0]) return IAU_BOUNDARIES[i][1]
  }
  return 12 // below 29.07° = Pisces (wrapping)
}

/** Lahiri ayanamsa (generic sidereal offset from tropical), degrees. */
function getLahiriAyanamsa(date: Date): number {
  const msPerYear = 365.25 * 24 * 3600 * 1000
  const j2000 = new Date('2000-01-01T12:00:00Z')
  const yearsDiff = (date.getTime() - j2000.getTime()) / msPerYear
  return 23.8568 + yearsDiff * (50.29 / 3600)
}

/** Convert a tropical longitude to the appropriate longitude for the given mode. */
function applyMode(tropicalLon: number, mode: AstrologyMode, date: Date): { lon: number; signIndex: number; nakshatraIndex?: number } {
  if (mode === 'sidereal') {
    const lon = normLon(tropicalLon - getLahiriAyanamsa(date))
    return { lon, signIndex: signIndexOf(lon) }
  }
  if (mode === 'iau') {
    return { lon: tropicalLon, signIndex: iauSignIndex(tropicalLon) }
  }
  if (mode === 'vedic') {
    const lon = normLon(tropicalLon - getLahiriAyanamsa(date))
    return { lon, signIndex: signIndexOf(lon), nakshatraIndex: getNakshatraIndex(lon) }
  }
  // tropical
  return { lon: tropicalLon, signIndex: signIndexOf(tropicalLon) }
}

function angularDiff(lon1: number, lon2: number): number {
  let d = Math.abs(normLon(lon1) - normLon(lon2)) % 360
  if (d > 180) d = 360 - d
  return d
}

function eclipticLon(body: Astronomy.Body, date: Date): number {
  // Astrology charts are always geocentric ("as seen from Earth"). Despite its
  // generic-sounding name, Astronomy.EclipticLongitude() is explicitly documented
  // as HELIOCENTRIC ("as seen from the center of the Sun") — using it here would
  // put every planet except the Sun in the wrong position, by tens of degrees for
  // the inner planets. Verified against JPL Horizons (matches to ~0.001°):
  //   - Sun: SunPosition() (already geocentric)
  //   - Moon: EclipticGeoMoon() — dedicated geocentric lunar function
  //   - Everything else: GeoVector() + Ecliptic() (geocentric, aberration-corrected)
  if (body === Astronomy.Body.Sun) {
    return normLon(Astronomy.SunPosition(date).elon)
  }
  if (body === Astronomy.Body.Moon) {
    return normLon(Astronomy.EclipticGeoMoon(date).lon)
  }
  return normLon(Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon)
}

// ─── Lunar node positions ─────────────────────────────────────────────────────

/**
 * Mean ascending node (Rahu) tropical longitude using Meeus Ch.22 formula.
 * Accurate to within ~0.1° for dates near J2000. Pass isKetu=true for Ketu (South Node).
 */
function getMeanNodeLongitude(date: Date, isKetu = false): number {
  const JD = date.getTime() / 86400000 + 2440587.5
  const T  = (JD - 2451545.0) / 36525
  const omega = normLon(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000)
  return isKetu ? normLon(omega + 180) : omega
}

/**
 * Mean lunar apogee (Black Moon Lilith) tropical longitude.
 * Formula from Meeus "Astronomical Algorithms" Ch.52, accurate to within ~1°
 * of the true (osculating) apogee — the standard used by most astrology software.
 */
function getMeanLilithLon(date: Date): number {
  const JD = date.getTime() / 86400000 + 2440587.5
  const T  = (JD - 2451545.0) / 36525
  return normLon(
    83.3532465
    + 4069.0137287 * T
    - 0.0103200    * T * T
    - (T * T * T)  / 80053
    + (T * T * T * T) / 18999000
  )
}

// ─── Planetary positions ──────────────────────────────────────────────────────

const NODE_CNS = new Set(['astrology.node.rahu', 'astrology.node.ketu', 'astrology.point.black-moon-lilith'])
export const MODERN_PLANET_CNS = new Set(PLANETS.filter(p => p.modernOnly).map(p => p.canonicalName))

export function getPlanetPositions(
  date: Date,
  mode: AstrologyMode = 'tropical',
  options: { showNodes?: boolean; showModernPlanets?: boolean } = {},
): PlanetPosition[] {
  const { showNodes = true, showModernPlanets = true } = options
  const planets = PLANETS.filter(p => {
    if (p.nodePoint && !showNodes) return false
    if (p.modernOnly && !showModernPlanets) return false
    return true
  })
  const next = new Date(date.getTime() + 86400000)
  const isKetu   = (p: PlanetDef) => p.canonicalName === 'astrology.node.ketu'
  const isLilith = (p: PlanetDef) => p.canonicalName === 'astrology.point.black-moon-lilith'
  const nodePointLon = (p: PlanetDef, d: Date) =>
    isLilith(p) ? getMeanLilithLon(d) : getMeanNodeLongitude(d, isKetu(p))
  const asteroidLon = (p: PlanetDef, d: Date) => {
    const ast = ASTEROID_BODIES.find(a => a.canonicalName === p.canonicalName)
    return ast ? asteroidTropicalLon(ast, d) : 0
  }
  const tropicalLon = (p: PlanetDef, d: Date) => {
    if (p.body !== null) return eclipticLon(p.body, d)
    if (p.nodePoint)     return nodePointLon(p, d)
    return asteroidLon(p, d)
  }
  return planets.map(planet => {
    const tropLon = tropicalLon(planet, date)
    const { lon, signIndex, nakshatraIndex } = applyMode(tropLon, mode, date)
    const lon2 = applyMode(tropicalLon(planet, next), mode, next).lon
    const degTotal  = lon % 30
    const degree    = Math.floor(degTotal)
    const minutes   = Math.floor((degTotal - degree) * 60)

    // Sun and Moon never retrograde (geocentric). Nodes always do — suppress the flag
    // since it's permanently true and therefore non-informative to display.
    let retrograde = false
    if (!planet.nodePoint && planet.body !== Astronomy.Body.Sun && planet.body !== Astronomy.Body.Moon) {
      let diff = lon2 - lon
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      retrograde = diff < 0
    }

    return { planet, longitude: lon, signIndex, degree, minutes, retrograde, nakshatraIndex }
  })
}

/**
 * Sun sign for a given date, respecting the active astrology mode. Sidereal/Vedic
 * shift the boundary by the ayanamsa (~24° at present) relative to tropical, and
 * IAU uses entirely different (unequal, constellation-based) boundaries including
 * Ophiuchus — so this cannot be a fixed calendar date-range table; it must go
 * through the same geocentric Sun position + applyMode pipeline as every other
 * mode-aware calculation in this file.
 */
export function getSunSignForMode(date: Date, mode: AstrologyMode = 'tropical'): { name: string; symbol: string; canonicalName: string } {
  const tropicalLon = normLon(Astronomy.SunPosition(date).elon)
  const { signIndex } = applyMode(tropicalLon, mode, date)
  return getSignsForMode(mode)[signIndex]
}

// ─── Aspects ─────────────────────────────────────────────────────────────────

export function getAspects(positions: PlanetPosition[], date?: Date): Aspect[] {
  const aspects: Aspect[] = []
  const nextPositions = date ? getPlanetPositions(new Date(date.getTime() + 3600000)) : null

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      // Rahu and Ketu are always exactly opposite by definition — suppress the trivial opposition
      if (NODE_CNS.has(positions[i].planet.canonicalName) && NODE_CNS.has(positions[j].planet.canonicalName)) continue
      const diff = angularDiff(positions[i].longitude, positions[j].longitude)
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle)
        if (orb <= def.orb) {
          let applying = false
          if (nextPositions) {
            const nextDiff = angularDiff(nextPositions[i].longitude, nextPositions[j].longitude)
            const nextOrb  = Math.abs(nextDiff - def.angle)
            applying = nextOrb < orb
          }
          aspects.push({
            planet1: positions[i].planet,
            planet2: positions[j].planet,
            type: def.type,
            symbol: def.symbol,
            angle: def.angle,
            orb: Math.round(orb * 10) / 10,
            applying,
          })
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb)
}

// ─── Void-of-Course Moon ──────────────────────────────────────────────────────

export type VoCStatus = {
  isVoid: boolean
  /** Approximate degrees remaining in sign (tropical) */
  degreesRemaining: number
}

/**
 * Returns whether the Moon is currently void-of-course (tropical).
 *
 * The Moon is VoC when it will make no more major aspects (conjunction, sextile,
 * square, trine, opposition) to any planet before leaving its current sign.
 * Planet positions are treated as fixed — accurate enough for a display indicator.
 */
export function getVoidOfCourseMoon(date: Date): VoCStatus {
  const positions = getPlanetPositions(date, 'tropical')
  const moon = positions.find(p => p.planet.name === 'Luna')!

  // Tropical sign exit: next multiple of 30° above Moon's longitude
  const signExit = (Math.floor(moon.longitude / 30) + 1) * 30
  const degreesRemaining = signExit - moon.longitude

  const others = positions.filter(p => p.planet.name !== 'Luna')

  for (const other of others) {
    for (const def of ASPECT_DEFS) {
      // Two longitudes where Moon would be exactly asp° from this planet
      for (const target of [
        normLon(other.longitude + def.angle),
        normLon(other.longitude - def.angle),
      ]) {
        // Forward angular distance from Moon to that target (0–360, exclusive 0)
        const dist = normLon(target - moon.longitude)
        if (dist > 0 && dist < degreesRemaining) {
          return { isVoid: false, degreesRemaining }
        }
      }
    }
  }

  return { isVoid: true, degreesRemaining }
}

// ─── Moon events for a month ──────────────────────────────────────────────────

const MOON_PHASE_TARGETS: Array<{ targetLon: number; type: MoonEvent['type']; emoji: string }> = [
  { targetLon: 0,   type: 'new',           emoji: '🌑' },
  { targetLon: 90,  type: 'first-quarter', emoji: '🌓' },
  { targetLon: 180, type: 'full',          emoji: '🌕' },
  { targetLon: 270, type: 'last-quarter',  emoji: '🌗' },
]

export function getMoonEventsForMonth(year: number, month: number): MoonEvent[] {
  const events: MoonEvent[] = []
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 1)

  for (const phase of MOON_PHASE_TARGETS) {
    // Start search a few days before month start to catch events at the beginning
    let searchFrom = new Date(year, month - 1, -3)
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = Astronomy.SearchMoonPhase(phase.targetLon, searchFrom, 35)
      if (!result) break
      const t = result.date
      if (t >= end) break
      if (t >= start) {
        events.push({ type: phase.type, time: t, emoji: phase.emoji })
      }
      searchFrom = new Date(t.getTime() + 29 * 86400000)
    }
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime())
}

// ─── Ingresses for a month ────────────────────────────────────────────────────

/** Binary search for the exact moment a planet crosses a sign boundary. */
function binarySearchIngress(
  body: Astronomy.Body,
  t1: Date,
  t2: Date,
  targetSignIndex: number,
  signFn: (lon: number) => number,
): Date {
  if (t2.getTime() - t1.getTime() < 60000) return new Date((t1.getTime() + t2.getTime()) / 2)
  const tMid = new Date((t1.getTime() + t2.getTime()) / 2)
  const signMid = signFn(eclipticLon(body, tMid))
  if (signMid === targetSignIndex) {
    return binarySearchIngress(body, t1, tMid, targetSignIndex, signFn)
  } else {
    return binarySearchIngress(body, tMid, t2, targetSignIndex, signFn)
  }
}

export function getIngressesForMonth(year: number, month: number, mode: AstrologyMode = 'tropical'): Ingress[] {
  const ingresses: Ingress[] = []
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 1)

  const signFn = mode === 'iau' ? iauSignIndex : signIndexOf
  const signs  = getSignsForMode(mode)

  // Sample interval: 6 hours (adequate for all planets incl. Moon ~2.3d/sign)
  const STEP_MS = 6 * 3600 * 1000

  for (const planet of INGRESS_PLANETS) {
    // Start 1 step before month to catch ingresses right at the boundary
    let t = new Date(monthStart.getTime() - STEP_MS)
    let prevSign = signFn(eclipticLon(planet.body!, t))

    while (t < monthEnd) {
      const tNext = new Date(t.getTime() + STEP_MS)
      const currSign = signFn(eclipticLon(planet.body!, tNext))

      if (currSign !== prevSign) {
        const exactTime = binarySearchIngress(planet.body!, t, tNext, currSign, signFn)
        if (exactTime >= monthStart && exactTime < monthEnd) {
          ingresses.push({ planet, sign: signs[currSign] as ZodiacSign, time: exactTime })
        }
      }

      prevSign = currSign
      t = tNext
    }
  }

  return ingresses.sort((a, b) => a.time.getTime() - b.time.getTime())
}

// ─── Sabbats ──────────────────────────────────────────────────────────────────

export type Sabbat = {
  name: string
  canonicalName: string
  type: 'solar' | 'cross-quarter'
  emoji: string
  sunLongitude: number   // tropical Sun longitude at which this Sabbat occurs
  time: Date
  hemisphere: 'northern' | 'southern'
}

/** The 8 Wiccan/Pagan Sabbats defined by the Sun's tropical longitude. */
const SABBAT_DEFS = [
  { canonicalName: 'calendar.sabbat.imbolc',     type: 'cross-quarter' as const, emoji: '🌱', sunLon: 315, northernName: 'Imbolc',    southernName: 'Lughnasadh', southernCN: 'calendar.sabbat.lughnasadh' },
  { canonicalName: 'calendar.sabbat.ostara',     type: 'solar'          as const, emoji: '🌸', sunLon: 0,   northernName: 'Ostara',    southernName: 'Mabon',      southernCN: 'calendar.sabbat.mabon'      },
  { canonicalName: 'calendar.sabbat.beltane',    type: 'cross-quarter' as const, emoji: '🔥', sunLon: 45,  northernName: 'Beltane',   southernName: 'Samhain',    southernCN: 'calendar.sabbat.samhain'    },
  { canonicalName: 'calendar.sabbat.litha',      type: 'solar'          as const, emoji: '☀️', sunLon: 90,  northernName: 'Litha',     southernName: 'Yule',       southernCN: 'calendar.sabbat.yule'       },
  { canonicalName: 'calendar.sabbat.lughnasadh', type: 'cross-quarter' as const, emoji: '🌾', sunLon: 135, northernName: 'Lughnasadh',southernName: 'Imbolc',     southernCN: 'calendar.sabbat.imbolc'     },
  { canonicalName: 'calendar.sabbat.mabon',      type: 'solar'          as const, emoji: '🍂', sunLon: 180, northernName: 'Mabon',     southernName: 'Ostara',     southernCN: 'calendar.sabbat.ostara'     },
  { canonicalName: 'calendar.sabbat.samhain',    type: 'cross-quarter' as const, emoji: '🕯️', sunLon: 225, northernName: 'Samhain',   southernName: 'Beltane',    southernCN: 'calendar.sabbat.beltane'    },
  { canonicalName: 'calendar.sabbat.yule',       type: 'solar'          as const, emoji: '❄️', sunLon: 270, northernName: 'Yule',      southernName: 'Litha',      southernCN: 'calendar.sabbat.litha'      },
]

/**
 * Returns the 8 Sabbats for the given year, computed from actual Sun longitude crossings.
 * The vernal equinox search starts from 1 Jan of that year; each subsequent Sabbat
 * is searched from the previous one.
 */
export function getSabbatsForYear(year: number, hemisphere: 'northern' | 'southern' = 'northern'): Sabbat[] {
  const sabbats: Sabbat[] = []
  // Start from Dec 1 of prior year to catch Imbolc (315°) which can fall in late Jan
  let searchFrom = new Date(year - 1, 11, 1)

  for (const def of SABBAT_DEFS) {
    try {
      // The window must comfortably cover the real gap between consecutive Sabbats
      // (~45 days, up to ~64 for the first Imbolc search from Dec 1) but stay well
      // under a full solar year: SearchSunLongitude's underlying root-finder brackets
      // [searchFrom, searchFrom+limitDays], and since the Sun's longitude offset is
      // periodic (~365.25 days), a window anywhere near that length can contain BOTH
      // the near crossing and next year's occurrence — with no guarantee it converges
      // to the nearer one. A 400-day window here reliably returned next year's
      // crossing instead of the one ~2-4 weeks away, silently dropping every Sabbat
      // past Litha for the current year. 100 days is nowhere near the danger zone
      // while still far exceeding the largest real gap.
      const result = Astronomy.SearchSunLongitude(def.sunLon, searchFrom, 100)
      if (!result) continue
      const time = result.date
      // Only include sabbats that fall in the target year
      if (time.getFullYear() === year) {
        const name = hemisphere === 'southern' ? def.southernName : def.northernName
        const canonicalName = hemisphere === 'southern' ? def.southernCN : def.canonicalName
        sabbats.push({ name, canonicalName, type: def.type, emoji: def.emoji, sunLongitude: def.sunLon, time, hemisphere })
      }
      searchFrom = new Date(time.getTime() + 30 * 86400000) // advance ~1 month
    } catch {
      // skip if astronomy-engine can't find this crossing
    }
  }

  return sabbats.sort((a, b) => a.time.getTime() - b.time.getTime())
}

// ─── House calculations ───────────────────────────────────────────────────────

/** Mean obliquity of ecliptic for current era (accurate to ~0.01° 2000–2050) */
const OBLIQUITY_DEG = 23.4393

function calcMC(gastHours: number, lonDeg: number): number {
  const ramc = normLon((gastHours * 15) + lonDeg)
  const ramcRad = ramc * Math.PI / 180
  const epsRad  = OBLIQUITY_DEG * Math.PI / 180
  let mc = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)) * 180 / Math.PI
  return normLon(mc)
}

function calcAscendant(gastHours: number, latDeg: number, lonDeg: number): number {
  const ramc    = normLon((gastHours * 15) + lonDeg)
  const ramcRad = ramc * Math.PI / 180
  const epsRad  = OBLIQUITY_DEG * Math.PI / 180
  const latRad  = latDeg * Math.PI / 180
  let asc = Math.atan2(
    Math.cos(ramcRad),
    -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad))
  ) * 180 / Math.PI
  return normLon(asc)
}

function calcWholeSignHouses(ascLon: number): number[] {
  const ascSign = signIndexOf(ascLon)
  return Array.from({ length: 12 }, (_, i) => ((ascSign + i) % 12) * 30)
}

function calcEqualHouses(ascLon: number): number[] {
  return Array.from({ length: 12 }, (_, i) => normLon(ascLon + i * 30))
}

// ── Shared helpers for quadrant systems ──────────────────────────────────────

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** RA and declination (radians) of an ecliptic point at longitude λ (degrees). */
function eclToEq(lonDeg: number, epsRad: number): { ra: number; decRad: number } {
  const l = lonDeg * D2R
  const ra = Math.atan2(Math.sin(l) * Math.cos(epsRad), Math.cos(l))
  const decRad = Math.asin(Math.sin(l) * Math.sin(epsRad))
  return { ra, decRad }
}

/** Semi-diurnal arc (degrees) for a given declination (rad) and latitude (rad).
 *  Returns 180 if circumpolar, 0 if always below horizon. */
function semiDiurnalArcDeg(decRad: number, latRad: number): number {
  const x = -Math.tan(decRad) * Math.tan(latRad)
  if (x <= -1) return 180
  if (x >= 1)  return 0
  return Math.acos(x) * R2D
}

/** Convert RA (rad) and declination (rad) to ecliptic longitude (degrees). */
function eqToEcl(raRad: number, decRad: number, epsRad: number): number {
  const lon = Math.atan2(
    Math.sin(raRad) * Math.cos(epsRad) + Math.tan(decRad) * Math.sin(epsRad),
    Math.cos(raRad)
  ) * R2D
  return normLon(lon)
}

// ── Porphyry ──────────────────────────────────────────────────────────────────
// Divides each quadrant arc (ASC→IC, IC→DSC, DSC→MC, MC→ASC) into three equal parts.

function calcPorphyryHouses(ascLon: number, mcLon: number): number[] {
  const ic  = normLon(mcLon  + 180)
  const dsc = normLon(ascLon + 180)
  const arc = (a: number, b: number) => normLon(b - a)
  const cusps = new Array<number>(12)
  cusps[0]  = ascLon
  cusps[3]  = ic
  cusps[6]  = dsc
  cusps[9]  = mcLon
  const a1 = arc(ascLon, ic);  cusps[1] = normLon(ascLon + a1 / 3); cusps[2] = normLon(ascLon + 2 * a1 / 3)
  const a2 = arc(ic,  dsc);   cusps[4] = normLon(ic   + a2 / 3); cusps[5] = normLon(ic   + 2 * a2 / 3)
  const a3 = arc(dsc, mcLon); cusps[7] = normLon(dsc  + a3 / 3); cusps[8] = normLon(dsc  + 2 * a3 / 3)
  const a4 = arc(mcLon, normLon(ascLon + 360))
  cusps[10] = normLon(mcLon + a4 / 3); cusps[11] = normLon(mcLon + 2 * a4 / 3)
  return cusps
}

// ── Morinus ───────────────────────────────────────────────────────────────────
// Divides the celestial equator into 12×30° from RAMC, projects each to ecliptic
// using only obliquity (no latitude dependence).

function calcMorinusHouses(ramcDeg: number, epsRad: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ra = (ramcDeg + i * 30) * D2R
    return normLon(Math.atan2(Math.sin(ra) * Math.cos(epsRad), Math.cos(ra)) * R2D)
  })
}

// ── Regiomontanus ─────────────────────────────────────────────────────────────
// Divides the celestial equator into 12×30° from RAMC; projects each equatorial
// point to the ecliptic via the great circle through Zenith.

function calcRegiomontanusHouses(ramcDeg: number, latDeg: number, epsRad: number): number[] {
  const latRad = latDeg * D2R
  return Array.from({ length: 12 }, (_, i) => {
    const ra = (ramcDeg + i * 30) * D2R
    return normLon(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad)) * R2D)
  })
}

// ── Campanus ──────────────────────────────────────────────────────────────────
// Divides the prime vertical (East→Zenith→West→Nadir) into 12×30° arcs.
// H1=ASC, H4=IC, H7=DSC, H10=MC are taken directly; intermediate cusps are
// computed by projecting the prime vertical point through (RA, δ) to ecliptic.

function calcCampanusHouses(ascLon: number, mcLon: number, ramcDeg: number, latDeg: number, epsRad: number): number[] {
  const ic  = normLon(mcLon  + 180)
  const dsc = normLon(ascLon + 180)
  const latRad = latDeg * D2R
  const cusps = new Array<number>(12)
  cusps[0]  = ascLon
  cusps[3]  = ic
  cusps[6]  = dsc
  cusps[9]  = mcLon

  // Angles on the prime vertical (0=East, 90=Zenith, 180=West, 270=Nadir)
  // House ordering: H1→H12→H11→H10→H9→H8→H7→H6→H5→H4→H3→H2
  // ψ for each non-angular cusp (index, ψ in degrees):
  const pvAngles: [number, number][] = [
    [1, 330], [2, 300],   // H2, H3 — below horizon, south/east
    [4, 240], [5, 210],   // H5, H6
    [7, 150], [8, 120],   // H8, H9
    [10, 60], [11, 30],   // H11, H12
  ]

  for (const [idx, psi] of pvAngles) {
    const psiRad = psi * D2R
    const sinPsi = Math.sin(psiRad)
    const cosPsi = Math.cos(psiRad)
    // Hour angle from meridian
    const H = Math.atan2(cosPsi, sinPsi * Math.cos(latRad))
    // Declination: tan(δ) = cos(H) * tan(φ)
    const tanDec = Math.cos(H) * Math.tan(latRad)
    const decRad = Math.atan(tanDec)
    // RA = RAMC + H (verified against JPL-consistent house ordering; RAMC - H
    // places every non-angular cusp in the wrong quadrant)
    const raRad = (ramcDeg * D2R) + H
    cusps[idx] = eqToEcl(raRad, decRad, epsRad)
  }
  return cusps
}

// ── Placidus ──────────────────────────────────────────────────────────────────
// Semi-arc method. For each cusp between MC↔ASC and IC↔DSC the ecliptic point
// is found iteratively such that the fractional semi-arc condition is met.
// Converges in ~8 iterations. Falls back to Porphyry near extreme latitudes.

function placidusIterate(
  targetFrac: number,   // 1/3 or 2/3
  ramcDeg: number,
  latRad: number,
  epsRad: number,
  diurnal: boolean,     // true = upper hemisphere (MC→ASC), false = lower (IC→DSC)
  initLon: number,
): number {
  let lon = initLon
  for (let iter = 0; iter < 20; iter++) {
    const { decRad } = eclToEq(lon, epsRad)
    const D = semiDiurnalArcDeg(decRad, latRad)
    if (D === 0 || D === 180) break  // circumpolar / never-rises fallback
    // A point's RA satisfies RA = RAMC + D (its own semi-diurnal arc) exactly when
    // it is rising (at the Ascendant), and RA = RAMC + 180 when at the IC. Trisecting
    // the diurnal quadrant (MC→ASC) or nocturnal quadrant (ASC→IC) means interpolating
    // between these two RA landmarks — NOT subtracting from RAMC, which lands cusps in
    // the wrong quadrant entirely (verified against JPL-consistent house ordering).
    let targetRA: number
    if (diurnal) {
      targetRA = normLon(ramcDeg + D * targetFrac)
    } else {
      const N = 180 - D
      targetRA = normLon(ramcDeg + D + N * targetFrac)
    }
    const newLon = normLon(Math.atan2(Math.sin(targetRA * D2R), Math.cos(targetRA * D2R) * Math.cos(epsRad)) * R2D)
    if (Math.abs(normLon(newLon - lon + 180) - 180) < 0.0001) break
    lon = newLon
  }
  return lon
}

function calcPlacidusHouses(ascLon: number, mcLon: number, ramcDeg: number, latDeg: number, epsRad: number): number[] {
  const ic  = normLon(mcLon  + 180)
  const dsc = normLon(ascLon + 180)
  const latRad = latDeg * D2R
  const cusps = new Array<number>(12)
  cusps[0] = ascLon; cusps[3] = ic; cusps[6] = dsc; cusps[9] = mcLon

  // Check for extreme latitudes where Placidus breaks down
  const testDec = Math.asin(Math.sin((mcLon + 30) * D2R) * Math.sin(epsRad))
  if (Math.abs(latDeg) > 66 && Math.abs(testDec) > Math.abs(Math.PI / 2 - Math.abs(latRad))) {
    return calcPorphyryHouses(ascLon, mcLon)  // graceful fallback
  }

  cusps[10] = placidusIterate(1/3, ramcDeg, latRad, epsRad, true,  normLon(mcLon  + 30))
  cusps[11] = placidusIterate(2/3, ramcDeg, latRad, epsRad, true,  normLon(mcLon  + 60))
  cusps[1]  = placidusIterate(1/3, ramcDeg, latRad, epsRad, false, normLon(ascLon + 30))
  cusps[2]  = placidusIterate(2/3, ramcDeg, latRad, epsRad, false, normLon(ascLon + 60))

  // Opposite cusps
  cusps[4]  = normLon(cusps[10] + 180)
  cusps[5]  = normLon(cusps[11] + 180)
  cusps[7]  = normLon(cusps[1]  + 180)
  cusps[8]  = normLon(cusps[2]  + 180)
  return cusps
}

// ── Koch (Birthplace) ─────────────────────────────────────────────────────────
// The oblique ascension of each cusp equals OA_MC ± n * (semi-arc_MC / 3).
// Iterative, same convergence characteristics as Placidus.

function kochIterate(
  targetOA: number,
  latRad: number,
  epsRad: number,
  initLon: number,
): number {
  let lon = initLon
  for (let iter = 0; iter < 20; iter++) {
    const { ra, decRad } = eclToEq(lon, epsRad)
    const ad = Math.asin(Math.tan(decRad) * Math.tan(latRad))  // ascension difference
    const oa = normLon(ra * R2D - ad * R2D)
    const newRA = normLon(targetOA + ad * R2D)
    const newLon = normLon(Math.atan2(Math.sin(newRA * D2R), Math.cos(newRA * D2R) * Math.cos(epsRad)) * R2D)
    if (Math.abs(normLon(newLon - lon + 180) - 180) < 0.0001) break
    lon = newLon
  }
  return lon
}

function calcKochHouses(ascLon: number, mcLon: number, ramcDeg: number, latDeg: number, epsRad: number): number[] {
  const ic  = normLon(mcLon  + 180)
  const dsc = normLon(ascLon + 180)
  const latRad = latDeg * D2R
  const cusps = new Array<number>(12)
  cusps[0] = ascLon; cusps[3] = ic; cusps[6] = dsc; cusps[9] = mcLon

  // Semi-diurnal arc of the MC
  const { decRad: mcDecRad } = eclToEq(mcLon, epsRad)
  const dMC = semiDiurnalArcDeg(mcDecRad, latRad)
  if (dMC === 0 || dMC === 180) return calcPorphyryHouses(ascLon, mcLon)  // fallback

  const nMC = 180 - dMC  // nocturnal semi-arc

  // As with Placidus: a point's RA equals RAMC + D (its own semi-diurnal arc) at the
  // Ascendant and RAMC + 180 at the IC, so the nocturnal-quadrant target must be built
  // from ramcDeg + dMC (i.e. RA at the Ascendant), not from RAMC + 180 (raic) directly —
  // that lands cusps 2/3 in the wrong quadrant (verified against JPL-consistent ordering).
  cusps[10] = kochIterate(normLon(ramcDeg + dMC / 3),           latRad, epsRad, normLon(mcLon  + 30))
  cusps[11] = kochIterate(normLon(ramcDeg + 2 * dMC / 3),       latRad, epsRad, normLon(mcLon  + 60))
  cusps[1]  = kochIterate(normLon(ramcDeg + dMC + nMC / 3),     latRad, epsRad, normLon(ascLon + 30))
  cusps[2]  = kochIterate(normLon(ramcDeg + dMC + 2 * nMC / 3), latRad, epsRad, normLon(ascLon + 60))

  cusps[4]  = normLon(cusps[10] + 180)
  cusps[5]  = normLon(cusps[11] + 180)
  cusps[7]  = normLon(cusps[1]  + 180)
  cusps[8]  = normLon(cusps[2]  + 180)
  return cusps
}

export function getHouses(date: Date, lat: number, lon: number, system: HouseSystem = 'placidus'): HouseData {
  const gast   = Astronomy.SiderealTime(date) // hours
  const asc    = calcAscendant(gast, lat, lon)
  const mc     = calcMC(gast, lon)
  const ramc   = normLon((gast * 15) + lon)
  const epsRad = OBLIQUITY_DEG * Math.PI / 180

  let cusps: number[]
  switch (system) {
    case 'equal':          cusps = calcEqualHouses(asc);                                        break
    case 'porphyry':       cusps = calcPorphyryHouses(asc, mc);                                 break
    case 'morinus':        cusps = calcMorinusHouses(ramc, epsRad);                             break
    case 'regiomontanus':  cusps = calcRegiomontanusHouses(ramc, lat, epsRad);                  break
    case 'campanus':       cusps = calcCampanusHouses(asc, mc, ramc, lat, epsRad);              break
    case 'placidus':       cusps = calcPlacidusHouses(asc, mc, ramc, lat, epsRad);              break
    case 'koch':           cusps = calcKochHouses(asc, mc, ramc, lat, epsRad);                  break
    case 'whole-sign':
    default:               cusps = calcWholeSignHouses(asc);                                    break
  }

  return { cusps, ascendant: asc, midheaven: mc, system }
}

// ─── Transit aspects ──────────────────────────────────────────────────────────

export type TransitAspect = {
  transitPlanet: Planet
  natalPlanet: Planet
  type: AspectType
  symbol: string
  angle: number
  orb: number
  applying: boolean
}

/** Compute aspects between transit positions and natal positions (cross-chart). */
export function getTransitAspects(
  transitPositions: PlanetPosition[],
  natalPositions: PlanetPosition[],
  transitDate?: Date,
): TransitAspect[] {
  const aspects: TransitAspect[] = []
  const nextTransit = transitDate
    ? getPlanetPositions(new Date(transitDate.getTime() + 3600000))
    : null

  for (const tp of transitPositions) {
    for (const np of natalPositions) {
      const diff = angularDiff(tp.longitude, np.longitude)
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle)
        if (orb <= def.orb) {
          let applying = false
          if (nextTransit) {
            const nextTp = nextTransit.find(p => p.planet.name === tp.planet.name)
            if (nextTp) {
              const nextOrb = Math.abs(angularDiff(nextTp.longitude, np.longitude) - def.angle)
              applying = nextOrb < orb
            }
          }
          aspects.push({
            transitPlanet: tp.planet,
            natalPlanet: np.planet,
            type: def.type,
            symbol: def.symbol,
            angle: def.angle,
            orb: Math.round(orb * 10) / 10,
            applying,
          })
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb)
}

// ─── Hermetic Lots ────────────────────────────────────────────────────────────

/** Returns true if the nativity is a day chart (Sun above the horizon). */
export function isDayChart(sunLon: number, ascLon: number): boolean {
  return ((sunLon - ascLon + 360) % 360) > 180
}

/**
 * Compute the 7 Hermetic Lots (Paulus Alexandrinus) for a natal chart.
 * Lot formulas operate in tropical degrees; the result is then mode-adjusted.
 * Computation order matters: Fortune and Spirit are computed first because
 * Eros, Necessity, Courage, Victory, and Nemesis depend on them.
 */
export function computeHermeticLots(
  planets: PlanetPosition[],
  houses: HouseData,
  mode: AstrologyMode,
  date: Date,
): LotPosition[] {
  // Lots use tropical longitudes; un-apply ayanamsa for sidereal/vedic modes
  const ayanamsa = (mode === 'sidereal' || mode === 'vedic') ? getLahiriAyanamsa(date) : 0
  const trop = (pos: PlanetPosition) => normLon(pos.longitude + ayanamsa)

  const sun     = trop(planets.find(p => p.planet.name === 'Sol')!)
  const moon    = trop(planets.find(p => p.planet.name === 'Luna')!)
  const venus   = trop(planets.find(p => p.planet.name === 'Venus')!)
  const mercury = trop(planets.find(p => p.planet.name === 'Mercury')!)
  const mars    = trop(planets.find(p => p.planet.name === 'Mars')!)
  const jupiter = trop(planets.find(p => p.planet.name === 'Jupiter')!)
  const saturn  = trop(planets.find(p => p.planet.name === 'Saturn')!)
  const asc     = houses.ascendant  // always tropical

  const day = isDayChart(sun, asc)

  // Fortune and Spirit (all others depend on one or both)
  const fortuneLon = normLon(day ? asc + moon - sun : asc + sun - moon)
  const spiritLon  = normLon(day ? asc + sun - moon : asc + moon - sun)

  const tropLots: number[] = [
    fortuneLon,
    spiritLon,
    normLon(day ? asc + venus   - spiritLon  : asc + spiritLon  - venus),
    normLon(day ? asc + mercury - fortuneLon : asc + fortuneLon - mercury),
    normLon(day ? asc + mars    - fortuneLon : asc + fortuneLon - mars),
    normLon(day ? asc + jupiter - spiritLon  : asc + spiritLon  - jupiter),
    normLon(day ? asc + saturn  - fortuneLon : asc + fortuneLon - saturn),
  ]

  return HERMETIC_LOTS.map((lot, i) => {
    const { lon, signIndex } = applyMode(tropLots[i], mode, date)
    const degTotal = lon % 30
    const degree   = Math.floor(degTotal)
    const minutes  = Math.floor((degTotal - degree) * 60)
    return { lot, longitude: lon, signIndex, degree, minutes }
  })
}

// ─── Asteroid positions (Keplerian two-body) ──────────────────────────────────

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0)

/** Solve Kepler's equation E − e·sin(E) = M by Newton's method (radians). */
function solveKepler(M: number, e: number): number {
  let E = M
  for (let i = 0; i < 30; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E))
    E += dE
    if (Math.abs(dE) < 1e-10) break
  }
  return E
}

/**
 * Compute geocentric tropical ecliptic longitude for an asteroid using
 * mean Keplerian two-body orbital elements (JPL J2000.0 epoch).
 *
 * Accuracy (no perturbations modelled):
 *   Main-belt (Ceres, Pallas, Juno, Vesta): ~1–3° within a few centuries of J2000
 *   Chiron: ~3–5°; degrades significantly outside 650 CE – 4650 CE (chaotic orbit)
 *   Eris: ~1–3° near present; M0 is an approximation — verify against JPL Horizons
 *
 * TODO (SE): Replace with invoke('sweph_calc', { ipl: ast.swephId, jd }) once a
 *            Swiss Ephemeris Professional License is obtained. swephId is pre-set
 *            on each AsteroidDef for this purpose.
 */
function asteroidTropicalLon(ast: AsteroidDef, date: Date): number {
  const daysSinceJ2000 = (date.getTime() - J2000_MS) / 86_400_000

  // Mean motion (°/day) via Kepler's third law: T = a^1.5 years
  const n = 0.9856076686 / (ast.a ** 1.5)

  // Mean anomaly (radians)
  const Mrad = normLon(ast.M0 + n * daysSinceJ2000) * D2R

  // Eccentric anomaly
  const E = solveKepler(Mrad, ast.e)

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + ast.e) * Math.sin(E / 2),
    Math.sqrt(1 - ast.e) * Math.cos(E / 2),
  )

  // Heliocentric distance (AU)
  const r = ast.a * (1 - ast.e * Math.cos(E))

  // Argument of latitude (true anomaly + argument of perihelion)
  const u = normLon(nu * R2D + ast.omega) * D2R

  const iRad  = ast.i     * D2R
  const OmRad = ast.Omega * D2R

  // Heliocentric ecliptic Cartesian (J2000 ecliptic)
  const xHel = r * (Math.cos(OmRad) * Math.cos(u) - Math.sin(OmRad) * Math.sin(u) * Math.cos(iRad))
  const yHel = r * (Math.sin(OmRad) * Math.cos(u) + Math.cos(OmRad) * Math.sin(u) * Math.cos(iRad))

  // Earth's heliocentric position: opposite the geocentric Sun direction.
  // Use mean Earth-Sun distance (1 AU) — error is <0.02 AU, negligible for ~2° accuracy.
  const sunGeo   = Astronomy.SunPosition(date)
  const earthLon = (sunGeo.elon + 180) * D2R
  const xEarth   = Math.cos(earthLon)
  const yEarth   = Math.sin(earthLon)

  return normLon(Math.atan2(yHel - yEarth, xHel - xEarth) * R2D)
}

export function getAsteroidPositions(date: Date, mode: AstrologyMode = 'tropical'): AsteroidPosition[] {
  return ASTEROID_BODIES.map(ast => {
    const tropLon  = asteroidTropicalLon(ast, date)
    const { lon, signIndex } = applyMode(tropLon, mode, date)
    const degTotal = lon % 30
    const degree   = Math.floor(degTotal)
    const minutes  = Math.floor((degTotal - degree) * 60)
    return { asteroid: ast, longitude: lon, signIndex, degree, minutes, calculationMethod: 'keplerian' as const }
  })
}

// ─── Mutual reception ─────────────────────────────────────────────────────────

/** Classical rulerships by tropical sign index (0=Aries … 11=Pisces). */
const CLASSICAL_RULERS = ['Mars','Venus','Mercury','Luna','Sol','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']

/**
 * Find all mutual reception pairs: planet A in a sign ruled (classically) by
 * planet B, and B in a sign ruled by A. Sign index is taken mod 12 so it works
 * for tropical, sidereal, and vedic modes.
 */
export function getMutualReceptions(positions: PlanetPosition[]): MutualReception[] {
  const pairs: MutualReception[] = []
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i], b = positions[j]
      const rulerOfASign = CLASSICAL_RULERS[a.signIndex % 12]
      const rulerOfBSign = CLASSICAL_RULERS[b.signIndex % 12]
      if (rulerOfASign === b.planet.name && rulerOfBSign === a.planet.name) {
        pairs.push({ planet1: a.planet, planet2: b.planet })
      }
    }
  }
  return pairs
}

// ─── Natal chart ──────────────────────────────────────────────────────────────

export function getNatalChart(
  birthDate: Date,
  lat: number,
  lon: number,
  system: HouseSystem = 'whole-sign',
  mode: AstrologyMode = 'tropical',
  options: { showNodes?: boolean; showModernPlanets?: boolean } = {},
): NatalChartData {
  const planets   = getPlanetPositions(birthDate, mode, options)
  const houses    = getHouses(birthDate, lat, lon, system)
  const aspects   = getAspects(planets)
  const lots      = computeHermeticLots(planets, houses, mode, birthDate)
  const sunPos    = planets.find(p => p.planet.name === 'Sol')!
  const sect      = isDayChart(sunPos.longitude, houses.ascendant) ? 'day' : 'night'
  return { planets, houses, aspects, lots, sect }
}

// ─── Month cache ──────────────────────────────────────────────────────────────

/** All astrological events for a calendar month, computed once and cached. */
export type MonthAstroData = {
  moonEvents:  MoonEvent[]
  ingresses:   Ingress[]
  /** Date string → events that fall on that day */
  byDate: Map<string, { moonEvents: MoonEvent[]; ingresses: Ingress[] }>
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function computeMonthAstroData(year: number, month: number, mode: AstrologyMode = 'tropical'): MonthAstroData {
  const moonEvents = getMoonEventsForMonth(year, month)
  const ingresses  = getIngressesForMonth(year, month, mode)

  const byDate = new Map<string, { moonEvents: MoonEvent[]; ingresses: Ingress[] }>()

  const ensure = (ds: string) => {
    if (!byDate.has(ds)) byDate.set(ds, { moonEvents: [], ingresses: [] })
    return byDate.get(ds)!
  }

  for (const e of moonEvents) ensure(toLocalDateStr(e.time)).moonEvents.push(e)
  for (const i of ingresses)  ensure(toLocalDateStr(i.time)).ingresses.push(i)

  return { moonEvents, ingresses, byDate }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatLongitude(pos: PlanetPosition, mode: AstrologyMode = 'tropical'): string {
  const signs = getSignsForMode(mode)
  const sign = signs[pos.signIndex]
  if (!sign) return `${pos.degree}°${String(pos.minutes).padStart(2, '0')}′`
  return `${pos.degree}°${String(pos.minutes).padStart(2, '0')}′ ${sign.symbol} ${sign.name}`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
