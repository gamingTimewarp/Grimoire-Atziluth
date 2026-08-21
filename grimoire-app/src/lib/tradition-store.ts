/**
 * tradition-store.ts
 * localStorage-backed tradition & astrology mode settings.
 *
 * Traditions are grouped into "systems" for UI display and primary selection.
 * activeTraditions: which traditions are globally visible (affects link display).
 * primaryBySystem: one primary tradition per system (determines display names).
 * astrologyMode: tropical | sidereal | iau (affects zodiac calculations).
 * showDaath: whether Da'ath is shown on the Tree of Life.
 */

import type { BaseEntity } from '@grimoire/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AstrologyMode = 'tropical' | 'sidereal' | 'iau' | 'vedic'

export type HouseSystem = 'whole-sign' | 'equal' | 'placidus' | 'koch' | 'regiomontanus' | 'campanus' | 'porphyry' | 'morinus'

export interface TraditionSettings {
  /** Tradition canonical names that are currently active */
  activeTraditions: string[]
  /** system id → primary tradition canonical name */
  primaryBySystem: Record<string, string>
  astrologyMode: AstrologyMode
  houseSystem: HouseSystem
  showDaath: boolean
  /** Whether lunar nodes (Rahu/Ketu) appear in sky charts and natal wheels */
  showNodes: boolean
  /** Whether user-created entities appear in reference, search, and study */
  customEnabled: boolean
}

// ─── Static display names (fallback when tradition entity isn't seeded) ────────

export const TRADITION_DISPLAY_NAMES: Record<string, string> = {
  'tradition.golden-dawn':          'Golden Dawn',
  'tradition.jewish-kabbalah':      'Jewish Kabbalah',
  'tradition.thoth-crowley':        'Thoth / Crowley',
  'tradition.tarot-de-marseille':   'Tarot de Marseille',
  'tradition.etteilla':             'Etteilla',
  'tradition.goetic-tarot':         'Goetic Tarot (Reconstructed)',
  'tradition.pythagorean-numerology': 'Pythagorean Numerology',
  'tradition.chaldean-numerology':  'Chaldean Numerology',
  'tradition.ogham-bln':            'Beith-Luis-Nion Order',
  'tradition.hinduism-chakra':      'Hinduism / Chakra System',
  'tradition.alchemy':              'Hermetic Alchemy',
  'tradition.chinese-zodiac':       'Chinese Zodiac / Ganzhi',
  'tradition.vedic-jyotish':        'Vedic Jyotish',
  'tradition.geomancy':             'Geomancy',
  'tradition.modern-astrology':     'Modern Astrology',
  'tradition.gnostic-valentinian':  'Gnostic (Valentinian)',
  'tradition.gnostic-sethian':      'Gnostic (Sethian)',
  'tradition.feng-shui-later-heaven':   'Feng Shui — Later Heaven Ba Gua',
  'tradition.feng-shui-earlier-heaven': 'Feng Shui — Earlier Heaven Ba Gua',
  'tradition.enochian':                 'Enochian',
  'tradition.hermetic':                 'Hermeticism',
  'tradition.celtic-druidic':           'Celtic / Druidic',
}

// ─── System groupings (hardcoded — traditions appear in ≥1 system) ─────────────

export type TraditionTab = 'western' | 'eastern' | 'astrology' | 'custom'

export interface TraditionSystem {
  id: string
  label: string
  description: string
  traditionCNs: string[]
  tab: TraditionTab
  /** Whether traditions in this system are mutually exclusive (show Primary radio). Default true. */
  showPrimary?: boolean
}

export const TRADITION_SYSTEMS: TraditionSystem[] = [
  {
    id: 'qabalah',
    label: 'Qabalah',
    description: 'Affects romanisation of Hebrew names and Qabalistic correspondences.',
    tab: 'western',
    traditionCNs: [
      'tradition.golden-dawn',
      'tradition.jewish-kabbalah',
      'tradition.thoth-crowley',
    ],
  },
  {
    id: 'tarot',
    label: 'Tarot',
    description: 'Determines which attribution system is used for Major Arcana correspondences.',
    tab: 'western',
    traditionCNs: [
      'tradition.golden-dawn',
      'tradition.thoth-crowley',
      'tradition.tarot-de-marseille',
      'tradition.etteilla',
      'tradition.goetic-tarot',
    ],
  },
  {
    id: 'numerology',
    label: 'Numerology',
    description: 'Letter-to-number attribution system for gematria and numerological readings.',
    tab: 'western',
    traditionCNs: [
      'tradition.pythagorean-numerology',
      'tradition.chaldean-numerology',
    ],
  },
  {
    id: 'celtic-druidic',
    label: 'Celtic / Druidic',
    description: 'Celtic and Druidic tradition encompassing Ogham lore, tree wisdom, Celtic deities, and druidic cosmology.',
    tab: 'western',
    traditionCNs: [
      'tradition.celtic-druidic',
      'tradition.ogham-bln',
    ],
  },
  {
    id: 'enochian',
    label: 'Enochian',
    description: 'Angelic magical system of Dee and Kelley, covering Aethyrs, Governors, and Watchtower Tablets.',
    tab: 'western',
    traditionCNs: [
      'tradition.enochian',
    ],
  },
  {
    id: 'hermetic',
    label: 'Hermetic',
    description: 'The Hermetic philosophical tradition (Corpus Hermeticum, seven principles) and its alchemical branch (planetary metals, Great Work stages).',
    tab: 'western',
    showPrimary: false,
    traditionCNs: [
      'tradition.hermetic',
      'tradition.alchemy',
    ],
  },
  {
    id: 'geomancy',
    label: 'Geomancy',
    description: 'Planetary, zodiacal, and elemental attributions for the 16 geomantic figures.',
    tab: 'western',
    traditionCNs: [
      'tradition.geomancy',
    ],
  },
  {
    id: 'gnostic',
    label: 'Gnostic Cosmology',
    description: 'Select the primary Gnostic tradition for Aeon cross-references: Valentinian (30 Aeons in syzygy pairs) or Sethian (Barbelo, Four Luminaries, Seth lineage).',
    tab: 'western',
    traditionCNs: [
      'tradition.gnostic-valentinian',
      'tradition.gnostic-sethian',
    ],
  },
  {
    id: 'vedic',
    label: 'Vedic Jyotish',
    description: 'Vedic/Jyotish sidereal astrology with nakshatra attributions.',
    tab: 'eastern',
    traditionCNs: [
      'tradition.vedic-jyotish',
    ],
  },
  {
    id: 'chakra',
    label: 'Chakra / Hinduism',
    description: 'Tantric chakra system attributions and Sephirothic cross-references.',
    tab: 'eastern',
    traditionCNs: [
      'tradition.hinduism-chakra',
    ],
  },
  {
    id: 'chinese-zodiac',
    label: 'Chinese Zodiac / Ganzhi',
    description: 'Heavenly Stems, Earthly Branches, and zodiac animal attributions.',
    tab: 'eastern',
    traditionCNs: [
      'tradition.chinese-zodiac',
    ],
  },
  {
    id: 'feng-shui',
    label: 'Feng Shui / Ba Gua',
    description: 'Select the Ba Gua directional arrangement: Later Heaven (Wen Wang, used in most Feng Shui practice) or Earlier Heaven (Fu Xi, used in Ba Zhai and talismanic traditions).',
    tab: 'eastern',
    traditionCNs: [
      'tradition.feng-shui-later-heaven',
      'tradition.feng-shui-earlier-heaven',
    ],
  },
]

/** All unique tradition CNs across all systems, plus standalone toggles */
export const ALL_TRADITION_CNS: string[] = [
  ...new Set(TRADITION_SYSTEMS.flatMap(s => s.traditionCNs)),
  'tradition.modern-astrology',
]

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: TraditionSettings = {
  activeTraditions: ALL_TRADITION_CNS,
  primaryBySystem: {
    qabalah:    'tradition.golden-dawn',
    tarot:      'tradition.golden-dawn',
    numerology: 'tradition.pythagorean-numerology',
  },
  astrologyMode: 'tropical',
  houseSystem: 'placidus',
  showDaath: true,
  showNodes: true,
  customEnabled: true,
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY = 'grimoire:traditions'

// Increment when DEFAULTS change in a way that should override stored values.
// v1 = golden-dawn only  →  v2 = all traditions on by default
const SETTINGS_VERSION = 2

export function loadTraditionSettings(): TraditionSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    const stored = JSON.parse(raw) as Partial<TraditionSettings> & { _version?: number }
    // Migrate: if stored settings predate the all-traditions-on default, reset
    // activeTraditions to the current defaults while preserving everything else.
    if ((stored._version ?? 1) < SETTINGS_VERSION) {
      const migrated = { ...DEFAULTS, ...stored, activeTraditions: ALL_TRADITION_CNS }
      saveTraditionSettings(migrated)
      return migrated
    }
    return { ...DEFAULTS, ...stored }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export function saveTraditionSettings(settings: TraditionSettings): void {
  localStorage.setItem(KEY, JSON.stringify({ ...settings, _version: SETTINGS_VERSION }))
  window.dispatchEvent(new CustomEvent('grimoire:traditions-changed'))
}

export function patchTraditionSettings(patch: Partial<TraditionSettings>): TraditionSettings {
  const next = { ...loadTraditionSettings(), ...patch }
  saveTraditionSettings(next)
  return next
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface TraditionPreset {
  id: string
  label: string
  description: string
  apply: (current: TraditionSettings) => TraditionSettings
}

function withTraditions(current: TraditionSettings, cns: string[]): string[] {
  return [...new Set([...current.activeTraditions, ...cns])]
}

export const TRADITION_PRESETS: TraditionPreset[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'One tradition per competing system, no outer planets, no Da’ath, no lunar nodes. The least cluttered view.',
    apply: current => {
      const activeTraditions = TRADITION_SYSTEMS.flatMap(s => s.showPrimary === false ? s.traditionCNs : [s.traditionCNs[0]])
      const primaryBySystem = { ...current.primaryBySystem }
      for (const s of TRADITION_SYSTEMS) {
        if (s.showPrimary !== false) primaryBySystem[s.id] = s.traditionCNs[0]
      }
      return { ...current, activeTraditions, primaryBySystem, showDaath: false, showNodes: false }
    },
  },
  {
    id: 'maximal',
    label: 'Maximal',
    description: 'Every tradition, outer planets, Da’ath, and lunar nodes active. The most complete view.',
    apply: current => ({ ...current, activeTraditions: ALL_TRADITION_CNS, showDaath: true, showNodes: true }),
  },
  {
    id: 'classical-astrology',
    label: 'Classical Astrology',
    description: 'Tropical zodiac, Whole Sign houses, no outer planets or modern minor bodies. Scoped to astrology only — your Qabalah, Tarot, and Numerology choices are untouched.',
    apply: current => ({
      ...current,
      astrologyMode: 'tropical',
      houseSystem: 'whole-sign',
      activeTraditions: current.activeTraditions.filter(t => t !== 'tradition.modern-astrology'),
    }),
  },
  {
    id: 'atziluth',
    label: 'Recommended (Atziluth)',
    description: 'This app’s own curated baseline: Golden Dawn Qabalah & Tarot, Pythagorean numerology, tropical zodiac, Placidus houses, everything else active.',
    apply: current => ({
      ...current,
      activeTraditions: ALL_TRADITION_CNS,
      primaryBySystem: {
        ...current.primaryBySystem,
        qabalah: 'tradition.golden-dawn',
        tarot: 'tradition.golden-dawn',
        numerology: 'tradition.pythagorean-numerology',
      },
      astrologyMode: 'tropical',
      houseSystem: 'placidus',
      showDaath: true,
      showNodes: true,
    }),
  },
  {
    id: 'thelemic',
    label: 'Thelemic',
    description: 'Golden Dawn Qabalah, Thoth/Crowley Tarot, Enochian and Hermetic/Alchemy active. Leaves other systems as they are.',
    apply: current => ({
      ...current,
      primaryBySystem: { ...current.primaryBySystem, qabalah: 'tradition.golden-dawn', tarot: 'tradition.thoth-crowley' },
      activeTraditions: withTraditions(current, [
        'tradition.golden-dawn', 'tradition.thoth-crowley', 'tradition.enochian',
        'tradition.hermetic', 'tradition.alchemy',
      ]),
    }),
  },
  {
    id: 'traditional-jewish',
    label: 'Traditional Jewish',
    description: 'Jewish Kabbalah as the primary Qabalistic attribution. Scoped to Qabalah only — Tarot and Numerology are Western-esoteric additions with no traditional Jewish equivalent, so this preset leaves them untouched.',
    apply: current => ({
      ...current,
      primaryBySystem: { ...current.primaryBySystem, qabalah: 'tradition.jewish-kabbalah' },
      activeTraditions: withTraditions(current, ['tradition.jewish-kabbalah']),
    }),
  },
]

export function applyPreset(presetId: string, current: TraditionSettings): TraditionSettings {
  const preset = TRADITION_PRESETS.find(p => p.id === presetId)
  return preset ? preset.apply(current) : current
}

// ─── Export / import (tradition settings only, as a standalone JSON file) ─────

interface TraditionSettingsFile {
  kind: 'grimoire-tradition-settings'
  version: 1
  exportedAt: string
  settings: TraditionSettings
}

/**
 * Exports the current tradition settings as their own JSON file — distinct from
 * the full app backup in export-import.ts, for sharing/reusing just a tradition
 * configuration (e.g. handing a curated preset to someone else).
 * Returns null if the user cancelled the Save dialog.
 */
export async function exportTraditionSettingsFile(settings: TraditionSettings): Promise<string | null> {
  const file: TraditionSettingsFile = {
    kind: 'grimoire-tradition-settings',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  }
  const path = await save({
    defaultPath: 'grimoire-tradition-settings.json',
    filters: [{ name: 'Tradition Settings', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify(file, null, 2))
  return path
}

/**
 * Shows a native Open dialog, reads the chosen tradition settings file, and
 * returns the merged settings (existing settings as base, so a file missing
 * newer fields doesn't null them out). Returns null if the user cancelled.
 */
export async function pickAndImportTraditionSettingsFile(): Promise<TraditionSettings | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Tradition Settings', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null
  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as Partial<TraditionSettingsFile>
  if (parsed.kind !== 'grimoire-tradition-settings' || !parsed.settings) {
    throw new Error('Not a Grimoire tradition settings file.')
  }
  const next = { ...loadTraditionSettings(), ...parsed.settings }
  saveTraditionSettings(next)
  return next
}

// ─── Link visibility ──────────────────────────────────────────────────────────

/**
 * Returns true if a link should be shown given the current active traditions.
 * Universal links (traditionScope = []) are always shown.
 */
export function isLinkVisible(
  link: { traditionScope: string[] },
  activeTraditions: string[],
): boolean {
  if (link.traditionScope.length === 0) return true
  return link.traditionScope.some(t => activeTraditions.includes(t))
}

// ─── Display name resolution ──────────────────────────────────────────────────

/**
 * Maps entity type prefix to system id, for resolving the right primary tradition.
 */
function entityTypeToSystem(entityType: string): string | null {
  if (entityType.startsWith('qabalah.'))    return 'qabalah'
  if (entityType.startsWith('tarot.'))      return 'tarot'
  if (entityType.startsWith('letter.'))     return 'qabalah'
  return null
}

/**
 * Resolves the best display name for an entity given the active primary traditions.
 * Looks for a secondary name whose languageTag matches the primary tradition's short id.
 * Falls back to entity.primaryDisplayName if no tradition-specific name is found.
 *
 * Note: secondary names need languageTags like "golden-dawn" or "jewish-kabbalah"
 * to be fully utilised. The current data uses "en"/"en-alt"/"he" — this function
 * will extend coverage as data is updated.
 */
export function resolveDisplayName(
  entity: BaseEntity,
  primaryBySystem: Record<string, string>,
): string {
  const system = entityTypeToSystem(entity.entityType)
  if (!system) return entity.primaryDisplayName

  const primaryCN = primaryBySystem[system]
  if (!primaryCN) return entity.primaryDisplayName

  // Tradition short id: "tradition.golden-dawn" → "golden-dawn"
  const shortId = primaryCN.split('.').slice(1).join('.')

  // Look for a secondary name with a matching language tag
  const match = entity.secondaryNames
    .filter(n => n.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find(n => n.languageTag === shortId || n.languageTag === primaryCN)

  return match?.name ?? entity.primaryDisplayName
}
