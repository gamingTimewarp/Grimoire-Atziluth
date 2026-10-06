/**
 * holiday-engine.ts
 * Resolves calendar.holiday entities (grimoire-data/entities/calendar/holidays-*.json)
 * to real Gregorian dates for a given year — the holiday analogue of
 * getSabbatsForYear/SABBAT_DEFS in astro-engine.ts, but kept in its own file since
 * holidays are a distinct concern from astrology.
 *
 * Correspondence-table content (dayCorrespondences: the per-night sefirot, Ushpizin,
 * Navadurga, etc.) intentionally lives only in the entity JSON, not duplicated here —
 * this module only knows *when* a holiday falls, not what each day means. The UI
 * resolves the rest by fetching the entity itself via its canonicalName, the same way
 * the Calendar page already navigates Sabbat labels to /reference/$canonicalName
 * without duplicating a Sabbat's description locally.
 */

import * as Astronomy from 'astronomy-engine'
import { CALENDAR_SYSTEMS, type CalendarSystem } from '@grimoire/core'
import { getEasterForYear } from './astro-engine'

export type DateRule =
  | { kind: 'fixed-gregorian'; month: number; day: number }
  | { kind: 'native-calendar'; calendarId: 'hebrew' | 'chinese' | 'hindu'; month: number | 'adar-ii'; day: number | 'second-to-last' }
  | { kind: 'solar-longitude'; sunLongitude: number }
  | { kind: 'astronomical-easter' }
  | { kind: 'offset-from-holiday'; baseCanonicalName: string; offsetDays: number }

export interface HolidayDef {
  canonicalName: string
  name: string
  emoji: string
  dateRule: DateRule
  durationDays: number
}

export interface HolidayInstance {
  canonicalName: string
  name: string
  emoji: string
  /** Start date (day 1) of this holiday's span in the year it was resolved for. */
  time: Date
  durationDays: number
  /** Which day of the span (1-indexed) this particular instance/map-entry represents. */
  dayIndex: number
}

/** The 15 holidays covered so far. `dayCorrespondences` (the actual per-day
 *  meanings) live only in the matching calendar.holiday entity's extendedData. */
export const HOLIDAY_DEFS: HolidayDef[] = [
  { canonicalName: 'calendar.holiday.twelve-nights',   name: 'Twelve Nights',   emoji: '🌌', dateRule: { kind: 'fixed-gregorian', month: 12, day: 25 }, durationDays: 12 },
  { canonicalName: 'calendar.holiday.easter',           name: 'Easter',          emoji: '🌅', dateRule: { kind: 'astronomical-easter' }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.pentecost',        name: 'Pentecost',       emoji: '🔥', dateRule: { kind: 'offset-from-holiday', baseCanonicalName: 'calendar.holiday.easter', offsetDays: 49 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.pesach',           name: 'Pesach',          emoji: '🐑', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 1, day: 15 }, durationDays: 7 },
  { canonicalName: 'calendar.holiday.shavuot',          name: 'Shavuot',         emoji: '🌾', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 3, day: 6 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.rosh-hashanah',    name: 'Rosh Hashanah',   emoji: '📯', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 7, day: 1 }, durationDays: 2 },
  { canonicalName: 'calendar.holiday.yom-kippur',       name: 'Yom Kippur',      emoji: '🕊️', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 7, day: 10 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.sukkot',           name: 'Sukkot',          emoji: '🌿', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 7, day: 15 }, durationDays: 7 },
  { canonicalName: 'calendar.holiday.hanukkah',         name: 'Hanukkah',        emoji: '🕎', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 9, day: 25 }, durationDays: 8 },
  { canonicalName: 'calendar.holiday.purim',            name: 'Purim',           emoji: '🎭', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 'adar-ii', day: 14 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.tu-bishvat',       name: 'Tu BiShvat',      emoji: '🌳', dateRule: { kind: 'native-calendar', calendarId: 'hebrew', month: 11, day: 15 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.dongzhi',          name: 'Dongzhi',         emoji: '❄️', dateRule: { kind: 'solar-longitude', sunLongitude: 270 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.duanwu',           name: 'Duanwu',          emoji: '🐉', dateRule: { kind: 'native-calendar', calendarId: 'chinese', month: 5, day: 5 }, durationDays: 1 },
  { canonicalName: 'calendar.holiday.navratri',         name: 'Navratri',        emoji: '🪔', dateRule: { kind: 'native-calendar', calendarId: 'hindu', month: 7, day: 1 }, durationDays: 9 },
  { canonicalName: 'calendar.holiday.maha-shivaratri',  name: 'Maha Shivaratri', emoji: '🕉️', dateRule: { kind: 'native-calendar', calendarId: 'hindu', month: 12, day: 'second-to-last' }, durationDays: 1 },
]

/** Every distinct native-calendar year overlapping the given Gregorian year
 *  (at most 2 — the same "check both ends of the year" trick already used for
 *  Sabbats/month-grid building in calendar/index.tsx). */
function nativeYearsOverlapping(system: CalendarSystem, gregorianYear: number): number[] {
  const jan1  = system.fromGregorian(new Date(gregorianYear, 0, 1))
  const dec31 = system.fromGregorian(new Date(gregorianYear, 11, 31))
  return Array.from(new Set([jan1.year, dec31.year]))
}

function resolveNativeCalendarInstances(rule: Extract<DateRule, { kind: 'native-calendar' }>, gregorianYear: number): Date[] {
  const system = CALENDAR_SYSTEMS[rule.calendarId]
  if (!system) return []
  const dates: Date[] = []
  for (const nativeYear of nativeYearsOverlapping(system, gregorianYear)) {
    try {
      const month = rule.month === 'adar-ii' ? (system.monthsInYear(nativeYear) === 13 ? 13 : 12) : rule.month
      const day = rule.day === 'second-to-last' ? system.daysInMonth(nativeYear, month) - 1 : rule.day
      const d = system.toGregorian({ year: nativeYear, month, day })
      if (d.getFullYear() === gregorianYear) dates.push(d)
    } catch { /* calendar system couldn't resolve this year/month — skip */ }
  }
  return dates
}

/**
 * Resolves a fixed solar longitude (e.g. a solstice, or a meteor shower's
 * established peak) to its one real date within `gregorianYear` — unlike
 * getSabbatsForYear, which walks its 8 longitudes in order and can advance
 * searchFrom incrementally between them, this has to work for ANY single
 * longitude in isolation, with no neighbour to anchor from.
 *
 * SearchSunLongitude finds the next crossing after a start date within a
 * bounded window, and (per getSabbatsForYear's own note) a window anywhere
 * near a full solar year risks converging on next year's crossing instead
 * of a nearby one — so this walks forward in safe ~100-day windows from a
 * year before the target, re-anchoring past whatever it finds until a
 * crossing lands inside `gregorianYear` (a longitude whose crossing falls
 * very early in the year, like the Quadrantids near January, needs the
 * walk to pass through — and discard — that same longitude's occurrence
 * in the *prior* year first, since "year - 1, Jan 1" has no way to know in
 * advance which side of the year boundary a given longitude's first hit
 * will land on).
 */
function resolveSolarLongitudeDate(sunLongitude: number, gregorianYear: number): Date | null {
  let searchFrom = new Date(gregorianYear - 1, 0, 1)
  for (let i = 0; i < 10; i++) {
    let result: ReturnType<typeof Astronomy.SearchSunLongitude> | null
    try {
      result = Astronomy.SearchSunLongitude(sunLongitude, searchFrom, 100)
    } catch {
      result = null
    }
    if (!result) {
      searchFrom = new Date(searchFrom.getTime() + 95 * 86400000)
      continue
    }
    const year = result.date.getFullYear()
    if (year === gregorianYear) return result.date
    if (year > gregorianYear) return null
    searchFrom = new Date(result.date.getTime() + 86400000)
  }
  return null
}

function resolveDatesForYear(def: HolidayDef, gregorianYear: number): Date[] {
  switch (def.dateRule.kind) {
    case 'fixed-gregorian':
      return [new Date(gregorianYear, def.dateRule.month - 1, def.dateRule.day)]
    case 'native-calendar':
      return resolveNativeCalendarInstances(def.dateRule, gregorianYear)
    case 'solar-longitude': {
      const d = resolveSolarLongitudeDate(def.dateRule.sunLongitude, gregorianYear)
      return d ? [d] : []
    }
    case 'astronomical-easter': {
      try {
        return [getEasterForYear(gregorianYear)]
      } catch {
        return []
      }
    }
    case 'offset-from-holiday': {
      const rule = def.dateRule
      const baseDef = HOLIDAY_DEFS.find(d => d.canonicalName === rule.baseCanonicalName)
      if (!baseDef) return []
      const baseDates = resolveDatesForYear(baseDef, gregorianYear)
      if (baseDates.length === 0) return []
      const base = baseDates[0] as Date
      return [new Date(base.getFullYear(), base.getMonth(), base.getDate() + rule.offsetDays)]
    }
  }
}

/**
 * Returns every holiday instance touching the given Gregorian year, one entry per
 * day of each holiday's span (so a multi-day holiday like Hanukkah contributes up
 * to 8 entries). Also resolves each holiday against `year - 1`, since a holiday
 * anchored near the Gregorian year boundary (Twelve Nights starting 25 Dec;
 * Hanukkah, which most years starts in December) can spill its later days into
 * the following Gregorian year — mirroring the same concern the Sabbat search
 * handles by starting from 1 Dec of the prior year.
 */
export function getHolidaysForYear(year: number): HolidayInstance[] {
  const instances: HolidayInstance[] = []
  for (const def of HOLIDAY_DEFS) {
    for (const anchorYear of [year - 1, year]) {
      let starts: Date[]
      try {
        starts = resolveDatesForYear(def, anchorYear)
      } catch {
        continue
      }
      for (const start of starts) {
        for (let i = 0; i < def.durationDays; i++) {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
          if (d.getFullYear() === year) {
            instances.push({ canonicalName: def.canonicalName, name: def.name, emoji: def.emoji, time: d, durationDays: def.durationDays, dayIndex: i + 1 })
          }
        }
      }
    }
  }
  return instances.sort((a, b) => a.time.getTime() - b.time.getTime())
}

// ─── Meteor showers ─────────────────────────────────────────────────────────
// Resolves calendar.meteor-shower entities (grimoire-data/entities/calendar/
// meteor-showers.json) to a real date each year. Unlike holidays, a shower's
// peak is a single point in time (no durationDays span, no per-day
// correspondences) — it's the solar-longitude mechanism already used for
// Dongzhi above, just applied across the whole year instead of one point
// near the solstice. sunLongitude values here must stay in sync with each
// entity's own extendedData.dateRule, same relationship HOLIDAY_DEFS has
// with the holiday entities' dateRule fields.

export interface MeteorShowerDef {
  canonicalName: string
  name: string
  emoji: string
  sunLongitude: number
}

export interface MeteorShowerInstance {
  canonicalName: string
  name: string
  emoji: string
  time: Date
}

export const METEOR_SHOWER_DEFS: MeteorShowerDef[] = [
  { canonicalName: 'calendar.meteor-shower.quadrantids',    name: 'Quadrantids',    emoji: '☄️', sunLongitude: 283.16 },
  { canonicalName: 'calendar.meteor-shower.lyrids',          name: 'Lyrids',         emoji: '☄️', sunLongitude: 32.32 },
  { canonicalName: 'calendar.meteor-shower.eta-aquariids',   name: 'Eta Aquariids',  emoji: '☄️', sunLongitude: 45.5 },
  { canonicalName: 'calendar.meteor-shower.perseids',        name: 'Perseids',       emoji: '☄️', sunLongitude: 140.0 },
  { canonicalName: 'calendar.meteor-shower.orionids',        name: 'Orionids',       emoji: '☄️', sunLongitude: 208.0 },
  { canonicalName: 'calendar.meteor-shower.leonids',         name: 'Leonids',        emoji: '☄️', sunLongitude: 235.27 },
  { canonicalName: 'calendar.meteor-shower.geminids',        name: 'Geminids',       emoji: '☄️', sunLongitude: 262.2 },
  { canonicalName: 'calendar.meteor-shower.ursids',          name: 'Ursids',         emoji: '☄️', sunLongitude: 270.7 },
]

/** Returns every major meteor shower's peak date within the given Gregorian year. */
export function getMeteorShowersForYear(year: number): MeteorShowerInstance[] {
  const instances: MeteorShowerInstance[] = []
  for (const def of METEOR_SHOWER_DEFS) {
    const time = resolveSolarLongitudeDate(def.sunLongitude, year)
    if (time) instances.push({ canonicalName: def.canonicalName, name: def.name, emoji: def.emoji, time })
  }
  return instances.sort((a, b) => a.time.getTime() - b.time.getTime())
}
