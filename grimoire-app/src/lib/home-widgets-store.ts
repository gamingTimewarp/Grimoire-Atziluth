/**
 * home-widgets-store.ts
 * localStorage-backed Home page widget configuration.
 * Controls per-widget visibility and display order — same shape and
 * merge-on-load/broadcast conventions as nav-store.ts, for the same reason:
 * a settings page edits this, and a separately-mounted route (the Home page)
 * needs to pick up changes made there without a full reload.
 */

export interface HomeWidgetConfig {
  id: string
  visible: boolean
}

const KEY = 'grimoire:home-widgets'

export const HOME_WIDGET_DEFAULTS: HomeWidgetConfig[] = [
  { id: 'daily-reading',     visible: true  },
  { id: 'day-info',          visible: true  },
  { id: 'todays-activity',   visible: true  },
  { id: 'bookmarks',         visible: true  },
  { id: 'mini-moon',         visible: true  },
  { id: 'retrograde',        visible: true  },
  { id: 'statistics',        visible: false },
  { id: 'study',             visible: false },
  { id: 'upcoming-holidays', visible: false },
  { id: 'natal-transits',    visible: false },
  { id: 'on-this-day',       visible: false },
  { id: 'recently-viewed',   visible: false },
  { id: 'discover',          visible: false },
]

export function loadHomeWidgetConfig(): HomeWidgetConfig[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(HOME_WIDGET_DEFAULTS)
    const saved = JSON.parse(raw) as HomeWidgetConfig[]
    // Merge: preserve saved order/visibility, append any new defaults not yet saved
    // (so a widget added in a future app update shows up instead of vanishing).
    const known = new Set(saved.map(i => i.id))
    const merged = [...saved]
    for (const def of HOME_WIDGET_DEFAULTS) {
      if (!known.has(def.id)) merged.push({ ...def })
    }
    return merged
  } catch {
    return structuredClone(HOME_WIDGET_DEFAULTS)
  }
}

export function saveHomeWidgetConfig(config: HomeWidgetConfig[]): void {
  localStorage.setItem(KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent('grimoire:home-widgets-changed'))
}

export function resetHomeWidgetConfig(): HomeWidgetConfig[] {
  const defaults = structuredClone(HOME_WIDGET_DEFAULTS)
  saveHomeWidgetConfig(defaults)
  return defaults
}
