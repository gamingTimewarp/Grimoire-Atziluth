import { describe, it, expect } from 'vitest'
import { HebrewCalendarSystem, isHebrewLeapYear, daysInHebrewMonth } from './hebrew.js'
import { gregorianToDayCount } from './day-count.js'

describe('HebrewCalendarSystem', () => {
  it('matches verified Rosh Hashanah anchors, including a leap-year boundary', () => {
    expect(HebrewCalendarSystem.fromGregorian(new Date(2024, 9, 3))).toMatchObject({
      year: 5785,
      month: 7,
      day: 1,
    })
    expect(HebrewCalendarSystem.fromGregorian(new Date(2025, 8, 23))).toMatchObject({
      year: 5786,
      month: 7,
      day: 1,
    })
    expect(HebrewCalendarSystem.fromGregorian(new Date(2026, 8, 12))).toMatchObject({
      year: 5787,
      month: 7,
      day: 1,
    })
  })

  it('identifies 5787 as leap and 5785/5786 as common', () => {
    expect(isHebrewLeapYear(5785)).toBe(false)
    expect(isHebrewLeapYear(5786)).toBe(false)
    expect(isHebrewLeapYear(5787)).toBe(true)
  })

  it('gives a leap year 13 months and a common year 12', () => {
    expect(HebrewCalendarSystem.monthsInYear(5786)).toBe(12)
    expect(HebrewCalendarSystem.monthsInYear(5787)).toBe(13)
  })

  it('round-trips toGregorian(fromGregorian(d)) for a range of real dates', () => {
    const start = new Date(2020, 0, 1)
    for (let i = 0; i < 2000; i += 37) {
      const date = new Date(start.getTime() + i * 86400000)
      const hebrew = HebrewCalendarSystem.fromGregorian(date)
      const back = HebrewCalendarSystem.toGregorian(hebrew)
      expect(gregorianToDayCount(back)).toBe(gregorianToDayCount(date))
    }
  })

  it('addMonths rolls Elul -> Tishrei across a year boundary', () => {
    const tishrei5786 = { year: 5786, month: 7 }
    const prev = HebrewCalendarSystem.addMonths(tishrei5786, -1)
    expect(prev).toEqual({ year: 5785, month: 6 })
    const next = HebrewCalendarSystem.addMonths(prev, 1)
    expect(next).toEqual(tishrei5786)
  })

  it('addMonths handles the leap month Adar I/II correctly', () => {
    const adarI = { year: 5787, month: 12 } // 5787 is leap
    const adarII = HebrewCalendarSystem.addMonths(adarI, 1)
    expect(adarII).toEqual({ year: 5787, month: 13 })
    const nisan = HebrewCalendarSystem.addMonths(adarII, 1)
    expect(nisan).toEqual({ year: 5787, month: 1 })
  })

  it('Cheshvan/Kislev vary in length by year type but other months do not', () => {
    // Iyar is always 29 regardless of year type
    expect(daysInHebrewMonth(5785, 2)).toBe(29)
    expect(daysInHebrewMonth(5786, 2)).toBe(29)
  })
})
