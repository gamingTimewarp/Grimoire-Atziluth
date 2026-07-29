/**
 * reading-stats.ts
 * Pure aggregation helpers for the reading statistics page.
 * No I/O — all functions take already-loaded data and return derived values.
 */

import type { Reading, BaseEntity, CalendarSystem } from '@grimoire/core'
import type { DeckFilter } from './built-in-data'
import { getPlanetPositions, getSignsForMode } from './astro-engine'
import type { AstrologyMode, PlanetPosition } from './astro-engine'
import { getMoonPhase } from './astro-calc'
import type { MoonPhaseName } from './astro-calc'

// ─── Filter types ────────────────────────────────────────────────────────────

export type TimeRangePreset = '7d' | '30d' | '90d' | '365d' | 'all'
export type SeasonFilter = 'all' | 'spring' | 'summer' | 'autumn' | 'winter'
/** 'any' matches a reading where at least one tracked planet was retrograde;
 * a canonicalName (e.g. 'astrology.planet.mercury') matches that planet specifically. */
export type RetrogradeFilter = 'all' | 'any' | string

export interface StatsFilter {
  preset: TimeRangePreset
  season: SeasonFilter
  deckIds?: string[]
  spreadIds?: string[]
  suits?: string[]
  reversalCapable?: 'all' | 'yes' | 'no'
  moonPhases?: MoonPhaseName[]
  retrograde?: RetrogradeFilter
  signMatchOnly?: boolean
}

/** Data every filter/aggregate function needs beyond the readings themselves —
 * bundled so filterReadings/computeSignMatches don't grow an ever-longer
 * positional parameter list as new astro/deck-aware filters are added. */
export interface FilterContext {
  entityMap: Map<string, BaseEntity>
  deckFilters: Map<string, DeckFilter>
  astrologyMode: AstrologyMode
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
  astrological?: AstroCorrespondence
  arcana?: 'major' | 'minor'
  cardNumber?: number
  suit?: string          // normalised suit slug, e.g. 'wands'
}

/** A card's astrological correspondence, disambiguated by canonical-name prefix
 * so callers can tell "this is a zodiac sign" from "this is a planet" instead of
 * just getting an opaque display string — needed for sign-correspondence matching. */
export interface AstroCorrespondence {
  display: string        // e.g. 'Mercury', 'Aries'
  kind: 'sign' | 'planet' | 'other'
  canonicalName: string  // e.g. 'astrology.planet.mercury'
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

/**
 * A saved reading's deckId can be either a deck's own id or one of its
 * *variant* ids (e.g. 'rws-full') — see read/index.tsx's handleVariantClick,
 * which builds a synthetic DeckFilter keyed by the variant's id when the user
 * picks a specific variant rather than the deck as a whole. deckFilters (built
 * from BUILT_IN_DECK_FILTERS + custom decks) only indexes the parent ids, so
 * resolve a variant id down to its owning deck before any deck-based lookup —
 * otherwise deck/reversibility filtering silently never matches readings
 * drawn from a variant, which is most of them for decks that have variants.
 */
export function resolveDeckId(deckId: string, deckFilters: Map<string, DeckFilter>): string {
  if (deckFilters.has(deckId)) return deckId
  for (const deck of deckFilters.values()) {
    if (deck.variants?.some(v => v.id === deckId)) return deck.id
  }
  return deckId
}

export function filterReadings(readings: Reading[], filter: StatsFilter, ctx: FilterContext): Reading[] {
  const now = Date.now()
  let cutoffMs: number | null = null

  if (filter.preset !== 'all') {
    const days =
      filter.preset === '7d'   ?   7 :
      filter.preset === '30d'  ?  30 :
      filter.preset === '90d'  ?  90 : 365
    cutoffMs = now - days * 86_400_000
  }

  // Precomputed once, only when actually needed — it's the most expensive
  // predicate (walks every card of every reading, computing planet positions
  // per unique date).
  const signMatchReadingIds = filter.signMatchOnly
    ? new Set(computeSignMatches(readings, ctx.entityMap, ctx.astrologyMode).map(m => m.readingId))
    : null

  return readings.filter(r => {
    const d = new Date(r.readingDate)
    if (cutoffMs !== null && d.getTime() < cutoffMs) return false
    if (filter.season !== 'all' && monthToSeason(d.getMonth()) !== filter.season) return false

    const resolvedDeckId = resolveDeckId(r.deckId, ctx.deckFilters)
    if (filter.deckIds && filter.deckIds.length > 0 && !filter.deckIds.includes(resolvedDeckId)) return false
    if (filter.spreadIds && filter.spreadIds.length > 0 && (!r.spreadId || !filter.spreadIds.includes(r.spreadId))) return false

    if (filter.reversalCapable && filter.reversalCapable !== 'all') {
      const reversalEnabled = ctx.deckFilters.get(resolvedDeckId)?.reversalEnabled
      if (filter.reversalCapable === 'yes' && reversalEnabled !== true) return false
      if (filter.reversalCapable === 'no'  && reversalEnabled !== false) return false
    }

    if (filter.suits && filter.suits.length > 0) {
      const hasSuit = r.cards.some(c => {
        const suit = suitGroupFor(ctx.entityMap.get(c.cardCanonicalName))
        return suit && filter.suits!.includes(suit)
      })
      if (!hasSuit) return false
    }

    if (filter.moonPhases && filter.moonPhases.length > 0) {
      if (!filter.moonPhases.includes(getMoonPhase(d).name)) return false
    }

    if (filter.retrograde && filter.retrograde !== 'all') {
      const realPlanets = getPlanetPositions(d, ctx.astrologyMode).filter(p => p.planet.body !== null)
      const isRetro = filter.retrograde === 'any'
        ? realPlanets.some(p => p.retrograde)
        : realPlanets.some(p => p.planet.canonicalName === filter.retrograde && p.retrograde)
      if (!isRetro) return false
    }

    if (signMatchReadingIds && !signMatchReadingIds.has(r.id)) return false

    return true
  })
}

/**
 * suit and signMatchOnly are properties of an individual *card*, not a whole
 * reading — filterReadings only decides whether a reading is included at all
 * (a reading counts as "has Swords" if even one of its cards is a Sword), so
 * on its own it's not enough for card-level aggregates: a multi-card reading
 * that passed because it had one Swords card would otherwise still contribute
 * its Cups and Pentacles cards to Card Frequency too. This narrows each
 * already-included reading's own `cards` array down to just the cards that
 * satisfy those two filters, for computeCardFrequency/computeOrientationTotals/
 * totalCards to consume — computePeriodCounts and the "Readings" count should
 * keep using the reading-level filterReadings result unchanged, since those
 * are genuinely about how many *readings* occurred, not how many cards.
 */
export function filterCardsForAggregation(
  readings: Reading[],
  filter: StatsFilter,
  entityMap: Map<string, BaseEntity>,
  astrologyMode: AstrologyMode,
): Reading[] {
  const hasSuitFilter = !!filter.suits && filter.suits.length > 0
  if (!hasSuitFilter && !filter.signMatchOnly) return readings

  const signMatchKeys = filter.signMatchOnly
    ? new Set(computeSignMatches(readings, entityMap, astrologyMode).map(m => `${m.readingId}::${m.cardCanonicalName}`))
    : null

  return readings
    .map(r => ({
      ...r,
      cards: r.cards.filter(c => {
        if (hasSuitFilter) {
          const suit = suitGroupFor(entityMap.get(c.cardCanonicalName))
          if (!suit || !filter.suits!.includes(suit)) return false
        }
        if (signMatchKeys && !signMatchKeys.has(`${r.id}::${c.cardCanonicalName}`)) return false
        return true
      }),
    }))
    .filter(r => r.cards.length > 0)
}

// ─── Equivalent-card key helpers ─────────────────────────────────────────────

// Keyed by the normalised suit group (see suitGroupFor) — not the raw suit
// slug, which varies wildly by deck (see SUIT_ALIASES below).
const SUIT_ELEMENT: Record<string, string> = {
  wands:     'Fire',
  cups:      'Water',
  swords:    'Air',
  pentacles: 'Earth',
}

function inferElement(entity: BaseEntity | undefined, suitGroup: string | undefined): string | undefined {
  // 1. Check explicit extendedData.element (Thoth, etc.)
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.element
  if (typeof raw === 'string' && raw) {
    const slug = raw.split('.').slice(-1)[0] ?? raw
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }
  // 2. Infer from suit (already normalised — see suitGroupFor)
  if (suitGroup) return SUIT_ELEMENT[suitGroup]
  return undefined
}

function inferAstrological(entity: BaseEntity | undefined): AstroCorrespondence | undefined {
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.astrological
  if (typeof raw !== 'string' || !raw) return undefined
  const slug = raw.split('.').slice(-1)[0] ?? raw
  const display = slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const kind: AstroCorrespondence['kind'] =
    raw.startsWith('astrology.zodiac-sign.') ? 'sign' :
    raw.startsWith('astrology.planet.')      ? 'planet' : 'other'
  return { display, kind, canonicalName: raw }
}

function extractSuitSlug(entity: BaseEntity | undefined): string | undefined {
  const raw = (entity?.extendedData as Record<string, unknown> | undefined)?.suit
  if (typeof raw === 'string' && raw) return raw.split('.').slice(-1)[0]
  return undefined
}

/**
 * Whether a tarot card is Major or Minor Arcana, read off its canonicalName
 * prefix (tarot.major.* / tarot.minor.*) rather than extendedData.arcana —
 * that field turns out to only be set reliably by RWS. Thoth marks majors via
 * extendedData.suit === 'major' instead (no arcana field at all), and Etteilla
 * majors/minors have neither. The canonicalName prefix is the one thing every
 * deck agrees on (already the established pattern — see
 * quiz-engine.ts's resolveQuestionLabel, which disambiguates Major/Minor
 * Arcana Number the same way).
 */
function inferArcana(canonicalName: string): 'major' | 'minor' | undefined {
  if (canonicalName.startsWith('tarot.major.')) return 'major'
  if (canonicalName.startsWith('tarot.minor.')) return 'minor'
  return undefined
}

/**
 * Real suit slugs vary wildly by deck: RWS/Thoth use English words (Thoth's
 * Pentacles-equivalent is spelled "disks"), Tarot de Marseille uses French
 * (batons/coupes/deniers/epees), and Etteilla stores bare capitalised English
 * words ("Swords") rather than a namespaced canonical name at all — none of
 * which match each other as plain strings. This is also where "Major Arcana"
 * becomes selectable as if it were a fifth suit, since users think of "just
 * show me the Major Arcana" the same way as "just show me Wands".
 */
const SUIT_ALIASES: Record<string, string> = {
  wands: 'wands', batons: 'wands',
  cups: 'cups', coupes: 'cups',
  swords: 'swords', epees: 'swords',
  pentacles: 'pentacles', disks: 'pentacles', deniers: 'pentacles',
}

export function suitGroupFor(entity: BaseEntity | undefined): string | undefined {
  if (!entity) return undefined
  if (inferArcana(entity.canonicalName) === 'major') return 'major'
  const raw = extractSuitSlug(entity)
  return raw ? SUIT_ALIASES[raw.toLowerCase()] : undefined
}

function getGroupKey(canonicalName: string, entity: BaseEntity | undefined): string {
  if (!entity) return canonicalName
  const ext = entity.extendedData as Record<string, unknown> | undefined
  const arcana = inferArcana(canonicalName)
  const cardNumber = ext?.cardNumber

  if (arcana === 'major' && typeof cardNumber === 'number') {
    return `major:${cardNumber}`
  }
  if (arcana === 'minor') {
    const suit = suitGroupFor(entity) ?? ''
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
  /** When true, upright/reversed draws of the same card become separate rows
   * instead of one row with an upright/reversed sub-bar — lets a reversible
   * deck's stats be viewed "with reversals accounted for" vs. the default
   * "without" (orientation still tallied, but collapsed into one ranking). */
  splitByOrientation: boolean = false,
): CardFreqEntry[] {
  const map = new Map<string, CardFreqEntry>()

  for (const reading of readings) {
    for (const card of reading.cards) {
      const entity = entityMap.get(card.cardCanonicalName)
      const baseKey = groupEquivalent
        ? getGroupKey(card.cardCanonicalName, entity)
        : card.cardCanonicalName
      const key = splitByOrientation ? `${baseKey}::${card.orientation}` : baseKey

      if (!map.has(key)) {
        const ext = entity?.extendedData as Record<string, unknown> | undefined
        const suitGroup = suitGroupFor(entity)
        const baseName = entity?.primaryDisplayName ?? card.cardCanonicalName
        const orientationSuffix = splitByOrientation && card.orientation !== 'none'
          ? ` (${card.orientation === 'upright' ? 'Upright' : 'Reversed'})`
          : ''
        map.set(key, {
          key,
          displayName: baseName + orientationSuffix,
          canonicalNames: [],
          count: 0,
          upright: 0,
          reversed: 0,
          element: inferElement(entity, suitGroup),
          astrological: inferAstrological(entity),
          arcana: inferArcana(card.cardCanonicalName),
          cardNumber: typeof ext?.cardNumber === 'number' ? ext.cardNumber : undefined,
          suit: suitGroup,
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

// ─── Sign correspondence matches ───────────────────────────────────────────────

export interface SignMatchEntry {
  readingId: string
  readingDate: string
  cardCanonicalName: string
  cardDisplayName: string
  /** Display names of every tracked planet whose sign matched the card's own
   * sign correspondence on the reading's date, e.g. ['Sol', 'Mercury']. */
  matchedPlanets: string[]
}

/**
 * For every card drawn whose own astrological correspondence is a zodiac sign
 * (not a planet), checks whether any tracked planet was actually in that sign
 * on the reading's date — e.g. The Empress (→ Taurus) drawn while the Sun was
 * in Taurus. Planet positions are recomputed live from `readingDate` (not read
 * from any stored `astroSnapshot`, which doesn't record which AstrologyMode was
 * active) using the app's *current* astrology mode — see FilterContext.
 */
export function computeSignMatches(
  readings: Reading[],
  entityMap: Map<string, BaseEntity>,
  mode: AstrologyMode,
): SignMatchEntry[] {
  const matches: SignMatchEntry[] = []
  const positionsByDate = new Map<string, PlanetPosition[]>()
  const signs = getSignsForMode(mode)

  for (const reading of readings) {
    const dateKey = reading.readingDate.slice(0, 10)
    let positions = positionsByDate.get(dateKey)
    if (!positions) {
      positions = getPlanetPositions(new Date(reading.readingDate), mode).filter(p => p.planet.body !== null)
      positionsByDate.set(dateKey, positions)
    }

    for (const card of reading.cards) {
      const entity = entityMap.get(card.cardCanonicalName)
      const astro = inferAstrological(entity)
      if (!astro || astro.kind !== 'sign') continue

      const matchedPlanets = positions
        .filter(p => signs[p.signIndex]?.canonicalName === astro.canonicalName)
        .map(p => p.planet.name)

      if (matchedPlanets.length > 0) {
        matches.push({
          readingId: reading.id,
          readingDate: reading.readingDate,
          cardCanonicalName: card.cardCanonicalName,
          cardDisplayName: entity?.primaryDisplayName ?? card.cardCanonicalName,
          matchedPlanets,
        })
      }
    }
  }

  return matches
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

/**
 * Calendar-aware variant of computePeriodCounts — buckets by the given
 * calendar's own year/month instead of the Gregorian ISO helpers. Only
 * meaningful at 'month' granularity (a day is a day in every calendar; week
 * boundaries don't translate cleanly to lunisolar systems), so callers should
 * hide the calendar picker entirely when `choosePeriodGranularity` isn't
 * 'month' — this falls back to the plain Gregorian computation otherwise.
 * Unlike computePeriodCounts, empty months aren't pre-filled (would need
 * calendar.addMonths-driven iteration across the range; skipped as low-value
 * for a first pass — gaps just don't appear as explicit zero bars).
 */
export function computeCalendarPeriodCounts(
  readings: Reading[],
  filter: StatsFilter,
  calendar: CalendarSystem | null,
): PeriodCount[] {
  const gran = choosePeriodGranularity(filter.preset)
  if (!calendar || gran !== 'month') return computePeriodCounts(readings, filter)

  const buckets = new Map<string, { label: string; count: number }>()
  for (const r of readings) {
    const cd = calendar.fromGregorian(new Date(r.readingDate))
    const key = `${cd.year}-${String(cd.month).padStart(2, '0')}`
    const existing = buckets.get(key)
    if (existing) existing.count++
    else buckets.set(key, { label: `${cd.monthName} ${cd.year}`, count: 1 })
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}
