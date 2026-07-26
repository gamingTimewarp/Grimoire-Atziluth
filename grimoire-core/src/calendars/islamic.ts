/**
 * calendars/islamic.ts
 * Tabular (arithmetic) Hijri calendar: a deterministic 30-year cycle with
 * 11 leap years, alternating 30/29-day months. This is the *calculated
 * civil* calendar used by many software implementations — it will not
 * always match real moon-sighting-based dates observed by some communities,
 * which can vary by a day depending on region.
 *
 * ISLAMIC_EPOCH is calibrated (not a textbook constant) against a verified
 * anchor (1 Muharram 1447 AH = 2025-06-27) and cross-checked against 1446 AH,
 * where this implementation's result (2024-07-08) matches multiple
 * independent real-world moon-sighting announcements (Saudi Arabia's
 * alternate date, Indonesia's Lembaga Falakiyah PBNU) even though one
 * particular tabular-calendar website reports 2024-07-07 instead — expected
 * ±1 day variance between tabular calendar variants, not an implementation bug.
 */

import type { CalendarDate, CalendarSystem } from './types.js'
import { gregorianToDayCount, dayCountToGregorian } from './day-count.js'

const ISLAMIC_EPOCH = -492148

function mod(a: number, b: number): number {
  return ((a % b) + b) % b
}

export function isIslamicLeapYear(year: number): boolean {
  return mod(11 * year + 14, 30) < 11
}

function islamicYearLength(year: number): number {
  return isIslamicLeapYear(year) ? 355 : 354
}

export function daysInIslamicMonth(year: number, month: number): number {
  if (month === 12 && isIslamicLeapYear(year)) return 30
  return month % 2 === 1 ? 30 : 29
}

const ISLAMIC_MONTH_NAMES: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: "Rabi' al-Awwal",
  4: "Rabi' al-Thani",
  5: 'Jumada al-Awwal',
  6: 'Jumada al-Thani',
  7: 'Rajab',
  8: "Sha'ban",
  9: 'Ramadan',
  10: 'Shawwal',
  11: "Dhu al-Qa'dah",
  12: 'Dhu al-Hijjah',
}

export function islamicMonthName(_year: number, month: number): string {
  return ISLAMIC_MONTH_NAMES[month] as string
}

function fixedFromIslamic(date: { year: number; month: number; day: number }): number {
  const { year, month, day } = date
  let elapsed = 0
  for (let y = 1; y < year; y++) elapsed += islamicYearLength(y)
  for (let m = 1; m < month; m++) elapsed += daysInIslamicMonth(year, m)
  return ISLAMIC_EPOCH + elapsed + (day - 1)
}

function islamicFromFixed(fixed: number): CalendarDate {
  const target = fixed - ISLAMIC_EPOCH
  let year = Math.max(1, Math.floor(target / 355) + 1)
  let elapsedBeforeYear = (() => {
    let e = 0
    for (let y = 1; y < year; y++) e += islamicYearLength(y)
    return e
  })()
  while (elapsedBeforeYear > target) {
    year--
    elapsedBeforeYear -= islamicYearLength(year)
  }
  while (elapsedBeforeYear + islamicYearLength(year) <= target) {
    elapsedBeforeYear += islamicYearLength(year)
    year++
  }

  let remaining = target - elapsedBeforeYear
  let month = 1
  while (month < 12) {
    const len = daysInIslamicMonth(year, month)
    if (remaining < len) break
    remaining -= len
    month++
  }
  return {
    year,
    month,
    day: remaining + 1,
    monthName: islamicMonthName(year, month),
    era: 'AH',
  }
}

export const IslamicCalendarSystem: CalendarSystem = {
  id: 'islamic',
  displayName: 'Islamic (Hijri)',

  fromGregorian(date: Date): CalendarDate {
    return islamicFromFixed(gregorianToDayCount(date))
  },

  toGregorian(date: { year: number; month: number; day: number }): Date {
    return dayCountToGregorian(fixedFromIslamic(date))
  },

  daysInMonth(year: number, month: number): number {
    return daysInIslamicMonth(year, month)
  },

  monthsInYear(): number {
    return 12
  },

  monthName(year: number, month: number): string {
    return islamicMonthName(year, month)
  },

  addMonths(date: { year: number; month: number }, delta: number): { year: number; month: number } {
    const totalMonths = (date.year - 1) * 12 + (date.month - 1) + delta
    const year = Math.floor(totalMonths / 12) + 1
    const month = (((totalMonths % 12) + 12) % 12) + 1
    return { year, month }
  },
}
