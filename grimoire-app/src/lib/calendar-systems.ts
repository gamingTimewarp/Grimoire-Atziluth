/**
 * calendar-systems.ts
 * App-facing registry of non-Gregorian calendar tabs available on the
 * Calendar page. Wraps the pure conversion math from @grimoire/core with
 * display metadata (tab label, emoji) that belongs at the UI layer.
 */

import { CALENDAR_SYSTEMS } from '@grimoire/core'
import type { CalendarSystem } from '@grimoire/core'

export type CalendarTabDefinition = {
  id: string
  system: CalendarSystem
  tabLabel: string
  emoji: string
}

export const CALENDAR_TABS: CalendarTabDefinition[] = [
  {
    id: 'hebrew',
    system: CALENDAR_SYSTEMS.hebrew as CalendarSystem,
    tabLabel: 'Hebrew',
    emoji: '✡️',
  },
  {
    id: 'islamic',
    system: CALENDAR_SYSTEMS.islamic as CalendarSystem,
    tabLabel: 'Islamic',
    emoji: '☪️',
  },
  {
    id: 'chinese',
    system: CALENDAR_SYSTEMS.chinese as CalendarSystem,
    tabLabel: 'Chinese',
    emoji: '🏮',
  },
  {
    id: 'hindu',
    system: CALENDAR_SYSTEMS.hindu as CalendarSystem,
    tabLabel: 'Hindu',
    emoji: '🕉️',
  },
]

export function getCalendarTab(id: string): CalendarTabDefinition | undefined {
  return CALENDAR_TABS.find(tab => tab.id === id)
}
