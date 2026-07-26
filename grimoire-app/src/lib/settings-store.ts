/**
 * settings-store.ts
 * localStorage-backed settings: home location, date/time override.
 * Designed to be extended with additional settings (house system, traditions, etc.)
 */

export type Location = {
  label: string   // Human-readable place name
  lat: number
  lon: number
  timezone: string // IANA timezone, e.g. "Europe/London"
}

export type Settings = {
  homeLocation: Location | null
  /** ISO datetime override — if set, calendar uses this instead of now() */
  dateTimeOverride: string | null
  /** Deck ID to use for the automatic daily reading */
  dailyDeckId: string
  /** Spread ID for the daily reading — null means single-card free reading */
  dailySpreadId: string | null
  /** Default spread for manual readings — null means no pre-selection */
  defaultReadingSpreadId: string | null
  /** Default to compact (dense) layout in the journal */
  defaultCompactJournal: boolean
  /** Show the per-planet retrograde tracker strip on the calendar grid */
  showRetrogradeTracker: boolean
  /** Which non-Gregorian calendar tabs are enabled on the Calendar page.
   *  The Gregorian tab is always shown regardless of this list. */
  enabledCalendarSystems: string[]
}

const KEY = 'grimoire:settings'

const DEFAULTS: Settings = {
  homeLocation: null,
  dateTimeOverride: null,
  dailyDeckId: 'rws-major',
  dailySpreadId: null,
  defaultReadingSpreadId: null,
  defaultCompactJournal: false,
  showRetrogradeTracker: false,
  enabledCalendarSystems: ['hebrew', 'islamic', 'chinese'],
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const current = loadSettings()
  const next = { ...current, ...patch }
  saveSettings(next)
  return next
}

/** Returns the effective date to use — override if set, otherwise now. */
export function getEffectiveDate(): Date {
  const { dateTimeOverride } = loadSettings()
  if (dateTimeOverride) {
    const d = new Date(dateTimeOverride)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

/** Returns the home location, or null. */
export function getHomeLocation(): Location | null {
  return loadSettings().homeLocation
}
