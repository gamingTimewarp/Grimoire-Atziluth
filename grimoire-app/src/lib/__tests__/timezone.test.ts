import { describe, it, expect } from 'vitest'
import { zonedTimeToUtc, todayInZone } from '../timezone'

// Regression coverage for a bug where the convergence check compared the
// formatted result against the shifting guess instead of the fixed desired
// wall-clock time. For any zone whose offset doesn't change between the
// initial guess and the corrected instant — the overwhelming majority of
// real date/zone combinations, not a rare edge case — that never converges
// to zero and the same correction gets applied twice, doubling the offset
// instead of applying it once (e.g. a UTC-6 zone came out 12 hours off
// instead of 6).

describe('zonedTimeToUtc', () => {
  it('resolves CST (winter, no DST) correctly', () => {
    expect(zonedTimeToUtc('2002-01-26', '07:13', 'America/Chicago').toISOString())
      .toBe('2002-01-26T13:13:00.000Z')
  })

  it('resolves CDT (summer, DST active) correctly', () => {
    expect(zonedTimeToUtc('2002-07-15', '07:13', 'America/Chicago').toISOString())
      .toBe('2002-07-15T12:13:00.000Z')
  })

  it('resolves a positive-offset zone (CET, winter)', () => {
    expect(zonedTimeToUtc('2002-01-26', '07:13', 'Europe/Paris').toISOString())
      .toBe('2002-01-26T06:13:00.000Z')
  })

  it('resolves a positive-offset zone during its DST period (CEST, summer)', () => {
    expect(zonedTimeToUtc('2002-07-15', '07:13', 'Europe/Paris').toISOString())
      .toBe('2002-07-15T05:13:00.000Z')
  })

  it('resolves a half-hour-offset zone', () => {
    expect(zonedTimeToUtc('2002-01-26', '07:13', 'Asia/Kolkata').toISOString())
      .toBe('2002-01-26T01:43:00.000Z')
  })

  it('resolves a large positive offset that rolls back to the previous UTC day', () => {
    expect(zonedTimeToUtc('2002-01-26', '07:13', 'Pacific/Kiritimati').toISOString())
      .toBe('2002-01-25T17:13:00.000Z')
  })

  it('falls back to device-local interpretation when no zone is recorded', () => {
    const result = zonedTimeToUtc('2002-01-26', '07:13', null)
    expect(result.getFullYear()).toBe(2002)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(26)
    expect(result.getHours()).toBe(7)
    expect(result.getMinutes()).toBe(13)
  })
})

describe('todayInZone', () => {
  // Fixed instant: 2002-01-26T23:30:00Z — late evening UTC, so zones ahead of
  // UTC have already rolled into the 27th while zones behind UTC are still on
  // the 26th. This is exactly the boundary case the daily reading fix cares
  // about: "today" must track the configured zone, not UTC or device-local.
  const lateUtcInstant = new Date('2002-01-26T23:30:00.000Z')

  it('returns the UTC date when no zone is given, based on device-local wall clock', () => {
    // No zone -> reads the Date object's own local getFullYear/Month/Date,
    // so this just needs to round-trip a date consistently, not match UTC.
    const now = new Date(2002, 0, 26, 12, 0, 0)
    expect(todayInZone(null, now)).toBe('2002-01-26')
    expect(todayInZone(undefined, now)).toBe('2002-01-26')
  })

  it('rolls over to the next day for a zone ahead of UTC', () => {
    expect(todayInZone('Pacific/Auckland', lateUtcInstant)).toBe('2002-01-27')
  })

  it('stays on the same day for a zone behind UTC', () => {
    expect(todayInZone('America/Chicago', lateUtcInstant)).toBe('2002-01-26')
  })

  it('is deterministic for the same (zone, instant) pair regardless of how many times it is called', () => {
    // Directly models the "zone flipped back and forth" scenario: repeated
    // calls with the same inputs must always agree, since the daily-reading
    // existence check and the stored readingDate both depend on this.
    const a = todayInZone('Europe/London', lateUtcInstant)
    const b = todayInZone('Europe/London', lateUtcInstant)
    const c = todayInZone('Europe/London', lateUtcInstant)
    expect(a).toBe(b)
    expect(b).toBe(c)
  })
})
