/**
 * timezone.ts
 * Converts a local wall-clock date/time in an IANA timezone to the correct
 * UTC Date. A fixed numeric offset is not enough here: historical DST rules
 * vary by zone and by date (and have changed over the decades in many
 * countries), so the offset must be resolved for the specific calendar date
 * given, not "whatever offset the current device happens to observe."
 */

/**
 * Interprets `${dateStr}T${timeStr}` as local wall-clock time in `ianaZone`
 * and returns the equivalent UTC Date. Falls back to interpreting the
 * components as the current device's local time if ianaZone is absent —
 * this is only correct when the viewing device happens to share the same
 * zone as the recorded location, so callers should prefer passing a zone
 * whenever one was recorded.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, ianaZone: string | null | undefined): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  if (!ianaZone) {
    return new Date(year, month - 1, day, hour, minute)
  }

  // The desired wall-clock time, treated as a plain (non-UTC-meaningful) instant
  // value purely so it can be diffed against candidate guesses below.
  const desiredMs = Date.UTC(year, month - 1, day, hour, minute)

  // Initial guess: treat the wall-clock components as if they were already UTC.
  let guessMs = desiredMs

  // Ask what wall-clock time that UTC instant corresponds to in the target zone,
  // then correct the guess by the difference *from the desired wall-clock time*
  // (not from the shifting guess — comparing against a moving target never
  // converges for a zone with a constant offset across the correction, which is
  // the overwhelming majority of real dates: it just re-applies the same delta
  // forever instead of reaching zero). Three iterations reliably converge except
  // inside a DST transition's ambiguous/skipped hour, an accepted edge case.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  })

  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guessMs)).map(p => [p.type, p.value]),
    ) as Record<string, string>
    const seenAsUtcMs = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    )
    const delta = desiredMs - seenAsUtcMs
    if (delta === 0) break
    guessMs += delta
  }

  return new Date(guessMs)
}

/**
 * Returns the current local calendar date (YYYY-MM-DD) as observed in
 * `ianaZone`, or in the device's own zone if none is given. Used anywhere
 * "today" needs to mean the user's configured zone rather than UTC or
 * whatever zone the device happens to be set to.
 */
export function todayInZone(ianaZone: string | null | undefined, now: Date = new Date()): string {
  if (!ianaZone) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  // en-CA formats as YYYY-MM-DD directly — no manual part-assembly needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ianaZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
