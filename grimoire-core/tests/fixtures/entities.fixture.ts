import type { CreateEntityInput } from '../../src/types/entity.types.js'

export const theFool: CreateEntityInput = {
  canonicalName: 'tarot.major.the-fool',
  entityType: 'tarot.card',
  primaryDisplayName: 'The Fool',
  description: 'The first card of the Major Arcana. Numbered 0.',
  tags: ['major-arcana', 'tarot'],
  isBuiltIn: true,
  extendedData: {
    cardNumber: 0,
    rank: 'The Fool',
    suit: null,
    arcana: 'major',
    uprightMeaning: 'New beginnings, innocence, spontaneity.',
    reversedMeaning: 'Recklessness, risk-taking, inconsideration.',
    reversalsApplicable: true,
    sourceDeck: 'tarot.deck.rider-waite-smith',
  },
  secondaryNames: [
    { name: 'Le Mat', languageTag: 'fr', visible: true, sortOrder: 0 },
    { name: 'הטיפש', languageTag: 'he', visible: false, sortOrder: 1 },
  ],
}

export const theMagician: CreateEntityInput = {
  canonicalName: 'tarot.major.the-magician',
  entityType: 'tarot.card',
  primaryDisplayName: 'The Magician',
  description: 'The second card of the Major Arcana. Numbered 1.',
  tags: ['major-arcana', 'tarot'],
  isBuiltIn: true,
  extendedData: {
    cardNumber: 1,
    rank: 'The Magician',
    suit: null,
    arcana: 'major',
  },
}

export const kether: CreateEntityInput = {
  canonicalName: 'qabalah.sephira.kether',
  entityType: 'qabalah.sephira',
  primaryDisplayName: 'Kether',
  description: 'The Crown. First and highest of the sephiroth on the Tree of Life.',
  tags: ['sephira', 'qabalah'],
  isBuiltIn: true,
  extendedData: {
    number: 1,
    mundaneChakra: 'Primum Mobile',
  },
  secondaryNames: [
    { name: 'כֶּתֶר', languageTag: 'he', visible: true, sortOrder: 0 },
    { name: 'Kether', languageTag: 'he-gd-roman', visible: true, sortOrder: 1 },
  ],
}

export const mars: CreateEntityInput = {
  canonicalName: 'astrology.planet.mars',
  entityType: 'astrology.planet',
  primaryDisplayName: 'Mars',
  description: 'The planet Mars. Associated with war, energy, and action.',
  tags: ['planet', 'astrology'],
  isBuiltIn: true,
  extendedData: {
    symbol: '♂',
  },
}

export const aleph: CreateEntityInput = {
  canonicalName: 'letter.hebrew.aleph',
  entityType: 'letter.hebrew',
  primaryDisplayName: 'Aleph',
  description: 'First letter of the Hebrew alphabet. A Mother letter.',
  tags: ['hebrew-letter', 'letter'],
  isBuiltIn: true,
  extendedData: {
    form: 'א',
    letterType: 'mother',
    numericalValue: 1,
    phonetic: 'silent / glottal stop',
  },
  secondaryNames: [
    { name: 'אָלֶף', languageTag: 'he', visible: true, sortOrder: 0 },
  ],
}
