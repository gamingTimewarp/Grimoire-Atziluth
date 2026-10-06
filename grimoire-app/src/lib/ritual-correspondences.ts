/**
 * ritual-correspondences.ts
 * Fixed-set correspondences selectable for a direction in the Practice
 * page's ritual space (Wu Xing phases, Western elements, Yin/Yang, and
 * Western polarity) — colour + symbol pairs modelled on the existing Wu
 * Xing Phases reference chart's own hardcoded PHASE_COLORS (there's no
 * generic "colour"/"symbol" field on these entities to read instead; this
 * mirrors that chart's own established approach of keeping chart-specific
 * styling local rather than inventing a new entity schema field for it).
 *
 * Symbols are deliberately picked from codepoints already covered by this
 * app's bundled Noto fallback fonts (see index.css) — alchemical element
 * glyphs (U+1F701-1F704) and ♂/♀ (U+2640, U+2642) are both in that range,
 * so they render correctly even on Android WebViews missing them from the
 * system font. Yin/Yang use their Chinese characters instead of the
 * hexagram-line monogram glyphs (U+268A/U+268B) for the same reason — those
 * aren't in the bundled range and would risk showing as tofu.
 *
 * `tag` is the literal tag string used to jump to a Reference search for
 * "everything correspondence-tagged with this" (see entity-type-groups.ts's
 * neighbouring Nature & Magic group for how pervasively this app already
 * tags entities with their element — 'fire' alone covers 70+ entities
 * across tarot, astrology, Qabalah, and more). Masculine/Feminine and
 * Yin/Yang tag coverage is much thinner in the current data (and "day"/
 * "night" aren't used as tags at all) — an honest reflection of how
 * consistently each tradition's cross-referencing has been filled in so
 * far, not a bug in this feature.
 */

export type RitualCorrespondenceCategory = 'Wu Xing Phase' | 'Element' | 'Yin / Yang' | 'Polarity'

export interface RitualCorrespondence {
  canonicalName: string
  label: string
  category: RitualCorrespondenceCategory
  color: string
  symbol: string
  /** Tag used for the Reference page's "view everything with this tag" link. */
  tag: string
}

export const RITUAL_CORRESPONDENCES: RitualCorrespondence[] = [
  // Wu Xing phases — colours match the Wu Xing Phases reference chart's own PHASE_COLORS
  { canonicalName: 'wuxing.phase.wood',  label: 'Wood',  category: 'Wu Xing Phase', color: '#4a8f4a', symbol: '木', tag: 'wood' },
  { canonicalName: 'wuxing.phase.fire',  label: 'Fire',  category: 'Wu Xing Phase', color: '#b83838', symbol: '火', tag: 'fire' },
  { canonicalName: 'wuxing.phase.earth', label: 'Earth', category: 'Wu Xing Phase', color: '#9e7a18', symbol: '土', tag: 'earth' },
  { canonicalName: 'wuxing.phase.metal', label: 'Metal', category: 'Wu Xing Phase', color: '#5a7e9a', symbol: '金', tag: 'metal' },
  { canonicalName: 'wuxing.phase.water', label: 'Water', category: 'Wu Xing Phase', color: '#2a5e96', symbol: '水', tag: 'water' },

  // Western (Golden Dawn) elements — alchemical glyphs
  { canonicalName: 'astrology.element.fire',  label: 'Fire',  category: 'Element', color: '#c4524a', symbol: '🜂', tag: 'fire' },
  { canonicalName: 'astrology.element.water', label: 'Water', category: 'Element', color: '#4a7ac4', symbol: '🜄', tag: 'water' },
  { canonicalName: 'astrology.element.air',   label: 'Air',   category: 'Element', color: '#c4a93a', symbol: '🜁', tag: 'air' },
  { canonicalName: 'astrology.element.earth', label: 'Earth', category: 'Element', color: '#5a7a46', symbol: '🜃', tag: 'earth' },

  // Yin / Yang — day / night
  { canonicalName: 'taoism.principle.yang', label: 'Yang (Day)',  category: 'Yin / Yang', color: '#d9a33a', symbol: '陽', tag: 'yang' },
  { canonicalName: 'taoism.principle.yin',  label: 'Yin (Night)', category: 'Yin / Yang', color: '#32325a', symbol: '陰', tag: 'yin' },

  // Western polarity — positive / negative
  { canonicalName: 'western.polarity.masculine', label: 'Masculine (+)', category: 'Polarity', color: '#c4922a', symbol: '♂', tag: 'masculine' },
  { canonicalName: 'western.polarity.feminine',  label: 'Feminine (−)',  category: 'Polarity', color: '#9a6ab0', symbol: '♀', tag: 'feminine' },
]

export const RITUAL_CORRESPONDENCE_CATEGORIES: RitualCorrespondenceCategory[] = [
  'Wu Xing Phase', 'Element', 'Yin / Yang', 'Polarity',
]
