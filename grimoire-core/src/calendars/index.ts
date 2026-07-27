export type { CalendarDate, CalendarSystem, MonthKey } from './types.js'
export { gregorianToDayCount, dayCountToGregorian } from './day-count.js'
export { HebrewCalendarSystem, isHebrewLeapYear, daysInHebrewMonth, hebrewMonthName } from './hebrew.js'
export { IslamicCalendarSystem, isIslamicLeapYear, daysInIslamicMonth, islamicMonthName } from './islamic.js'
export { ChineseCalendarSystem, chineseMonthName } from './chinese.js'
export { HinduCalendarSystem, hinduMonthName } from './hindu.js'

import type { CalendarSystem } from './types.js'
import { HebrewCalendarSystem } from './hebrew.js'
import { IslamicCalendarSystem } from './islamic.js'
import { ChineseCalendarSystem } from './chinese.js'
import { HinduCalendarSystem } from './hindu.js'

export const CALENDAR_SYSTEMS: Record<string, CalendarSystem> = {
  hebrew: HebrewCalendarSystem,
  islamic: IslamicCalendarSystem,
  chinese: ChineseCalendarSystem,
  hindu: HinduCalendarSystem,
}
