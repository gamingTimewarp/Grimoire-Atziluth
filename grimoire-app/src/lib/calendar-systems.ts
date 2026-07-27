/**
 * calendar-systems.ts
 * App-facing registry of non-Gregorian calendar tabs available on the
 * Calendar page. Wraps the pure conversion math from @grimoire/core with
 * display metadata (tab label, emoji, reference-entity canonical names)
 * that belongs at the UI layer.
 */

import { CALENDAR_SYSTEMS } from '@grimoire/core'
import type { CalendarSystem } from '@grimoire/core'

export type CalendarTabDefinition = {
  id: string
  system: CalendarSystem
  tabLabel: string
  emoji: string
  /** Canonical name of the `calendar.month` reference entity for each of
   *  this calendar's 12 base months, indexed by `month - 1`. A leap month
   *  (Chinese, Hindu) shares its regular counterpart's `month` number and
   *  so resolves to the same entity — there's no separate entry for it. */
  monthCanonicalNames: string[]
}

export const CALENDAR_TABS: CalendarTabDefinition[] = [
  {
    id: 'hebrew',
    system: CALENDAR_SYSTEMS.hebrew as CalendarSystem,
    tabLabel: 'Hebrew',
    emoji: '✡️',
    monthCanonicalNames: [
      'calendar.month.hebrew.nisan',
      'calendar.month.hebrew.iyar',
      'calendar.month.hebrew.sivan',
      'calendar.month.hebrew.tammuz',
      'calendar.month.hebrew.av',
      'calendar.month.hebrew.elul',
      'calendar.month.hebrew.tishrei',
      'calendar.month.hebrew.cheshvan',
      'calendar.month.hebrew.kislev',
      'calendar.month.hebrew.tevet',
      'calendar.month.hebrew.shevat',
      'calendar.month.hebrew.adar',
    ],
  },
  {
    id: 'islamic',
    system: CALENDAR_SYSTEMS.islamic as CalendarSystem,
    tabLabel: 'Islamic',
    emoji: '☪️',
    monthCanonicalNames: [
      'calendar.month.islamic.muharram',
      'calendar.month.islamic.safar',
      'calendar.month.islamic.rabi-al-awwal',
      'calendar.month.islamic.rabi-al-thani',
      'calendar.month.islamic.jumada-al-awwal',
      'calendar.month.islamic.jumada-al-thani',
      'calendar.month.islamic.rajab',
      'calendar.month.islamic.shaban',
      'calendar.month.islamic.ramadan',
      'calendar.month.islamic.shawwal',
      'calendar.month.islamic.dhu-al-qadah',
      'calendar.month.islamic.dhu-al-hijjah',
    ],
  },
  {
    id: 'chinese',
    system: CALENDAR_SYSTEMS.chinese as CalendarSystem,
    tabLabel: 'Chinese',
    emoji: '🏮',
    monthCanonicalNames: [
      'calendar.month.chinese.month-1',
      'calendar.month.chinese.month-2',
      'calendar.month.chinese.month-3',
      'calendar.month.chinese.month-4',
      'calendar.month.chinese.month-5',
      'calendar.month.chinese.month-6',
      'calendar.month.chinese.month-7',
      'calendar.month.chinese.month-8',
      'calendar.month.chinese.month-9',
      'calendar.month.chinese.month-10',
      'calendar.month.chinese.month-11',
      'calendar.month.chinese.month-12',
    ],
  },
  {
    id: 'hindu',
    system: CALENDAR_SYSTEMS.hindu as CalendarSystem,
    tabLabel: 'Hindu',
    emoji: '🕉️',
    monthCanonicalNames: [
      'calendar.month.hindu.chaitra',
      'calendar.month.hindu.vaishakha',
      'calendar.month.hindu.jyeshtha',
      'calendar.month.hindu.ashadha',
      'calendar.month.hindu.shravana',
      'calendar.month.hindu.bhadrapada',
      'calendar.month.hindu.ashwin',
      'calendar.month.hindu.kartika',
      'calendar.month.hindu.margashirsha',
      'calendar.month.hindu.pausha',
      'calendar.month.hindu.magha',
      'calendar.month.hindu.phalguna',
    ],
  },
]

/** Canonical name of the `calendar.month` reference entity for each of the
 *  12 Gregorian months, indexed by `month - 1` (January = index 0). */
export const GREGORIAN_MONTH_CANONICAL_NAMES: string[] = [
  'calendar.month.gregorian.january',
  'calendar.month.gregorian.february',
  'calendar.month.gregorian.march',
  'calendar.month.gregorian.april',
  'calendar.month.gregorian.may',
  'calendar.month.gregorian.june',
  'calendar.month.gregorian.july',
  'calendar.month.gregorian.august',
  'calendar.month.gregorian.september',
  'calendar.month.gregorian.october',
  'calendar.month.gregorian.november',
  'calendar.month.gregorian.december',
]

export function getCalendarTab(id: string): CalendarTabDefinition | undefined {
  return CALENDAR_TABS.find(tab => tab.id === id)
}
