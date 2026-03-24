/**
 * entity.types.ts
 * Core entity model for the Grimoire Atziluth knowledge graph.
 * Every object in the system (cards, sephiroth, planets, letters, …) is a BaseEntity.
 */

/**
 * A namespaced slug used as the stable, human-readable unique identifier.
 * Format: "<namespace>.<type>.<slug>"
 * Examples: "tarot.major.the-fool", "qabalah.sephira.kether", "astrology.planet.mars"
 * Immutable after creation for built-in entities.
 * User entities may be renamed only when no incoming links exist.
 */
export type CanonicalName = string

/**
 * An open string type for entity classification.
 * Use the EntityType constants from src/constants/entity-types.ts for well-known types.
 * Custom/user-defined entity classes use arbitrary strings.
 */
export type EntityType = string

/**
 * An open string type for link classification.
 * Use the LinkLabel constants from src/constants/link-labels.ts for well-known labels.
 */
export type LinkLabel = string

// ─── Secondary Names ──────────────────────────────────────────────────────────

/**
 * An alternate name or romanization for an entity.
 * Multiple secondary names can be shown simultaneously; each has an individual visibility toggle.
 */
export interface SecondaryName {
  id: string
  entityId: string
  name: string
  /**
   * Language or romanization system tag.
   * Examples: "he", "grc", "la", "en", "he-akademi", "he-gd-roman", "transliteration-ipa"
   */
  languageTag: string
  /** Whether this name is currently visible in the UI */
  visible: boolean
  /** Display order relative to other secondary names on the same entity */
  sortOrder: number
}

// ─── Custom Attributes ────────────────────────────────────────────────────────

/**
 * User-defined key-value metadata attached to any entity.
 * The value is stored as JSON and can be any serialisable type.
 */
export interface CustomAttribute {
  id: string
  entityId: string
  /** Machine-friendly key (used as identifier) */
  key: string
  /** JSON-serialisable value */
  value: unknown
  /** Optional human-readable label (separate from key) */
  label?: string
  sortOrder: number
}

// ─── Base Entity ──────────────────────────────────────────────────────────────

/**
 * The universal base for every object in Grimoire Atziluth.
 * Specialised entity types (tarot cards, sephiroth, planets, …) store their
 * type-specific fields in `extendedData` rather than through subclassing,
 * keeping the model flat and the adapter simple.
 */
export interface BaseEntity {
  /** Internal UUID — used as foreign key in all relational tables */
  id: string
  /** Immutable namespaced slug — used as graph node identifier and in links */
  canonicalName: CanonicalName
  entityType: EntityType
  /** Primary display name shown in space-constrained contexts (labels, graph nodes) */
  primaryDisplayName: string
  /** Alternate names with language/romanization tags */
  secondaryNames: SecondaryName[]
  /** Reference/lore text (may be markdown) */
  description?: string
  /** User-authored personal notes (separate from description) */
  userNotes?: string
  /** User-defined key-value metadata */
  customAttributes: CustomAttribute[]
  /**
   * Type-specific structured fields.
   * Consumers that know the entityType apply their own schema on top of this.
   * Examples:
   *   TarotCard: { rank, suit, arcana, cardNumber, uprightMeaning, reversedMeaning, … }
   *   Sephira:   { number, divineNames, colorScales, … }
   *   Planet:    { symbol, rulership, … }
   */
  extendedData: Record<string, unknown>
  tags: string[]
  /** True = ships with the app; content is immutable unless forked */
  isBuiltIn: boolean
  /**
   * If this entity was cloned from a built-in, records the original's canonicalName.
   * Present only on forked entities.
   */
  forkedFromCanonicalName?: CanonicalName
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
}

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Used to create a new entity. The engine generates id, createdAt, updatedAt. */
export type CreateEntityInput = Omit<
  BaseEntity,
  'id' | 'createdAt' | 'updatedAt' | 'secondaryNames' | 'customAttributes'
> & {
  secondaryNames?: Omit<SecondaryName, 'id' | 'entityId'>[]
  customAttributes?: Omit<CustomAttribute, 'id' | 'entityId'>[]
}

/**
 * Fields that can be updated on an existing entity.
 * canonicalName changes go through EntityEngine.renameEntity() for safety checks.
 * isBuiltIn is immutable.
 */
export type UpdateEntityInput = Partial<
  Omit<BaseEntity, 'id' | 'canonicalName' | 'createdAt' | 'updatedAt' | 'isBuiltIn' | 'secondaryNames' | 'customAttributes'>
>

// ─── Search ───────────────────────────────────────────────────────────────────

export type EntityMatchField =
  | 'canonicalName'
  | 'primaryDisplayName'
  | 'secondaryName'
  | 'tag'
  | 'description'

export interface EntitySearchResult {
  entity: BaseEntity
  /** Which fields the query matched against */
  matchedOn: EntityMatchField[]
  /** Relevance score for result ranking */
  score: number
}
