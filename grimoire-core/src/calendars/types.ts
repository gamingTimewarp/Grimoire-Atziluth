/**
 * calendars/types.ts
 * Shared interface for non-Gregorian calendar systems (Hebrew, Islamic, and
 * future lunisolar/tithi-based systems). A CalendarSystem converts to/from
 * real Gregorian dates and describes its own month/year structure so the app
 * layer can build a native month grid without knowing the underlying math.
 */

/** A date expressed in a non-Gregorian calendar system. `month` is 1-indexed
 * and chronological within the year (matches the order months actually
 * occur in, not necessarily a liturgical numbering). */
export interface CalendarDate {
  year: number
  month: number
  day: number
  monthName: string
  /** True when this month is an intercalary/leap month (e.g. Adar I). */
  isLeapMonth?: boolean
  /** Era label to display alongside the year, e.g. "AM" or "AH". */
  era?: string
}

export interface CalendarSystem {
  id: string
  displayName: string
  fromGregorian(date: Date): CalendarDate
  toGregorian(date: { year: number; month: number; day: number }): Date
  daysInMonth(year: number, month: number): number
  monthsInYear(year: number): number
  monthName(year: number, month: number): string
  /** Adds `delta` months to `date`, rolling over years (and leap months)
   * as needed. Delta may be negative. */
  addMonths(date: { year: number; month: number }, delta: number): { year: number; month: number }
}
