/**
 * timezone.ts
 * Converts a local wall-clock date/time in a timezone to the correct UTC Date.
 * A fixed numeric offset is not enough here: historical DST rules vary by
 * zone and by date (and have changed over the decades in many countries), so
 * the offset must be resolved for the specific calendar date given, not
 * "whatever offset the current device happens to observe."
 *
 * Two representations of "timezone" are accepted everywhere in this module
 * (and, transparently, everywhere `timezone`/`birthTimezone` is stored and
 * passed around the app):
 *   - An IANA zone id, e.g. "America/Chicago" — the normal case, resolved
 *     against the runtime's own copy of the IANA database via Intl.
 *   - A "manual" fixed-offset-plus-optional-recurring-DST-rule, serialized as
 *     a `manual:...` string (see ManualTimezone below) — the advanced-mode
 *     escape hatch for a location the IANA database doesn't cover, has
 *     mis-classified, or may reclassify in the future (DST law changes
 *     periodically; IANA zone identifiers themselves are occasionally split,
 *     renamed, or merged).
 */

// ─── IANA zone validation ──────────────────────────────────────────────────

/**
 * True if `zone` is a real IANA timezone identifier the runtime recognizes.
 * Empty/absent is treated as false — callers that allow "no zone recorded"
 * check for that case separately rather than through this function.
 */
export function isValidIanaZone(zone: string | null | undefined): boolean {
  if (!zone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

// ─── Manual (fixed-offset + optional recurring DST rule) timezones ────────

/**
 * A recurring civil-time DST transition: the Nth (or last, week=5)
 * occurrence of `weekday` (0=Sunday..6=Saturday) in `month` (1-12), at
 * `minuteOfDay` local clock time (the *current* local time at the instant
 * clocks change — standard time for a DST start, daylight time for a DST
 * end, matching how these rules are normally described, e.g. "clocks spring
 * forward at 2am").
 */
export interface DstTransitionRule {
  month: number
  week: number
  weekday: number
  minuteOfDay: number
}

export interface ManualDstRule {
  /** Minutes added to the base offset while DST is in effect (usually 60; 30 for the rare half-hour case, e.g. Lord Howe Island). */
  offsetMinutes: number
  start: DstTransitionRule
  end: DstTransitionRule
}

export interface ManualTimezone {
  /** Standard-time UTC offset in minutes, e.g. -300 for UTC-05:00. */
  baseOffsetMinutes: number
  dst: ManualDstRule | null
}

const MANUAL_PREFIX = 'manual:'

export function isManualTimezone(value: string | null | undefined): boolean {
  return !!value && value.startsWith(MANUAL_PREFIX)
}

function serializeTransition(r: DstTransitionRule): string {
  return `${r.month}.${r.week}.${r.weekday}.${r.minuteOfDay}`
}

function parseTransition(s: string): DstTransitionRule | null {
  const m = /^(\d{1,2})\.([1-5])\.([0-6])\.(\d{1,4})$/.exec(s)
  if (!m) return null
  const [, month, week, weekday, minuteOfDay] = m
  return { month: Number(month), week: Number(week), weekday: Number(weekday), minuteOfDay: Number(minuteOfDay) }
}

/** Serializes a ManualTimezone to the string form stored as a location's `timezone`. */
export function serializeManualTimezone(tz: ManualTimezone): string {
  if (!tz.dst) return `${MANUAL_PREFIX}${tz.baseOffsetMinutes}`
  return [
    `${MANUAL_PREFIX}${tz.baseOffsetMinutes}`,
    tz.dst.offsetMinutes,
    serializeTransition(tz.dst.start),
    serializeTransition(tz.dst.end),
  ].join(':')
}

/** Parses a `manual:...` string back into a ManualTimezone, or null if malformed / not a manual string. */
export function parseManualTimezone(value: string | null | undefined): ManualTimezone | null {
  if (!value || !value.startsWith(MANUAL_PREFIX)) return null
  // Strip the prefix *before* splitting on ':' — the prefix itself ends in a
  // colon, so splitting first would throw off every part's index.
  const parts = value.slice(MANUAL_PREFIX.length).split(':')
  const baseOffsetMinutes = Number(parts[0])
  if (!Number.isFinite(baseOffsetMinutes)) return null
  if (parts.length === 1) return { baseOffsetMinutes, dst: null }
  if (parts.length !== 4) return null

  const dstOffsetMinutes = Number(parts[1])
  const start = parseTransition(parts[2])
  const end = parseTransition(parts[3])
  if (!Number.isFinite(dstOffsetMinutes) || !start || !end) return null
  return { baseOffsetMinutes, dst: { offsetMinutes: dstOffsetMinutes, start, end } }
}

/** Local calendar date (year/month/day) of the Nth — or last, week=5 — `weekday` in `month` of `year`. */
function nthWeekdayDate(year: number, month: number, week: number, weekday: number): { y: number; m: number; d: number } {
  if (week === 5) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    for (let d = lastDay; d > lastDay - 7; d--) {
      if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() === weekday) return { y: year, m: month, d }
    }
    /* istanbul ignore next -- unreachable: every 7-day window contains each weekday once */
    throw new Error('nthWeekdayDate: no match found')
  }
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (week - 1) * 7
  return { y: year, m: month, d: day }
}

/** The UTC instant of a transition, given the local clock offset in effect at that instant. */
function transitionUtcMs(year: number, rule: DstTransitionRule, offsetMinutesAtTransition: number): number {
  const { y, m, d } = nthWeekdayDate(year, rule.month, rule.week, rule.weekday)
  const hour = Math.floor(rule.minuteOfDay / 60)
  const minute = rule.minuteOfDay % 60
  return Date.UTC(y, m - 1, d, hour, minute) - offsetMinutesAtTransition * 60_000
}

/**
 * The effective UTC offset (minutes) for the given local wall-clock date/time
 * under a ManualTimezone's recurring rule. Resolved via the same two-step
 * "guess standard, check the season, recompute if in DST" approach used for
 * IANA zones below — correct except inside the transition's own
 * ambiguous/skipped hour, the same accepted edge case as zonedTimeToUtc.
 */
export function resolveManualOffsetMinutes(
  tz: ManualTimezone,
  year: number, month: number, day: number, hour: number, minute: number,
): number {
  if (!tz.dst) return tz.baseOffsetMinutes
  const { baseOffsetMinutes: base, dst } = tz

  const guessMs = Date.UTC(year, month - 1, day, hour, minute) - base * 60_000

  // start.month <= end.month: the DST season sits inside one calendar year
  // (the usual Northern-hemisphere shape, e.g. March..November). Otherwise
  // it wraps across the year boundary (Southern-hemisphere shape, e.g.
  // October..April) and has to be checked against both the season that
  // started last year and the one starting this year.
  if (dst.start.month <= dst.end.month) {
    const startMs = transitionUtcMs(year, dst.start, base)
    const endMs = transitionUtcMs(year, dst.end, base + dst.offsetMinutes)
    const inDst = guessMs >= startMs && guessMs < endMs
    return base + (inDst ? dst.offsetMinutes : 0)
  }

  const startPrevMs = transitionUtcMs(year - 1, dst.start, base)
  const endThisMs = transitionUtcMs(year, dst.end, base + dst.offsetMinutes)
  const startThisMs = transitionUtcMs(year, dst.start, base)
  const endNextMs = transitionUtcMs(year + 1, dst.end, base + dst.offsetMinutes)
  const inDst = (guessMs >= startPrevMs && guessMs < endThisMs) || (guessMs >= startThisMs && guessMs < endNextMs)
  return base + (inDst ? dst.offsetMinutes : 0)
}

/** "UTC−05:00" / "UTC+05:45" / "UTC±00:00" */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC±00:00'
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

/** Every UTC offset actually in use by a real timezone somewhere (−12:00..+14:00), for the advanced-mode picker. */
export const WELL_KNOWN_UTC_OFFSETS: number[] = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -270, -240, -210, -180, -120, -60, 0,
  60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 630, 660, 690, 720, 765, 780, 840,
]

/**
 * Common recurring-DST-rule presets for the advanced-mode picker, prefilling
 * the custom start/end fields rather than being a distinct stored format —
 * ManualTimezone/the `manual:` string always store the fully-resolved rule.
 * These are approximations of real civil law (see each `note`), meant for
 * the rare case IANA doesn't already cover — prefer the automatic IANA mode
 * whenever it applies.
 */
export const DST_RULE_PRESETS: Record<string, { label: string; note: string; dstOffsetMinutes: number; start: DstTransitionRule; end: DstTransitionRule }> = {
  us: {
    label: 'United States / Canada',
    note: 'Current rule since 2007: 2nd Sunday in March to 1st Sunday in November, 2:00am local time.',
    dstOffsetMinutes: 60,
    start: { month: 3, week: 2, weekday: 0, minuteOfDay: 120 },
    end: { month: 11, week: 1, weekday: 0, minuteOfDay: 120 },
  },
  eu: {
    label: 'European Union',
    note: 'Last Sunday in March to last Sunday in October, officially 1:00am UTC — approximated here as ~2:00am local time (exact for UTC+1 zones; off by up to an hour right at the transition for others).',
    dstOffsetMinutes: 60,
    start: { month: 3, week: 5, weekday: 0, minuteOfDay: 120 },
    end: { month: 10, week: 5, weekday: 0, minuteOfDay: 120 },
  },
  au: {
    label: 'Australia (most states)',
    note: '1st Sunday in October to 1st Sunday in April.',
    dstOffsetMinutes: 60,
    start: { month: 10, week: 1, weekday: 0, minuteOfDay: 120 },
    end: { month: 4, week: 1, weekday: 0, minuteOfDay: 180 },
  },
  nz: {
    label: 'New Zealand',
    note: 'Last Sunday in September to 1st Sunday in April.',
    dstOffsetMinutes: 60,
    start: { month: 9, week: 5, weekday: 0, minuteOfDay: 120 },
    end: { month: 4, week: 1, weekday: 0, minuteOfDay: 180 },
  },
}

// ─── Conversion ─────────────────────────────────────────────────────────────

/**
 * Interprets `${dateStr}T${timeStr}` as local wall-clock time in `zone`
 * (an IANA id, or a `manual:` string — see ManualTimezone above) and returns
 * the equivalent UTC Date. Falls back to interpreting the components as the
 * current device's local time if `zone` is absent — this is only correct
 * when the viewing device happens to share the same zone as the recorded
 * location, so callers should prefer passing a zone whenever one was
 * recorded.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, zone: string | null | undefined): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  if (!zone) {
    return new Date(year, month - 1, day, hour, minute)
  }

  const manual = parseManualTimezone(zone)
  if (manual) {
    const offsetMinutes = resolveManualOffsetMinutes(manual, year, month, day, hour, minute)
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60_000)
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
    timeZone: zone,
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
 * `zone` (an IANA id, or a `manual:` string), or in the device's own zone if
 * none is given. Used anywhere "today" needs to mean the user's configured
 * zone rather than UTC or whatever zone the device happens to be set to.
 */
export function todayInZone(zone: string | null | undefined, now: Date = new Date()): string {
  if (!zone) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  const manual = parseManualTimezone(zone)
  if (manual) {
    // now's own UTC calendar fields are an approximate stand-in for "local
    // time" purely to pick the right DST season below — safe except within
    // dst.offsetMinutes of a transition, the same accepted edge case as
    // resolveManualOffsetMinutes itself.
    const offsetMinutes = resolveManualOffsetMinutes(
      manual, now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(),
    )
    const local = new Date(now.getTime() + offsetMinutes * 60_000)
    return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
  }

  // en-CA formats as YYYY-MM-DD directly — no manual part-assembly needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
