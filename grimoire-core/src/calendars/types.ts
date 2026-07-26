/**
 * calendars/types.ts
 * Shared interface for non-Gregorian calendar systems (Hebrew, Islamic,
 * Chinese, and future lunisolar/tithi-based systems). A CalendarSystem
 * converts to/from real Gregorian dates and describes its own month/year
 * structure so the app layer can build a native month grid without knowing
 * the underlying math.
 */

/** A date expressed in a non-Gregorian calendar system. `month` is 1-indexed
 * and chronological within the year (matches the order months actually
 * occur in, not necessarily a liturgical numbering). */
export interface CalendarDate {
  year: number
  month: number
  day: number
  monthName: string
  /** True when this month is an intercalary/leap month (e.g. Hebrew Adar I,
   *  or a Chinese leap month like 闰二月). Some systems (Chinese) reuse the
   *  same `month` number for both the regular and leap month in a leap
   *  year, so `isLeapMonth` — not `month` alone — disambiguates which one
   *  a given (year, month) pair refers to. */
  isLeapMonth?: boolean
  /** Era label to display alongside the year, e.g. "AM" or "AH". */
  era?: string
}

/** Identifies a specific month: `isLeapMonth` disambiguates systems (like
 *  Chinese) where a leap month reuses its preceding month's number. */
export interface MonthKey {
  year: number
  month: number
  isLeapMonth?: boolean
}

export interface CalendarSystem {
  id: string
  displayName: string
  fromGregorian(date: Date): CalendarDate
  toGregorian(date: MonthKey & { day: number }): Date
  daysInMonth(year: number, month: number, isLeapMonth?: boolean): number
  monthsInYear(year: number): number
  monthName(year: number, month: number, isLeapMonth?: boolean): string
  /** Adds `delta` months to `date`, rolling over years (and leap months)
   * as needed. Delta may be negative. */
  addMonths(date: MonthKey, delta: number): MonthKey
}
