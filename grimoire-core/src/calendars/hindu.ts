/**
 * calendars/hindu.ts
 * Hindu lunisolar (Vedic) calendar, Amanta (new-moon-ending-month) system —
 * used across South and West India (Andhra Pradesh, Karnataka, Kerala,
 * Tamil Nadu, Maharashtra, Gujarat, West Bengal, and others). Month
 * boundaries and sankranti are real astronomical events, computed with
 * astronomy-engine, mirroring the structure used for the Chinese calendar
 * (chinese.ts) — new-moon month boundaries, and a leap month found by the
 * same "month without a solar-longitude crossing" rule — but with three
 * deliberate differences:
 *
 *  - **Sidereal, not tropical.** Vedic month/sankranti reckoning uses the
 *    sidereal zodiac. This duplicates the exact Lahiri ayanamsha formula
 *    from grimoire-app's astro-engine.ts (`getLahiriAyanamsa`) rather than
 *    inventing a different one — the two MUST stay numerically identical,
 *    or this calendar and the app's existing Vedic/jyotish sidereal
 *    positions would silently disagree on the same date.
 *  - **Day 1 is the day *after* the new moon**, not the day of it. Amanta
 *    convention describes a month as *ending* on amavasya (new moon) — so
 *    the new month starts the following civil day. (Chinese instead treats
 *    the new-moon's own civil day as day 1.)
 *  - **Civil day boundary approximation.** The traditional rule assigns a
 *    day using the tithi prevailing at *sunrise*, which is location- and
 *    date-dependent. This implementation instead uses a fixed civil-day
 *    boundary at India Standard Time (UTC+5:30, no DST) — consistent with
 *    how Hebrew/Islamic (no meridian at all) and Chinese (fixed UTC+8) are
 *    each handled here, and accurate for month/day placement except in the
 *    rare case a new moon falls in the roughly two-hour gap between IST
 *    midnight and actual local sunrise, which could shift a month's start
 *    by one day versus a full sunrise-based panchang. `day` itself is a
 *    sequential civil-day count within the month (matching every other
 *    system in this module), not the traditional tithi number, which can
 *    occasionally skip (kshaya) or repeat (vriddhi) relative to civil days.
 *
 * Rules:
 *  - The lunar month containing Mesha Sankranti (the Sun's sidereal
 *    ecliptic longitude reaching 0°, i.e. entering Aries — a real
 *    astronomical event, falling in mid-April) is Chaitra, month 1.
 *  - "Sankranti" (the Sun crossing a multiple of 30° sidereal longitude,
 *    12 per year — one per rashi/sign) is this calendar's equivalent of
 *    the Chinese zhongqi. If the span from one Mesha-Sankranti-month to
 *    the next contains 13 lunar months instead of 12, the first one (after
 *    month 1) with no sankranti is Adhika Masa, the leap month — it keeps
 *    its predecessor's number, flagged `isLeapMonth` (e.g. Adhika Shravana
 *    reuses Shravana's number 5).
 *  - The year is labelled in Vikram Samvat (VS = Gregorian year of that
 *    Chaitra's start + 57), the most widely recognised Hindu calendar era.
 *
 * Verified against real anchors (see hindu.test.ts): Chaitra Shukla
 * Pratipada (month 1 day 1) on 2024-04-09 (VS 2081), and Adhika Shravana
 * (leap 5th month) spanning 2023-07-18 through 2023-08-16.
 */

import * as Astronomy from 'astronomy-engine'
import type { CalendarDate, CalendarSystem } from './types.js'

const MS_PER_DAY = 86400000
const IST_OFFSET_MS = 5.5 * 3600 * 1000
const VIKRAM_SAMVAT_OFFSET = 57

/** MUST stay identical to getLahiriAyanamsa in grimoire-app's astro-engine.ts. */
function lahiriAyanamsha(date: Date): number {
  const msPerYear = 365.25 * 24 * 3600 * 1000
  const j2000 = new Date('2000-01-01T12:00:00Z')
  const yearsDiff = (date.getTime() - j2000.getTime()) / msPerYear
  return 23.8568 + yearsDiff * (50.29 / 3600)
}

function normLon(lon: number): number {
  return ((lon % 360) + 360) % 360
}

/** The India Standard Time (UTC+5:30, no DST) civil calendar date
 *  containing a given real instant. */
function toIstCivilDate(instant: Date): { year: number; month: number; day: number } {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

function civilDateToLocalDate(civil: { year: number; month: number; day: number }): Date {
  return new Date(civil.year, civil.month - 1, civil.day)
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** All new-moon instants in [start, end) (mirrors findNewMoonsInRange in
 *  chinese.ts). */
function findNewMoonsInRange(start: Date, end: Date): Date[] {
  const moons: Date[] = []
  let searchFrom = addDays(start, -33)
  for (let i = 0; i < Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY / 29.5) + 4; i++) {
    const result = Astronomy.SearchMoonPhase(0, searchFrom, 35)
    if (!result) break
    const t = result.date
    if (t >= end) break
    if (t >= start) moons.push(t)
    searchFrom = new Date(t.getTime() + 29 * MS_PER_DAY)
  }
  return moons
}

/** Every sankranti (Sun's *sidereal* ecliptic longitude at a multiple of
 *  30°) in [start, end). 12 per year — one per rashi/sign.
 *
 *  `Astronomy.SearchSunLongitude` only understands tropical longitude, so
 *  each sidereal target is converted to its tropical equivalent (tropical
 *  = sidereal + ayanamsha) before searching. As in chinese.ts, this seeds
 *  every search from a calendar estimate rather than one wide "bootstrap"
 *  call — SearchSunLongitude can silently return null for a window near a
 *  full tropical year, so every real search here stays a safe ~50 days
 *  wide. Mesha Sankranti (sidereal 0°) falls in mid-April (matching the
 *  well-known real-world Vaisakhi/Vishu date), so that's the seed anchor;
 *  the ~24° ayanamsha offset from the tropical vernal equinox (~Mar 20) is
 *  exactly why. */
function findSankrantiInRange(start: Date, end: Date): Array<{ siderealLon: number; time: Date }> {
  const terms: Array<{ siderealLon: number; time: Date }> = []
  const DAYS_PER_DEGREE = 365.25 / 360

  for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1; year++) {
    const meshaEstimate = new Date(year, 3, 14) // mid-April
    for (let siderealLon = 0; siderealLon < 360; siderealLon += 30) {
      const daysAfterMesha = (siderealLon / 30) * DAYS_PER_DEGREE * 30
      const estimate = addDays(meshaEstimate, Math.round(daysAfterMesha))
      const tropicalTarget = normLon(siderealLon + lahiriAyanamsha(estimate))
      const result = Astronomy.SearchSunLongitude(tropicalTarget, addDays(estimate, -25), 50)
      if (!result) continue
      const t = result.date
      if (t >= start && t < end) terms.push({ siderealLon, time: t })
    }
  }
  terms.sort((a, b) => a.time.getTime() - b.time.getTime())
  return terms
}

interface RawMonth {
  /** IST civil date this month starts on (the day *after* the new moon). */
  start: { year: number; month: number; day: number }
  hasSankranti: boolean
  isMeshaSankrantiMonth: boolean
}

interface MonthEntry {
  startDate: Date
  endDate: Date
  year: number
  month: number
  isLeapMonth: boolean
}

/** Builds numbered/leap-flagged month entries spanning roughly `centerDate`
 *  ± `radiusDays`. Unlike the Chinese calendar, a Hindu year's months
 *  (Chaitra through Phalguna, one Vikram Samvat label) fall entirely within
 *  a single Mesha-Sankranti-to-Mesha-Sankranti span, since month 1 itself
 *  is the anchor — so only two consecutive anchors (one suì) need to be
 *  bracketed around any query date, not three. */
function buildMonthTable(centerDate: Date, radiusDays = 430): MonthEntry[] {
  const windowStart = addDays(centerDate, -radiusDays)
  const windowEnd = addDays(centerDate, radiusDays)

  const newMoons = findNewMoonsInRange(windowStart, windowEnd)
  if (newMoons.length < 2) throw new Error('Hindu calendar: failed to locate new moons in range')

  const sankranti = findSankrantiInRange(windowStart, windowEnd)
  const sankrantiCivilDates = sankranti.map(s => toIstCivilDate(s.time))
  const meshaSankrantiCivilDates = sankranti.filter(s => s.siderealLon === 0).map(s => toIstCivilDate(s.time))

  const civilDateKey = (c: { year: number; month: number; day: number }) => c.year * 10000 + c.month * 100 + c.day

  // Raw month intervals: each starts the civil day *after* a new moon.
  const raw: RawMonth[] = []
  for (let i = 0; i < newMoons.length - 1; i++) {
    const startCivil = toIstCivilDate(addDays(newMoons[i] as Date, 1))
    const nextCivil = toIstCivilDate(addDays(newMoons[i + 1] as Date, 1))
    const startKey = civilDateKey(startCivil)
    const nextKey = civilDateKey(nextCivil)
    const hasSankranti = sankrantiCivilDates.some(s => {
      const k = civilDateKey(s)
      return k >= startKey && k < nextKey
    })
    const isMeshaSankrantiMonth = meshaSankrantiCivilDates.some(s => {
      const k = civilDateKey(s)
      return k >= startKey && k < nextKey
    })
    raw.push({ start: startCivil, hasSankranti, isMeshaSankrantiMonth })
  }

  // Find every month-1 anchor (a raw interval containing Mesha Sankranti).
  const anchorIndices = raw.reduce<number[]>((acc, m, i) => {
    if (m.isMeshaSankrantiMonth) acc.push(i)
    return acc
  }, [])
  if (anchorIndices.length < 2) throw new Error('Hindu calendar: could not bracket two Mesha Sankrantis')

  const entries: MonthEntry[] = []

  for (let a = 0; a < anchorIndices.length - 1; a++) {
    const yearStart = anchorIndices[a] as number
    const yearEnd = anchorIndices[a + 1] as number // exclusive — the next month-1
    const monthCount = yearEnd - yearStart // 12 or 13 raw intervals in this year

    // Which raw interval (if any) is Adhika Masa: the first one after
    // month 1 (month 1 itself always has a sankranti, by construction)
    // lacking a sankranti.
    let leapIndex = -1
    if (monthCount === 13) {
      for (let i = yearStart + 1; i < yearEnd; i++) {
        if (!(raw[i] as RawMonth).hasSankranti) {
          leapIndex = i
          break
        }
      }
    }

    // Vikram Samvat year = Gregorian year of this year's Chaitra (month 1,
    // the anchor itself) start + 57. Every entry in this suì shares one
    // label — no incremental "seed and correct" pass is needed (unlike
    // Chinese) because month 1 IS the anchor, so the whole span is already
    // fully bracketed by construction.
    const vsYear = civilDateToLocalDate((raw[yearStart] as RawMonth).start).getFullYear() + VIKRAM_SAMVAT_OFFSET

    // Unlike Chinese (leap keeps its *predecessor's* number), Adhika Masa
    // takes the name of the *following* regular month — verified against
    // real sources and the 2023 Adhika Shravana anchor below, which
    // precedes (not follows) the regular Shravana it shares a number with.
    // So: only advance `num` after pushing a non-leap entry: the leap
    // entry gets the current (not-yet-advanced) `num`, and since `num`
    // stays put through it, the very next (necessarily non-leap) entry
    // gets that same number too — naturally reproducing the shared name.
    let num = 1
    for (let i = yearStart; i < yearEnd; i++) {
      const isLeap = i === leapIndex
      const r = raw[i] as RawMonth
      entries.push({
        startDate: civilDateToLocalDate(r.start),
        endDate: civilDateToLocalDate((raw[i + 1] as RawMonth)?.start ?? r.start),
        year: vsYear,
        month: num,
        isLeapMonth: isLeap,
      })
      if (!isLeap) num = (num % 12) + 1
    }
  }

  return entries
}

function findEntry(table: MonthEntry[], predicate: (e: MonthEntry) => boolean): MonthEntry | undefined {
  return table.find(predicate)
}

function monthMatcher(year: number, month: number, isLeapMonth?: boolean) {
  return (e: MonthEntry) => e.year === year && e.month === month && !!e.isLeapMonth === !!isLeapMonth
}

function toCalendarDate(entry: MonthEntry, day: number): CalendarDate {
  return {
    year: entry.year,
    month: entry.month,
    day,
    monthName: hinduMonthName(entry.month, entry.isLeapMonth),
    isLeapMonth: entry.isLeapMonth,
    era: 'VS',
  }
}

const HINDU_MONTH_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
]

export function hinduMonthName(month: number, isLeapMonth = false): string {
  const base = HINDU_MONTH_NAMES[month - 1] ?? `Month ${month}`
  return isLeapMonth ? `Adhika ${base}` : base
}

export const HinduCalendarSystem: CalendarSystem = {
  id: 'hindu',
  displayName: 'Hindu (Vedic)',

  fromGregorian(date: Date): CalendarDate {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const table = buildMonthTable(target)
    const entry = findEntry(table, e => target >= e.startDate && target < e.endDate)
    if (!entry) throw new Error(`Hindu calendar: no month found for ${target.toISOString()}`)
    const day = Math.round((target.getTime() - entry.startDate.getTime()) / MS_PER_DAY) + 1
    return toCalendarDate(entry, day)
  },

  toGregorian(date: { year: number; month: number; day: number; isLeapMonth?: boolean }): Date {
    // Vikram Samvat year Y's Chaitra starts in Gregorian year (Y - 57), so
    // that's a good center estimate regardless of which month is requested.
    const estimate = new Date(date.year - VIKRAM_SAMVAT_OFFSET, 5, 15)
    const matches = monthMatcher(date.year, date.month, date.isLeapMonth)
    const entry = findEntry(buildMonthTable(estimate), matches)
      ?? findEntry(buildMonthTable(addDays(estimate, 200)), matches)
      ?? findEntry(buildMonthTable(addDays(estimate, -200)), matches)
    if (!entry) throw new Error(`Hindu calendar: month ${date.year}/${date.month}${date.isLeapMonth ? ' (leap)' : ''} not found`)
    return addDays(entry.startDate, date.day - 1)
  },

  daysInMonth(year: number, month: number, isLeapMonth?: boolean): number {
    const estimate = new Date(year - VIKRAM_SAMVAT_OFFSET, 5, 15)
    const entry = findEntry(buildMonthTable(estimate), monthMatcher(year, month, isLeapMonth))
    if (!entry) throw new Error(`Hindu calendar: month ${year}/${month}${isLeapMonth ? ' (leap)' : ''} not found`)
    return Math.round((entry.endDate.getTime() - entry.startDate.getTime()) / MS_PER_DAY)
  },

  monthsInYear(year: number): number {
    const table = buildMonthTable(new Date(year - VIKRAM_SAMVAT_OFFSET, 5, 15))
    return table.filter(e => e.year === year).length
  },

  monthName(_year: number, month: number, isLeapMonth?: boolean): string {
    return hinduMonthName(month, isLeapMonth)
  },

  addMonths(date: { year: number; month: number; isLeapMonth?: boolean }, delta: number): { year: number; month: number; isLeapMonth?: boolean } {
    const matches = monthMatcher(date.year, date.month, date.isLeapMonth)

    const estimate = new Date(date.year - VIKRAM_SAMVAT_OFFSET, 5, 15)
    let table = buildMonthTable(estimate)
    let idx = table.findIndex(matches)
    if (idx === -1) throw new Error(`Hindu calendar: could not locate ${date.year}/${date.month}${date.isLeapMonth ? ' (leap)' : ''} to step from`)

    let target = idx + delta
    if (target < 0 || target >= table.length) {
      // A Hindu "year" is exactly one suì (unlike Chinese, where a year
      // spans parts of two), so buildMonthTable only ever contains fully
      // bracketed suis — the query month can sit right at the edge of the
      // one bracketed suì the default radius finds, with nothing bracketed
      // beyond it yet. Widen the *radius* (same center) rather than
      // shifting it: a strictly larger window is guaranteed to still
      // contain whatever the first attempt found, while also reaching far
      // enough to bracket the adjacent suì the target needs.
      table = buildMonthTable(estimate, 800)
      idx = table.findIndex(matches)
      if (idx === -1) throw new Error(`Hindu calendar: could not locate ${date.year}/${date.month}${date.isLeapMonth ? ' (leap)' : ''} to step from`)
      target = idx + delta
      if (target < 0 || target >= table.length) {
        throw new Error(`Hindu calendar: addMonths(${date.year}/${date.month}, ${delta}) out of range`)
      }
    }

    const e = table[target] as MonthEntry
    return { year: e.year, month: e.month, isLeapMonth: e.isLeapMonth }
  },
}
