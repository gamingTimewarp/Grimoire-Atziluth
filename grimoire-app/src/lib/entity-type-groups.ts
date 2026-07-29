/**
 * entity-type-groups.ts
 * Grouped, human-labeled entity-type taxonomy for type-filter dropdowns —
 * moved out of reference/index.tsx (its original, sole owner) so the
 * Custom Deck editor's card picker can reuse the exact same groups instead
 * of duplicating this list and drifting out of sync as new entity types
 * are added.
 */

export interface EntityTypeGroup {
  label: string
  options: { value: string; label: string }[]
}

export const ENTITY_TYPE_GROUPS: EntityTypeGroup[] = [
  { label: 'Tarot', options: [
    { value: 'tarot.card',  label: 'Cards' },
    { value: 'tarot.deck',  label: 'Decks' },
    { value: 'tarot.suit',  label: 'Suits' },
  ]},
  { label: 'Divination', options: [
    { value: 'rune',                    label: 'Runes' },
    { value: 'ogham.letter',            label: 'Ogham' },
    { value: 'iching.hexagram',         label: 'I Ching Hexagrams' },
    { value: 'iching.trigram',          label: 'I Ching Trigrams' },
    { value: 'geomancy.figure',         label: 'Geomantic Figures' },
    { value: 'divination.mahjong-tile', label: 'Mahjong Tiles' },
    { value: 'divination.tea-symbol',   label: 'Tea Leaf Symbols' },
  ]},
  { label: 'Astrology', options: [
    { value: 'astrology.zodiac-sign',    label: 'Zodiac Signs' },
    { value: 'astrology.planet',         label: 'Planets' },
    { value: 'astrology.node',           label: 'Lunar Nodes' },
    { value: 'astrology.house',          label: 'Houses' },
    { value: 'astrology.aspect',         label: 'Aspects' },
    { value: 'astrology.element',        label: 'Elements' },
    { value: 'astrology.decan',          label: 'Decans' },
    { value: 'astrology.fixed-star',     label: 'Fixed Stars' },
    { value: 'astrology.nakshatra',      label: 'Nakshatras' },
    { value: 'astrology.lunar-mansion',  label: 'Lunar Mansions' },
    { value: 'astrology.full-moon-name', label: 'Full Moon Names' },
  ]},
  { label: 'Qabalah', options: [
    { value: 'qabalah.sephira',        label: 'Sephiroth' },
    { value: 'qabalah.path',           label: 'Paths' },
    { value: 'qabalah.qliphoth',       label: 'Qliphoth' },
    { value: 'qabalah.world',          label: 'Worlds' },
    { value: 'qabalah.pillar',         label: 'Pillars' },
    { value: 'qabalah.partzuf',        label: 'Partzufim' },
    { value: 'qabalah.tunnel-of-set',  label: 'Tunnels of Set' },
  ]},
  { label: 'Angels & Demons', options: [
    { value: 'angel.shem',     label: 'Shem Angels (72)' },
    { value: 'angel.order',    label: 'Angelic Orders' },
    { value: 'angel.archangel',label: 'Archangels' },
    { value: 'goetia.demon',   label: 'Goetia Demons' },
    { value: 'spirit.olympic', label: 'Olympic Spirits' },
    { value: 'enochian.aethyr',label: 'Enochian Aethyrs' },
  ]},
  { label: 'Deities', options: [
    { value: 'deity.greek',     label: 'Greek Deities' },
    { value: 'deity.egyptian',  label: 'Egyptian Deities' },
    { value: 'norse.deity',     label: 'Norse Deities' },
    { value: 'taoism.immortal', label: 'Taoist Immortals' },
  ]},
  { label: 'Letters', options: [
    { value: 'letter.hebrew',   label: 'Hebrew' },
    { value: 'letter.greek',    label: 'Greek' },
    { value: 'letter.arabic',   label: 'Arabic' },
    { value: 'letter.enochian', label: 'Enochian' },
    { value: 'letter.latin',    label: 'Latin' },
  ]},
  { label: 'Nature & Magic', options: [
    { value: 'herb',              label: 'Herbs' },
    { value: 'chakra',            label: 'Chakras' },
    { value: 'tattwa',            label: 'Tattwas' },
    { value: 'calendar.sabbat',   label: 'Sabbats / Wheel of the Year' },
    { value: 'calendar.holiday',  label: 'Holidays & Festivals' },
    { value: 'alchemy.metal',     label: 'Alchemical Metals' },
    { value: 'alchemy.operation', label: 'Alchemical Operations' },
    { value: 'geometry.shape',    label: 'Sacred Geometry' },
  ]},
  { label: 'Colour & Gemstone', options: [
    { value: 'colour.colour',       label: 'Colours' },
    { value: 'gemstone.gemstone',   label: 'Gemstones' },
  ]},
  { label: 'Other', options: [
    { value: 'numerology.digit',    label: 'Numerology' },
    { value: 'chinese-zodiac.animal', label: 'Chinese Zodiac' },
    { value: 'omen.animal',         label: 'Omen Animals' },
    { value: 'wuxing.phase',        label: 'Wu Xing / Five Phases' },
    { value: 'gnostic.aeon',        label: 'Gnostic Aeons' },
    { value: 'western.polarity',    label: 'Western Polarity' },
    { value: 'palmistry.line',      label: 'Palmistry Lines' },
    { value: 'palmistry.mount',     label: 'Palmistry Mounts' },
    { value: 'rosicrucian.symbol',  label: 'Rosicrucian Symbols' },
  ]},
]

/** Every entityType value already covered by a labeled group above. */
export const KNOWN_ENTITY_TYPES = new Set(ENTITY_TYPE_GROUPS.flatMap(g => g.options.map(o => o.value)))
