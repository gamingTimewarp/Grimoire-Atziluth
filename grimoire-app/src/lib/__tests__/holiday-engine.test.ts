import { describe, it, expect } from 'vitest'
import { HebrewCalendarSystem } from '@grimoire/core'
import { getHolidaysForYear, HOLIDAY_DEFS } from '../holiday-engine'
import type { HolidayInstance } from '../holiday-engine'
import { getEasterForYear } from '../astro-engine'

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('HOLIDAY_DEFS', () => {
  it('has a unique canonicalName per holiday', () => {
    const names = HOLIDAY_DEFS.map(d => d.canonicalName)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('getHolidaysForYear — Hanukkah', () => {
  it('night 1 falls on 25 Kislev, and each occurrence\'s nights are exactly one day apart (Hanukkah legitimately crosses from Kislev into Tevet most years, since Kislev has only 29-30 days; a year can also show two overlapping occurrences at the boundary, so nights are first grouped by which occurrence they belong to)', () => {
    const nights = getHolidaysForYear(2025).filter(h => h.canonicalName === 'calendar.holiday.hanukkah')
    expect(nights.length).toBeGreaterThan(0)

    // Group by occurrence: each night's own span start (time minus dayIndex-1 days) —
    // nights from the same 8-night Hanukkah land in the same group.
    const occurrences = new Map<number, HolidayInstance[]>()
    for (const h of nights) {
      const startKey = h.time.getTime() - (h.dayIndex - 1) * 86400000
      occurrences.set(startKey, [...(occurrences.get(startKey) ?? []), h])
    }

    for (const group of occurrences.values()) {
      const sorted = [...group].sort((a, b) => a.dayIndex - b.dayIndex)
      const first = sorted[0] as HolidayInstance
      if (first.dayIndex === 1) {
        const hd = HebrewCalendarSystem.fromGregorian(first.time)
        expect(hd.month).toBe(9) // Kislev
        expect(hd.day).toBe(25)
      }
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1] as HolidayInstance
        const cur = sorted[i] as HolidayInstance
        const diffDays = Math.round((cur.time.getTime() - prev.time.getTime()) / 86400000)
        expect(diffDays).toBe(cur.dayIndex - prev.dayIndex)
      }
    }
  })

  it("2024 Hanukkah's first night falls on 26 December (25 Kislev 5785, per this app's own verified Hebrew calendar arithmetic)", () => {
    const night1 = getHolidaysForYear(2024).find(h => h.canonicalName === 'calendar.holiday.hanukkah' && h.dayIndex === 1)
    expect(night1).toBeDefined()
    expect(dateKey(night1!.time)).toBe('2024-12-26')
  })
})

describe('getHolidaysForYear — Purim Adar/Adar II handling', () => {
  it('resolves Purim to the final month of its Hebrew year (Adar, or Adar II in a leap year)', () => {
    const monthsSeen = new Set<number>()
    for (const year of [2026, 2027]) {
      const purim = getHolidaysForYear(year).find(h => h.canonicalName === 'calendar.holiday.purim')
      expect(purim).toBeDefined()
      const hd = HebrewCalendarSystem.fromGregorian(purim!.time)
      expect(hd.day).toBe(14)
      expect(hd.month).toBe(HebrewCalendarSystem.monthsInYear(hd.year))
      monthsSeen.add(hd.month)
    }
    // Across these two consecutive years we should see both a plain Adar (12)
    // year and a leap Adar II (13) year — otherwise this test wouldn't be
    // exercising the leap-year branch at all.
    expect(monthsSeen.has(12)).toBe(true)
    expect(monthsSeen.has(13)).toBe(true)
  })
})

describe('getEasterForYear', () => {
  it('matches the known 2024 Easter date', () => {
    expect(dateKey(getEasterForYear(2024))).toBe('2024-03-31')
  })

  it('always lands on a Sunday', () => {
    for (const year of [2023, 2024, 2025, 2026, 2027]) {
      expect(getEasterForYear(year).getDay()).toBe(0)
    }
  })
})

describe('getHolidaysForYear — Pentecost offset', () => {
  it('falls exactly 49 days after Easter', () => {
    const instances = getHolidaysForYear(2026)
    const easter = instances.find(h => h.canonicalName === 'calendar.holiday.easter')
    const pentecost = instances.find(h => h.canonicalName === 'calendar.holiday.pentecost')
    expect(easter).toBeDefined()
    expect(pentecost).toBeDefined()
    const diffDays = Math.round((pentecost!.time.getTime() - easter!.time.getTime()) / 86400000)
    expect(diffDays).toBe(49)
  })
})

describe('getHolidaysForYear — Dongzhi', () => {
  it('lands within the known winter-solstice window (Dec 20-23)', () => {
    for (const year of [2024, 2025, 2026]) {
      const dongzhi = getHolidaysForYear(year).find(h => h.canonicalName === 'calendar.holiday.dongzhi')
      expect(dongzhi).toBeDefined()
      expect(dongzhi!.time.getMonth()).toBe(11) // December
      expect(dongzhi!.time.getDate()).toBeGreaterThanOrEqual(20)
      expect(dongzhi!.time.getDate()).toBeLessThanOrEqual(23)
    }
  })
})

describe('getHolidaysForYear — Twelve Nights year-boundary spillover', () => {
  it('a single call returns both the December start of this year\'s span (nights 1-7) and the January tail of last year\'s span (nights 8-12)', () => {
    const y2024 = getHolidaysForYear(2024).filter(h => h.canonicalName === 'calendar.holiday.twelve-nights')
    const decStart = y2024.filter(h => h.time.getMonth() === 11) // December 2024
    const janTail = y2024.filter(h => h.time.getMonth() === 0)   // January 2024
    expect(decStart.map(h => h.dayIndex).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(janTail.map(h => h.dayIndex).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12])
  })
})
