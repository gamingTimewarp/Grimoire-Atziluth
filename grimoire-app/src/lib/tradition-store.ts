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

export interface TraditionSystem {
  id: string
  label: string
  description: string
  traditionCNs: string[]
}

export const TRADITION_SYSTEMS: TraditionSystem[] = [
  {
    id: 'qabalah',
    label: 'Qabalah',
    description: 'Affects romanisation of Hebrew names and Qabalistic correspondences.',
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
    traditionCNs: [
      'tradition.pythagorean-numerology',
      'tradition.chaldean-numerology',
    ],
  },
  {
    id: 'celtic-druidic',
    label: 'Celtic / Druidic',
    description: 'Celtic and Druidic tradition encompassing Ogham lore, tree wisdom, Celtic deities, and druidic cosmology.',
    traditionCNs: [
      'tradition.celtic-druidic',
      'tradition.ogham-bln',
    ],
  },
  {
    id: 'enochian',
    label: 'Enochian',
    description: 'Angelic magical system of Dee and Kelley, covering Aethyrs, Governors, and Watchtower Tablets.',
    traditionCNs: [
      'tradition.enochian',
    ],
  },
  {
    id: 'hermetic',
    label: 'Hermeticism',
    description: 'Philosophical tradition of the Corpus Hermeticum and the seven Hermetic principles.',
    traditionCNs: [
      'tradition.hermetic',
    ],
  },
  {
    id: 'chakra',
    label: 'Chakra / Hinduism',
    description: 'Tantric chakra system attributions and Sephirothic cross-references.',
    traditionCNs: [
      'tradition.hinduism-chakra',
    ],
  },
  {
    id: 'alchemy',
    label: 'Alchemy',
    description: 'Hermetic alchemical attributions: planetary metals, Great Work stages.',
    traditionCNs: [
      'tradition.alchemy',
    ],
  },
  {
    id: 'chinese-zodiac',
    label: 'Chinese Zodiac / Ganzhi',
    description: 'Heavenly Stems, Earthly Branches, and zodiac animal attributions.',
    traditionCNs: [
      'tradition.chinese-zodiac',
    ],
  },
  {
    id: 'vedic',
    label: 'Vedic Jyotish',
    description: 'Vedic/Jyotish sidereal astrology with nakshatra attributions.',
    traditionCNs: [
      'tradition.vedic-jyotish',
    ],
  },
  {
    id: 'geomancy',
    label: 'Geomancy',
    description: 'Planetary, zodiacal, and elemental attributions for the 16 geomantic figures.',
    traditionCNs: [
      'tradition.geomancy',
    ],
  },
  {
    id: 'modern-astrology',
    label: 'Modern Astrology',
    description: 'Shows modern outer planet rulerships (Uranus→Aquarius, Neptune→Pisces, Pluto→Scorpio) alongside classical dignities.',
    traditionCNs: [
      'tradition.modern-astrology',
    ],
  },
  {
    id: 'gnostic',
    label: 'Gnostic Cosmology',
    description: 'Select the primary Gnostic tradition for Aeon cross-references: Valentinian (30 Aeons in syzygy pairs) or Sethian (Barbelo, Four Luminaries, Seth lineage).',
    traditionCNs: [
      'tradition.gnostic-valentinian',
      'tradition.gnostic-sethian',
    ],
  },
  {
    id: 'feng-shui',
    label: 'Feng Shui / Ba Gua',
    description: 'Select the Ba Gua directional arrangement: Later Heaven (Wen Wang, used in most Feng Shui practice) or Earlier Heaven (Fu Xi, used in Ba Zhai and talismanic traditions).',
    traditionCNs: [
      'tradition.feng-shui-later-heaven',
      'tradition.feng-shui-earlier-heaven',
    ],
  },
]

/** All unique tradition CNs across all systems */
export const ALL_TRADITION_CNS: string[] = [
  ...new Set(TRADITION_SYSTEMS.flatMap(s => s.traditionCNs)),
]

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: TraditionSettings = {
  activeTraditions: ['tradition.golden-dawn'],
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

export function loadTraditionSettings(): TraditionSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export function saveTraditionSettings(settings: TraditionSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent('grimoire:traditions-changed'))
}

export function patchTraditionSettings(patch: Partial<TraditionSettings>): TraditionSettings {
  const next = { ...loadTraditionSettings(), ...patch }
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
