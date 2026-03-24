/**
 * storage.types.ts
 * The StorageAdapter interface — the single persistence boundary in Grimoire Core.
 *
 * All engine logic talks to this interface. Concrete implementations:
 *   - SqliteAdapter   (better-sqlite3; used in production / Tauri)
 *   - InMemoryAdapter (Maps; used in unit tests)
 *
 * All methods are async to keep the engine code platform-agnostic.
 * The SQLite adapter wraps synchronous better-sqlite3 calls in Promise.resolve()
 * at negligible overhead. A future WASM or IPC-based adapter can be truly async.
 */

import type {
  BaseEntity,
  CanonicalName,
  CreateEntityInput,
  CustomAttribute,
  EntitySearchResult,
  SecondaryName,
  UpdateEntityInput,
} from './entity.types.js'
import type { CreateLinkInput, Link, LinkQuery, UpdateLinkInput } from './link.types.js'
import type {
  AttributionField,
  CreateTraditionInput,
  Tradition,
  UpdateTraditionInput,
} from './tradition.types.js'

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Page {
  limit: number
  offset: number
}

export interface PagedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ─── Storage Adapter ──────────────────────────────────────────────────────────

export interface StorageAdapter {
  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Create tables / apply migrations. Idempotent; safe to call on every startup. */
  initialize(): Promise<void>

  /** Flush pending work and close connections. No-op for InMemoryAdapter. */
  close(): Promise<void>

  // ── Entities ───────────────────────────────────────────────────────────

  createEntity(input: CreateEntityInput): Promise<BaseEntity>
  getEntityById(id: string): Promise<BaseEntity | null>
  getEntityByCanonicalName(canonicalName: CanonicalName): Promise<BaseEntity | null>
  updateEntity(id: string, input: UpdateEntityInput): Promise<BaseEntity>

  /**
   * Deletes an entity and cascades to its secondary names and custom attributes.
   * Does NOT delete links — caller (EntityEngine) must verify none exist first.
   */
  deleteEntity(id: string): Promise<void>

  listEntities(
    filter?: { entityType?: string; isBuiltIn?: boolean; tags?: string[] },
    page?: Page
  ): Promise<PagedResult<BaseEntity>>

  /**
   * Full-text search across canonicalName, primaryDisplayName, and all secondary names.
   * Results ordered by descending score.
   */
  searchEntities(
    query: string,
    filter?: { entityType?: string },
    page?: Page
  ): Promise<PagedResult<EntitySearchResult>>

  /** True if any link uses this canonicalName as its target — guards rename/delete */
  hasIncomingLinks(canonicalName: CanonicalName): Promise<boolean>

  // ── Secondary Names ────────────────────────────────────────────────────

  addSecondaryName(
    entityId: string,
    input: Omit<SecondaryName, 'id' | 'entityId'>
  ): Promise<SecondaryName>

  updateSecondaryName(
    nameId: string,
    input: Partial<Pick<SecondaryName, 'name' | 'languageTag' | 'visible' | 'sortOrder'>>
  ): Promise<SecondaryName>

  deleteSecondaryName(nameId: string): Promise<void>

  // ── Custom Attributes ──────────────────────────────────────────────────

  addCustomAttribute(
    entityId: string,
    input: Omit<CustomAttribute, 'id' | 'entityId'>
  ): Promise<CustomAttribute>

  updateCustomAttribute(
    attrId: string,
    input: Partial<Pick<CustomAttribute, 'key' | 'value' | 'label' | 'sortOrder'>>
  ): Promise<CustomAttribute>

  deleteCustomAttribute(attrId: string): Promise<void>

  // ── Links ──────────────────────────────────────────────────────────────

  createLink(input: CreateLinkInput): Promise<Link>
  getLinkById(id: string): Promise<Link | null>
  updateLink(id: string, input: UpdateLinkInput): Promise<Link>
  deleteLink(id: string): Promise<void>

  /**
   * Flexible link query supporting filtering by entity involvement, label,
   * tradition scope, and direction.
   */
  queryLinks(query: LinkQuery): Promise<PagedResult<Link>>

  // ── Traditions ─────────────────────────────────────────────────────────

  createTradition(input: CreateTraditionInput): Promise<Tradition>
  getTraditionById(id: string): Promise<Tradition | null>
  getTraditionByCanonicalName(canonicalName: CanonicalName): Promise<Tradition | null>
  updateTradition(id: string, input: UpdateTraditionInput): Promise<Tradition>
  deleteTradition(id: string): Promise<void>
  listTraditions(filter?: { isBuiltIn?: boolean }): Promise<Tradition[]>

  // ── Attribution Fields ─────────────────────────────────────────────────

  addAttributionField(
    traditionId: string,
    input: Omit<AttributionField, 'id' | 'traditionCanonicalName'>
  ): Promise<AttributionField>

  updateAttributionField(
    fieldId: string,
    input: Partial<Pick<AttributionField, 'displayName' | 'targetEntityType' | 'allowMultiple' | 'sortOrder'>>
  ): Promise<AttributionField>

  deleteAttributionField(fieldId: string): Promise<void>

  // ── Tags ───────────────────────────────────────────────────────────────

  /** All distinct tags currently in use across all entities — for autocomplete */
  listAllTags(): Promise<string[]>

  // ── Transactions ───────────────────────────────────────────────────────

  /**
   * Run a set of adapter operations atomically.
   * The function receives the same adapter instance; the adapter wraps it in a
   * database transaction (SQLite) or equivalent (in-memory: single-threaded, always consistent).
   *
   * The adapter MUST NOT commit until fn resolves, and MUST rollback on rejection.
   */
  transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T>
}
