/**
 * calendars/day-count.ts
 * A simple integer day-count pivot (days since the Unix epoch, UTC midnight)
 * used as the common exchange point between Gregorian dates and other
 * calendar systems. Each system's epoch constant is calibrated in the same
 * units, so conversions are just addition/subtraction of day counts.
 */

export function gregorianToDayCount(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
}

export function dayCountToGregorian(dayCount: number): Date {
  // Decode via UTC fields (matching how gregorianToDayCount encoded them),
  // then construct a local-time Date so local getters read back the
  // intended calendar day regardless of the host timezone's UTC offset.
  const utc = new Date(dayCount * 86400000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}
