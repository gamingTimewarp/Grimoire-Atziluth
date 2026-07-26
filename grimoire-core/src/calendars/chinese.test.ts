import { describe, it, expect } from 'vitest'
import { ChineseCalendarSystem } from './chinese.js'
import { gregorianToDayCount } from './day-count.js'

describe('ChineseCalendarSystem', () => {
  it('matches the verified month-11 anchor (new moon 2010-12-06, containing the 2010-12-22 winter solstice)', () => {
    expect(ChineseCalendarSystem.fromGregorian(new Date(2010, 11, 6))).toMatchObject({
      year: 2010, month: 11, day: 1, isLeapMonth: false,
    })
    // Winter solstice falls 16 days later, still within the same month.
    expect(ChineseCalendarSystem.fromGregorian(new Date(2010, 11, 22))).toMatchObject({
      year: 2010, month: 11, day: 17, isLeapMonth: false,
    })
  })

  it('matches Chinese New Year 2024-02-10 (cross-checked against the existing CNY_DATES table in astro-calc.ts)', () => {
    expect(ChineseCalendarSystem.fromGregorian(new Date(2024, 1, 10))).toMatchObject({
      year: 2024, month: 1, day: 1, isLeapMonth: false,
    })
  })

  it('matches the verified 2023 leap 2nd month (闰二月, 2023-03-22 through 2023-04-19)', () => {
    expect(ChineseCalendarSystem.fromGregorian(new Date(2023, 2, 22))).toMatchObject({
      year: 2023, month: 2, day: 1, isLeapMonth: true,
    })
    expect(ChineseCalendarSystem.fromGregorian(new Date(2023, 2, 25))).toMatchObject({
      year: 2023, month: 2, day: 4, isLeapMonth: true,
    })
    // The day after the leap month ends is month 3, day 1.
    expect(ChineseCalendarSystem.fromGregorian(new Date(2023, 3, 20))).toMatchObject({
      year: 2023, month: 3, day: 1, isLeapMonth: false,
    })
    expect(ChineseCalendarSystem.daysInMonth(2023, 2, true)).toBe(29)

    // The regular (non-leap) month 2 precedes the leap one.
    const regularMonth2 = ChineseCalendarSystem.fromGregorian(new Date(2023, 1, 25))
    expect(regularMonth2).toMatchObject({ year: 2023, month: 2, isLeapMonth: false })
  })

  it('matches an independent leap-month anchor with a different month/year (闰六月 2025, 2025-07-25 through 2025-08-22)', () => {
    expect(ChineseCalendarSystem.fromGregorian(new Date(2025, 6, 25))).toMatchObject({
      year: 2025, month: 6, day: 1, isLeapMonth: true,
    })
    expect(ChineseCalendarSystem.fromGregorian(new Date(2025, 7, 23))).toMatchObject({
      year: 2025, month: 7, day: 1, isLeapMonth: false,
    })
    expect(ChineseCalendarSystem.daysInMonth(2025, 6, true)).toBe(29)
  })

  it('reports 13 months for known leap years and 12 for a known non-leap year', () => {
    expect(ChineseCalendarSystem.monthsInYear(2023)).toBe(13)
    expect(ChineseCalendarSystem.monthsInYear(2025)).toBe(13)
    expect(ChineseCalendarSystem.monthsInYear(2024)).toBe(12)
  })

  it('round-trips toGregorian(fromGregorian(d)) for a range of real dates spanning leap and non-leap years', () => {
    const start = new Date(2022, 0, 1)
    for (let i = 0; i < 1400; i += 41) {
      const date = new Date(start.getTime() + i * 86400000)
      const chinese = ChineseCalendarSystem.fromGregorian(date)
      const back = ChineseCalendarSystem.toGregorian(chinese)
      expect(gregorianToDayCount(back)).toBe(gregorianToDayCount(date))
    }
  })

  it('addMonths steps from a regular month into its leap sibling and back', () => {
    const month2 = { year: 2023, month: 2, isLeapMonth: false }
    const next = ChineseCalendarSystem.addMonths(month2, 1)
    expect(next).toEqual({ year: 2023, month: 2, isLeapMonth: true })
    const back = ChineseCalendarSystem.addMonths(next, -1)
    expect(back).toEqual(month2)
    const afterLeap = ChineseCalendarSystem.addMonths(next, 1)
    expect(afterLeap).toEqual({ year: 2023, month: 3, isLeapMonth: false })
  })

  it('addMonths rolls month 12 into next year\'s month 1', () => {
    const cny2024 = { year: 2024, month: 1, isLeapMonth: false }
    const prev = ChineseCalendarSystem.addMonths(cny2024, -1)
    expect(prev.year).toBeLessThan(2024)
    expect(prev.month).toBe(12)
    const back = ChineseCalendarSystem.addMonths(prev, 1)
    expect(back).toEqual(cny2024)
  })
})
