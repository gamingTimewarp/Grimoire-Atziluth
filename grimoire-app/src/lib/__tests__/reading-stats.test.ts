import { describe, it, expect } from 'vitest'
import {
  computeCardFrequency, computeSignMatches, computeCalendarPeriodCounts, computePeriodCounts,
  filterReadings, resolveDeckId, suitGroupFor, filterCardsForAggregation,
} from '../reading-stats'
import type { StatsFilter, FilterContext } from '../reading-stats'
import type { BaseEntity, Reading, ReadingCard, CalendarSystem } from '@grimoire/core'
import type { DeckFilter } from '../built-in-data'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<BaseEntity> = {}): BaseEntity {
  return {
    id: 'id-' + Math.random(),
    canonicalName: 'test.entity',
    entityType: 'test.type',
    primaryDisplayName: 'Test Entity',
    secondaryNames: [],
    customAttributes: [],
    extendedData: {},
    tags: [],
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  } as BaseEntity
}

function makeCard(overrides: Partial<ReadingCard> = {}): ReadingCard {
  return {
    id: 'card-' + Math.random(),
    cardCanonicalName: 'test.entity',
    positionId: null,
    drawOrder: 0,
    orientation: 'upright',
    ...overrides,
  }
}

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: 'reading-' + Math.random(),
    createdAt: '2024-05-15T12:00:00Z',
    readingDate: '2024-05-15T12:00:00Z',
    deckId: 'rws',
    spreadId: null,
    isFreeReading: true,
    cards: [makeCard()],
    subject: null,
    notes: '',
    tags: [],
    traditionSnapshot: [],
    astroSnapshot: null,
    ...overrides,
  } as Reading
}

// ─── computeCardFrequency: splitByOrientation ─────────────────────────────────

describe('computeCardFrequency splitByOrientation', () => {
  const fool = makeEntity({ canonicalName: 'tarot.major.the-fool', primaryDisplayName: 'The Fool' })
  const entityMap = new Map([[fool.canonicalName, fool]])
  const readings = [
    makeReading({ cards: [makeCard({ cardCanonicalName: fool.canonicalName, orientation: 'upright' })] }),
    makeReading({ cards: [makeCard({ cardCanonicalName: fool.canonicalName, orientation: 'reversed' })] }),
    makeReading({ cards: [makeCard({ cardCanonicalName: fool.canonicalName, orientation: 'upright' })] }),
  ]

  it('combines orientations into one row by default', () => {
    const freq = computeCardFrequency(readings, entityMap, false)
    expect(freq).toHaveLength(1)
    expect(freq[0].count).toBe(3)
    expect(freq[0].upright).toBe(2)
    expect(freq[0].reversed).toBe(1)
    expect(freq[0].displayName).toBe('The Fool')
  })

  it('splits into separate upright/reversed rows when enabled', () => {
    const freq = computeCardFrequency(readings, entityMap, false, true)
    expect(freq).toHaveLength(2)
    const upright = freq.find(e => e.displayName.includes('Upright'))!
    const reversed = freq.find(e => e.displayName.includes('Reversed'))!
    expect(upright.count).toBe(2)
    expect(reversed.count).toBe(1)
  })
})

// ─── inferAstrological (tested indirectly via computeCardFrequency) ───────────

describe('astrological correspondence kind disambiguation', () => {
  it('classifies a zodiac-sign canonical name as kind "sign"', () => {
    const empress = makeEntity({
      canonicalName: 'tarot.major.the-empress',
      primaryDisplayName: 'The Empress',
      extendedData: { astrological: 'astrology.zodiac-sign.taurus' },
    })
    const freq = computeCardFrequency(
      [makeReading({ cards: [makeCard({ cardCanonicalName: empress.canonicalName })] })],
      new Map([[empress.canonicalName, empress]]),
      false,
    )
    expect(freq[0].astrological).toEqual({
      display: 'Taurus', kind: 'sign', canonicalName: 'astrology.zodiac-sign.taurus',
    })
  })

  it('classifies a planet canonical name as kind "planet"', () => {
    const magician = makeEntity({
      canonicalName: 'tarot.major.the-magician',
      primaryDisplayName: 'The Magician',
      extendedData: { astrological: 'astrology.planet.mercury' },
    })
    const freq = computeCardFrequency(
      [makeReading({ cards: [makeCard({ cardCanonicalName: magician.canonicalName })] })],
      new Map([[magician.canonicalName, magician]]),
      false,
    )
    expect(freq[0].astrological?.kind).toBe('planet')
    expect(freq[0].astrological?.display).toBe('Mercury')
  })
})

// ─── computeSignMatches ────────────────────────────────────────────────────────

describe('computeSignMatches', () => {
  // Ground truth verified directly against getPlanetPositions: the Sun was in
  // Taurus (well within the sign, not near a boundary) on 2024-05-15.
  const empress = makeEntity({
    canonicalName: 'tarot.major.the-empress',
    primaryDisplayName: 'The Empress',
    extendedData: { astrological: 'astrology.zodiac-sign.taurus' },
  })
  const magician = makeEntity({
    canonicalName: 'tarot.major.the-magician',
    primaryDisplayName: 'The Magician',
    extendedData: { astrological: 'astrology.planet.mercury' },
  })
  const hierophant = makeEntity({
    canonicalName: 'tarot.major.the-hierophant',
    primaryDisplayName: 'The Hierophant',
    extendedData: { astrological: 'astrology.zodiac-sign.taurus' },
  })
  const entityMap = new Map([
    [empress.canonicalName, empress],
    [magician.canonicalName, magician],
    [hierophant.canonicalName, hierophant],
  ])

  it('matches a card whose sign correspondence equals the Sun\'s actual sign that day', () => {
    const reading = makeReading({
      readingDate: '2024-05-15T12:00:00Z',
      cards: [makeCard({ cardCanonicalName: empress.canonicalName })],
    })
    const matches = computeSignMatches([reading], entityMap, 'tropical')
    expect(matches).toHaveLength(1)
    expect(matches[0].cardCanonicalName).toBe(empress.canonicalName)
    expect(matches[0].matchedPlanets).toContain('Sol')
  })

  it('does not match a planet-correspondence card (only sign-correspondence cards are checked)', () => {
    const reading = makeReading({
      readingDate: '2024-05-15T12:00:00Z',
      cards: [makeCard({ cardCanonicalName: magician.canonicalName })],
    })
    expect(computeSignMatches([reading], entityMap, 'tropical')).toHaveLength(0)
  })

  it('does not match a sign that no tracked planet occupied that day', () => {
    // Verified directly against getPlanetPositions for 2024-05-15: none of the
    // 10 real-bodied planets were in Gemini that day (occupied signs were
    // Taurus, Leo, Aries, Pisces, Aquarius only).
    const geminiCard = makeEntity({
      canonicalName: 'tarot.minor.rws.wands.3',
      primaryDisplayName: 'Three of Wands',
      extendedData: { astrological: 'astrology.zodiac-sign.gemini' },
    })
    const reading = makeReading({
      readingDate: '2024-05-15T12:00:00Z',
      cards: [makeCard({ cardCanonicalName: geminiCard.canonicalName })],
    })
    const matches = computeSignMatches([reading], new Map([[geminiCard.canonicalName, geminiCard]]), 'tropical')
    expect(matches).toHaveLength(0)
  })

  it('reuses one planet-position computation per unique date across multiple cards/readings', () => {
    const reading = makeReading({
      readingDate: '2024-05-15T12:00:00Z',
      cards: [
        makeCard({ cardCanonicalName: empress.canonicalName }),
        makeCard({ cardCanonicalName: hierophant.canonicalName }),
      ],
    })
    const matches = computeSignMatches([reading], entityMap, 'tropical')
    expect(matches).toHaveLength(2)
  })
})

// ─── computeCalendarPeriodCounts ────────────────────────────────────────────────

describe('computeCalendarPeriodCounts', () => {
  const fakeCalendar: CalendarSystem = {
    id: 'fake',
    displayName: 'Fake Calendar',
    fromGregorian: (date: Date) => ({
      year: date.getUTCFullYear() + 1000,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      monthName: `FakeMonth${date.getUTCMonth() + 1}`,
      isLeapMonth: false,
    }),
    toGregorian: () => new Date(),
    daysInMonth: () => 30,
    monthsInYear: () => 12,
    monthName: () => 'FakeMonth',
    addMonths: (d) => d,
  }

  const filter: StatsFilter = { preset: 'all', season: 'all' }

  it('falls back to plain Gregorian bucketing when no calendar is given', () => {
    const readings = [makeReading({ readingDate: '2024-05-15T12:00:00Z' })]
    const result = computeCalendarPeriodCounts(readings, filter, null)
    expect(result).toEqual(computePeriodCounts(readings, filter))
  })

  it('buckets by the given calendar\'s year/month at month granularity', () => {
    const readings = [
      makeReading({ readingDate: '2024-05-15T12:00:00Z' }),
      makeReading({ readingDate: '2024-05-20T12:00:00Z' }),
      makeReading({ readingDate: '2024-06-01T12:00:00Z' }),
    ]
    const result = computeCalendarPeriodCounts(readings, filter, fakeCalendar)
    expect(result).toEqual([
      { label: 'FakeMonth5 3024', count: 2 },
      { label: 'FakeMonth6 3024', count: 1 },
    ])
  })

  it('ignores the calendar at non-month granularity (7d/30d/90d presets)', () => {
    const readings = [makeReading({ readingDate: new Date().toISOString() })]
    const dayFilter: StatsFilter = { preset: '7d', season: 'all' }
    const result = computeCalendarPeriodCounts(readings, dayFilter, fakeCalendar)
    expect(result).toEqual(computePeriodCounts(readings, dayFilter))
  })
})

// ─── resolveDeckId / deck & reversibility filtering ────────────────────────────

describe('resolveDeckId', () => {
  // Mirrors read/index.tsx's handleVariantClick: picking a deck variant saves
  // a reading with deckId set to the *variant's* id (e.g. 'rws-full'), not the
  // parent deck's id — deckFilters only indexes parent ids.
  const rws: DeckFilter = {
    id: 'rws', displayName: 'Rider-Waite-Smith', description: '', reversalEnabled: true,
    variants: [
      { id: 'rws-full', label: 'Full 78' },
      { id: 'rws-major', label: 'Major Arcana Only' },
    ],
  }
  const thoth: DeckFilter = { id: 'thoth', displayName: 'Thoth', description: '', reversalEnabled: false }
  const deckFilters = new Map([[rws.id, rws], [thoth.id, thoth]])

  it('returns a parent deck id unchanged', () => {
    expect(resolveDeckId('rws', deckFilters)).toBe('rws')
  })

  it('resolves a variant id to its owning parent deck id', () => {
    expect(resolveDeckId('rws-full', deckFilters)).toBe('rws')
    expect(resolveDeckId('rws-major', deckFilters)).toBe('rws')
  })

  it('falls back to the raw id when it matches nothing known (e.g. a deleted custom deck)', () => {
    expect(resolveDeckId('some-deleted-deck', deckFilters)).toBe('some-deleted-deck')
  })
})

describe('filterReadings deck/reversibility filters (variant-drawn readings)', () => {
  const rws: DeckFilter = {
    id: 'rws', displayName: 'Rider-Waite-Smith', description: '', reversalEnabled: true,
    variants: [{ id: 'rws-full', label: 'Full 78' }],
  }
  const thoth: DeckFilter = { id: 'thoth', displayName: 'Thoth', description: '', reversalEnabled: false }
  const deckFilters = new Map([[rws.id, rws], [thoth.id, thoth]])
  const ctx: FilterContext = { entityMap: new Map(), deckFilters, astrologyMode: 'tropical' }

  // The actual bug reported: a reading drawn from the RWS *variant* ('rws-full')
  // was invisible to every deck/reversibility filter, since 'rws-full' never
  // appeared anywhere in deckFilters' keys.
  const variantReading = makeReading({ deckId: 'rws-full' })
  const parentReading  = makeReading({ deckId: 'rws' })
  const thothReading   = makeReading({ deckId: 'thoth' })
  const readings = [variantReading, parentReading, thothReading]

  it('matches a variant-drawn reading when its parent deck is selected', () => {
    const result = filterReadings(readings, { preset: 'all', season: 'all', deckIds: ['rws'] }, ctx)
    expect(result.map(r => r.id)).toEqual([variantReading.id, parentReading.id])
  })

  it('matches variant-drawn readings when every deck is selected', () => {
    const result = filterReadings(readings, { preset: 'all', season: 'all', deckIds: ['rws', 'thoth'] }, ctx)
    expect(result).toHaveLength(3)
  })

  it('classifies a variant-drawn reading\'s reversibility via its parent deck', () => {
    const reversible = filterReadings(readings, { preset: 'all', season: 'all', reversalCapable: 'yes' }, ctx)
    expect(reversible.map(r => r.id)).toEqual([variantReading.id, parentReading.id])

    const nonReversible = filterReadings(readings, { preset: 'all', season: 'all', reversalCapable: 'no' }, ctx)
    expect(nonReversible.map(r => r.id)).toEqual([thothReading.id])
  })
})

// ─── Suit normalisation, "Major" as a pseudo-suit, and card-level filtering ───

describe('suit filtering across decks and card-level narrowing', () => {
  // Real per-deck suit slug variance: RWS/Thoth use English (Thoth spells its
  // Earth suit "disks"), Tarot de Marseille uses French, Etteilla stores a
  // bare capitalised word with no canonical-name-style prefix at all.
  const rwsPentacles = makeEntity({
    canonicalName: 'tarot.minor.rws.pentacles.ace', extendedData: { suit: 'tarot.suit.rws.pentacles' },
  })
  const thothDisks = makeEntity({
    canonicalName: 'tarot.minor.thoth.disks.ace', extendedData: { suit: 'tarot.suit.thoth.disks' },
  })
  const tdmDeniers = makeEntity({
    canonicalName: 'tarot.minor.tdm.deniers.ace', extendedData: { suit: 'tarot.suit.tdm.deniers' },
  })
  const etteillaPentacles = makeEntity({
    canonicalName: 'tarot.minor.etteilla.pentacles.ace', extendedData: { suit: 'Pentacles' },
  })
  const rwsSword = makeEntity({
    canonicalName: 'tarot.minor.rws.swords.ace', extendedData: { suit: 'tarot.suit.rws.swords' },
  })
  const major = makeEntity({
    canonicalName: 'tarot.major.rws.the-fool', extendedData: { arcana: 'major', cardNumber: 0 },
  })

  it('unifies Pentacles/Discs/Coins-equivalent suit slugs across every deck', () => {
    for (const e of [rwsPentacles, thothDisks, tdmDeniers, etteillaPentacles]) {
      expect(suitGroupFor(e)).toBe('pentacles')
    }
  })

  it('classifies Major Arcana as suit group "major" regardless of its own suit field', () => {
    expect(suitGroupFor(major)).toBe('major')
  })

  it('only narrows Card Frequency to the matching cards, not the whole reading', () => {
    // A single reading with one Sword and one Pentacle — the bug as reported:
    // selecting "Swords" still showed the Pentacles card in Card Frequency,
    // because filterReadings only ever decided whether to keep the *reading*.
    const entityMap = new Map([
      [rwsSword.canonicalName, rwsSword],
      [rwsPentacles.canonicalName, rwsPentacles],
    ])
    const reading = makeReading({
      cards: [
        makeCard({ cardCanonicalName: rwsSword.canonicalName }),
        makeCard({ cardCanonicalName: rwsPentacles.canonicalName }),
      ],
    })
    const ctx: FilterContext = { entityMap, deckFilters: new Map(), astrologyMode: 'tropical' }
    const filter: StatsFilter = { preset: 'all', season: 'all', suits: ['swords'] }

    // Reading-level: the reading is correctly kept (it has a Sword).
    expect(filterReadings([reading], filter, ctx)).toHaveLength(1)

    // Card-level: only the Sword should survive into aggregation.
    const narrowed = filterCardsForAggregation([reading], filter, entityMap, 'tropical')
    expect(narrowed).toHaveLength(1)
    expect(narrowed[0].cards.map(c => c.cardCanonicalName)).toEqual([rwsSword.canonicalName])

    const freq = computeCardFrequency(narrowed, entityMap, false)
    expect(freq.map(f => f.displayName)).toEqual(['Test Entity'])
    expect(freq).toHaveLength(1)
  })

  it('passes cards through unchanged when no card-level filter is active', () => {
    const entityMap = new Map([[rwsSword.canonicalName, rwsSword]])
    const reading = makeReading({ cards: [makeCard({ cardCanonicalName: rwsSword.canonicalName })] })
    const result = filterCardsForAggregation([reading], { preset: 'all', season: 'all' }, entityMap, 'tropical')
    expect(result).toEqual([reading])
  })
})
