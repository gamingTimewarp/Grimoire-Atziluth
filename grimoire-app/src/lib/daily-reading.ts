/**
 * daily-reading.ts
 * Logic for automatically creating the daily reading on app startup.
 */

import type { GrimoireEngine } from '@grimoire/core'
import { nowIso } from '@grimoire/core'
import { getTodaysDailyReading, saveReading } from '@/lib/reading-db'
import { loadSettings } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { getNatalChart } from '@/lib/astro-engine'
import { getHomeLocation } from '@/lib/settings-store'
import { BUILT_IN_DECK_FILTERS, BUILT_IN_SPREADS } from '@/lib/built-in-data'

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function createDailyReadingIfAbsent(engine: GrimoireEngine): Promise<void> {
  // Check if today's daily reading already exists
  const existing = await getTodaysDailyReading()
  if (existing) return

  const { dailyDeckId, dailySpreadId } = loadSettings()
  const { astrologyMode, houseSystem } = loadTraditionSettings()

  // Resolve deck filter — dailyDeckId may be a variant id (e.g. 'rws-full') or
  // a top-level id (e.g. 'runes-elder-futhark'). Try variants first.
  let deckFilter = BUILT_IN_DECK_FILTERS.find(d => d.id === dailyDeckId)
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

  // Guard: no filter resolved, or filter would match everything
  if (!deckFilter || (!tags?.length && !entityType)) return

  // Load cards matching the deck filter
  const result = await engine.adapter.listEntities(
    { tags, entityType },
    { offset: 0, limit: 1000 }
  )
  if (!result.items.length) return

  // Resolve spread
  const spread = dailySpreadId ? BUILT_IN_SPREADS.find(s => s.id === dailySpreadId) ?? null : null
  const isFreeReading = !spread || spread.positions.length === 0

  // Shuffle and draw cards
  const shuffled = fisherYates(result.items)
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
    const loc = getHomeLocation()
    astroSnapshot = getNatalChart(new Date(), loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode)
  } catch (e) {
    console.error('Daily reading astro snapshot failed:', e)
  }

  await saveReading(
    {
      readingDate: nowIso(),
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
