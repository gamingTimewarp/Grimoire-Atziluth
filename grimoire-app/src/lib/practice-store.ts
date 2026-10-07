/**
 * practice-store.ts
 * localStorage-backed persistence for the Practice page — pinned reference
 * entities (by canonicalName, re-hydrated against the engine on load) and
 * ritual-space slot picks (by RitualCorrespondence canonicalName, resolved
 * against the static RITUAL_CORRESPONDENCES list, so there's nothing to
 * re-fetch for these). Everything persists until explicitly cleared; there's
 * no "ritual session" concept yet to scope it to, so this is simply
 * "whatever was last set," matching how this first pass is meant to be used
 * for testing.
 */

const PINNED_KEY = 'grimoire:practice-pinned'
const SLOTS_KEY = 'grimoire:practice-slots'

export function loadPinnedCanonicalNames(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function savePinnedCanonicalNames(canonicalNames: string[]): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(canonicalNames))
  } catch { /* ignore quota/serialisation errors — not worth surfacing for a local cache */ }
}

/** Slot id → RitualCorrespondence canonicalName. */
export function loadSlotPicks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveSlotPicks(picks: Record<string, string>): void {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(picks))
  } catch { /* ignore */ }
}

// ─── Ritual space display settings (Settings → Traditions → Ritual) ────────

export interface RitualGroupsEnabled {
  cardinal: boolean
  intercardinal: boolean
  center: boolean
  corners: boolean
}

export interface RitualSettings {
  /** Corner slots (the Tetragrammaton) default to showing the Hebrew letters
   *  themselves; this adds the English transliteration alongside them. */
  showEnglishCaptions: boolean
  groupsEnabled: RitualGroupsEnabled
}

const RITUAL_SETTINGS_KEY = 'grimoire:ritual-settings'

const DEFAULT_RITUAL_SETTINGS: RitualSettings = {
  showEnglishCaptions: false,
  groupsEnabled: { cardinal: true, intercardinal: true, center: true, corners: true },
}

export function loadRitualSettings(): RitualSettings {
  try {
    const raw = localStorage.getItem(RITUAL_SETTINGS_KEY)
    if (!raw) return { showEnglishCaptions: false, groupsEnabled: { ...DEFAULT_RITUAL_SETTINGS.groupsEnabled } }
    const parsed = JSON.parse(raw) as Partial<RitualSettings>
    return {
      showEnglishCaptions: parsed.showEnglishCaptions ?? DEFAULT_RITUAL_SETTINGS.showEnglishCaptions,
      groupsEnabled: { ...DEFAULT_RITUAL_SETTINGS.groupsEnabled, ...parsed.groupsEnabled },
    }
  } catch {
    return { showEnglishCaptions: false, groupsEnabled: { ...DEFAULT_RITUAL_SETTINGS.groupsEnabled } }
  }
}

export function saveRitualSettings(settings: RitualSettings): void {
  try {
    localStorage.setItem(RITUAL_SETTINGS_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('grimoire:ritual-settings-changed'))
  } catch { /* ignore */ }
}

// ─── Ritual widgets (the 4 side slots) ──────────────────────────────────────

export interface TimerWidgetState {
  kind: 'timer'
  /** 'stopwatch' counts up with no end; 'countdown' counts down from durationMs. */
  mode: 'stopwatch' | 'countdown'
  running: boolean
  /** Elapsed time banked from previous start/pause cycles, in ms. */
  accumulatedMs: number
  /** Epoch ms the current run started at, or null when paused — elapsed
   *  while running is computed from wall-clock time against this, not a
   *  timer tick, so it's correct immediately on reload instead of restarting. */
  startedAt: number | null
  /** Countdown-mode target duration, in ms. Unused in stopwatch mode. */
  durationMs: number
}

export interface MagicCircleWidgetState {
  kind: 'magic-circle'
  /** null until a specific circle has been picked. */
  canonicalName: string | null
}

export interface ReadingWidgetState {
  kind: 'reading'
  /** DeckFilter id (built-in or custom) — null until a deck has been picked. */
  deckId: string | null
}

export interface NumerologyWidgetState {
  kind: 'numerology'
  system: 'pythagorean' | 'chaldean' | 'gematria'
  input: string
}

/** No configuration — always shows the current-moment sky, same as the
 *  Astrology page's "Current Sky" panel, just without its controls. */
export interface SkyWheelWidgetState {
  kind: 'sky-wheel'
}

export interface NatalChartWidgetState {
  kind: 'natal-chart'
  /** NatalChartRecord id — null until a chart has been picked. */
  chartId: string | null
}

export type RitualWidgetState =
  | TimerWidgetState | MagicCircleWidgetState | ReadingWidgetState | NumerologyWidgetState
  | SkyWheelWidgetState | NatalChartWidgetState

const WIDGETS_KEY = 'grimoire:practice-widgets'

export function loadWidgetSlots(): Record<string, RitualWidgetState> {
  try {
    const raw = localStorage.getItem(WIDGETS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, RitualWidgetState>) : {}
  } catch {
    return {}
  }
}

export function saveWidgetSlots(slots: Record<string, RitualWidgetState>): void {
  try {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(slots))
  } catch { /* ignore */ }
}

// ─── Notes (free-text section at the bottom of the Practice page) ──────────

const NOTES_KEY = 'grimoire:practice-notes'

export function loadRitualNotes(): string {
  try {
    return localStorage.getItem(NOTES_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveRitualNotes(notes: string): void {
  try {
    localStorage.setItem(NOTES_KEY, notes)
  } catch { /* ignore */ }
}
