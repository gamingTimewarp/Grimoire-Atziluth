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

/** Only used for Dongzhi (270°, the December solstice) this pass — unlike
 *  Imbolc's search in getSabbatsForYear (which starts from 1 Dec of the
 *  *prior* year because Imbolc falls in early-mid Feb), a longitude that
 *  itself falls in December needs the search to start within the *target*
 *  year, or it never reaches that December at all. 1 Nov comfortably
 *  brackets a Dec 21-23 solstice within a 60-day window. */
function resolveSolarLongitudeDate(sunLongitude: number, gregorianYear: number): Date | null {
  try {
    const result = Astronomy.SearchSunLongitude(sunLongitude, new Date(gregorianYear, 10, 1), 60)
    if (!result) return null
    return result.date.getFullYear() === gregorianYear ? result.date : null
  } catch {
    return null
  }
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
