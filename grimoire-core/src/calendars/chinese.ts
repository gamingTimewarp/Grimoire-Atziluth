/**
 * calendars/chinese.ts
 * Chinese lunisolar calendar. Unlike Hebrew/Islamic (pure arithmetic), month
 * boundaries are real astronomical events — computed here with
 * astronomy-engine rather than a lookup table.
 *
 * Rules (matching the modern calendar in use since 1929 — see
 * https://ytliu0.github.io/ChineseCalendar/rules.html):
 *  - All instants (new moons, solar terms) are evaluated in China Standard
 *    Time (UTC+8, no DST) — the "120°E meridian" rule.
 *  - A month runs from one new moon (the calendar day containing it, in
 *    CST) to the day before the next.
 *  - The month containing the winter solstice is month 11.
 *  - "Major solar terms" (zhongqi) occur every 30° of solar ecliptic
 *    longitude (12 per year, including the solstices/equinoxes). If the
 *    span between one winter-solstice month and the next contains 13
 *    lunar months instead of 12, the first of those 13 months (after
 *    month 11) that contains no major solar term is the leap month — it
 *    keeps its predecessor's number, flagged `isLeapMonth`.
 *
 * Verified against real anchors (see chinese.test.ts): the new moon of
 * 2010-12-06 (month 11 day 1, containing the 2010-12-22 winter solstice),
 * Chinese New Year 2024-02-10, and the 2023 leap 2nd month (闰二月,
 * 2023-03-22 through 2023-04-19).
 */

import * as Astronomy from 'astronomy-engine'
import type { CalendarDate, CalendarSystem } from './types.js'

const MS_PER_DAY = 86400000
const CST_OFFSET_MS = 8 * 3600 * 1000

/** The China Standard Time (UTC+8, no DST) civil calendar date containing
 *  a given real instant. */
function toCstCivilDate(instant: Date): { year: number; month: number; day: number } {
  const shifted = new Date(instant.getTime() + CST_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

/** Local-Date representation of a CST civil date — matches the app-wide
 *  convention (elsewhere in this codebase) of treating a `Date` as a plain
 *  calendar day via local getters, not a specific instant. */
function civilDateToLocalDate(civil: { year: number; month: number; day: number }): Date {
  return new Date(civil.year, civil.month - 1, civil.day)
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** All new-moon instants in [start, end), found via repeated searches
 *  advancing ~29.5 days at a time (mirrors getMoonEventsForRange in
 *  grimoire-app's astro-engine.ts). */
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

/** Every occurrence of a "major solar term" (zhongqi — Sun ecliptic
 *  longitude at a multiple of 30°) in [start, end). 12 per year.
 *
 *  `Astronomy.SearchSunLongitude` has an undocumented failure mode: called
 *  with a search window anywhere near a full tropical year (empirically,
 *  roughly 397+ days — and the exact edge also depends on where the target
 *  falls within the window, not just the window length), it can silently
 *  return null instead of the occurrence, even though smaller or larger
 *  windows on either side of that zone work fine. There is no safe way to
 *  "bootstrap" a search for an unknown occurrence with one wide call, so
 *  instead this seeds each search from a *calendar estimate*: winter
 *  solstice (270°) falls around Dec 21, and terms recur every 30° / ~30.44
 *  days after that, so the estimate for any longitude in any year is
 *  within a few days of the true date — safely narrowing every search to
 *  a ~50-day window, far from the danger zone. */
function findMajorSolarTermsInRange(start: Date, end: Date): Array<{ longitude: number; time: Date }> {
  const terms: Array<{ longitude: number; time: Date }> = []
  const DAYS_PER_DEGREE = 365.25 / 360

  for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1; year++) {
    const solsticeEstimate = new Date(year, 11, 21)
    for (let lon = 0; lon < 360; lon += 30) {
      const daysAfterSolstice = ((lon - 270 + 360) % 360) * DAYS_PER_DEGREE
      const estimate = addDays(solsticeEstimate, Math.round(daysAfterSolstice))
      const result = Astronomy.SearchSunLongitude(lon, addDays(estimate, -25), 50)
      if (!result) continue
      const t = result.date
      if (t >= start && t < end) terms.push({ longitude: lon, time: t })
    }
  }
  terms.sort((a, b) => a.time.getTime() - b.time.getTime())
  return terms
}

interface RawMonth {
  /** CST civil date this month starts on. */
  start: { year: number; month: number; day: number }
  hasZhongqi: boolean
  isWinterSolsticeMonth: boolean
}

interface MonthEntry {
  startDate: Date
  endDate: Date
  year: number
  month: number
  isLeapMonth: boolean
}

/** Builds numbered/leap-flagged month entries spanning roughly `centerDate`
 *  ± 20 months. A single calendar year's 12-13 months are split across TWO
 *  adjacent suì (solstice-to-solstice spans) — month 11/12 come from the
 *  suì anchored by *this* year's December solstice, while month 1-10 come
 *  from the suì anchored by the *previous* December's — so a ±14-month
 *  window (enough to bracket only one suì boundary either side) silently
 *  drops a query year's tail months. ±600 days reliably brackets three
 *  consecutive winter solstices — two full suì spans — around centerDate. */
function buildMonthTable(centerDate: Date): MonthEntry[] {
  const windowStart = addDays(centerDate, -600)
  const windowEnd = addDays(centerDate, 600)

  const newMoons = findNewMoonsInRange(windowStart, windowEnd)
  if (newMoons.length < 2) throw new Error('Chinese calendar: failed to locate new moons in range')

  const zhongqi = findMajorSolarTermsInRange(windowStart, windowEnd)
  const zhongqiCivilDates = zhongqi.map(z => toCstCivilDate(z.time))
  const winterSolsticeCivilDates = zhongqi.filter(z => z.longitude === 270).map(z => toCstCivilDate(z.time))

  const civilDateKey = (c: { year: number; month: number; day: number }) => c.year * 10000 + c.month * 100 + c.day

  // Raw month intervals between consecutive new moons.
  const raw: RawMonth[] = []
  for (let i = 0; i < newMoons.length - 1; i++) {
    const startCivil = toCstCivilDate(newMoons[i] as Date)
    const nextCivil = toCstCivilDate(newMoons[i + 1] as Date)
    const startKey = civilDateKey(startCivil)
    const nextKey = civilDateKey(nextCivil)
    const hasZhongqi = zhongqiCivilDates.some(z => {
      const k = civilDateKey(z)
      return k >= startKey && k < nextKey
    })
    const isWinterSolsticeMonth = winterSolsticeCivilDates.some(z => {
      const k = civilDateKey(z)
      return k >= startKey && k < nextKey
    })
    raw.push({ start: startCivil, hasZhongqi, isWinterSolsticeMonth })
  }

  // Find every month-11 anchor (a raw interval containing a winter solstice).
  const anchorIndices = raw.reduce<number[]>((acc, m, i) => {
    if (m.isWinterSolsticeMonth) acc.push(i)
    return acc
  }, [])
  if (anchorIndices.length < 2) throw new Error('Chinese calendar: could not bracket two winter solstices')

  const entries: MonthEntry[] = []

  for (let a = 0; a < anchorIndices.length - 1; a++) {
    const suiStart = anchorIndices[a] as number
    const suiEnd = anchorIndices[a + 1] as number // exclusive — this index is the NEXT month-11
    const monthCount = suiEnd - suiStart // 12 or 13 raw intervals in this suì

    // Which raw interval (if any) is the leap month: the first one after
    // month 11 (i.e. index suiStart+1 onward) lacking a zhongqi.
    let leapIndex = -1
    if (monthCount === 13) {
      for (let i = suiStart + 1; i < suiEnd; i++) {
        if (!(raw[i] as RawMonth).hasZhongqi) {
          leapIndex = i
          break
        }
      }
    }

    // Walk the suì assigning month numbers. A leap month is never a "new"
    // number — it reuses whatever number was just assigned to the previous
    // (regular) entry, and the number only advances again on the entry
    // after it. So the increment must be decided for each entry using that
    // same entry's own leap status, not applied a step early in advance.
    let num = 11
    for (let i = suiStart; i < suiEnd; i++) {
      const isLeap = i === leapIndex
      if (i > suiStart && !isLeap) num = (num % 12) + 1
      const r = raw[i] as RawMonth
      entries.push({
        startDate: civilDateToLocalDate(r.start),
        endDate: civilDateToLocalDate((raw[i + 1] as RawMonth)?.start ?? r.start),
        year: 0, // filled in below
        month: num,
        isLeapMonth: isLeap,
      })
    }
  }

  // Year label increments at each (non-leap, by construction) month === 1 —
  // CNY's Gregorian year IS the label, unambiguously. Entries before the
  // table's first month-1 need a seed guess, but since the table spans the
  // query date ± ~14 months and month 1 recurs at least once a year, any
  // real query point is corrected well before it's read; a same-year guess
  // for the initial entry is good enough for that unread prefix.
  let year = (entries[0] as MonthEntry).startDate.getFullYear()
  for (const e of entries) {
    if (e.month === 1) year = e.startDate.getFullYear()
    e.year = year
  }

  return entries
}

function findEntry(table: MonthEntry[], predicate: (e: MonthEntry) => boolean): MonthEntry | undefined {
  return table.find(predicate)
}

/** Predicate matching a specific (year, month, isLeapMonth) — `isLeapMonth`
 *  disambiguates a leap month from its same-numbered regular sibling. */
function monthMatcher(year: number, month: number, isLeapMonth?: boolean) {
  return (e: MonthEntry) => e.year === year && e.month === month && !!e.isLeapMonth === !!isLeapMonth
}

function toCalendarDate(entry: MonthEntry, day: number): CalendarDate {
  return {
    year: entry.year,
    month: entry.month,
    day,
    monthName: chineseMonthName(entry.month, entry.isLeapMonth),
    isLeapMonth: entry.isLeapMonth,
    era: '农历',
  }
}

const CHINESE_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

export function chineseMonthName(month: number, isLeapMonth = false): string {
  const base = CHINESE_MONTH_NAMES[month - 1] ?? `${month}月`
  return isLeapMonth ? `闰${base}` : base
}

export const ChineseCalendarSystem: CalendarSystem = {
  id: 'chinese',
  displayName: 'Chinese',

  fromGregorian(date: Date): CalendarDate {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const table = buildMonthTable(target)
    const entry = findEntry(table, e => target >= e.startDate && target < e.endDate)
    if (!entry) throw new Error(`Chinese calendar: no month found for ${target.toISOString()}`)
    const day = Math.round((target.getTime() - entry.startDate.getTime()) / MS_PER_DAY) + 1
    return toCalendarDate(entry, day)
  },

  toGregorian(date: { year: number; month: number; day: number; isLeapMonth?: boolean }): Date {
    // Estimate a center date from the requested year/month, then locate the
    // exact entry in a table built around that estimate.
    const estimate = new Date(date.year, date.month - 1, 15)
    const matches = monthMatcher(date.year, date.month, date.isLeapMonth)
    const entry = findEntry(buildMonthTable(estimate), matches)
      ?? findEntry(buildMonthTable(addDays(estimate, 200)), matches)
      ?? findEntry(buildMonthTable(addDays(estimate, -200)), matches)
    if (!entry) throw new Error(`Chinese calendar: month ${date.year}/${date.month}${date.isLeapMonth ? ' (leap)' : ''} not found`)
    return addDays(entry.startDate, date.day - 1)
  },

  daysInMonth(year: number, month: number, isLeapMonth?: boolean): number {
    const estimate = new Date(year, month - 1, 15)
    const entry = findEntry(buildMonthTable(estimate), monthMatcher(year, month, isLeapMonth))
    if (!entry) throw new Error(`Chinese calendar: month ${year}/${month}${isLeapMonth ? ' (leap)' : ''} not found`)
    return Math.round((entry.endDate.getTime() - entry.startDate.getTime()) / MS_PER_DAY)
  },

  monthsInYear(year: number): number {
    // Build a table centered mid-year and count distinct (month, isLeapMonth)
    // entries carrying this year label.
    const table = buildMonthTable(new Date(year, 6, 1))
    return table.filter(e => e.year === year).length
  },

  monthName(_year: number, month: number, isLeapMonth?: boolean): string {
    return chineseMonthName(month, isLeapMonth)
  },

  addMonths(date: { year: number; month: number; isLeapMonth?: boolean }, delta: number): { year: number; month: number; isLeapMonth?: boolean } {
    const matches = monthMatcher(date.year, date.month, date.isLeapMonth)

    // The table spans roughly ±14 months around its center, so centering it
    // directly on the requested month comfortably covers any single-digit
    // step in either direction without hitting an edge. For a larger delta,
    // widen the center estimate toward the target and try again.
    let estimate = new Date(date.year, date.month - 1, 15)
    let table = buildMonthTable(estimate)
    let idx = table.findIndex(matches)
    if (idx === -1) throw new Error(`Chinese calendar: could not locate ${date.year}/${date.month}${date.isLeapMonth ? ' (leap)' : ''} to step from`)

    let target = idx + delta
    if (target < 0 || target >= table.length) {
      estimate = addDays(estimate, Math.sign(delta) * (Math.abs(delta) + 2) * 30)
      table = buildMonthTable(estimate)
      idx = table.findIndex(matches)
      if (idx === -1) throw new Error(`Chinese calendar: addMonths(${date.year}/${date.month}, ${delta}) out of range`)
      target = idx + delta
      if (target < 0 || target >= table.length) {
        throw new Error(`Chinese calendar: addMonths(${date.year}/${date.month}, ${delta}) out of range`)
      }
    }

    const e = table[target] as MonthEntry
    return { year: e.year, month: e.month, isLeapMonth: e.isLeapMonth }
  },
}
