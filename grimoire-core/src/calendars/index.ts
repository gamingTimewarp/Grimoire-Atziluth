export type { CalendarDate, CalendarSystem } from './types.js'
export { gregorianToDayCount, dayCountToGregorian } from './day-count.js'
export { HebrewCalendarSystem, isHebrewLeapYear, daysInHebrewMonth, hebrewMonthName } from './hebrew.js'
export { IslamicCalendarSystem, isIslamicLeapYear, daysInIslamicMonth, islamicMonthName } from './islamic.js'

import type { CalendarSystem } from './types.js'
import { HebrewCalendarSystem } from './hebrew.js'
import { IslamicCalendarSystem } from './islamic.js'

export const CALENDAR_SYSTEMS: Record<string, CalendarSystem> = {
  hebrew: HebrewCalendarSystem,
  islamic: IslamicCalendarSystem,
}
