/**
 * daily-reading.ts
 * Logic for automatically creating the daily reading on app startup.
 */

import type { GrimoireEngine } from '@grimoire/core'
import { getTodaysDailyReading, saveReading } from '@/lib/reading-db'
import { loadSettings } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { getNatalChart } from '@/lib/astro-engine'
import { getHomeLocation } from '@/lib/settings-store'
import { todayInZone } from '@/lib/timezone'
import { BUILT_IN_DECK_FILTERS, BUILT_IN_SPREADS } from '@/lib/built-in-data'
import type { DeckFilter } from '@/lib/built-in-data'
import { getAllCustomDecks, deckRecordToFilter, getAllCustomSpreads, spreadRecordToDefinition } from '@/lib/custom-db'

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function createDailyReadingIfAbsent(engine: GrimoireEngine): Promise<void> {
  const loc = getHomeLocation()
  // "Today" per the user's configured home-location zone (falling back to the
  // device's own zone if none is set) rather than UTC — so a reading made
  // near midnight lands on the calendar day the user actually experienced,
  // and re-deriving this same way on every check means flipping the zone
  // setting back and forth can never make "today" reappear as a fresh day.
  const today = todayInZone(loc?.timezone)

  // Check if today's daily reading already exists
  const existing = await getTodaysDailyReading()
  if (existing) return

  const { dailyDeckId, dailySpreadId } = loadSettings()
  const { astrologyMode, houseSystem } = loadTraditionSettings()

  // Resolve deck filter — dailyDeckId may be a variant id (e.g. 'rws-full'), a
  // top-level built-in id (e.g. 'runes-elder-futhark'), or a custom deck id.
  // Try built-in variants first, then fall back to custom decks.
  let deckFilter: DeckFilter | undefined = BUILT_IN_DECK_FILTERS.find(d => d.id === dailyDeckId)
  let tags       = deckFilter?.tags
  let entityType = deckFilter?.entityType

  if (!deckFilter) {
    // Search inside variant arrays
    for (const deck of BUILT_IN_DECK_FILTERS) {
      const variant = deck.variants?.find(v => v.id === dailyDeckId)
      if (variant) {
        deckFilter  = deck
        tags        = variant.tags        ?? deck.tags
        entityType  = variant.entityType  ?? deck.entityType
        break
      }
    }
  }

  if (!deckFilter) {
    const customDecks = await getAllCustomDecks()
    const customRecord = customDecks.find(d => d.id === dailyDeckId)
    if (customRecord) {
      deckFilter = deckRecordToFilter(customRecord)
    } else {
      // Search inside custom decks' own sub-deck variants
      for (const record of customDecks) {
        const filter = deckRecordToFilter(record)
        const variant = filter.variants?.find(v => v.id === dailyDeckId)
        if (variant) {
          deckFilter  = { ...filter, cardCanonicalNames: variant.cardCanonicalNames }
          tags        = variant.tags       ?? filter.tags
          entityType  = variant.entityType ?? filter.entityType
          break
        }
      }
    }
  }

  // Guard: no filter resolved, or filter would match everything
  if (!deckFilter || (!deckFilter.cardCanonicalNames?.length && !tags?.length && !entityType)) return

  // Load cards matching the deck filter — custom decks carry an explicit card
  // list instead of a tag/entityType query (see read/index.tsx for the same split).
  let items
  if (deckFilter.cardCanonicalNames) {
    const resolved = await Promise.all(
      deckFilter.cardCanonicalNames.map(cn => engine.adapter.getEntityByCanonicalName(cn))
    )
    items = resolved.filter((e): e is NonNullable<typeof e> => e !== null)
  } else {
    const result = await engine.adapter.listEntities(
      { tags, entityType },
      { offset: 0, limit: 1000 }
    )
    items = result.items
  }
  if (!items.length) return

  // Resolve spread. dailySpreadId === null means "Single card (default)" (see
  // the settings picker) — a real 1-position spread, not a true free
  // reading — so it must resolve to the 'single' built-in, not to no spread
  // at all. A configured id can also name a custom spread, same as the deck
  // resolution above; an id that matches neither also falls back to 'single'
  // rather than silently degrading to a free reading.
  const customSpreads = await getAllCustomSpreads()
  const spreadCandidates = [...BUILT_IN_SPREADS, ...customSpreads.map(spreadRecordToDefinition)]
  const spread =
    spreadCandidates.find(s => s.id === dailySpreadId) ??
    spreadCandidates.find(s => s.id === 'single') ??
    null
  const isFreeReading = !spread || spread.positions.length === 0

  // Shuffle and draw cards
  const shuffled = fisherYates(items)
  const positions = spread ? [...spread.positions].sort((a, b) => a.drawOrder - b.drawOrder) : []
  const cardCount = isFreeReading ? 1 : positions.length
  const drawnEntities = shuffled.slice(0, cardCount)

  const cards = drawnEntities.map((entity, i) => ({
    id: '',
    cardCanonicalName: entity.canonicalName,
    positionId: isFreeReading ? null : (positions[i]?.id ?? null),
    drawOrder: i + 1,
    orientation: (deckFilter!.reversalEnabled && Math.random() < 0.5 ? 'reversed' : 'upright') as 'upright' | 'reversed',
  }))

  // Capture astro snapshot
  let astroSnapshot = null
  try {
    astroSnapshot = getNatalChart(new Date(), loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode)
  } catch (e) {
    console.error('Daily reading astro snapshot failed:', e)
  }

  await saveReading(
    {
      // Midday UTC on the zone-local calendar day computed above, rather than
      // the real creation instant (nowIso()) — keeps the date prefix that
      // getTodaysDailyReading()'s LIKE match relies on aligned with "today"
      // in the user's zone even when that's a different UTC calendar day.
      readingDate: `${today}T12:00:00.000Z`,
      deckId: dailyDeckId,
      spreadId: spread?.id ?? null,
      isFreeReading,
      cards,
      subject: 'self',
      notes: '',
      tags: [],
      traditionSnapshot: [],
      astroSnapshot: null,
    },
    { isDaily: true, astroSnapshot }
  )
}
