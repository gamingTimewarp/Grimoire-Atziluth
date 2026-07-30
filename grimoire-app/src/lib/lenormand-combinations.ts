/**
 * lenormand-combinations.ts
 * Loads the Lenormand combination guide from the bundled grimoire-data virtual module.
 * Each entry pairs two card numbers (1–36) with a combined meaning.
 */
import rawData from 'virtual:grimoire-data'

export interface LenormandCombination {
  a: number
  b: number
  meaning: string
}

const file = (rawData as Record<string, unknown>)['lenormand-combinations.json'] as
  | { combinations: LenormandCombination[] }
  | undefined

export const LENORMAND_COMBINATIONS: LenormandCombination[] = file?.combinations ?? []

/** Card number (1–36) → display name. Index 0 unused; index 1 = Rider, etc. */
export const LENORMAND_CARD_NAMES: string[] = [
  '',          // 0 — unused
  'Rider',     // 1
  'Clover',    // 2
  'Ship',      // 3
  'House',     // 4
  'Tree',      // 5
  'Clouds',    // 6
  'Snake',     // 7
  'Coffin',    // 8
  'Bouquet',   // 9
  'Scythe',    // 10
  'Whip',      // 11
  'Birds',     // 12
  'Child',     // 13
  'Fox',       // 14
  'Bear',      // 15
  'Stars',     // 16
  'Stork',     // 17
  'Dog',       // 18
  'Tower',     // 19
  'Garden',    // 20
  'Mountain',  // 21
  'Crossroads',// 22
  'Mice',      // 23
  'Heart',     // 24
  'Ring',      // 25
  'Book',      // 26
  'Letter',    // 27
  'Man',       // 28
  'Woman',     // 29
  'Lily',      // 30
  'Sun',       // 31
  'Moon',      // 32
  'Key',       // 33
  'Fish',      // 34
  'Anchor',    // 35
  'Cross',     // 36
]

/** Card number (1–36) → canonical name, e.g. 7 → "lenormand.card.the-snake". */
export function lenormandCardCanonicalName(cardNum: number): string {
  return `lenormand.card.the-${LENORMAND_CARD_NAMES[cardNum]?.toLowerCase()}`
}

/**
 * Look up the combination meaning for two card numbers.
 * The combination file always stores a < b, so we normalise before lookup.
 */
export function getLenormandCombination(
  cardNumA: number,
  cardNumB: number,
  combos: LenormandCombination[] = LENORMAND_COMBINATIONS,
): string | null {
  const lo = Math.min(cardNumA, cardNumB)
  const hi = Math.max(cardNumA, cardNumB)
  return combos.find(c => c.a === lo && c.b === hi)?.meaning ?? null
}
