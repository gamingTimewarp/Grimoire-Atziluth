/**
 * reading-stats.ts
 * Pure aggregation helpers for the reading statistics page.
 * No I/O — all functions take already-loaded data and return derived values.
 */

import type { Reading, BaseEntity } from '@grimoire/core'

// ─── Filter types ────────────────────────────────────────────────────────────

export type TimeRangePreset = '7d' | '30d' | '90d' | '365d' | 'all'
export type SeasonFilter = 'all' | 'spring' | 'summer' | 'autumn' | 'winter'

export interface StatsFilter {
  preset: TimeRangePreset
  season: SeasonFilter
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface CardFreqEntry {
  /** Stable key: canonical name (ungrouped) or archetype key like 'major:0' (grouped) */
  key: string
  displayName: string
  /** All canonical names collapsed into this key when grouping is on */
  canonicalNames: string[]
  count: number
  upright: number
  reversed: number
  element?: string       // e.g. 'Fire', 'Water'
  astrological?: string  // e.g. 'Mercury', 'Aries'
  arcana?: 'major' | 'minor'
  cardNumber?: number
  suit?: string          // normalised suit slug, e.g. 'wands'
}

export interface PeriodCount {
  label: string
  count: number
}

export interface OrientationTotal {
  upright: number
  reversed: number
  none: number
}

export type PeriodGranularity = 'day' | 'week' | 'month'

// ─── Season helpers ──────────────────────────────────────────────────────────

function monthToSeason(month: number): Exclude<SeasonFilter, 'all'> {
  // month: 0-indexed JS Date month
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

// ─── Filter readings ─────────────────────────────────────────────────────────

export function filterReadings(readings: Reading[], filter: StatsFilter): Reading[] {
  const now = Date.now()
  let cutoffMs: number | null = null

  if (filter.preset !== 'all') {
    const days =
      filter.preset === '7d'   ?   7 :
      filter.preset === '30d'  ?  30 :
      filter.preset === '90d'  ?  90 : 365
    cutoffMs = now - days * 86_400_000
  }

  return readings.filter(r => {
    const d = new Date(r.readingDate)
    if (cutoffMs !== null && d.getTime() < cutoffMs) return false
    if (filter.season !== 'all' && monthToSeason(d.getMonth()) !== filter.season) return false
    return true
  })
}

// ─── Equivalent-card key helpers ─────────────────────────────────────────────

const SUIT_ELEMENT: Record<string, string> = {
  wands:     'Fire',
  cups:      'Water',
  swords:    'Air',
  pentacles: 'Earth',
  discs:     'Earth',
  coins:     'Earth',
}

function inferElement(entity: BaseEntity | undefined, suitSlug: string | undefined): string | undefined {
  // 1. Check explicit extendedData.element (Thoth, etc.)
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.element
  if (typeof raw === 'string' && raw) {
    const slug = raw.split('.').slice(-1)[0] ?? raw
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }
  // 2. Infer from suit
  if (suitSlug) return SUIT_ELEMENT[suitSlug.toLowerCase()]
  return undefined
}

function inferAstrological(entity: BaseEntity | undefined): string | undefined {
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.astrological
  if (typeof raw !== 'string' || !raw) return undefined
  const slug = raw.split('.').slice(-1)[0] ?? raw
  return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function extractSuitSlug(entity: BaseEntity | undefined): string | undefined {
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.suit
  if (typeof raw === 'string' && raw) return raw.split('.').slice(-1)[0]
  return undefined
}

function getGroupKey(canonicalName: string, entity: BaseEntity | undefined): string {
  if (!entity) return canonicalName
  const ext = entity.extendedData as Record<string, unknown> | undefined
  const arcana = ext?.arcana
  const cardNumber = ext?.cardNumber

  if (arcana === 'major' && typeof cardNumber === 'number') {
    return `major:${cardNumber}`
  }
  if (arcana === 'minor') {
    const suit = extractSuitSlug(entity) ?? ''
    const rank = typeof ext?.rank === 'string' ? ext.rank.toLowerCase() : ''
    if (suit && rank) return `minor:${suit}:${rank}`
  }
  return canonicalName
}

// ─── Card frequency ───────────────────────────────────────────────────────────

export function computeCardFrequency(
  readings: Reading[],
  entityMap: Map<string, BaseEntity>,
  groupEquivalent: boolean,
): CardFreqEntry[] {
  const map = new Map<string, CardFreqEntry>()

  for (const reading of readings) {
    for (const card of reading.cards) {
      const entity = entityMap.get(card.cardCanonicalName)
      const key = groupEquivalent
        ? getGroupKey(card.cardCanonicalName, entity)
        : card.cardCanonicalName

      if (!map.has(key)) {
        const ext = entity?.extendedData as Record<string, unknown> | undefined
        const suitSlug = extractSuitSlug(entity)
        map.set(key, {
          key,
          displayName: entity?.primaryDisplayName ?? card.cardCanonicalName,
          canonicalNames: [],
          count: 0,
          upright: 0,
          reversed: 0,
          element: inferElement(entity, suitSlug),
          astrological: inferAstrological(entity),
          arcana: (ext?.arcana as 'major' | 'minor' | undefined),
          cardNumber: typeof ext?.cardNumber === 'number' ? ext.cardNumber : undefined,
          suit: suitSlug,
        })
      }

      const entry = map.get(key)!
      entry.count++
      if (card.orientation === 'upright')  entry.upright++
      if (card.orientation === 'reversed') entry.reversed++
      if (!entry.canonicalNames.includes(card.cardCanonicalName)) {
        entry.canonicalNames.push(card.cardCanonicalName)
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

// ─── Arcana counts ────────────────────────────────────────────────────────────

export interface ArcanaCounts {
  major: number
  minor: number
  other: number  // non-tarot cards (runes, geomancy, etc.)
}

/**
 * Counts drawn cards by arcana using the pre-computed frequency list so we
 * don't need to re-iterate all readings.
 */
export function computeArcanaCounts(freq: CardFreqEntry[]): ArcanaCounts {
  let major = 0, minor = 0, other = 0
  for (const e of freq) {
    if (e.arcana === 'major') major += e.count
    else if (e.arcana === 'minor') minor += e.count
    else other += e.count
  }
  return { major, minor, other }
}

// ─── Orientation totals ───────────────────────────────────────────────────────

export function computeOrientationTotals(readings: Reading[]): OrientationTotal {
  let upright = 0, reversed = 0, none = 0
  for (const r of readings) {
    for (const c of r.cards) {
      if (c.orientation === 'upright')  upright++
      else if (c.orientation === 'reversed') reversed++
      else none++
    }
  }
  return { upright, reversed, none }
}

// ─── Period counts ────────────────────────────────────────────────────────────

export function choosePeriodGranularity(preset: TimeRangePreset): PeriodGranularity {
  if (preset === '7d' || preset === '30d') return 'day'
  if (preset === '90d') return 'week'
  return 'month'
}

function isoDate(d: Date)  { return d.toISOString().slice(0, 10) }
function isoMonth(d: Date) { return d.toISOString().slice(0, 7) }

function isoWeek(d: Date): string {
  const tmp = new Date(d)
  tmp.setHours(0, 0, 0, 0)
  // Shift to Thursday to determine ISO week year
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7))
  const yearStart = new Date(tmp.getFullYear(), 0, 1)
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function bucketKey(d: Date, gran: PeriodGranularity): string {
  if (gran === 'day')   return isoDate(d)
  if (gran === 'week')  return isoWeek(d)
  return isoMonth(d)
}

function formatLabel(key: string, gran: PeriodGranularity): string {
  if (gran === 'day') {
    const d = new Date(key + 'T12:00:00')
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  }
  if (gran === 'week') {
    return key.slice(5) // 'W04'
  }
  // 'YYYY-MM'
  const [yr, mo] = key.split('-')
  const d = new Date(Number(yr), Number(mo) - 1, 1)
  return d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
}

export function computePeriodCounts(
  readings: Reading[],
  filter: StatsFilter,
): PeriodCount[] {
  const gran = choosePeriodGranularity(filter.preset)
  const buckets = new Map<string, number>()

  // Pre-fill empty buckets for fixed ranges (so gaps show as 0)
  if (filter.preset !== 'all' && filter.season === 'all') {
    const days =
      filter.preset === '7d'   ?   7 :
      filter.preset === '30d'  ?  30 :
      filter.preset === '90d'  ?  90 : 365
    const now = new Date()
    const start = new Date(now.getTime() - days * 86_400_000)
    const cursor = new Date(start)

    while (cursor <= now) {
      buckets.set(bucketKey(cursor, gran), 0)
      if (gran === 'day')   cursor.setDate(cursor.getDate() + 1)
      else if (gran === 'week') cursor.setDate(cursor.getDate() + 7)
      else cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  // Count readings into buckets
  for (const r of readings) {
    const key = bucketKey(new Date(r.readingDate), gran)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ label: formatLabel(key, gran), count }))
}
