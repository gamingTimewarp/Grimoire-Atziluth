import { describe, it, expect } from 'vitest'
import { IslamicCalendarSystem, isIslamicLeapYear } from './islamic.js'
import { gregorianToDayCount } from './day-count.js'

describe('IslamicCalendarSystem', () => {
  it('matches the verified 1447 AH anchor (1 Muharram = 2025-06-27)', () => {
    expect(IslamicCalendarSystem.fromGregorian(new Date(2025, 5, 27))).toMatchObject({
      year: 1447,
      month: 1,
      day: 1,
    })
  })

  it('matches independent real-world moon-sighting corroboration for 1446 AH (2024-07-08)', () => {
    expect(IslamicCalendarSystem.fromGregorian(new Date(2024, 6, 8))).toMatchObject({
      year: 1446,
      month: 1,
      day: 1,
    })
  })

  it('uses the standard 30-year cycle leap-year positions', () => {
    const leapYearsInCycle = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]
    for (let pos = 1; pos <= 30; pos++) {
      expect(isIslamicLeapYear(pos)).toBe(leapYearsInCycle.includes(pos))
    }
  })

  it('round-trips toGregorian(fromGregorian(d)) for a range of real dates', () => {
    const start = new Date(2020, 0, 1)
    for (let i = 0; i < 2000; i += 37) {
      const date = new Date(start.getTime() + i * 86400000)
      const islamic = IslamicCalendarSystem.fromGregorian(date)
      const back = IslamicCalendarSystem.toGregorian(islamic)
      expect(gregorianToDayCount(back)).toBe(gregorianToDayCount(date))
    }
  })

  it('addMonths rolls Dhu al-Hijjah -> Muharram across a year boundary', () => {
    const dhuAlHijjah1446 = { year: 1446, month: 12 }
    const next = IslamicCalendarSystem.addMonths(dhuAlHijjah1446, 1)
    expect(next).toEqual({ year: 1447, month: 1 })
    const prev = IslamicCalendarSystem.addMonths(next, -1)
    expect(prev).toEqual(dhuAlHijjah1446)
  })

  it('always reports 12 months in a year', () => {
    expect(IslamicCalendarSystem.monthsInYear(1446)).toBe(12)
    expect(IslamicCalendarSystem.monthsInYear(1447)).toBe(12)
  })
})
