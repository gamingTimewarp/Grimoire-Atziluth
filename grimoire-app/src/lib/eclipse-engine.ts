/**
 * eclipse-engine.ts
 * Every lunar and solar eclipse within a given Gregorian year, via
 * astronomy-engine's own eclipse search — unlike holidays and meteor
 * showers (which land on a fixed point in Earth's orbit every year),
 * eclipses are irregular, so there's no yearly recurrence rule to resolve;
 * each year's occurrences are found by walking forward through the actual
 * eclipse sequence with Next*Eclipse.
 *
 * Both searches report global/location-independent events (same choice
 * astro-engine.ts's getNextLunarEclipse/getNextSolarEclipse already made,
 * for the same reason: a specific-location filter needs its own
 * obscuration/visibility handling, out of scope here).
 *
 * Penumbral lunar eclipses — Earth's faint outer shadow only, usually
 * imperceptible without instruments — are deliberately excluded. Solar
 * eclipses have no equivalently-faint "barely there" kind to exclude.
 */

import * as Astronomy from 'astronomy-engine'

export type LunarEclipseKind = 'partial' | 'total'
export type SolarEclipseKind = 'partial' | 'annular' | 'total'

export interface EclipseInstance {
  canonicalName: 'calendar.eclipse.lunar' | 'calendar.eclipse.solar'
  kind: LunarEclipseKind | SolarEclipseKind
  time: Date
  /** Fraction of the disc obscured at peak (0-1), where known. Solar partial
   *  eclipses don't report a meaningful global obscuration (see astronomy-
   *  engine's own GlobalSolarEclipseInfo docs) — null in that case. */
  obscuration: number | null
  /** Plain-language description of roughly where on Earth this eclipse can
   *  be seen from — see formatVisibility() below. */
  visibility: string
}

function formatLatLon(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(0)}°${latDir}, ${Math.abs(lon).toFixed(0)}°${lonDir}`
}

/** Lunar eclipses are visible, identically, from the entire night-side
 *  hemisphere of Earth at the time — there's no narrower "path" the way a
 *  solar eclipse has. */
function lunarVisibility(): string {
  return 'Visible from anywhere on the night-side hemisphere of Earth at the time of the eclipse — wherever it\'s nighttime when the eclipse peaks.'
}

/** Solar eclipses are location-dependent: GlobalSolarEclipseInfo only gives
 *  a peak lat/lon for total/annular eclipses (the point directly under the
 *  Moon's shadow axis at maximum) — astronomy-engine deliberately leaves it
 *  undefined for partial-only eclipses, since there's no single meaningful
 *  peak location without picking an observer (see SearchLocalSolarEclipse
 *  for that, out of scope here). */
function solarVisibility(kind: SolarEclipseKind, lat: number | undefined, lon: number | undefined): string {
  if (kind === 'partial' || lat === undefined || lon === undefined) {
    return 'Visible as a partial eclipse from a broad region of Earth\'s surface — a partial-only eclipse has no single peak location.'
  }
  const core = kind === 'total' ? 'Totality' : 'The annular "ring of fire"'
  return `${core} is visible along a narrow path centred near ${formatLatLon(lat, lon)} at peak; a much wider surrounding region sees a partial eclipse instead.`
}

// Generous iteration cap while walking a sequence of eclipses from a year
// before the target through to just past it — real eclipse seasons produce
// at most a handful of lunar or solar eclipses per year, so this is never
// close to being hit; it only exists to guarantee the loop terminates.
const MAX_WALK = 20

export function getLunarEclipsesForYear(year: number): EclipseInstance[] {
  const instances: EclipseInstance[] = []
  let e: Astronomy.LunarEclipseInfo
  try {
    e = Astronomy.SearchLunarEclipse(new Date(year - 1, 0, 1))
  } catch {
    return []
  }
  for (let i = 0; i < MAX_WALK; i++) {
    const y = e.peak.date.getFullYear()
    if (y > year) break
    if (y === year && e.kind !== Astronomy.EclipseKind.Penumbral) {
      instances.push({ canonicalName: 'calendar.eclipse.lunar', kind: e.kind as LunarEclipseKind, time: e.peak.date, obscuration: e.obscuration, visibility: lunarVisibility() })
    }
    try {
      e = Astronomy.NextLunarEclipse(e.peak)
    } catch {
      break
    }
  }
  return instances
}

export function getSolarEclipsesForYear(year: number): EclipseInstance[] {
  const instances: EclipseInstance[] = []
  let e: Astronomy.GlobalSolarEclipseInfo
  try {
    e = Astronomy.SearchGlobalSolarEclipse(new Date(year - 1, 0, 1))
  } catch {
    return []
  }
  for (let i = 0; i < MAX_WALK; i++) {
    const y = e.peak.date.getFullYear()
    if (y > year) break
    if (y === year) {
      const kind = e.kind as SolarEclipseKind
      instances.push({
        canonicalName: 'calendar.eclipse.solar', kind, time: e.peak.date, obscuration: e.obscuration ?? null,
        visibility: solarVisibility(kind, e.latitude, e.longitude),
      })
    }
    try {
      e = Astronomy.NextGlobalSolarEclipse(e.peak)
    } catch {
      break
    }
  }
  return instances
}

/** Every lunar + solar eclipse within the given year, sorted chronologically. */
export function getEclipsesForYear(year: number): EclipseInstance[] {
  return [...getLunarEclipsesForYear(year), ...getSolarEclipsesForYear(year)]
    .sort((a, b) => a.time.getTime() - b.time.getTime())
}

// Deliberately distinct from any moon-phase glyph (which tracks the literal
// lunar phase every day) so an eclipse badge never reads as "today's moon
// phase" wherever it's shown alongside one (the Calendar grid, in particular).
export function eclipseEmoji(e: EclipseInstance): string {
  return e.canonicalName === 'calendar.eclipse.lunar' ? '🔴' : '⚫'
}

export function eclipseLabel(e: EclipseInstance): string {
  const kind = e.kind.charAt(0).toUpperCase() + e.kind.slice(1)
  const type = e.canonicalName === 'calendar.eclipse.lunar' ? 'Lunar Eclipse' : 'Solar Eclipse'
  return `${kind} ${type}`
}
