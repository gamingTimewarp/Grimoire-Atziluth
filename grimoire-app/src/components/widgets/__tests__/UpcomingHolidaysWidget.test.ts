import { describe, it, expect } from 'vitest'
import { getUpcoming } from '../UpcomingHolidaysWidget'

describe('getUpcoming', () => {
  it('only returns entries strictly at or after "now"', () => {
    const now = new Date(2026, 5, 15) // 15 June 2026
    const upcoming = getUpcoming(now)
    for (const e of upcoming) {
      expect(e.time.getTime()).toBeGreaterThanOrEqual(now.getTime())
    }
  })

  it('returns entries sorted chronologically', () => {
    const now = new Date(2026, 0, 1)
    const upcoming = getUpcoming(now)
    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i]!.time.getTime()).toBeGreaterThanOrEqual(upcoming[i - 1]!.time.getTime())
    }
  })

  it('caps the list at 4 entries', () => {
    const upcoming = getUpcoming(new Date(2026, 0, 1))
    expect(upcoming.length).toBeLessThanOrEqual(4)
  })

  it('includes only the start (day 1) of a multi-day holiday, not every day of its span', () => {
    // Just before Hanukkah 2025 (25 Kislev 5786 = 14 Dec 2025) — its 8 nights
    // should contribute at most one entry to the list, not up to 8.
    const now = new Date(2025, 11, 1)
    const upcoming = getUpcoming(now)
    const hanukkahEntries = upcoming.filter(e => e.canonicalName === 'calendar.holiday.hanukkah')
    expect(hanukkahEntries.length).toBeLessThanOrEqual(1)
  })

  it('does not go empty in late December (pulls in next year\'s Sabbats/Holidays too)', () => {
    const now = new Date(2026, 11, 28) // 28 Dec 2026
    const upcoming = getUpcoming(now)
    expect(upcoming.length).toBeGreaterThan(0)
  })
})
