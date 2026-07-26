/**
 * built-in-data.ts
 * Static definitions for built-in decks and spreads.
 * Decks reference card entity canonical names from grimoire-data.
 * TODO (Polish Phase): replace placeholder art with real card images.
 */

import type { SpreadDefinition } from '@grimoire/core'
export type { SpreadDefinition } from '@grimoire/core'

// ─── Decks ────────────────────────────────────────────────────────────────────

/**
 * A variant within a deck (e.g. Full 78 vs Major Arcana Only).
 * When present, the user must pick a variant before proceeding.
 * The resolved DeckFilter is constructed by merging deck + variant.
 */
export interface DeckVariant {
  id: string
  label: string
  tags?: string[]
  entityType?: string
}

/** Deck definitions that resolve to entity tag filters at runtime. */
export interface DeckFilter {
  id: string
  displayName: string
  description: string
  tags?: string[]
  entityType?: string
  reversalEnabled: boolean
  variants?: DeckVariant[]
  /** If present, use this explicit card list instead of tags/entityType. Custom decks only. */
  cardCanonicalNames?: string[]
  /**
   * Tradition canonical names associated with this deck.
   * When a reading is active with this deck, these traditions are added to the
   * reference page's visible-link filter so attribution links surface automatically.
   */
  traditionIds?: string[]
  /** Canonical name of the entity representing this deck in the reference database. */
  infoCanonicalName?: string
}

export const BUILT_IN_DECK_FILTERS: DeckFilter[] = [
  // ── Tarot ──────────────────────────────────────────────────────────────────
  {
    id: 'rws',
    displayName: 'Rider-Waite-Smith',
    description: 'Classic illustrated tarot deck by Pamela Colman Smith (1909).',
    reversalEnabled: true,
    traditionIds: ['tradition.golden-dawn'],
    infoCanonicalName: 'tarot.deck.rider-waite-smith',
    variants: [
      { id: 'rws-full',  label: 'Full 78',          tags: ['rider-waite-smith'], entityType: 'tarot.card' },
      { id: 'rws-major', label: 'Major Arcana Only', tags: ['major-arcana', 'rider-waite-smith'], entityType: 'tarot.card' },
    ],
  },
  {
    id: 'thoth',
    displayName: 'Thoth',
    description: 'Complete 78-card Thoth deck designed by Aleister Crowley.',
    reversalEnabled: false,
    traditionIds: ['tradition.thoth-crowley', 'tradition.golden-dawn'],
    infoCanonicalName: 'tarot.deck.thoth',
    variants: [
      { id: 'thoth-full',  label: 'Full 78',          tags: ['thoth'], entityType: 'tarot.card' },
      { id: 'thoth-major', label: 'Major Arcana Only', tags: ['major-arcana', 'thoth'], entityType: 'tarot.card' },
    ],
  },
  {
    id: 'tdm',
    displayName: 'Tarot de Marseille',
    description: 'Classic woodblock-printed tarot in the Marseille tradition.',
    reversalEnabled: false,
    traditionIds: ['tradition.tarot-de-marseille'],
    infoCanonicalName: 'tarot.deck.tarot-de-marseille',
    variants: [
      { id: 'tdm-full',  label: 'Full 78',          tags: ['tarot-de-marseille'], entityType: 'tarot.card' },
      { id: 'tdm-major', label: 'Major Arcana Only', tags: ['major-arcana', 'tarot-de-marseille'], entityType: 'tarot.card' },
    ],
  },
  {
    id: 'etteilla',
    displayName: 'Etteilla',
    description: 'The first purpose-built occult tarot (1789) by Jean-Baptiste Alliette.',
    reversalEnabled: true,
    traditionIds: ['tradition.etteilla'],
    infoCanonicalName: 'tarot.deck.etteilla',
    variants: [
      { id: 'etteilla-full',  label: 'Full 78',          tags: ['etteilla'], entityType: 'tarot.card' },
      { id: 'etteilla-major', label: 'Major Arcana Only', tags: ['major-arcana', 'etteilla'], entityType: 'tarot.card' },
    ],
  },
  // ── Playing Cards ──────────────────────────────────────────────────────────
  {
    id: 'playing-cards',
    displayName: 'Playing Cards',
    description: 'Standard French-suited playing card deck for cartomancy.',
    reversalEnabled: false,
    infoCanonicalName: 'system.overview.playing-cards',
    variants: [
      { id: 'playing-cards-52', label: '52 Cards (No Jokers)', tags: ['playing-card-suited'], entityType: 'tarot.card' },
      { id: 'playing-cards-54', label: '54 Cards (With Jokers)', tags: ['playing-card'], entityType: 'tarot.card' },
    ],
  },
  // ── Other divination systems ───────────────────────────────────────────────
  {
    id: 'runes-elder-futhark',
    displayName: 'Elder Futhark Runes',
    description: '24 Elder Futhark runes for runic divination.',
    tags: ['elder-futhark'],
    entityType: 'rune',
    reversalEnabled: false,
    infoCanonicalName: 'system.overview.runes',
  },
  {
    id: 'lenormand',
    displayName: 'Lenormand (36 cards)',
    description: '36-card Lenormand deck.',
    tags: ['lenormand'],
    entityType: 'tarot.card',
    reversalEnabled: false,
    infoCanonicalName: 'system.overview.lenormand',
  },
  {
    id: 'ogham',
    displayName: 'Ogham',
    description: 'Ogham alphabet characters used for divination.',
    reversalEnabled: false,
    traditionIds: ['tradition.ogham-bln'],
    infoCanonicalName: 'system.overview.ogham',
    variants: [
      { id: 'ogham-core', label: '20 Core Letters',        tags: ['ogham-core'], entityType: 'ogham.letter' },
      { id: 'ogham-full', label: 'Full 25 (with Forfeda)', tags: ['ogham'],      entityType: 'ogham.letter' },
    ],
  },
  {
    id: 'geomancy',
    displayName: 'Geomancy (16 Figures)',
    description: 'The 16 geomantic figures for geomantic divination readings.',
    entityType: 'geomancy.figure',
    reversalEnabled: false,
    traditionIds: ['tradition.geomancy'],
    infoCanonicalName: 'system.overview.geomancy',
  },
  {
    id: 'mahjong',
    displayName: 'Mahjong Oracle (42 tiles)',
    description: '42 Mahjong tile types for Chinese divinatory oracle readings.',
    entityType: 'divination.mahjong-tile',
    reversalEnabled: false,
    infoCanonicalName: 'system.overview.mahjong',
  },
  {
    id: 'tea-symbols',
    displayName: 'Tea Leaf Symbols (~90)',
    description: 'Approximately 90 classic tasseomancy symbols for tea leaf and coffee ground readings.',
    entityType: 'divination.tea-symbol',
    reversalEnabled: false,
    infoCanonicalName: 'system.overview.tasseomancy',
  },
]

// ─── Spread entity map ────────────────────────────────────────────────────────

/** Maps built-in spread IDs to their canonical names in the reference database. */
export const SPREAD_ENTITY_CN: Record<string, string> = {
  'free':          'divination.spread.free-reading',
  'single':        'divination.spread.single-card',
  'three-card':    'divination.spread.three-card',
  'celtic-cross':  'divination.spread.celtic-cross',
  'horseshoe':     'divination.spread.horseshoe',
  'year-ahead':    'divination.spread.year-ahead',
  'zodiac-year':   'divination.spread.zodiac-year',
  'chakra':        'divination.spread.chakra',
  'grand-tableau': 'divination.spread.grand-tableau',
  'relationship':  'divination.spread.relationship',
  'tree-of-life':  'divination.spread.tree-of-life',
}

// ─── Spreads ──────────────────────────────────────────────────────────────────

export const BUILT_IN_SPREADS: SpreadDefinition[] = [
  {
    id: 'free',
    displayName: 'Free Reading',
    description: 'No fixed positions — draw cards freely as needed.',
    isBuiltIn: true,
    positions: [],
  },
  {
    id: 'single',
    displayName: 'Single Card',
    description: 'Draw one card for a focused daily message or quick answer.',
    isBuiltIn: true,
    positions: [
      {
        id: 'card',
        name: 'The Card',
        meaning: 'The message or answer for today.',
        drawOrder: 1,
        orientationRule: 'upright-reversed',
        x: 2, y: 2, z: 0,
      },
    ],
  },
  {
    id: 'three-card',
    displayName: 'Three Card',
    description: 'Past / Present / Future — or any three-aspect question.',
    isBuiltIn: true,
    positions: [
      {
        id: 'past',
        name: 'Past',
        meaning: 'What has led to this moment.',
        drawOrder: 1,
        orientationRule: 'upright-reversed',
        x: 0, y: 2, z: 0,
      },
      {
        id: 'present',
        name: 'Present',
        meaning: 'The current situation.',
        drawOrder: 2,
        orientationRule: 'upright-reversed',
        x: 2, y: 2, z: 0,
      },
      {
        id: 'future',
        name: 'Future',
        meaning: 'What may emerge.',
        drawOrder: 3,
        orientationRule: 'upright-reversed',
        x: 4, y: 2, z: 0,
      },
    ],
  },
  {
    id: 'celtic-cross',
    displayName: 'Celtic Cross',
    description: 'Classic 10-card spread covering the full situation.',
    isBuiltIn: true,
    positions: [
      { id: 'present',     name: 'Present',          meaning: 'The heart of the matter.',                drawOrder: 1,  orientationRule: 'upright-reversed', x: 2, y: 2, z: 0 },
      { id: 'crossing',    name: 'Crossing',          meaning: 'What crosses or challenges.',             drawOrder: 2,  orientationRule: 'upright-reversed', x: 2, y: 2, z: 1 },
      { id: 'below',       name: 'Root / Below',      meaning: 'Foundation or unconscious influence.',    drawOrder: 3,  orientationRule: 'upright-reversed', x: 2, y: 4, z: 0 },
      { id: 'past',        name: 'Recent Past',       meaning: 'What is passing away.',                   drawOrder: 4,  orientationRule: 'upright-reversed', x: 1, y: 2, z: 0 },
      { id: 'above',       name: 'Crown / Above',     meaning: 'Best possible outcome or ideal.',         drawOrder: 5,  orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'future',      name: 'Near Future',       meaning: 'What approaches.',                        drawOrder: 6,  orientationRule: 'upright-reversed', x: 3, y: 2, z: 0 },
      { id: 'self',        name: 'Self',              meaning: 'Your attitude or position.',              drawOrder: 7,  orientationRule: 'upright-reversed', x: 4, y: 4, z: 0 },
      { id: 'environment', name: 'Environment',       meaning: 'External influences and others.',         drawOrder: 8,  orientationRule: 'upright-reversed', x: 4, y: 3, z: 0 },
      { id: 'hopes',       name: 'Hopes / Fears',     meaning: 'Hidden hopes or fears.',                  drawOrder: 9,  orientationRule: 'upright-reversed', x: 4, y: 1, z: 0 },
      { id: 'outcome',     name: 'Final Outcome',     meaning: 'Where this leads if the path continues.', drawOrder: 10, orientationRule: 'upright-reversed', x: 4, y: 0, z: 0 },
    ],
  },
  {
    id: 'horseshoe',
    displayName: 'Horseshoe (7 Card)',
    description: 'A balanced 7-card spread covering past, present, influences, and outcome.',
    isBuiltIn: true,
    positions: [
      { id: 'past',          name: 'Distant Past',     meaning: 'Long-standing influence.',      drawOrder: 1, orientationRule: 'upright-reversed', x: 0, y: 4, z: 0 },
      { id: 'recent',        name: 'Recent Past',      meaning: 'What is fading.',               drawOrder: 2, orientationRule: 'upright-reversed', x: 1, y: 2, z: 0 },
      { id: 'present',       name: 'Present',          meaning: 'The current situation.',        drawOrder: 3, orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'future',        name: 'Near Future',      meaning: 'What approaches soon.',         drawOrder: 4, orientationRule: 'upright-reversed', x: 3, y: 2, z: 0 },
      { id: 'external',      name: 'External Forces',  meaning: 'Outside influences.',           drawOrder: 5, orientationRule: 'upright-reversed', x: 4, y: 4, z: 0 },
      { id: 'hopes',         name: 'Hopes & Fears',    meaning: 'Hidden desires or concerns.',   drawOrder: 6, orientationRule: 'upright-reversed', x: 2, y: 3, z: 0 },
      { id: 'outcome',       name: 'Outcome',          meaning: 'The likely result.',            drawOrder: 7, orientationRule: 'upright-reversed', x: 2, y: 2, z: 0 },
    ],
  },
  {
    id: 'year-ahead',
    displayName: 'Year Ahead (12 Months)',
    description: 'One card per month for the twelve months ahead, starting with the current month.',
    isBuiltIn: true,
    positions: [
      { id: 'month-0',  name: 'Month 1',  meaning: 'The first month ahead.',   drawOrder: 1,  orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'month-1',  name: 'Month 2',  meaning: 'The second month ahead.',  drawOrder: 2,  orientationRule: 'upright-reversed', x: 3, y: 0, z: 0 },
      { id: 'month-2',  name: 'Month 3',  meaning: 'The third month ahead.',   drawOrder: 3,  orientationRule: 'upright-reversed', x: 4, y: 1, z: 0 },
      { id: 'month-3',  name: 'Month 4',  meaning: 'The fourth month ahead.',  drawOrder: 4,  orientationRule: 'upright-reversed', x: 4, y: 2, z: 0 },
      { id: 'month-4',  name: 'Month 5',  meaning: 'The fifth month ahead.',   drawOrder: 5,  orientationRule: 'upright-reversed', x: 4, y: 3, z: 0 },
      { id: 'month-5',  name: 'Month 6',  meaning: 'The sixth month ahead.',   drawOrder: 6,  orientationRule: 'upright-reversed', x: 3, y: 4, z: 0 },
      { id: 'month-6',  name: 'Month 7',  meaning: 'The seventh month ahead.', drawOrder: 7,  orientationRule: 'upright-reversed', x: 2, y: 4, z: 0 },
      { id: 'month-7',  name: 'Month 8',  meaning: 'The eighth month ahead.',  drawOrder: 8,  orientationRule: 'upright-reversed', x: 1, y: 4, z: 0 },
      { id: 'month-8',  name: 'Month 9',  meaning: 'The ninth month ahead.',   drawOrder: 9,  orientationRule: 'upright-reversed', x: 0, y: 3, z: 0 },
      { id: 'month-9',  name: 'Month 10', meaning: 'The tenth month ahead.',   drawOrder: 10, orientationRule: 'upright-reversed', x: 0, y: 2, z: 0 },
      { id: 'month-10', name: 'Month 11', meaning: 'The eleventh month ahead.', drawOrder: 11, orientationRule: 'upright-reversed', x: 0, y: 1, z: 0 },
      { id: 'month-11', name: 'Month 12', meaning: 'The twelfth month ahead.',  drawOrder: 12, orientationRule: 'upright-reversed', x: 1, y: 0, z: 0 },
    ],
  },
  {
    id: 'zodiac-year',
    displayName: 'Zodiac Year (12/13 Signs)',
    description: 'One card per zodiac sign — a zodiacal year spread. Includes Ophiuchus when IAU mode is active.',
    isBuiltIn: true,
    positions: [
      { id: 'astrology.zodiac-sign.aries',       name: 'Aries',       meaning: 'The Aries season — initiative, new beginnings.',           drawOrder: 1,  orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'astrology.zodiac-sign.taurus',      name: 'Taurus',      meaning: 'The Taurus season — stability, resources, pleasure.',      drawOrder: 2,  orientationRule: 'upright-reversed', x: 3, y: 0, z: 0 },
      { id: 'astrology.zodiac-sign.gemini',      name: 'Gemini',      meaning: 'The Gemini season — communication, duality, learning.',    drawOrder: 3,  orientationRule: 'upright-reversed', x: 4, y: 1, z: 0 },
      { id: 'astrology.zodiac-sign.cancer',      name: 'Cancer',      meaning: 'The Cancer season — home, emotion, nurture.',             drawOrder: 4,  orientationRule: 'upright-reversed', x: 4, y: 2, z: 0 },
      { id: 'astrology.zodiac-sign.leo',         name: 'Leo',         meaning: 'The Leo season — creativity, pride, self-expression.',    drawOrder: 5,  orientationRule: 'upright-reversed', x: 4, y: 3, z: 0 },
      { id: 'astrology.zodiac-sign.virgo',       name: 'Virgo',       meaning: 'The Virgo season — analysis, service, refinement.',       drawOrder: 6,  orientationRule: 'upright-reversed', x: 3, y: 4, z: 0 },
      { id: 'astrology.zodiac-sign.libra',       name: 'Libra',       meaning: 'The Libra season — balance, relationships, justice.',     drawOrder: 7,  orientationRule: 'upright-reversed', x: 2, y: 4, z: 0 },
      { id: 'astrology.zodiac-sign.scorpio',     name: 'Scorpio',     meaning: 'The Scorpio season — depth, transformation, intensity.',  drawOrder: 8,  orientationRule: 'upright-reversed', x: 1, y: 4, z: 0 },
      { id: 'astrology.zodiac-sign.sagittarius', name: 'Sagittarius', meaning: 'The Sagittarius season — expansion, philosophy, travel.', drawOrder: 9,  orientationRule: 'upright-reversed', x: 0, y: 3, z: 0 },
      { id: 'astrology.zodiac-sign.capricorn',   name: 'Capricorn',   meaning: 'The Capricorn season — ambition, structure, mastery.',    drawOrder: 10, orientationRule: 'upright-reversed', x: 0, y: 2, z: 0 },
      { id: 'astrology.zodiac-sign.aquarius',    name: 'Aquarius',    meaning: 'The Aquarius season — innovation, community, vision.',    drawOrder: 11, orientationRule: 'upright-reversed', x: 0, y: 1, z: 0 },
      { id: 'astrology.zodiac-sign.pisces',      name: 'Pisces',      meaning: 'The Pisces season — intuition, dissolution, dreams.',     drawOrder: 12, orientationRule: 'upright-reversed', x: 1, y: 0, z: 0 },
    ],
  },
  {
    id: 'chakra',
    displayName: 'Chakra Spread (7 Card)',
    description: 'One card per chakra — maps the question from the crown to the root.',
    isBuiltIn: true,
    positions: [
      { id: 'chakra.classical.sahasrara',    name: 'Sahasrara',    meaning: 'Crown — consciousness, divine connection, transcendence.',          drawOrder: 1, orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'chakra.classical.ajna',         name: 'Ajna',         meaning: 'Third Eye — intuition, insight, inner vision.',                     drawOrder: 2, orientationRule: 'upright-reversed', x: 2, y: 1, z: 0 },
      { id: 'chakra.classical.vishuddha',    name: 'Vishuddha',    meaning: 'Throat — communication, truth, creative expression.',               drawOrder: 3, orientationRule: 'upright-reversed', x: 2, y: 2, z: 0 },
      { id: 'chakra.classical.anahata',      name: 'Anahata',      meaning: 'Heart — love, compassion, balance between above and below.',        drawOrder: 4, orientationRule: 'upright-reversed', x: 2, y: 3, z: 0 },
      { id: 'chakra.classical.manipura',     name: 'Manipura',     meaning: 'Solar Plexus — personal power, will, confidence.',                  drawOrder: 5, orientationRule: 'upright-reversed', x: 2, y: 4, z: 0 },
      { id: 'chakra.classical.svadhisthana', name: 'Svadhisthana', meaning: 'Sacral — emotion, desire, creativity, relationships.',              drawOrder: 6, orientationRule: 'upright-reversed', x: 2, y: 5, z: 0 },
      { id: 'chakra.classical.muladhara',    name: 'Muladhara',    meaning: 'Root — safety, groundedness, physical foundation.',                 drawOrder: 7, orientationRule: 'upright-reversed', x: 2, y: 6, z: 0 },
    ],
  },
  {
    id: 'grand-tableau',
    displayName: 'Grand Tableau (36 Card)',
    description: 'Full 36-card Lenormand spread laid out in a 9×4 grid. Each position is a numbered house whose name corresponds to the Lenormand card that belongs there.',
    isBuiltIn: true,
    requiredDeckId: 'lenormand',
    // The Tableau uses the entire 36-card deck by definition — every card already
    // has a house, so there's nothing left to pull as a separate clarifier.
    allowClarifiers: false,
    positions: [
      { id: 'house-1',  name: 'Rider',      meaning: 'News, swift movement, a visitor arriving',              drawOrder: 1,  orientationRule: 'upright-reversed', x: 0, y: 0, z: 0 },
      { id: 'house-2',  name: 'Clover',     meaning: 'Luck, small opportunity, brief happiness',              drawOrder: 2,  orientationRule: 'upright-reversed', x: 1, y: 0, z: 0 },
      { id: 'house-3',  name: 'Ship',       meaning: 'Journey, distance, commerce, longing',                  drawOrder: 3,  orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'house-4',  name: 'House',      meaning: 'Home, family, property, security',                      drawOrder: 4,  orientationRule: 'upright-reversed', x: 3, y: 0, z: 0 },
      { id: 'house-5',  name: 'Tree',       meaning: 'Health, slow growth, deep roots, life force',           drawOrder: 5,  orientationRule: 'upright-reversed', x: 4, y: 0, z: 0 },
      { id: 'house-6',  name: 'Clouds',     meaning: 'Uncertainty, confusion, hidden problems',               drawOrder: 6,  orientationRule: 'upright-reversed', x: 5, y: 0, z: 0 },
      { id: 'house-7',  name: 'Snake',      meaning: 'Desire, complications, a rival or detour',              drawOrder: 7,  orientationRule: 'upright-reversed', x: 6, y: 0, z: 0 },
      { id: 'house-8',  name: 'Coffin',     meaning: 'Endings, illness, transformation, stagnation',          drawOrder: 8,  orientationRule: 'upright-reversed', x: 7, y: 0, z: 0 },
      { id: 'house-9',  name: 'Bouquet',    meaning: 'Joy, gifts, beauty, social pleasures',                  drawOrder: 9,  orientationRule: 'upright-reversed', x: 8, y: 0, z: 0 },
      { id: 'house-10', name: 'Scythe',     meaning: 'Sudden cut, decision, harvest, danger',                 drawOrder: 10, orientationRule: 'upright-reversed', x: 0, y: 1, z: 0 },
      { id: 'house-11', name: 'Whip',       meaning: 'Conflict, repetition, discipline, strife',              drawOrder: 11, orientationRule: 'upright-reversed', x: 1, y: 1, z: 0 },
      { id: 'house-12', name: 'Birds',      meaning: 'Worry, chatter, a couple, nervous energy',              drawOrder: 12, orientationRule: 'upright-reversed', x: 2, y: 1, z: 0 },
      { id: 'house-13', name: 'Child',      meaning: 'New beginning, innocence, a child, naivety',            drawOrder: 13, orientationRule: 'upright-reversed', x: 3, y: 1, z: 0 },
      { id: 'house-14', name: 'Fox',        meaning: 'Cunning, caution, work, self-interest',                 drawOrder: 14, orientationRule: 'upright-reversed', x: 4, y: 1, z: 0 },
      { id: 'house-15', name: 'Bear',       meaning: 'Strength, authority, finances, a protector',            drawOrder: 15, orientationRule: 'upright-reversed', x: 5, y: 1, z: 0 },
      { id: 'house-16', name: 'Stars',      meaning: 'Hope, guidance, inspiration, long-term vision',         drawOrder: 16, orientationRule: 'upright-reversed', x: 6, y: 1, z: 0 },
      { id: 'house-17', name: 'Stork',      meaning: 'Change, improvement, relocation, transformation',       drawOrder: 17, orientationRule: 'upright-reversed', x: 7, y: 1, z: 0 },
      { id: 'house-18', name: 'Dog',        meaning: 'Loyalty, friendship, a trusted companion',              drawOrder: 18, orientationRule: 'upright-reversed', x: 8, y: 1, z: 0 },
      { id: 'house-19', name: 'Tower',      meaning: 'Solitude, authority, institutions, the ego',            drawOrder: 19, orientationRule: 'upright-reversed', x: 0, y: 2, z: 0 },
      { id: 'house-20', name: 'Garden',     meaning: 'Society, public life, gatherings, networks',            drawOrder: 20, orientationRule: 'upright-reversed', x: 1, y: 2, z: 0 },
      { id: 'house-21', name: 'Mountain',   meaning: 'Obstacles, delay, challenges, opposition',              drawOrder: 21, orientationRule: 'upright-reversed', x: 2, y: 2, z: 0 },
      { id: 'house-22', name: 'Crossroads', meaning: 'Choice, alternatives, freedom, divergence',             drawOrder: 22, orientationRule: 'upright-reversed', x: 3, y: 2, z: 0 },
      { id: 'house-23', name: 'Mice',       meaning: 'Loss, anxiety, gradual depletion, worry',               drawOrder: 23, orientationRule: 'upright-reversed', x: 4, y: 2, z: 0 },
      { id: 'house-24', name: 'Heart',      meaning: 'Love, emotion, desire, kindness',                       drawOrder: 24, orientationRule: 'upright-reversed', x: 5, y: 2, z: 0 },
      { id: 'house-25', name: 'Ring',       meaning: 'Commitment, cycles, contracts, partnership',            drawOrder: 25, orientationRule: 'upright-reversed', x: 6, y: 2, z: 0 },
      { id: 'house-26', name: 'Book',       meaning: 'Secrets, hidden knowledge, study, mystery',             drawOrder: 26, orientationRule: 'upright-reversed', x: 7, y: 2, z: 0 },
      { id: 'house-27', name: 'Letter',     meaning: 'Written communication, documents, messages',            drawOrder: 27, orientationRule: 'upright-reversed', x: 8, y: 2, z: 0 },
      { id: 'house-28', name: 'Man',        meaning: 'A man significant to the querent or reading',           drawOrder: 28, orientationRule: 'upright-reversed', x: 0, y: 3, z: 0 },
      { id: 'house-29', name: 'Woman',      meaning: 'A woman significant to the querent or reading',         drawOrder: 29, orientationRule: 'upright-reversed', x: 1, y: 3, z: 0 },
      { id: 'house-30', name: 'Lily',       meaning: 'Maturity, peace, sensuality, an older person',          drawOrder: 30, orientationRule: 'upright-reversed', x: 2, y: 3, z: 0 },
      { id: 'house-31', name: 'Sun',        meaning: 'Success, vitality, clarity, happiness',                 drawOrder: 31, orientationRule: 'upright-reversed', x: 3, y: 3, z: 0 },
      { id: 'house-32', name: 'Moon',       meaning: 'Emotions, intuition, recognition, the unconscious',     drawOrder: 32, orientationRule: 'upright-reversed', x: 4, y: 3, z: 0 },
      { id: 'house-33', name: 'Key',        meaning: 'Certainty, solution, destiny, access',                  drawOrder: 33, orientationRule: 'upright-reversed', x: 5, y: 3, z: 0 },
      { id: 'house-34', name: 'Fish',       meaning: 'Abundance, finances, independence, flow',               drawOrder: 34, orientationRule: 'upright-reversed', x: 6, y: 3, z: 0 },
      { id: 'house-35', name: 'Anchor',     meaning: 'Stability, security, perseverance, holding fast',       drawOrder: 35, orientationRule: 'upright-reversed', x: 7, y: 3, z: 0 },
      { id: 'house-36', name: 'Cross',      meaning: 'Burden, fate, suffering, duty, the unavoidable',        drawOrder: 36, orientationRule: 'upright-reversed', x: 8, y: 3, z: 0 },
    ],
  },
  {
    id: 'relationship',
    displayName: 'Relationship (6 Card)',
    description: 'Six-card spread exploring the dynamics between two people — what each brings, what bonds and challenges them, and where the connection could lead.',
    isBuiltIn: true,
    positions: [
      { id: 'you',         name: 'You',          meaning: 'How you show up in this relationship.',                    drawOrder: 1, orientationRule: 'upright-reversed', x: 0, y: 0, z: 0 },
      { id: 'them',        name: 'Them',          meaning: 'How they show up in this relationship.',                  drawOrder: 2, orientationRule: 'upright-reversed', x: 4, y: 0, z: 0 },
      { id: 'bond',        name: 'The Bond',      meaning: 'What connects you — the energy between you.',            drawOrder: 3, orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      { id: 'your-need',   name: 'Your Need',     meaning: 'What you need from this relationship.',                  drawOrder: 4, orientationRule: 'upright-reversed', x: 1, y: 1, z: 0 },
      { id: 'their-need',  name: 'Their Need',    meaning: 'What they need from this relationship.',                 drawOrder: 5, orientationRule: 'upright-reversed', x: 3, y: 1, z: 0 },
      { id: 'potential',   name: 'Potential',     meaning: 'Where this relationship could lead if both needs are met.', drawOrder: 6, orientationRule: 'upright-reversed', x: 2, y: 2, z: 0 },
    ],
  },
  {
    id: 'tree-of-life',
    displayName: 'Tree of Life (10 Card)',
    description: 'One card per sephira — maps the question across all ten spheres of the Qabalistic Tree of Life.',
    isBuiltIn: true,
    positions: [
      { id: 'qabalah.sephira.kether',    name: 'Kether',    meaning: 'Crown — unity, pure being, the divine source.',          drawOrder: 1,  orientationRule: 'upright-reversed', x: 2, y: 0,  z: 0 },
      { id: 'qabalah.sephira.chokmah',   name: 'Chokmah',   meaning: 'Wisdom — primordial creative force, the Father.',        drawOrder: 2,  orientationRule: 'upright-reversed', x: 0, y: 1,  z: 0 },
      { id: 'qabalah.sephira.binah',     name: 'Binah',     meaning: 'Understanding — form and limit, the Mother.',            drawOrder: 3,  orientationRule: 'upright-reversed', x: 4, y: 1,  z: 0 },
      { id: 'qabalah.sephira.chesed',    name: 'Chesed',    meaning: 'Mercy — expansion, benevolence, abundance.',             drawOrder: 4,  orientationRule: 'upright-reversed', x: 0, y: 3,  z: 0 },
      { id: 'qabalah.sephira.geburah',   name: 'Geburah',   meaning: 'Strength — severity, will, the power to restrict.',     drawOrder: 5,  orientationRule: 'upright-reversed', x: 4, y: 3,  z: 0 },
      { id: 'qabalah.sephira.tiphareth', name: 'Tiphareth', meaning: 'Beauty — harmony, the heart centre, the true Self.',    drawOrder: 6,  orientationRule: 'upright-reversed', x: 2, y: 4,  z: 0 },
      { id: 'qabalah.sephira.netzach',   name: 'Netzach',   meaning: 'Victory — desire, emotion, instinct, nature.',          drawOrder: 7,  orientationRule: 'upright-reversed', x: 0, y: 6,  z: 0 },
      { id: 'qabalah.sephira.hod',       name: 'Hod',       meaning: 'Splendour — intellect, language, magical form.',        drawOrder: 8,  orientationRule: 'upright-reversed', x: 4, y: 6,  z: 0 },
      { id: 'qabalah.sephira.yesod',     name: 'Yesod',     meaning: 'Foundation — the astral plane, imagination, reflection.', drawOrder: 9,  orientationRule: 'upright-reversed', x: 2, y: 7,  z: 0 },
      { id: 'qabalah.sephira.malkuth',   name: 'Malkuth',   meaning: 'Kingdom — physical manifestation, the world of matter.', drawOrder: 10, orientationRule: 'upright-reversed', x: 2, y: 9,  z: 0 },
    ],
  },
]
