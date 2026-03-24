/**
 * Well-known EntityType string constants.
 * EntityType is an open string — custom types are fully supported.
 * These constants exist for type-safe references to built-in entity classes.
 */
export const EntityType = {
  // ── Tarot ────────────────────────────────────────────────────────────
  TAROT_CARD:         'tarot.card',
  TAROT_SUIT:         'tarot.suit',
  TAROT_DECK:         'tarot.deck',
  // ── Astrology ────────────────────────────────────────────────────────
  PLANET:             'astrology.planet',
  ZODIAC_SIGN:        'astrology.sign',
  HOUSE:              'astrology.house',
  ASPECT:             'astrology.aspect',
  ELEMENT:            'astrology.element',
  // ── Qabalah ──────────────────────────────────────────────────────────
  SEPHIRA:            'qabalah.sephira',
  PATH:               'qabalah.path',
  QLIPHAH:            'qabalah.qliphah',
  FOUR_WORLD:         'qabalah.world',
  // ── Letter Systems ───────────────────────────────────────────────────
  HEBREW_LETTER:      'letter.hebrew',
  GREEK_LETTER:       'letter.greek',
  LATIN_LETTER:       'letter.latin',
  ENOCHIAN_LETTER:    'letter.enochian',
  // ── Numerology ───────────────────────────────────────────────────────
  NUMERAL:            'numerology.numeral',
  // ── Goetia ───────────────────────────────────────────────────────────
  DEMON:              'goetia.demon',
  // ── Runes ────────────────────────────────────────────────────────────
  RUNE:               'rune.elder-futhark',
  // ── I Ching ──────────────────────────────────────────────────────────
  HEXAGRAM:           'iching.hexagram',
  // ── Chakras ──────────────────────────────────────────────────────────
  CHAKRA:             'chakra.classical',
  // ── Practice ─────────────────────────────────────────────────────────
  READING:            'practice.reading',
  JOURNAL_ENTRY:      'practice.journal-entry',
  SPREAD:             'practice.spread',
} as const

export type WellKnownEntityType = typeof EntityType[keyof typeof EntityType]
