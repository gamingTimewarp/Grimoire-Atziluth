import { describe, it, expect } from 'vitest'
import {
  zonedTimeToUtc, todayInZone, isValidIanaZone,
  serializeManualTimezone, parseManualTimezone, resolveManualOffsetMinutes,
  type ManualTimezone,
} from '../timezone'

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

describe('isValidIanaZone', () => {
  it('accepts a real IANA zone', () => {
    expect(isValidIanaZone('America/Chicago')).toBe(true)
    expect(isValidIanaZone('UTC')).toBe(true)
  })

  it('rejects a made-up zone name', () => {
    expect(isValidIanaZone('Not/AZone')).toBe(false)
  })

  it('rejects empty/absent input', () => {
    expect(isValidIanaZone('')).toBe(false)
    expect(isValidIanaZone(null)).toBe(false)
    expect(isValidIanaZone(undefined)).toBe(false)
  })

  it('rejects a manual: string (not a real IANA id)', () => {
    expect(isValidIanaZone('manual:-300')).toBe(false)
  })
})

describe('manual timezone serialization', () => {
  it('round-trips a fixed offset with no DST', () => {
    const tz: ManualTimezone = { baseOffsetMinutes: -300, dst: null }
    const s = serializeManualTimezone(tz)
    expect(s).toBe('manual:-300')
    expect(parseManualTimezone(s)).toEqual(tz)
  })

  it('round-trips a fixed offset with a recurring DST rule', () => {
    const tz: ManualTimezone = {
      baseOffsetMinutes: -300,
      dst: {
        offsetMinutes: 60,
        start: { month: 3, week: 2, weekday: 0, minuteOfDay: 120 },
        end: { month: 11, week: 1, weekday: 0, minuteOfDay: 120 },
      },
    }
    const s = serializeManualTimezone(tz)
    expect(parseManualTimezone(s)).toEqual(tz)
  })

  it('returns null for a non-manual or malformed string', () => {
    expect(parseManualTimezone('America/Chicago')).toBeNull()
    expect(parseManualTimezone('manual:not-a-number')).toBeNull()
    expect(parseManualTimezone('manual:-300:60:garbage:11.1.0.120')).toBeNull()
  })
})

describe('resolveManualOffsetMinutes / zonedTimeToUtc with a manual timezone', () => {
  it('applies a fixed offset with no DST unconditionally', () => {
    const tz = 'manual:330' // UTC+05:30, no DST
    expect(zonedTimeToUtc('2002-06-01', '12:00', tz).toISOString()).toBe('2002-06-01T06:30:00.000Z')
    expect(zonedTimeToUtc('2002-01-01', '12:00', tz).toISOString()).toBe('2002-01-01T06:30:00.000Z')
  })

  // US-style rule: UTC-05:00 standard, +60 DST, 2nd Sunday March .. 1st Sunday
  // November at 2:00am local. In 2002 that's March 10 and November 3.
  const usRule: ManualTimezone = {
    baseOffsetMinutes: -300,
    dst: {
      offsetMinutes: 60,
      start: { month: 3, week: 2, weekday: 0, minuteOfDay: 120 },
      end: { month: 11, week: 1, weekday: 0, minuteOfDay: 120 },
    },
  }
  const us = serializeManualTimezone(usRule)

  it('is on standard time in January', () => {
    expect(zonedTimeToUtc('2002-01-15', '07:00', us).toISOString()).toBe('2002-01-15T12:00:00.000Z')
  })

  it('is on DST in July', () => {
    expect(zonedTimeToUtc('2002-07-15', '07:00', us).toISOString()).toBe('2002-07-15T11:00:00.000Z')
  })

  it('is still standard time just before the March transition', () => {
    expect(zonedTimeToUtc('2002-03-10', '01:59', us).toISOString()).toBe('2002-03-10T06:59:00.000Z')
  })

  it('is on DST just after the March transition', () => {
    expect(zonedTimeToUtc('2002-03-10', '03:00', us).toISOString()).toBe('2002-03-10T07:00:00.000Z')
  })

  it('is still DST shortly before the November transition', () => {
    // 01:00-02:00 is the repeated/ambiguous hour on fall-back night (it occurs
    // once in DST, once in standard time), so this checks 00:59 rather than
    // 01:59 — genuinely unambiguous, unlike the accepted-edge-case hour itself.
    expect(zonedTimeToUtc('2002-11-03', '00:59', us).toISOString()).toBe('2002-11-03T04:59:00.000Z')
  })

  it('is back on standard time just after the November transition', () => {
    expect(zonedTimeToUtc('2002-11-03', '02:01', us).toISOString()).toBe('2002-11-03T07:01:00.000Z')
  })

  // Southern-hemisphere-shaped rule (AU preset): UTC+10:00 standard, +60 DST,
  // 1st Sunday October (2:00am std) .. 1st Sunday April (3:00am dst) — the
  // season wraps across the year boundary, so this also covers that branch.
  const auRule: ManualTimezone = {
    baseOffsetMinutes: 600,
    dst: {
      offsetMinutes: 60,
      start: { month: 10, week: 1, weekday: 0, minuteOfDay: 120 },
      end: { month: 4, week: 1, weekday: 0, minuteOfDay: 180 },
    },
  }
  const au = serializeManualTimezone(auRule)

  it('is on DST in January (season wraps the year boundary)', () => {
    expect(zonedTimeToUtc('2002-01-15', '10:00', au).toISOString()).toBe('2002-01-14T23:00:00.000Z')
  })

  it('is on standard time in July (outside the wrapped season)', () => {
    expect(zonedTimeToUtc('2002-07-15', '10:00', au).toISOString()).toBe('2002-07-15T00:00:00.000Z')
  })

  it('resolveManualOffsetMinutes agrees with the zonedTimeToUtc results above', () => {
    expect(resolveManualOffsetMinutes(usRule, 2002, 1, 15, 7, 0)).toBe(-300)
    expect(resolveManualOffsetMinutes(usRule, 2002, 7, 15, 7, 0)).toBe(-240)
    expect(resolveManualOffsetMinutes(auRule, 2002, 1, 15, 10, 0)).toBe(660)
    expect(resolveManualOffsetMinutes(auRule, 2002, 7, 15, 10, 0)).toBe(600)
  })
})

describe('todayInZone with a manual timezone', () => {
  const lateUtcInstant = new Date('2002-01-26T23:30:00.000Z')

  it('rolls over to the next day for a positive fixed offset', () => {
    expect(todayInZone('manual:600', lateUtcInstant)).toBe('2002-01-27')
  })

  it('stays on the same day for a negative fixed offset', () => {
    expect(todayInZone('manual:-300', lateUtcInstant)).toBe('2002-01-26')
  })
})
