/**
 * Well-known LinkLabel string constants.
 * LinkLabel is an open string — custom labels are fully supported.
 * These constants exist for type-safe references to built-in link semantics.
 *
 * Convention:
 *   "attributed-*" labels are owned by traditions and carry traditionScope.
 *   All others are universal (traditionScope = []).
 */
export const LinkLabel = {
  // ── Universal Correspondences ────────────────────────────────────────
  CORRESPONDS_TO:         'corresponds-to',
  OPPOSES:                'opposes',
  COMPLEMENTS:            'complements',
  PRECEDES:               'precedes',
  FOLLOWS:                'follows',

  // ── Structural / Hierarchical ────────────────────────────────────────
  PART_OF:                'part-of',
  CONTAINS:               'contains',
  /** Used for paths connecting sephiroth */
  CONNECTS:               'connects',
  /** Connects a sephira to its qliphothic shadow */
  HAS_SHADOW:             'has-shadow',

  // ── Tradition Attributions (owned by specific traditions) ────────────
  ATTRIBUTED_PLANET:      'attributed-planet',
  ATTRIBUTED_SIGN:        'attributed-sign',
  ATTRIBUTED_ELEMENT:     'attributed-element',
  ATTRIBUTED_PATH:        'attributed-path',
  ATTRIBUTED_SEPHIRA:     'attributed-sephira',
  ATTRIBUTED_LETTER:      'attributed-letter',
  ATTRIBUTED_NUMBER:      'attributed-number',
  ATTRIBUTED_RUNE:        'attributed-rune',
  ATTRIBUTED_CHAKRA:      'attributed-chakra',
  ATTRIBUTED_DEMON:       'attributed-demon',
  ATTRIBUTED_COLOR:       'attributed-color',
  ATTRIBUTED_ANGEL:       'attributed-angel',
  ATTRIBUTED_DIVINE_NAME: 'attributed-divine-name',

  // ── Goetia-specific ──────────────────────────────────────────────────
  GOVERNS:                'governs',
  RANKED_AS:              'ranked-as',

  // ── Practice Linkages ────────────────────────────────────────────────
  DRAWN_IN:               'drawn-in',
  DOCUMENTED_IN:          'documented-in',
} as const

export type WellKnownLinkLabel = typeof LinkLabel[keyof typeof LinkLabel]
