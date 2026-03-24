/**
 * Canonical names for built-in traditions.
 * These slugs are the stable IDs used in link traditionScope arrays.
 */
export const TraditionId = {
  GOLDEN_DAWN:            'tradition.golden-dawn',
  THOTH_CROWLEY:          'tradition.thoth-crowley',
  JEWISH_KABBALAH:        'tradition.jewish-kabbalah',
  TAROT_DE_MARSEILLE:     'tradition.tarot-de-marseille',
  PYTHAGOREAN_NUMEROLOGY: 'tradition.pythagorean-numerology',
  CHALDEAN_NUMEROLOGY:    'tradition.chaldean-numerology',
  GOETIC_TAROT:           'tradition.goetic-tarot',
} as const

export type WellKnownTraditionId = typeof TraditionId[keyof typeof TraditionId]
