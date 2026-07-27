import { describe, it, expect } from 'vitest'
import { HinduCalendarSystem } from './hindu.js'
import { gregorianToDayCount } from './day-count.js'

describe('HinduCalendarSystem', () => {
  it('matches the verified Chaitra Shukla Pratipada anchor (2024-04-09, Vikram Samvat 2081)', () => {
    expect(HinduCalendarSystem.fromGregorian(new Date(2024, 3, 9))).toMatchObject({
      year: 2081, month: 1, day: 1, isLeapMonth: false,
    })
  })

  it('matches two more independent Chaitra Shukla Pratipada anchors (Gudi Padwa / Ugadi 2025 and 2026)', () => {
    expect(HinduCalendarSystem.fromGregorian(new Date(2025, 2, 30))).toMatchObject({
      year: 2082, month: 1, day: 1, isLeapMonth: false,
    })
    expect(HinduCalendarSystem.fromGregorian(new Date(2026, 2, 19))).toMatchObject({
      year: 2083, month: 1, day: 1, isLeapMonth: false,
    })
  })

  it('matches the verified 2023 Adhika Shravana (leap 5th month, 2023-07-18 through 2023-08-16)', () => {
    expect(HinduCalendarSystem.fromGregorian(new Date(2023, 6, 18))).toMatchObject({
      month: 5, day: 1, isLeapMonth: true,
    })
    // Adhika Masa takes the name of the *following* regular month (unlike
    // Chinese, where the leap keeps its predecessor's number) — so the
    // regular (non-leap) Shravana immediately follows the leap one here,
    // sharing its number, and only the month after that advances to 6.
    expect(HinduCalendarSystem.fromGregorian(new Date(2023, 7, 17))).toMatchObject({
      month: 5, day: 1, isLeapMonth: false,
    })
    expect(HinduCalendarSystem.fromGregorian(new Date(2023, 8, 15))).toMatchObject({
      month: 6, day: 1, isLeapMonth: false,
    })
    expect(HinduCalendarSystem.daysInMonth(
      HinduCalendarSystem.fromGregorian(new Date(2023, 6, 18)).year, 5, true,
    )).toBe(30)

    // Ashadha (month 4) precedes the leap month.
    const ashadha = HinduCalendarSystem.fromGregorian(new Date(2023, 5, 20))
    expect(ashadha).toMatchObject({ month: 4, isLeapMonth: false })
  })

  it('reports 13 months for the known 2023 leap year', () => {
    const leapYear = HinduCalendarSystem.fromGregorian(new Date(2023, 6, 18)).year
    expect(HinduCalendarSystem.monthsInYear(leapYear)).toBe(13)
  })

  it('round-trips toGregorian(fromGregorian(d)) for a range of real dates spanning a leap year', () => {
    const start = new Date(2022, 0, 1)
    for (let i = 0; i < 1400; i += 41) {
      const date = new Date(start.getTime() + i * 86400000)
      const hindu = HinduCalendarSystem.fromGregorian(date)
      const back = HinduCalendarSystem.toGregorian(hindu)
      expect(gregorianToDayCount(back)).toBe(gregorianToDayCount(date))
    }
  })

  it('addMonths steps from Ashadha into the leap Shravana, then the regular one, then Bhadrapada', () => {
    const leapYear = HinduCalendarSystem.fromGregorian(new Date(2023, 6, 18)).year
    const ashadha = { year: leapYear, month: 4, isLeapMonth: false }
    const leapShravana = HinduCalendarSystem.addMonths(ashadha, 1)
    expect(leapShravana).toEqual({ year: leapYear, month: 5, isLeapMonth: true })
    const back = HinduCalendarSystem.addMonths(leapShravana, -1)
    expect(back).toEqual(ashadha)
    const regularShravana = HinduCalendarSystem.addMonths(leapShravana, 1)
    expect(regularShravana).toEqual({ year: leapYear, month: 5, isLeapMonth: false })
    const bhadrapada = HinduCalendarSystem.addMonths(regularShravana, 1)
    expect(bhadrapada).toEqual({ year: leapYear, month: 6, isLeapMonth: false })
  })

  it("addMonths rolls Phalguna (month 12) into next year's Chaitra (month 1)", () => {
    const chaitra2081 = { year: 2081, month: 1, isLeapMonth: false }
    const prev = HinduCalendarSystem.addMonths(chaitra2081, -1)
    expect(prev.year).toBe(2080)
    expect(prev.month).toBe(12)
    const back = HinduCalendarSystem.addMonths(prev, 1)
    expect(back).toEqual(chaitra2081)
  })
})
