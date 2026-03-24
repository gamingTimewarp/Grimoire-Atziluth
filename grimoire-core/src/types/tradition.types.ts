/**
 * tradition.types.ts
 * Tradition and attribution schema types.
 *
 * A Tradition is a named attribution schema — it declares which link labels it
 * "owns" and how they should be presented. Multiple traditions can be active
 * simultaneously; the UI displays their attributions side-by-side.
 *
 * Attribution data lives entirely in the link table (as links with traditionScope).
 * The Tradition record is purely a schema/metadata object.
 */

import type { CanonicalName, LinkLabel } from './entity.types.js'

// ─── Attribution Field ────────────────────────────────────────────────────────

/**
 * A single attribution slot that a tradition defines.
 * Example: GD's "Attributed Planet" field, which owns the "attributed-planet" link label.
 *
 * When the UI displays a tradition's attribution panel for an entity, it iterates
 * these fields in sortOrder and looks up links with matching label + traditionScope.
 */
export interface AttributionField {
  /** UUID */
  id: string
  traditionCanonicalName: CanonicalName
  /** The link label this field corresponds to in the graph */
  linkLabel: LinkLabel
  /** Human-readable label shown in the UI (e.g. "Attributed Planet") */
  displayName: string
  /** Expected entity type for the target of this attribution (for UI filtering/display hints) */
  targetEntityType?: string
  /** Whether multiple links with this label are valid for a single entity in this tradition */
  allowMultiple: boolean
  sortOrder: number
}

// ─── Tradition ────────────────────────────────────────────────────────────────

export interface Tradition {
  /** UUID */
  id: string
  /** Namespaced slug, e.g. "tradition.golden-dawn" */
  canonicalName: CanonicalName
  /** Human-readable name shown in the UI */
  displayName: string
  description?: string
  /**
   * The set of link labels this tradition claims authority over.
   * This is the union of all field.linkLabel values in attributionFields,
   * kept denormalised for fast querying.
   */
  ownedLinkLabels: LinkLabel[]
  /** Ordered list of fields the tradition exposes in its attribution panel */
  attributionFields: AttributionField[]
  /** True = ships with the app; field definitions are immutable unless forked */
  isBuiltIn: boolean
  /** canonicalName of the tradition this was forked from, if applicable */
  forkedFromCanonicalName?: CanonicalName
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export type CreateTraditionInput = Omit<
  Tradition,
  'id' | 'createdAt' | 'updatedAt' | 'attributionFields' | 'ownedLinkLabels'
> & {
  attributionFields?: Omit<AttributionField, 'id' | 'traditionCanonicalName'>[]
}

export type UpdateTraditionInput = Partial<
  Omit<Tradition, 'id' | 'canonicalName' | 'createdAt' | 'updatedAt' | 'isBuiltIn' | 'attributionFields' | 'ownedLinkLabels'>
>

// ─── Attribution Query Results ────────────────────────────────────────────────

/**
 * A single resolved attribution value:
 * one link asserted by a tradition for a particular field on a particular entity.
 */
export interface AttributionValue {
  linkId: string
  linkLabel: LinkLabel
  targetCanonicalName: CanonicalName
  targetPrimaryDisplayName: string
  targetEntityType: string
  note?: string
}

/**
 * All attributions for a single tradition, for a single entity.
 * Keyed by linkLabel for fast lookup.
 */
export interface TraditionAttributionResult {
  tradition: Pick<Tradition, 'canonicalName' | 'displayName' | 'id'>
  entityCanonicalName: CanonicalName
  /**
   * Map of linkLabel → array of attributed values.
   * Array length > 1 only when AttributionField.allowMultiple = true.
   */
  fields: Record<LinkLabel, AttributionValue[]>
}

/**
 * The aggregate result from TraditionEngine.getAttributionsForEntity()
 * across multiple simultaneously active traditions.
 */
export interface AttributionResult {
  entityCanonicalName: CanonicalName
  /** One entry per requested tradition that has any attributions for the entity */
  byTradition: TraditionAttributionResult[]
}
