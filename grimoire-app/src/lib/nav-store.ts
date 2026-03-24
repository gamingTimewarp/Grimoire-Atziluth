/**
 * nav-store.ts
 * localStorage-backed sidebar navigation configuration.
 * Controls per-item visibility and display order.
 */

export interface NavItemConfig {
  id: string
  visible: boolean
}

const KEY = 'grimoire:nav-config'

export const NAV_ITEM_DEFAULTS: NavItemConfig[] = [
  { id: '/',           visible: true  },
  { id: '/read',       visible: true  },
  { id: '/calendar',   visible: true  },
  { id: '/astrology',  visible: true  },
  { id: '/qabalah',    visible: true  },
  { id: '/study',      visible: true  },
  { id: '/reference',  visible: true  },
  { id: '/journal',    visible: true  },
  { id: '/bookmarks',  visible: true  },
  { id: '/custom',     visible: true  },
  { id: '/settings',   visible: true  },
]

export function loadNavConfig(): NavItemConfig[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(NAV_ITEM_DEFAULTS)
    const saved = JSON.parse(raw) as NavItemConfig[]
    // Merge: preserve saved order/visibility, append any new defaults not yet saved
    const known = new Set(saved.map(i => i.id))
    const merged = [...saved]
    for (const def of NAV_ITEM_DEFAULTS) {
      if (!known.has(def.id)) merged.push({ ...def })
    }
    return merged
  } catch {
    return structuredClone(NAV_ITEM_DEFAULTS)
  }
}

export function saveNavConfig(config: NavItemConfig[]): void {
  localStorage.setItem(KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent('grimoire:nav-config-changed'))
}

export function resetNavConfig(): NavItemConfig[] {
  const defaults = structuredClone(NAV_ITEM_DEFAULTS)
  saveNavConfig(defaults)
  return defaults
}

// ─── Sidebar pin (icon-only on desktop regardless of viewport) ─────────────────

const SIDEBAR_PIN_KEY = 'grimoire:sidebar-pinned'

export function loadSidebarPinned(): boolean {
  return localStorage.getItem(SIDEBAR_PIN_KEY) === 'true'
}

export function saveSidebarPinned(pinned: boolean): void {
  localStorage.setItem(SIDEBAR_PIN_KEY, String(pinned))
  window.dispatchEvent(new CustomEvent('grimoire:sidebar-pinned-changed'))
}
