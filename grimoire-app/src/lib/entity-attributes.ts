/**
 * entity-attributes.ts
 * Shared canonical-name detection, label formatting, and extendedData resolution
 * used by both the generic Reference entity page and the Study/quiz engine, so the
 * two never disagree about what an entity's data means. Also the single source of
 * truth for which entity types have a real (non-generic) art renderer.
 */

import type { StorageAdapter, BaseEntity } from '@grimoire/core'
import { resolveDisplayName } from './tradition-store'
import { artGroupForEntityType } from './art-store'
import { formatTag } from './format'

// ─── Canonical name helpers ───────────────────────────────────────────────────

/** Returns true if a string looks like a canonical name (≥3 dot-separated lowercase segments). */
export function looksLikeCanonicalName(s: string): boolean {
  return /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*){2,}$/.test(s)
}

/** Recursively extract all string leaves from a value (handles arrays and nested objects). */
export function flattenToStrings(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(flattenToStrings)
  if (typeof v === 'object' && v !== null) return Object.values(v as Record<string, unknown>).flatMap(flattenToStrings)
  return []
}

// ─── Label formatting ──────────────────────────────────────────────────────────

/** "cardNumber" / "cardNumberCN" → "Card Number" */
export function formatFieldLabel(key: string): string {
  return key.replace(/CN$/, '').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

/** "gd-tarot-letter" → "Gd Tarot Letter" */
export function formatLinkLabel(label: string): string {
  return label
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── extendedData entry selection ──────────────────────────────────────────────

/** Keys that are layout/visual-position or internal-wiring only, never meaningful
 * content on any entity type. `entityTypeGroup` marks a system.overview entity as
 * the top-level overview for a Study namespace group (see quiz-engine.ts's
 * discoverGroupOverviews) — purely a linkage field, never user-facing content. */
const NON_CONTENT_KEYS = new Set(['treeX', 'treeY', 'hue', 'entityTypeGroup'])

/**
 * Returns the non-empty, content-bearing [key, value] pairs of an entity's
 * extendedData, applying the same "*CN sibling override" substitution used by the
 * Reference page: if a `${key}CN` sibling exists, its canonical-name value is used
 * in place of the plain display value so downstream resolution can link it.
 */
export function getAttributeEntries(data: Record<string, unknown>): [string, unknown][] {
  return Object.entries(data)
    .filter(([k, v]) =>
      !NON_CONTENT_KEYS.has(k) &&
      !(k.endsWith('CN') && k.slice(0, -2) in data) &&
      v !== null && v !== undefined && v !== '',
    )
    .map(([k, v]): [string, unknown] => {
      const cnVal = data[k + 'CN']
      return [k, typeof cnVal === 'string' && cnVal ? cnVal : v]
    })
}

// ─── Value resolution ──────────────────────────────────────────────────────────

export interface ResolvedAttribute {
  display: string
  /** Present when the value resolved to a real entity — safe to render as a link. */
  linkTarget?: string
}

/**
 * The single place that turns a raw extendedData value into display text (and,
 * where applicable, a link target). Arrays take their first element, matching
 * existing quiz-answer behavior. If a string looks like a canonical name but
 * doesn't resolve to a real entity, it falls back to the raw string rather than
 * silently disappearing — better a visible label-formatting artifact than a
 * missing answer.
 */
export async function resolveAttributeValue(
  rawValue: unknown,
  adapter: StorageAdapter,
  primaryBySystem: Record<string, string>,
): Promise<ResolvedAttribute | null> {
  const value = Array.isArray(rawValue) ? (rawValue.length > 0 ? rawValue[0] : null) : rawValue
  if (value == null || value === '') return null

  if (typeof value === 'string') {
    if (looksLikeCanonicalName(value)) {
      const target = await adapter.getEntityByCanonicalName(value)
      if (target) {
        return { display: resolveDisplayName(target, primaryBySystem), linkTarget: target.canonicalName }
      }
    }
    return { display: value }
  }
  if (typeof value === 'boolean') return { display: value ? 'Yes' : 'No' }
  return { display: String(value) }
}

// ─── Visual representation ─────────────────────────────────────────────────────

/**
 * Entity types with a dedicated (non-generic) symbolic renderer in EntityArt.tsx,
 * keyed directly off that component's actual dispatch (the standalone `entityType
 * ===` checks at the top of EntityArt, not routed through an ArtGroup).
 */
const EXPLICIT_SYMBOLIC_TYPES = new Set([
  'iching.hexagram',
  'astrology.zodiac-sign',
  'astrology.planet',
  'astrology.node',
  'astrology.element',
  'letter.hebrew',
  'colour.colour',
])

/**
 * Returns true if this entity has a real (non-generic-placeholder) visual
 * renderer in EntityArt — the single source of truth for "does this have
 * distinct visual appearance," replacing what used to be a separately
 * hand-maintained set in quiz-engine.ts that had already drifted out of sync.
 *
 * `canonicalName` is optional and only matters for entity types whose art
 * group depends on more than the type alone (tarot.card spans Tarot proper,
 * Lenormand, and Playing Cards, each a distinct group with its own art) — pass
 * it whenever checking a specific entity's own capability. Omitting it checks
 * only whether the *type in general* has an art group, which is what callers
 * deciding "is this type worth offering as a quiz category at all" want.
 */
export function hasSymbolicArt(entityType: string, canonicalName?: string): boolean {
  if (EXPLICIT_SYMBOLIC_TYPES.has(entityType)) return true
  return artGroupForEntityType(entityType, canonicalName) !== null
}

// ─── Top-level tradition overviews ─────────────────────────────────────────────

export interface GroupOverview {
  canonicalName: string
  label: string
}

/**
 * Maps each Study namespace group key (e.g. "qabalah", "iching") to the
 * system.overview entity that represents it, via that entity's own
 * extendedData.entityTypeGroup field — a data-driven declaration rather than
 * string-matching group keys against canonical-name slugs (which don't always
 * agree, e.g. group "iching" vs. plural overview slugs like "chakras"). Groups
 * with no tagged overview simply have no entry — callers fall back to an
 * auto-formatted label. Shared by Study's entity-type picker and the Reference
 * page's top-level browse list.
 */
export async function discoverGroupOverviews(adapter: StorageAdapter): Promise<Map<string, GroupOverview>> {
  const result = await adapter.listEntities({ entityType: 'system.overview' }, { offset: 0, limit: 500 })
  const map = new Map<string, GroupOverview>()
  for (const e of result.items) {
    const key = e.extendedData.entityTypeGroup
    if (typeof key === 'string' && key) {
      map.set(key, { canonicalName: e.canonicalName, label: e.primaryDisplayName })
    }
  }
  return map
}

/**
 * The top-level overview entities that should appear on Reference's main browse
 * page: every entityTypeGroup-tagged overview, minus any that another overview
 * entity claims ownership of via its `members` array (a strict ownership field —
 * e.g. Letters lists Runes and Ogham as members even though both are also
 * independently entityTypeGroup-tagged, since Study still needs a link target
 * for their namespace groups). Excluded entities stay reachable one click into
 * their owning parent's Members grid. Sorted alphabetically by label.
 */
export async function computeReferenceTopLevelOverviews(adapter: StorageAdapter): Promise<GroupOverview[]> {
  const [groupOverviews, allOverviews] = await Promise.all([
    discoverGroupOverviews(adapter),
    adapter.listEntities({ entityType: 'system.overview' }, { offset: 0, limit: 500 }),
  ])

  const claimedAsMember = new Set<string>()
  for (const e of allOverviews.items) {
    const members = e.extendedData.members
    if (Array.isArray(members)) {
      for (const m of members) {
        if (typeof m === 'string') claimedAsMember.add(m)
      }
    }
  }

  return [...groupOverviews.values()]
    .filter(g => !claimedAsMember.has(g.canonicalName))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * The tradition an entity belongs to, for display alongside quiz questions —
 * e.g. distinguishing The Tower (Tarot) from The Tower (Lenormand), or Mercury
 * (Astrology) from Mercury (Alchemy). Looked up by the entity's *canonical name*
 * prefix rather than its entityType: most entities agree (astrology.planet.mercury
 * is both entityType "astrology.planet" and canonical-name prefix "astrology"),
 * but a few intentionally reuse another tradition's entityType — Lenormand and
 * Playing Card entities are entityType "tarot.card"/"tarot.deck" but canonical-name
 * prefix "lenormand"/"playing", so entityType-based grouping would mislabel them
 * as Tarot. Falls back to a title-cased version of the prefix itself if no
 * overview entity claims that key (matches the entityTypeGroup fallback used
 * elsewhere for consistency).
 */
export function traditionLabelForEntity(entity: BaseEntity, groupOverviews: Map<string, GroupOverview>): string {
  const prefix = entity.canonicalName.split('.')[0]
  return groupOverviews.get(prefix)?.label ?? formatTag(prefix)
}
