/**
 * secret-themes.ts
 * Hidden theme presets, found rather than picked from a list. Kept entirely
 * separate from THEME_PRESETS in theme-store.ts so they never appear in the
 * theme picker until earned — see getVisibleSecretThemes for the one place
 * that decides what's currently selectable.
 */

import type { ThemePreset } from './theme-store'
import { getSabbatsForYear } from './astro-engine'
import { todayInZone } from './timezone'

// ─── Presets ────────────────────────────────────────────────────────────────

/**
 * The four solar Sabbats (Wheel of the Year quarter-days), one theme apiece.
 * Reuses the exact astronomical instants the calendar's own Sabbat feature
 * already computes (getSabbatsForYear) rather than re-deriving equinox/
 * solstice dates a second way. Ids match the Sabbat's own canonical-name
 * segment ('ostara', 'litha', 'mabon', 'yule') so the reveal check in
 * getRevealedSeasonalThemeId needs no separate mapping table.
 */
export const SEASONAL_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ostara',
    label: 'Ostara',
    description: 'Blossom and new green.',
    colors: {
      'surface-0':    '#0c130f',
      'surface-1':    '#111a14',
      'surface-2':    '#18251c',
      'surface-3':    '#213125',
      'border':       '#2c4030',
      'accent':       '#e0899f',
      'accent-hover': '#ec9bb0',
      'accent-muted': '#8a4a5a',
      'text':         '#e6ece0',
      'text-muted':   '#7a9080',
      'text-subtle':  '#445040',
    },
    lightColors: {
      'surface-0':    '#f6f8ee',
      'surface-1':    '#eef4de',
      'surface-2':    '#e0edc8',
      'surface-3':    '#d0e4ac',
      'border':       '#a8cc80',
      'accent':       '#a83058',
      'accent-hover': '#bc3e68',
      'accent-muted': '#d06888',
      'text':         '#14180a',
      'text-muted':   '#3c5828',
      'text-subtle':  '#648048',
    },
  },
  {
    id: 'litha',
    label: 'Litha',
    description: 'Sun-gold at the height of the year.',
    colors: {
      'surface-0':    '#0e1018',
      'surface-1':    '#131722',
      'surface-2':    '#1c2230',
      'surface-3':    '#262e3e',
      'border':       '#333c50',
      'accent':       '#f0b840',
      'accent-hover': '#f8c860',
      'accent-muted': '#8a6c20',
      'text':         '#eceef4',
      'text-muted':   '#808ca0',
      'text-subtle':  '#464e60',
    },
    lightColors: {
      'surface-0':    '#fbf6e8',
      'surface-1':    '#f6eed0',
      'surface-2':    '#eee0ac',
      'surface-3':    '#e4d084',
      'border':       '#c8ac54',
      'accent':       '#9c6800',
      'accent-hover': '#b47a08',
      'accent-muted': '#d0982c',
      'text':         '#180f00',
      'text-muted':   '#504020',
      'text-subtle':  '#806840',
    },
  },
  {
    id: 'mabon',
    label: 'Mabon',
    description: 'Harvest rust and deep earth.',
    colors: {
      'surface-0':    '#120d0a',
      'surface-1':    '#1a120c',
      'surface-2':    '#241a12',
      'surface-3':    '#302418',
      'border':       '#40301f',
      'accent':       '#d87038',
      'accent-hover': '#e88448',
      'accent-muted': '#804420',
      'text':         '#ece4d8',
      'text-muted':   '#9c8060',
      'text-subtle':  '#584838',
    },
    lightColors: {
      'surface-0':    '#f8f0e2',
      'surface-1':    '#f0e4c8',
      'surface-2':    '#e4d0a4',
      'surface-3':    '#d6ba7c',
      'border':       '#b0925c',
      'accent':       '#9c4212',
      'accent-hover': '#b4501a',
      'accent-muted': '#c8703c',
      'text':         '#180c02',
      'text-muted':   '#543c1c',
      'text-subtle':  '#806038',
    },
  },
  {
    id: 'yule',
    label: 'Yule',
    description: 'Ice and evergreen at the dark of the year.',
    colors: {
      'surface-0':    '#0a0e12',
      'surface-1':    '#0f151c',
      'surface-2':    '#161e28',
      'surface-3':    '#1e2836',
      'border':       '#283446',
      'accent':       '#a8d8e8',
      'accent-hover': '#bce4f0',
      'accent-muted': '#4a7888',
      'text':         '#e4eef4',
      'text-muted':   '#7890a0',
      'text-subtle':  '#40505e',
    },
    lightColors: {
      'surface-0':    '#eef4f8',
      'surface-1':    '#e2eef4',
      'surface-2':    '#d0e4ee',
      'surface-3':    '#b8d6e6',
      'border':       '#90bcd4',
      'accent':       '#205870',
      'accent-hover': '#286c88',
      'accent-muted': '#4a90a8',
      'text':         '#060e14',
      'text-muted':   '#2c4858',
      'text-subtle':  '#5c7888',
    },
  },
]

/**
 * Almost colourless by design — Ain, the first of the three veils of
 * negative existence that precede Kether, before even the Void (see the
 * existing 'void' preset in theme-store.ts, which this is deliberately more
 * austere than).
 */
export const AIN_THEME_PRESET: ThemePreset = {
  id: 'ain',
  label: 'Ain',
  description: 'Before the Void, before Kether.',
  colors: {
    'surface-0':    '#000000',
    'surface-1':    '#060606',
    'surface-2':    '#0c0c0c',
    'surface-3':    '#141414',
    'border':       '#1c1c1c',
    'accent':       '#cfcfcf',
    'accent-hover': '#e0e0e0',
    'accent-muted': '#5c5c5c',
    'text':         '#e8e8e8',
    'text-muted':   '#707070',
    'text-subtle':  '#383838',
  },
  lightColors: {
    'surface-0':    '#ffffff',
    'surface-1':    '#f8f8f8',
    'surface-2':    '#f0f0f0',
    'surface-3':    '#e6e6e6',
    'border':       '#d0d0d0',
    'accent':       '#303030',
    'accent-hover': '#202020',
    'accent-muted': '#808080',
    'text':         '#050505',
    'text-muted':   '#606060',
    'text-subtle':  '#909090',
  },
}

export const SECRET_THEME_PRESETS: ThemePreset[] = [...SEASONAL_THEME_PRESETS, AIN_THEME_PRESET]

// ─── Unlock persistence ─────────────────────────────────────────────────────

const UNLOCK_KEY = 'grimoire:unlocked-themes'

export function getUnlockedSecretThemeIds(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** No-op if already unlocked — safe to call unconditionally. */
export function unlockSecretTheme(id: string): void {
  const current = getUnlockedSecretThemeIds()
  if (current.includes(id)) return
  localStorage.setItem(UNLOCK_KEY, JSON.stringify([...current, id]))
}

// ─── Seasonal reveal ────────────────────────────────────────────────────────

/**
 * Returns the id of the seasonal secret theme whose Sabbat falls today, in
 * the given zone — or null on every other day. Checked against the real
 * astronomical instant (not a fixed calendar date, since equinoxes/solstices
 * drift by up to a day year to year), converted to the zone's local calendar
 * day the same way "today" is computed everywhere else in this app.
 */
export function getRevealedSeasonalThemeId(timezone: string | null | undefined, now: Date = new Date()): string | null {
  const today = todayInZone(timezone, now)
  const solarSabbats = getSabbatsForYear(now.getFullYear()).filter(s => s.type === 'solar')

  for (const sabbat of solarSabbats) {
    if (todayInZone(timezone, sabbat.time) === today) {
      return sabbat.canonicalName.split('.').pop() ?? null
    }
  }
  return null
}

/**
 * Secret themes that should currently be selectable: every already-unlocked
 * one, plus today's seasonal reveal if it isn't unlocked yet. Deliberately
 * silent — callers render these identically to regular presets, with no
 * badge or explanation marking them as special.
 */
export function getVisibleSecretThemes(timezone: string | null | undefined, now: Date = new Date()): ThemePreset[] {
  const unlocked = new Set(getUnlockedSecretThemeIds())
  const visible = SECRET_THEME_PRESETS.filter(p => unlocked.has(p.id))

  const revealedId = getRevealedSeasonalThemeId(timezone, now)
  if (revealedId && !unlocked.has(revealedId)) {
    const revealed = SECRET_THEME_PRESETS.find(p => p.id === revealedId)
    if (revealed) visible.push(revealed)
  }

  return visible
}
