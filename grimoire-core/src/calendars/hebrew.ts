/**
 * calendars/hebrew.ts
 * Arithmetic (Rambam/Hillel II fixed) Hebrew calendar: a deterministic
 * 19-year Metonic cycle with molad-based new-year calculation and the
 * traditional postponement rules (dechiyot). No external data or
 * astronomical computation required.
 *
 * HEBREW_EPOCH is calibrated (not derived from a textbook constant) against
 * three verified Rosh Hashanah anchors spanning a leap-year boundary:
 *   1 Tishrei 5785 = 2024-10-03, 5786 = 2025-09-23, 5787 = 2026-09-12 (leap).
 * All three round-trip exactly under this implementation.
 */

import type { CalendarDate, CalendarSystem } from './types.js'
import { gregorianToDayCount, dayCountToGregorian } from './day-count.js'

const HEBREW_EPOCH = -2092590

function mod(a: number, b: number): number {
  return ((a % b) + b) % b
}

export function isHebrewLeapYear(year: number): boolean {
  return mod(7 * year + 1, 19) < 7
}

export function monthsInHebrewYear(year: number): number {
  return isHebrewLeapYear(year) ? 13 : 12
}

function hebrewCalendarElapsedDays(year: number): number {
  const monthsElapsed = Math.floor((235 * year - 234) / 19)
  const partsElapsed = 12084 + 13753 * monthsElapsed
  const day = 29 * monthsElapsed + Math.floor(partsElapsed / 25920)
  if (mod(3 * (day + 1), 7) < 3) return day + 1
  return day
}

function hebrewNewYearDelay(year: number): number {
  const ny1 = hebrewCalendarElapsedDays(year)
  const ny2 = hebrewCalendarElapsedDays(year + 1)
  if (ny2 - ny1 === 356) return 2
  const ny0 = hebrewCalendarElapsedDays(year - 1)
  if (ny1 - ny0 === 382) return 1
  return 0
}

function hebrewNewYearDay(year: number): number {
  return hebrewCalendarElapsedDays(year) + hebrewNewYearDelay(year)
}

/** 0 = deficient (353/383), 1 = regular (354/384), 2 = complete (355/385). */
function hebrewYearType(year: number): 0 | 1 | 2 {
  const length = hebrewNewYearDay(year + 1) - hebrewNewYearDay(year)
  const base = isHebrewLeapYear(year) ? 383 : 353
  return (length - base) as 0 | 1 | 2
}

export function daysInHebrewMonth(year: number, month: number): number {
  switch (month) {
    case 2: // Iyar
    case 4: // Tammuz
    case 6: // Elul
    case 10: // Tevet
    case 13: // Adar II
      return 29
    case 8: // Cheshvan
      return hebrewYearType(year) >= 2 ? 30 : 29
    case 9: // Kislev
      return hebrewYearType(year) >= 1 ? 30 : 29
    case 12: // Adar / Adar I
      return isHebrewLeapYear(year) ? 30 : 29
    default: // Nisan, Sivan, Av, Tishrei, Shevat
      return 30
  }
}

const HEBREW_MONTH_NAMES: Record<number, string> = {
  1: 'Nisan',
  2: 'Iyar',
  3: 'Sivan',
  4: 'Tammuz',
  5: 'Av',
  6: 'Elul',
  7: 'Tishrei',
  8: 'Cheshvan',
  9: 'Kislev',
  10: 'Tevet',
  11: 'Shevat',
}

export function hebrewMonthName(year: number, month: number): string {
  if (month === 12) return isHebrewLeapYear(year) ? 'Adar I' : 'Adar'
  if (month === 13) return 'Adar II'
  return HEBREW_MONTH_NAMES[month] as string
}

/** Month order within a Hebrew year, starting from Tishrei (the year that
 * begins the AM year number) through to Elul (the year's final month). */
function monthOrder(year: number): number[] {
  const last = monthsInHebrewYear(year)
  const order: number[] = []
  for (let m = 7; m <= last; m++) order.push(m)
  for (let m = 1; m <= 6; m++) order.push(m)
  return order
}

function fixedFromHebrew(date: { year: number; month: number; day: number }): number {
  const { year, month, day } = date
  let elapsed = 0
  for (const m of monthOrder(year)) {
    if (m === month) break
    elapsed += daysInHebrewMonth(year, m)
  }
  return HEBREW_EPOCH + hebrewNewYearDay(year) + elapsed + (day - 1)
}

function hebrewFromFixed(fixed: number): CalendarDate {
  const target = fixed - HEBREW_EPOCH
  let year = Math.floor(target / 366) + 1
  while (hebrewNewYearDay(year) > target) year--
  while (hebrewNewYearDay(year + 1) <= target) year++

  let remaining = target - hebrewNewYearDay(year)
  let month = 7
  for (const m of monthOrder(year)) {
    const len = daysInHebrewMonth(year, m)
    if (remaining < len) {
      month = m
      break
    }
    remaining -= len
  }
  return {
    year,
    month,
    day: remaining + 1,
    monthName: hebrewMonthName(year, month),
    isLeapMonth: month === 12 && isHebrewLeapYear(year),
    era: 'AM',
  }
}

export const HebrewCalendarSystem: CalendarSystem = {
  id: 'hebrew',
  displayName: 'Hebrew',

  fromGregorian(date: Date): CalendarDate {
    return hebrewFromFixed(gregorianToDayCount(date))
  },

  toGregorian(date: { year: number; month: number; day: number }): Date {
    return dayCountToGregorian(fixedFromHebrew(date))
  },

  daysInMonth(year: number, month: number, _isLeapMonth?: boolean): number {
    return daysInHebrewMonth(year, month)
  },

  monthsInYear(year: number): number {
    return monthsInHebrewYear(year)
  },

  monthName(year: number, month: number, _isLeapMonth?: boolean): string {
    return hebrewMonthName(year, month)
  },

  addMonths(date: { year: number; month: number }, delta: number): { year: number; month: number } {
    let { year, month } = date
    let remaining = delta
    while (remaining > 0) {
      const order = monthOrder(year)
      const idx = order.indexOf(month)
      if (idx === order.length - 1) {
        year += 1
        month = 7
      } else {
        month = order[idx + 1] as number
      }
      remaining--
    }
    while (remaining < 0) {
      const order = monthOrder(year)
      const idx = order.indexOf(month)
      if (idx === 0) {
        year -= 1
        month = monthOrder(year).at(-1) as number
      } else {
        month = order[idx - 1] as number
      }
      remaining++
    }
    return { year, month }
  },
}
