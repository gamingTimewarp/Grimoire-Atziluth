/**
 * art-store.ts
 * Art pack settings — which rendering style to use per entity group.
 *
 * ArtGroup: a category of entities that share a visual rendering approach.
 * ArtPackId: a string id — 'symbolic' (programmatic / Unicode) or a named
 *   image pack such as 'classic'. Additional named packs can be added to
 *   ART_GROUPS without changing the storage schema.
 *
 * A pack with isSymbolic=true uses the programmatic renderer in EntityArt.
 * A pack with isSymbolic=false uses classicArtUrl() to locate image files.
 * Image packs always fall back to Symbolic when an asset file is absent.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtGroup = 'tarot' | 'runes' | 'geomancy' | 'mahjong' | 'lenormand' | 'playing-cards'

/** Stored as a plain string so future named packs need no migration. */
export type ArtPackId = string

export interface ArtPack {
  id: ArtPackId
  label: string
  description: string
  /** False = assets not yet present; UI shows the pack as unavailable/pending. */
  available: boolean
  /** True = use the programmatic symbolic renderer, no image file needed. */
  isSymbolic: boolean
  /** URL of a representative sample image (image packs only). */
  previewUrl?: string
}

export interface ArtGroupConfig {
  id: ArtGroup
  label: string
  description: string
  packs: ArtPack[]
}

export const ART_GROUPS: ArtGroupConfig[] = [
  {
    id: 'tarot',
    label: 'Tarot Cards',
    description: 'All tarot decks (RWS, TdM, Thoth, Etteilla).',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Suit symbols, Roman numerals, and rank text',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'Classic',
        description: 'RWS 1909 · Jean Dodal TdM 1701 · Grand Etteilla c.1838 · Thoth (SVG)',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/tarot/classic/tarot-major-rws-the-fool.jpg',
      },
    ],
  },
  {
    id: 'runes',
    label: 'Elder Futhark Runes',
    description: 'Unicode runic characters vs stone-carved SVG lettering.',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Unicode runic characters (ᚠ ᚢ ᚦ …)',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'Stone-carved',
        description: 'Stylised stone-carved SVG glyphs',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/runes/classic/rune-elder-futhark-fehu.svg',
      },
    ],
  },
  {
    id: 'geomancy',
    label: 'Geomantic Figures',
    description: 'The 16 dot-pattern figures of geomancy.',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Dot-and-line geometric SVG patterns',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'Historical',
        description: 'Public domain SVG symbols (Wikimedia Commons)',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/geomancy/classic/geomancy-figure-acquisitio.svg',
      },
    ],
  },
  {
    id: 'mahjong',
    label: 'Mahjong Tiles',
    description: 'Unicode tile glyphs vs illustrated tile graphics.',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Unicode Mahjong tile glyphs (🀇 🀈 🀉 …)',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'Illustrated',
        description: 'FluffyStuff riichi-mahjong-tiles (CC0 SVG)',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/mahjong/classic/divination-mahjong-tile-bamboo-1.svg',
      },
    ],
  },
  {
    id: 'lenormand',
    label: 'Lenormand Cards',
    description: 'Number + keyword layout vs playing card equivalents.',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Card number, name, and keyword layout',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'Playing Card',
        description: 'Traditional playing card equivalents (nicubunu CC0 SVG)',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/playing-cards/classic/playing-card-hearts-9.svg',
      },
    ],
  },
  {
    id: 'playing-cards',
    label: 'Playing Cards',
    description: 'Standard 52-card French-suited deck with jokers.',
    packs: [
      {
        id: 'symbolic',
        label: 'Symbolic',
        description: 'Suit symbol and rank text layout',
        available: true,
        isSymbolic: true,
      },
      {
        id: 'classic',
        label: 'nicubunu',
        description: 'nicubunu card art (CC0 SVG)',
        available: true,
        isSymbolic: false,
        previewUrl: '/art/playing-cards/classic/playing-card-hearts-ace.svg',
      },
    ],
  },
]

export interface ArtSettings {
  packByGroup: Record<ArtGroup, ArtPackId>
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const DEFAULTS: ArtSettings = {
  packByGroup: {
    tarot:           'symbolic',
    runes:           'symbolic',
    geomancy:        'symbolic',
    mahjong:         'symbolic',
    lenormand:       'symbolic',
    'playing-cards': 'classic',
  },
}

const KEY = 'grimoire:art'

export function loadArtSettings(): ArtSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    const parsed = JSON.parse(raw) as Partial<ArtSettings>
    return {
      packByGroup: { ...DEFAULTS.packByGroup, ...parsed.packByGroup },
    }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export function saveArtSettings(settings: ArtSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the given pack id resolves to symbolic rendering
 * (either explicitly symbolic, or an unknown/unavailable pack id).
 */
export function isSymbolicPack(groupId: ArtGroup, packId: ArtPackId): boolean {
  const group = ART_GROUPS.find(g => g.id === groupId)
  const pack  = group?.packs.find(p => p.id === packId)
  return pack?.isSymbolic !== false
}

/**
 * Maps an entity type + optional canonical name to its art group, or null.
 * canonicalName is used to disambiguate tarot.card (which includes lenormand cards).
 */
export function artGroupForEntityType(entityType: string, canonicalName?: string): ArtGroup | null {
  if (entityType === 'tarot.card') {
    if (canonicalName?.startsWith('lenormand.')) return 'lenormand'
    if (canonicalName?.startsWith('playing.card.')) return 'playing-cards'
    return 'tarot'
  }
  if (entityType.startsWith('rune'))                    return 'runes'
  if (entityType === 'geomancy.figure')                 return 'geomancy'
  if (entityType === 'divination.mahjong-tile')         return 'mahjong'
  return null
}

/**
 * Lenormand → playing card canonical name map.
 * Derived directly from lenormand-playing-card-links.json.
 */
const LENORMAND_TO_PLAYING_CARD: Record<string, string> = {
  'lenormand.card.the-rider':      'playing.card.hearts.9',
  'lenormand.card.the-clover':     'playing.card.diamonds.6',
  'lenormand.card.the-ship':       'playing.card.spades.10',
  'lenormand.card.the-house':      'playing.card.hearts.king',
  'lenormand.card.the-tree':       'playing.card.hearts.7',
  'lenormand.card.the-clouds':     'playing.card.clubs.king',
  'lenormand.card.the-snake':      'playing.card.clubs.queen',
  'lenormand.card.the-coffin':     'playing.card.diamonds.9',
  'lenormand.card.the-bouquet':    'playing.card.spades.queen',
  'lenormand.card.the-scythe':     'playing.card.diamonds.jack',
  'lenormand.card.the-whip':       'playing.card.clubs.jack',
  'lenormand.card.the-birds':      'playing.card.diamonds.7',
  'lenormand.card.the-child':      'playing.card.spades.jack',
  'lenormand.card.the-fox':        'playing.card.clubs.9',
  'lenormand.card.the-bear':       'playing.card.clubs.10',
  'lenormand.card.the-stars':      'playing.card.hearts.6',
  'lenormand.card.the-stork':      'playing.card.hearts.queen',
  'lenormand.card.the-dog':        'playing.card.hearts.10',
  'lenormand.card.the-tower':      'playing.card.spades.6',
  'lenormand.card.the-garden':     'playing.card.spades.8',
  'lenormand.card.the-mountain':   'playing.card.clubs.8',
  'lenormand.card.the-crossroads': 'playing.card.diamonds.queen',
  'lenormand.card.the-mice':       'playing.card.clubs.7',
  'lenormand.card.the-heart':      'playing.card.hearts.jack',
  'lenormand.card.the-ring':       'playing.card.clubs.ace',
  'lenormand.card.the-book':       'playing.card.diamonds.10',
  'lenormand.card.the-letter':     'playing.card.spades.7',
  'lenormand.card.the-man':        'playing.card.hearts.ace',
  'lenormand.card.the-woman':      'playing.card.spades.ace',
  'lenormand.card.the-lily':       'playing.card.spades.king',
  'lenormand.card.the-sun':        'playing.card.diamonds.ace',
  'lenormand.card.the-moon':       'playing.card.hearts.8',
  'lenormand.card.the-key':        'playing.card.diamonds.8',
  'lenormand.card.the-fish':       'playing.card.diamonds.king',
  'lenormand.card.the-anchor':     'playing.card.spades.9',
  'lenormand.card.the-cross':      'playing.card.clubs.6',
}

/**
 * Returns the URL for an image pack asset.
 * Files live at /art/{group}/{packId}/{slug}.{ext} so multiple packs for the
 * same group can coexist without filename collisions.
 * Lenormand uses the corresponding playing card image from the playing-cards pack.
 */
export function imagePackArtUrl(group: ArtGroup, packId: ArtPackId, canonicalName: string): string {
  if (group === 'lenormand') {
    const pcCn = LENORMAND_TO_PLAYING_CARD[canonicalName]
    if (pcCn) return `/art/playing-cards/${packId}/${pcCn.replace(/\./g, '-')}.svg`
  }
  if (group === 'playing-cards') {
    return `/art/playing-cards/${packId}/${canonicalName.replace(/\./g, '-')}.svg`
  }
  const slug = canonicalName.replace(/\./g, '-')
  const ext = (group === 'runes' || group === 'geomancy' || group === 'mahjong' || canonicalName.includes('.thoth.')) ? 'svg' : 'jpg'
  return `/art/${group}/${packId}/${slug}.${ext}`
}

/** @deprecated Use imagePackArtUrl. Kept for any external callers during migration. */
export function classicArtUrl(group: ArtGroup, canonicalName: string): string {
  return imagePackArtUrl(group, 'classic', canonicalName)
}
