/**
 * sqlite-adapter.ts
 * StorageAdapter implementation backed by better-sqlite3.
 * All better-sqlite3 calls are synchronous; we wrap them in Promise.resolve()
 * to satisfy the async StorageAdapter interface.
 */

import Database from 'better-sqlite3'
import type {
  BaseEntity,
  CanonicalName,
  CreateEntityInput,
  CustomAttribute,
  EntitySearchResult,
  SecondaryName,
  UpdateEntityInput,
} from '../../types/entity.types.js'
import type { CreateLinkInput, Link, LinkQuery, UpdateLinkInput } from '../../types/link.types.js'
import type {
  AttributionField,
  CreateTraditionInput,
  Tradition,
  UpdateTraditionInput,
} from '../../types/tradition.types.js'
import type { Page, PagedResult, StorageAdapter } from '../../types/storage.types.js'
import { newId, nowIso } from '../../utils/id.js'
import {
  CanonicalNameConflictError,
  EntityNotFoundError,
  LinkNotFoundError,
  StorageError,
  TraditionNotFoundError,
} from '../../utils/errors.js'
import { MIGRATIONS, SCHEMA_VERSION } from './schema.js'

// ─── Row types (raw DB rows before hydration) ─────────────────────────────────

interface EntityRow {
  id: string
  canonical_name: string
  entity_type: string
  primary_display_name: string
  description: string | null
  user_notes: string | null
  extended_data: string
  tags: string
  is_built_in: number
  forked_from_canonical: string | null
  created_at: string
  updated_at: string
}

interface SecondaryNameRow {
  id: string
  entity_id: string
  name: string
  language_tag: string
  visible: number
  sort_order: number
}

interface CustomAttributeRow {
  id: string
  entity_id: string
  key: string
  value: string
  label: string | null
  sort_order: number
}

interface LinkRow {
  id: string
  source_canonical_name: string
  target_canonical_name: string
  label: string
  bidirectional: number
  tradition_scope: string
  is_built_in: number
  note: string | null
  extended_data: string
  created_at: string
  updated_at: string
}

interface TraditionRow {
  id: string
  canonical_name: string
  display_name: string
  description: string | null
  owned_link_labels: string
  is_built_in: number
  forked_from_canonical: string | null
  created_at: string
  updated_at: string
}

interface AttributionFieldRow {
  id: string
  tradition_id: string
  tradition_canonical_name: string
  link_label: string
  display_name: string
  target_entity_type: string | null
  allow_multiple: number
  sort_order: number
}

interface VersionRow { version: number }
interface CountRow { count: number }

// ─── Hydration helpers ────────────────────────────────────────────────────────

function hydrateSecondaryName(row: SecondaryNameRow): SecondaryName {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    languageTag: row.language_tag,
    visible: Boolean(row.visible),
    sortOrder: row.sort_order,
  }
}

function hydrateCustomAttribute(row: CustomAttributeRow): CustomAttribute {
  return {
    id: row.id,
    entityId: row.entity_id,
    key: row.key,
    value: JSON.parse(row.value) as unknown,
    ...(row.label !== null ? { label: row.label } : {}),
    sortOrder: row.sort_order,
  }
}

function hydrateLink(row: LinkRow): Link {
  return {
    id: row.id,
    sourceCanonicalName: row.source_canonical_name,
    targetCanonicalName: row.target_canonical_name,
    label: row.label,
    bidirectional: Boolean(row.bidirectional),
    traditionScope: JSON.parse(row.tradition_scope) as string[],
    isBuiltIn: Boolean(row.is_built_in),
    ...(row.note !== null ? { note: row.note } : {}),
    extendedData: JSON.parse(row.extended_data) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function hydrateAttributionField(row: AttributionFieldRow): AttributionField {
  return {
    id: row.id,
    traditionCanonicalName: row.tradition_canonical_name,
    linkLabel: row.link_label,
    displayName: row.display_name,
    ...(row.target_entity_type !== null ? { targetEntityType: row.target_entity_type } : {}),
    allowMultiple: Boolean(row.allow_multiple),
    sortOrder: row.sort_order,
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class SqliteAdapter implements StorageAdapter {
  private db: Database.Database
  private initialized = false

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return

    const currentVersion = this.getCurrentSchemaVersion()
    const migrations = Object.entries(MIGRATIONS)
      .map(([k, sql]) => ({ version: parseInt(k, 10), sql }))
      .filter(m => m.version > currentVersion)
      .sort((a, b) => a.version - b.version)

    for (const migration of migrations) {
      try {
        // Execute all statements in the migration string
        this.db.exec(migration.sql)
        this.db
          .prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
          .run(migration.version, nowIso())
      } catch (err) {
        throw new StorageError(`Migration v${migration.version} failed`, err)
      }
    }

    this.initialized = true
  }

  async close(): Promise<void> {
    this.db.close()
  }

  private getCurrentSchemaVersion(): number {
    try {
      const row = this.db
        .prepare<[], VersionRow>('SELECT MAX(version) AS version FROM schema_version')
        .get()
      return row?.version ?? 0
    } catch {
      return 0  // table doesn't exist yet
    }
  }

  // ── Entity hydration ───────────────────────────────────────────────────

  private hydrateEntity(row: EntityRow): BaseEntity {
    const secondaryNames = this.db
      .prepare<[string], SecondaryNameRow>(
        'SELECT * FROM secondary_names WHERE entity_id = ? ORDER BY sort_order'
      )
      .all(row.id)
      .map(hydrateSecondaryName)

    const customAttributes = this.db
      .prepare<[string], CustomAttributeRow>(
        'SELECT * FROM custom_attributes WHERE entity_id = ? ORDER BY sort_order'
      )
      .all(row.id)
      .map(hydrateCustomAttribute)

    return {
      id: row.id,
      canonicalName: row.canonical_name,
      entityType: row.entity_type,
      primaryDisplayName: row.primary_display_name,
      ...(row.description !== null ? { description: row.description } : {}),
      ...(row.user_notes !== null ? { userNotes: row.user_notes } : {}),
      extendedData: JSON.parse(row.extended_data) as Record<string, unknown>,
      tags: JSON.parse(row.tags) as string[],
      isBuiltIn: Boolean(row.is_built_in),
      ...(row.forked_from_canonical !== null
        ? { forkedFromCanonicalName: row.forked_from_canonical }
        : {}),
      secondaryNames,
      customAttributes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // ── Entities ───────────────────────────────────────────────────────────

  async createEntity(input: CreateEntityInput): Promise<BaseEntity> {
    const existing = this.db
      .prepare<[string], EntityRow>('SELECT id FROM entities WHERE canonical_name = ?')
      .get(input.canonicalName)
    if (existing) throw new CanonicalNameConflictError(input.canonicalName)

    const id = newId()
    const now = nowIso()

    const insertEntity = this.db.prepare<[
      string, string, string, string,
      string | null, string | null,
      string, string, number, string | null,
      string, string
    ]>(`
      INSERT INTO entities
        (id, canonical_name, entity_type, primary_display_name,
         description, user_notes, extended_data, tags,
         is_built_in, forked_from_canonical, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertTag = this.db.prepare<[string, string]>(
      'INSERT OR IGNORE INTO entity_tags (entity_id, tag) VALUES (?, ?)'
    )

    const insertSecondaryName = this.db.prepare<[
      string, string, string, string, number, number
    ]>(`
      INSERT INTO secondary_names (id, entity_id, name, language_tag, visible, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertCustomAttribute = this.db.prepare<[
      string, string, string, string, string | null, number
    ]>(`
      INSERT INTO custom_attributes (id, entity_id, key, value, label, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const run = this.db.transaction(() => {
      insertEntity.run(
        id,
        input.canonicalName,
        input.entityType,
        input.primaryDisplayName,
        input.description ?? null,
        input.userNotes ?? null,
        JSON.stringify(input.extendedData ?? {}),
        JSON.stringify(input.tags ?? []),
        input.isBuiltIn ? 1 : 0,
        input.forkedFromCanonicalName ?? null,
        now,
        now
      )

      for (const tag of (input.tags ?? [])) {
        insertTag.run(id, tag)
      }

      for (const [i, sn] of (input.secondaryNames ?? []).entries()) {
        insertSecondaryName.run(
          newId(), id,
          sn.name, sn.languageTag,
          sn.visible ? 1 : 0,
          sn.sortOrder ?? i
        )
      }

      for (const [i, ca] of (input.customAttributes ?? []).entries()) {
        insertCustomAttribute.run(
          newId(), id,
          ca.key,
          JSON.stringify(ca.value),
          ca.label ?? null,
          ca.sortOrder ?? i
        )
      }
    })

    run()

    const row = this.db
      .prepare<[string], EntityRow>('SELECT * FROM entities WHERE id = ?')
      .get(id)!
    return this.hydrateEntity(row)
  }

  async getEntityById(id: string): Promise<BaseEntity | null> {
    const row = this.db
      .prepare<[string], EntityRow>('SELECT * FROM entities WHERE id = ?')
      .get(id)
    return row ? this.hydrateEntity(row) : null
  }

  async getEntityByCanonicalName(canonicalName: CanonicalName): Promise<BaseEntity | null> {
    const row = this.db
      .prepare<[string], EntityRow>('SELECT * FROM entities WHERE canonical_name = ?')
      .get(canonicalName)
    return row ? this.hydrateEntity(row) : null
  }

  async updateEntity(id: string, input: UpdateEntityInput): Promise<BaseEntity> {
    const existing = this.db
      .prepare<[string], EntityRow>('SELECT * FROM entities WHERE id = ?')
      .get(id)
    if (!existing) throw new EntityNotFoundError(id)

    const now = nowIso()
    const tags = input.tags ?? (JSON.parse(existing.tags) as string[])

    this.db.transaction(() => {
      this.db.prepare<[
        string, string | null, string | null,
        string, string, number | null, string, string
      ]>(`
        UPDATE entities SET
          primary_display_name  = ?,
          description           = ?,
          user_notes            = ?,
          extended_data         = ?,
          tags                  = ?,
          is_built_in           = ?,
          updated_at            = ?
        WHERE id = ?
      `).run(
        input.primaryDisplayName ?? existing.primary_display_name,
        input.description !== undefined ? (input.description ?? null) : existing.description,
        input.userNotes !== undefined ? (input.userNotes ?? null) : existing.user_notes,
        JSON.stringify(input.extendedData ?? JSON.parse(existing.extended_data)),
        JSON.stringify(tags),
        existing.is_built_in,
        now,
        id
      )

      if (input.tags) {
        this.db.prepare<[string]>('DELETE FROM entity_tags WHERE entity_id = ?').run(id)
        const insertTag = this.db.prepare<[string, string]>(
          'INSERT OR IGNORE INTO entity_tags (entity_id, tag) VALUES (?, ?)'
        )
        for (const tag of input.tags) insertTag.run(id, tag)
      }
    })()

    const updated = this.db
      .prepare<[string], EntityRow>('SELECT * FROM entities WHERE id = ?')
      .get(id)!
    return this.hydrateEntity(updated)
  }

  async deleteEntity(id: string): Promise<void> {
    const existing = this.db
      .prepare<[string], EntityRow>('SELECT id FROM entities WHERE id = ?')
      .get(id)
    if (!existing) throw new EntityNotFoundError(id)
    // Cascade via FK ON DELETE CASCADE covers secondary_names, custom_attributes, entity_tags
    this.db.prepare<[string]>('DELETE FROM entities WHERE id = ?').run(id)
  }

  async listEntities(
    filter?: { entityType?: string; isBuiltIn?: boolean; tags?: string[] },
    page?: Page
  ): Promise<PagedResult<BaseEntity>> {
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (filter?.entityType !== undefined) {
      conditions.push('e.entity_type = ?')
      params.push(filter.entityType)
    }
    if (filter?.isBuiltIn !== undefined) {
      conditions.push('e.is_built_in = ?')
      params.push(filter.isBuiltIn ? 1 : 0)
    }

    let baseQuery = 'FROM entities e'
    if (filter?.tags && filter.tags.length > 0) {
      // Must match ALL tags
      for (const tag of filter.tags) {
        baseQuery += ' JOIN entity_tags et ON et.entity_id = e.id AND et.tag = ?'
        params.push(tag)
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = this.db
      .prepare<(string | number)[], CountRow>(`SELECT COUNT(*) AS count ${baseQuery} ${where}`)
      .get(...params) ?? { count: 0 }

    const limit = page?.limit ?? 1000
    const offset = page?.offset ?? 0

    const rows = this.db
      .prepare<(string | number)[], EntityRow>(
        `SELECT e.* ${baseQuery} ${where} ORDER BY e.primary_display_name LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)

    return {
      items: rows.map(r => this.hydrateEntity(r)),
      total: countRow.count,
      limit,
      offset,
    }
  }

  async searchEntities(
    query: string,
    filter?: { entityType?: string },
    page?: Page
  ): Promise<PagedResult<EntitySearchResult>> {
    const limit = page?.limit ?? 50
    const offset = page?.offset ?? 0
    const cleaned = query.trim().replace(/['"*]/g, '')
    const ftsQuery = cleaned + '*'
    const likePattern = `%${cleaned}%`
    const typeFilter = filter?.entityType ? `AND e.entity_type = '${filter.entityType}'` : ''

    // ── FTS5 prefix search (primary) ──────────────────────────────────────
    const entityRows = this.db.prepare<[string], { id: string; rank: number }>(`
      SELECT e.id, -efts.rank AS rank
      FROM entities_fts efts
      JOIN entities e ON e.id = efts.id
      WHERE entities_fts MATCH ?
      ${typeFilter}
    `).all(ftsQuery)

    const nameRows = this.db.prepare<[string], { entity_id: string; rank: number }>(`
      SELECT snfts.entity_id, -snfts.rank AS rank
      FROM secondary_names_fts snfts
      WHERE secondary_names_fts MATCH ?
    `).all(ftsQuery)

    // Merge FTS scores (entity match weighted 2x)
    const scoreMap = new Map<string, number>()
    for (const r of entityRows) {
      scoreMap.set(r.id, (scoreMap.get(r.id) ?? 0) + r.rank * 2)
    }
    for (const r of nameRows) {
      scoreMap.set(r.entity_id, (scoreMap.get(r.entity_id) ?? 0) + r.rank)
    }

    // ── LIKE-based fuzzy fallback (lower weight = 0.5) ────────────────────
    const likeEntityRows = this.db.prepare<[string, string], { id: string }>(`
      SELECT e.id FROM entities e
      WHERE (e.primary_display_name LIKE ? OR e.canonical_name LIKE ?)
      ${typeFilter}
    `).all(likePattern, likePattern)

    const likeNameRows = this.db.prepare<[string], { entity_id: string }>(`
      SELECT sn.entity_id FROM secondary_names sn
      WHERE sn.name LIKE ?
    `).all(likePattern)

    for (const r of likeEntityRows) {
      if (!scoreMap.has(r.id)) scoreMap.set(r.id, 0.5)
    }
    for (const r of likeNameRows) {
      if (!scoreMap.has(r.entity_id)) scoreMap.set(r.entity_id, 0.3)
    }

    const sortedIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])

    const total = sortedIds.length
    const page_ids = sortedIds.slice(offset, offset + limit)

    const results: EntitySearchResult[] = []
    for (const [entityId, score] of page_ids) {
      const row = this.db
        .prepare<[string], EntityRow>('SELECT * FROM entities WHERE id = ?')
        .get(entityId)
      if (row) {
        results.push({
          entity: this.hydrateEntity(row),
          matchedOn: ['primaryDisplayName'],
          score,
        })
      }
    }

    return { items: results, total, limit, offset }
  }

  async hasIncomingLinks(canonicalName: CanonicalName): Promise<boolean> {
    const row = this.db
      .prepare<[string], CountRow>(
        'SELECT COUNT(*) AS count FROM links WHERE target_canonical_name = ?'
      )
      .get(canonicalName)
    return (row?.count ?? 0) > 0
  }

  // ── Secondary Names ────────────────────────────────────────────────────

  async addSecondaryName(
    entityId: string,
    input: Omit<SecondaryName, 'id' | 'entityId'>
  ): Promise<SecondaryName> {
    const existing = this.db
      .prepare<[string], EntityRow>('SELECT id FROM entities WHERE id = ?')
      .get(entityId)
    if (!existing) throw new EntityNotFoundError(entityId)

    const id = newId()
    this.db.prepare<[string, string, string, string, number, number]>(`
      INSERT INTO secondary_names (id, entity_id, name, language_tag, visible, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, entityId, input.name, input.languageTag, input.visible ? 1 : 0, input.sortOrder)

    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), entityId)

    return { id, entityId, ...input }
  }

  async updateSecondaryName(
    nameId: string,
    input: Partial<Pick<SecondaryName, 'name' | 'languageTag' | 'visible' | 'sortOrder'>>
  ): Promise<SecondaryName> {
    const row = this.db
      .prepare<[string], SecondaryNameRow>('SELECT * FROM secondary_names WHERE id = ?')
      .get(nameId)
    if (!row) throw new EntityNotFoundError(nameId)

    this.db.prepare<[string, string, number, number, string]>(`
      UPDATE secondary_names SET
        name = ?, language_tag = ?, visible = ?, sort_order = ?
      WHERE id = ?
    `).run(
      input.name ?? row.name,
      input.languageTag ?? row.language_tag,
      (input.visible ?? Boolean(row.visible)) ? 1 : 0,
      input.sortOrder ?? row.sort_order,
      nameId
    )

    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), row.entity_id)

    const updated = this.db
      .prepare<[string], SecondaryNameRow>('SELECT * FROM secondary_names WHERE id = ?')
      .get(nameId)!
    return hydrateSecondaryName(updated)
  }

  async deleteSecondaryName(nameId: string): Promise<void> {
    const row = this.db
      .prepare<[string], SecondaryNameRow>('SELECT * FROM secondary_names WHERE id = ?')
      .get(nameId)
    if (!row) throw new EntityNotFoundError(nameId)

    this.db.prepare<[string]>('DELETE FROM secondary_names WHERE id = ?').run(nameId)
    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), row.entity_id)
  }

  // ── Custom Attributes ──────────────────────────────────────────────────

  async addCustomAttribute(
    entityId: string,
    input: Omit<CustomAttribute, 'id' | 'entityId'>
  ): Promise<CustomAttribute> {
    const existing = this.db
      .prepare<[string], EntityRow>('SELECT id FROM entities WHERE id = ?')
      .get(entityId)
    if (!existing) throw new EntityNotFoundError(entityId)

    const id = newId()
    this.db.prepare<[string, string, string, string, string | null, number]>(`
      INSERT INTO custom_attributes (id, entity_id, key, value, label, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id, entityId,
      input.key,
      JSON.stringify(input.value),
      input.label ?? null,
      input.sortOrder
    )

    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), entityId)

    return { id, entityId, ...input }
  }

  async updateCustomAttribute(
    attrId: string,
    input: Partial<Pick<CustomAttribute, 'key' | 'value' | 'label' | 'sortOrder'>>
  ): Promise<CustomAttribute> {
    const row = this.db
      .prepare<[string], CustomAttributeRow>('SELECT * FROM custom_attributes WHERE id = ?')
      .get(attrId)
    if (!row) throw new EntityNotFoundError(attrId)

    this.db.prepare<[string, string, string | null, number, string]>(`
      UPDATE custom_attributes SET key = ?, value = ?, label = ?, sort_order = ?
      WHERE id = ?
    `).run(
      input.key ?? row.key,
      input.value !== undefined ? JSON.stringify(input.value) : row.value,
      input.label !== undefined ? (input.label ?? null) : row.label,
      input.sortOrder ?? row.sort_order,
      attrId
    )

    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), row.entity_id)

    const updated = this.db
      .prepare<[string], CustomAttributeRow>('SELECT * FROM custom_attributes WHERE id = ?')
      .get(attrId)!
    return hydrateCustomAttribute(updated)
  }

  async deleteCustomAttribute(attrId: string): Promise<void> {
    const row = this.db
      .prepare<[string], CustomAttributeRow>('SELECT * FROM custom_attributes WHERE id = ?')
      .get(attrId)
    if (!row) throw new EntityNotFoundError(attrId)

    this.db.prepare<[string]>('DELETE FROM custom_attributes WHERE id = ?').run(attrId)
    this.db.prepare<[string, string]>(
      'UPDATE entities SET updated_at = ? WHERE id = ?'
    ).run(nowIso(), row.entity_id)
  }

  // ── Links ──────────────────────────────────────────────────────────────

  async createLink(input: CreateLinkInput): Promise<Link> {
    const id = newId()
    const now = nowIso()
    const traditionScope = JSON.stringify(input.traditionScope)

    const run = this.db.transaction(() => {
      this.db.prepare<[
        string, string, string, string,
        number, string, number,
        string | null, string, string, string
      ]>(`
        INSERT INTO links
          (id, source_canonical_name, target_canonical_name, label,
           bidirectional, tradition_scope, is_built_in,
           note, extended_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.sourceCanonicalName,
        input.targetCanonicalName,
        input.label,
        input.bidirectional ? 1 : 0,
        traditionScope,
        input.isBuiltIn ? 1 : 0,
        input.note ?? null,
        JSON.stringify(input.extendedData ?? {}),
        now,
        now
      )

      const insertScope = this.db.prepare<[string, string]>(
        'INSERT OR IGNORE INTO link_tradition_scope (link_id, tradition_canonical_name) VALUES (?, ?)'
      )
      for (const t of input.traditionScope) {
        insertScope.run(id, t)
      }
    })

    run()

    const row = this.db
      .prepare<[string], LinkRow>('SELECT * FROM links WHERE id = ?')
      .get(id)!
    return hydrateLink(row)
  }

  async getLinkById(id: string): Promise<Link | null> {
    const row = this.db
      .prepare<[string], LinkRow>('SELECT * FROM links WHERE id = ?')
      .get(id)
    return row ? hydrateLink(row) : null
  }

  async updateLink(id: string, input: UpdateLinkInput): Promise<Link> {
    const existing = this.db
      .prepare<[string], LinkRow>('SELECT * FROM links WHERE id = ?')
      .get(id)
    if (!existing) throw new LinkNotFoundError(id)

    const traditionScope = input.traditionScope !== undefined
      ? JSON.stringify(input.traditionScope)
      : existing.tradition_scope

    this.db.transaction(() => {
      this.db.prepare<[string, number, string, string | null, string, string, string]>(`
        UPDATE links SET
          label = ?, bidirectional = ?, tradition_scope = ?,
          note = ?, extended_data = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.label ?? existing.label,
        (input.bidirectional ?? Boolean(existing.bidirectional)) ? 1 : 0,
        traditionScope,
        input.note !== undefined ? (input.note ?? null) : existing.note,
        JSON.stringify(input.extendedData ?? JSON.parse(existing.extended_data)),
        nowIso(),
        id
      )

      if (input.traditionScope !== undefined) {
        this.db.prepare<[string]>(
          'DELETE FROM link_tradition_scope WHERE link_id = ?'
        ).run(id)
        const insertScope = this.db.prepare<[string, string]>(
          'INSERT OR IGNORE INTO link_tradition_scope (link_id, tradition_canonical_name) VALUES (?, ?)'
        )
        for (const t of input.traditionScope) insertScope.run(id, t)
      }
    })()

    const updated = this.db
      .prepare<[string], LinkRow>('SELECT * FROM links WHERE id = ?')
      .get(id)!
    return hydrateLink(updated)
  }

  async deleteLink(id: string): Promise<void> {
    const existing = this.db
      .prepare<[string], LinkRow>('SELECT id FROM links WHERE id = ?')
      .get(id)
    if (!existing) throw new LinkNotFoundError(id)
    this.db.prepare<[string]>('DELETE FROM links WHERE id = ?').run(id)
  }

  async queryLinks(query: LinkQuery): Promise<PagedResult<Link>> {
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (query.involvedCanonicalName) {
      const dir = query.direction ?? 'both'
      if (dir === 'outgoing') {
        conditions.push('l.source_canonical_name = ?')
        params.push(query.involvedCanonicalName)
      } else if (dir === 'incoming') {
        conditions.push('l.target_canonical_name = ?')
        params.push(query.involvedCanonicalName)
      } else {
        conditions.push('(l.source_canonical_name = ? OR l.target_canonical_name = ?)')
        params.push(query.involvedCanonicalName, query.involvedCanonicalName)
      }
    } else {
      if (query.sourceCanonicalName) {
        conditions.push('l.source_canonical_name = ?')
        params.push(query.sourceCanonicalName)
      }
      if (query.targetCanonicalName) {
        conditions.push('l.target_canonical_name = ?')
        params.push(query.targetCanonicalName)
      }
    }

    if (query.labels && query.labels.length > 0) {
      conditions.push(`l.label IN (${query.labels.map(() => '?').join(',')})`)
      params.push(...query.labels)
    }

    if (query.traditions && query.traditions.length > 0) {
      // Universal links (scope=[]) always pass; tradition-specific links pass if intersection
      const placeholders = query.traditions.map(() => '?').join(',')
      conditions.push(`(
        l.tradition_scope = '[]'
        OR EXISTS (
          SELECT 1 FROM link_tradition_scope lts
          WHERE lts.link_id = l.id AND lts.tradition_canonical_name IN (${placeholders})
        )
      )`)
      params.push(...query.traditions)
    }

    if (query.isBuiltIn !== undefined) {
      conditions.push('l.is_built_in = ?')
      params.push(query.isBuiltIn ? 1 : 0)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const base = `FROM links l ${where}`

    const countRow = this.db
      .prepare<(string | number)[], CountRow>(`SELECT COUNT(*) AS count ${base}`)
      .get(...params) ?? { count: 0 }

    const limit = query.limit ?? 1000
    const offset = query.offset ?? 0

    const rows = this.db
      .prepare<(string | number)[], LinkRow>(`SELECT l.* ${base} ORDER BY l.created_at LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)

    return {
      items: rows.map(hydrateLink),
      total: countRow.count,
      limit,
      offset,
    }
  }

  // ── Traditions ─────────────────────────────────────────────────────────

  private hydrateTradition(row: TraditionRow): Tradition {
    const fields = this.db
      .prepare<[string], AttributionFieldRow>(
        'SELECT * FROM attribution_fields WHERE tradition_id = ? ORDER BY sort_order'
      )
      .all(row.id)
      .map(hydrateAttributionField)

    return {
      id: row.id,
      canonicalName: row.canonical_name,
      displayName: row.display_name,
      ...(row.description !== null ? { description: row.description } : {}),
      ownedLinkLabels: JSON.parse(row.owned_link_labels) as string[],
      attributionFields: fields,
      isBuiltIn: Boolean(row.is_built_in),
      ...(row.forked_from_canonical !== null
        ? { forkedFromCanonicalName: row.forked_from_canonical }
        : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async createTradition(input: CreateTraditionInput): Promise<Tradition> {
    const existing = this.db
      .prepare<[string], TraditionRow>('SELECT id FROM traditions WHERE canonical_name = ?')
      .get(input.canonicalName)
    if (existing) throw new CanonicalNameConflictError(input.canonicalName)

    const id = newId()
    const now = nowIso()
    const fields = input.attributionFields ?? []
    const ownedLinkLabels = [...new Set(fields.map(f => f.linkLabel))]

    this.db.transaction(() => {
      this.db.prepare<[
        string, string, string, string | null,
        string, number, string | null, string, string
      ]>(`
        INSERT INTO traditions
          (id, canonical_name, display_name, description,
           owned_link_labels, is_built_in, forked_from_canonical, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.canonicalName,
        input.displayName,
        input.description ?? null,
        JSON.stringify(ownedLinkLabels),
        input.isBuiltIn ? 1 : 0,
        input.forkedFromCanonicalName ?? null,
        now,
        now
      )

      const insertField = this.db.prepare<[
        string, string, string, string, string, string | null, number, number
      ]>(`
        INSERT INTO attribution_fields
          (id, tradition_id, tradition_canonical_name, link_label,
           display_name, target_entity_type, allow_multiple, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const [i, f] of fields.entries()) {
        insertField.run(
          newId(), id, input.canonicalName,
          f.linkLabel, f.displayName,
          f.targetEntityType ?? null,
          f.allowMultiple ? 1 : 0,
          f.sortOrder ?? i
        )
      }
    })()

    const row = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE id = ?')
      .get(id)!
    return this.hydrateTradition(row)
  }

  async getTraditionById(id: string): Promise<Tradition | null> {
    const row = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE id = ?')
      .get(id)
    return row ? this.hydrateTradition(row) : null
  }

  async getTraditionByCanonicalName(canonicalName: CanonicalName): Promise<Tradition | null> {
    const row = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE canonical_name = ?')
      .get(canonicalName)
    return row ? this.hydrateTradition(row) : null
  }

  async updateTradition(id: string, input: UpdateTraditionInput): Promise<Tradition> {
    const existing = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE id = ?')
      .get(id)
    if (!existing) throw new TraditionNotFoundError(id)

    this.db.prepare<[string, string | null, string]>(`
      UPDATE traditions SET display_name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.displayName ?? existing.display_name,
      input.description !== undefined ? (input.description ?? null) : existing.description,
      nowIso(),
      id
    )

    const updated = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE id = ?')
      .get(id)!
    return this.hydrateTradition(updated)
  }

  async deleteTradition(id: string): Promise<void> {
    const existing = this.db
      .prepare<[string], TraditionRow>('SELECT id FROM traditions WHERE id = ?')
      .get(id)
    if (!existing) throw new TraditionNotFoundError(id)
    // Cascade via FK ON DELETE CASCADE covers attribution_fields
    this.db.prepare<[string]>('DELETE FROM traditions WHERE id = ?').run(id)
  }

  async listTraditions(filter?: { isBuiltIn?: boolean }): Promise<Tradition[]> {
    const where = filter?.isBuiltIn !== undefined ? 'WHERE is_built_in = ?' : ''
    const params = filter?.isBuiltIn !== undefined ? [filter.isBuiltIn ? 1 : 0] : []

    const rows = this.db
      .prepare<number[], TraditionRow>(`SELECT * FROM traditions ${where} ORDER BY display_name`)
      .all(...params)
    return rows.map(r => this.hydrateTradition(r))
  }

  // ── Attribution Fields ─────────────────────────────────────────────────

  async addAttributionField(
    traditionId: string,
    input: Omit<AttributionField, 'id' | 'traditionCanonicalName'>
  ): Promise<AttributionField> {
    const tradition = this.db
      .prepare<[string], TraditionRow>('SELECT * FROM traditions WHERE id = ?')
      .get(traditionId)
    if (!tradition) throw new TraditionNotFoundError(traditionId)

    const id = newId()
    this.db.transaction(() => {
      this.db.prepare<[string, string, string, string, string, string | null, number, number]>(`
        INSERT INTO attribution_fields
          (id, tradition_id, tradition_canonical_name, link_label,
           display_name, target_entity_type, allow_multiple, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, traditionId, tradition.canonical_name,
        input.linkLabel, input.displayName,
        input.targetEntityType ?? null,
        input.allowMultiple ? 1 : 0,
        input.sortOrder
      )

      // Update owned_link_labels on the tradition
      const existing = JSON.parse(tradition.owned_link_labels) as string[]
      if (!existing.includes(input.linkLabel)) {
        existing.push(input.linkLabel)
        this.db.prepare<[string, string, string]>(
          'UPDATE traditions SET owned_link_labels = ?, updated_at = ? WHERE id = ?'
        ).run(JSON.stringify(existing), nowIso(), traditionId)
      }
    })()

    return {
      id,
      traditionCanonicalName: tradition.canonical_name,
      ...input,
    }
  }

  async updateAttributionField(
    fieldId: string,
    input: Partial<Pick<AttributionField, 'displayName' | 'targetEntityType' | 'allowMultiple' | 'sortOrder'>>
  ): Promise<AttributionField> {
    const row = this.db
      .prepare<[string], AttributionFieldRow>('SELECT * FROM attribution_fields WHERE id = ?')
      .get(fieldId)
    if (!row) throw new TraditionNotFoundError(fieldId)

    this.db.prepare<[string, string | null, number, number, string]>(`
      UPDATE attribution_fields SET
        display_name = ?, target_entity_type = ?, allow_multiple = ?, sort_order = ?
      WHERE id = ?
    `).run(
      input.displayName ?? row.display_name,
      input.targetEntityType !== undefined ? (input.targetEntityType ?? null) : row.target_entity_type,
      (input.allowMultiple ?? Boolean(row.allow_multiple)) ? 1 : 0,
      input.sortOrder ?? row.sort_order,
      fieldId
    )

    const updated = this.db
      .prepare<[string], AttributionFieldRow>('SELECT * FROM attribution_fields WHERE id = ?')
      .get(fieldId)!
    return hydrateAttributionField(updated)
  }

  async deleteAttributionField(fieldId: string): Promise<void> {
    const row = this.db
      .prepare<[string], AttributionFieldRow>('SELECT * FROM attribution_fields WHERE id = ?')
      .get(fieldId)
    if (!row) throw new TraditionNotFoundError(fieldId)

    this.db.transaction(() => {
      this.db.prepare<[string]>('DELETE FROM attribution_fields WHERE id = ?').run(fieldId)

      // Recompute owned_link_labels
      const remaining = this.db
        .prepare<[string], AttributionFieldRow>(
          'SELECT * FROM attribution_fields WHERE tradition_id = ?'
        )
        .all(row.tradition_id)

      const labels = [...new Set(remaining.map(f => f.link_label))]
      this.db.prepare<[string, string, string]>(
        'UPDATE traditions SET owned_link_labels = ?, updated_at = ? WHERE id = ?'
      ).run(JSON.stringify(labels), nowIso(), row.tradition_id)
    })()
  }

  // ── Tags ───────────────────────────────────────────────────────────────

  async listAllTags(): Promise<string[]> {
    const rows = this.db
      .prepare<[], { tag: string }>('SELECT DISTINCT tag FROM entity_tags ORDER BY tag')
      .all()
    return rows.map(r => r.tag)
  }

  // ── Transactions ───────────────────────────────────────────────────────

  async transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
    // better-sqlite3 transactions are synchronous; we run fn() inside one
    let result!: T
    this.db.transaction(() => {
      // Run async fn synchronously by collecting its promise — this works because
      // better-sqlite3 is synchronous and our adapter wraps sync calls in resolved promises
      const promise = fn(this)
      promise.then(r => { result = r }).catch(err => { throw err })
    })()
    return result
  }
}
