/**
 * in-memory-adapter.ts
 * A fully functional in-memory StorageAdapter backed by Maps.
 * Used in all unit tests; zero disk I/O, zero setup.
 *
 * All methods are synchronous internally but wrapped in Promise.resolve()
 * to match the async StorageAdapter interface.
 */

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
  EntityNotFoundError,
  LinkNotFoundError,
  TraditionNotFoundError,
  CanonicalNameConflictError,
} from '../../utils/errors.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paginate<T>(items: T[], page?: Page): PagedResult<T> {
  const limit = page?.limit ?? items.length
  const offset = page?.offset ?? 0
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  }
}

/** Escapes regex metacharacters so a raw query string is safe to interpolate
 * into a RegExp constructor. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function scoreSearch(query: string, entity: BaseEntity): { score: number; matchedOn: EntitySearchResult['matchedOn'] } {
  const q = query.toLowerCase()
  const matchedOn: EntitySearchResult['matchedOn'] = []
  let score = 0

  const displayExact = entity.primaryDisplayName.toLowerCase() === q

  // \b treats non-word characters (spaces, punctuation, the dots/hyphens in a
  // canonicalName) as boundaries, so this distinguishes "mars" appearing as
  // its own word from "mars" merely appearing inside a longer word like
  // "Marseille" — a plain .includes(q) can't tell those apart, which is why
  // "Tarot de Marseille" used to score the same as genuine Mars references.
  const wordBoundaryRe = new RegExp(`\\b${escapeRegExp(q)}\\b`, 'i')
  let wholeWordMatch = false

  if (entity.canonicalName.toLowerCase().includes(q)) {
    matchedOn.push('canonicalName')
    score += entity.canonicalName.toLowerCase() === q ? 10 : 5
    if (wordBoundaryRe.test(entity.canonicalName)) wholeWordMatch = true
  }
  if (entity.primaryDisplayName.toLowerCase().includes(q)) {
    matchedOn.push('primaryDisplayName')
    score += displayExact ? 10 : 7
    if (wordBoundaryRe.test(entity.primaryDisplayName)) wholeWordMatch = true
  }
  let secondaryExact = false
  for (const sn of entity.secondaryNames) {
    if (sn.name?.toLowerCase().includes(q)) {
      matchedOn.push('secondaryName')
      score += 4
      if (sn.name.toLowerCase() === q) secondaryExact = true
      if (wordBoundaryRe.test(sn.name)) wholeWordMatch = true
      break
    }
  }
  for (const tag of entity.tags) {
    if (tag.toLowerCase().includes(q)) {
      matchedOn.push('tag')
      score += 3
      if (wordBoundaryRe.test(tag)) wholeWordMatch = true
      break
    }
  }
  if (entity.description?.toLowerCase().includes(q)) {
    matchedOn.push('description')
    score += 2
    if (wordBoundaryRe.test(entity.description)) wholeWordMatch = true
  }

  // An exact name match dominates regardless of how many other fields happen
  // to mention the query as a substring — without this, searching "Mars" put
  // the actual Mars planet entity ~20 rows down, outranked by anything that
  // merely references Mars across canonicalName/description/tags at once
  // (e.g. "Kamea of Mars", "Mars Mahadasha", a dozen Jyotish antardasha
  // combinations) even though none of those *are* what was searched for. The
  // bonus is large enough that no plausible stack of substring-only matches
  // (max ~21: 5 + 7 + 4 + 3 + 2) can outscore it.
  if (displayExact || secondaryExact) score += 50
  // A genuine whole-word reference (even a non-exact one, like "Kamea of
  // Mars") should still clearly outrank an entity that only contains the
  // query as part of a longer, unrelated word.
  else if (wholeWordMatch) score += 8

  return { score, matchedOn }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class InMemoryAdapter implements StorageAdapter {
  // Primary stores
  private entities = new Map<string, BaseEntity>()         // id → entity
  private entityByName = new Map<string, string>()         // canonicalName → id
  private links = new Map<string, Link>()                  // id → link
  private traditions = new Map<string, Tradition>()        // id → tradition
  private traditionByName = new Map<string, string>()      // canonicalName → id

  // Child record stores
  private secondaryNames = new Map<string, SecondaryName>()     // nameId → name
  private customAttributes = new Map<string, CustomAttribute>() // attrId → attr
  private attributionFields = new Map<string, AttributionField>() // fieldId → field

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> { /* no-op */ }
  async close(): Promise<void> { /* no-op */ }

  // ── Entities ───────────────────────────────────────────────────────────

  async createEntity(input: CreateEntityInput): Promise<BaseEntity> {
    if (this.entityByName.has(input.canonicalName)) {
      throw new CanonicalNameConflictError(input.canonicalName)
    }

    const id = newId()
    const now = nowIso()

    // Persist child records first
    const secondaryNames: SecondaryName[] = (input.secondaryNames ?? []).map(sn => {
      const nameId = newId()
      const record: SecondaryName = { ...sn, id: nameId, entityId: id }
      this.secondaryNames.set(nameId, record)
      return record
    })

    const customAttributes: CustomAttribute[] = (input.customAttributes ?? []).map(ca => {
      const attrId = newId()
      const record: CustomAttribute = { ...ca, id: attrId, entityId: id }
      this.customAttributes.set(attrId, record)
      return record
    })

    const entity: BaseEntity = {
      ...input,
      id,
      secondaryNames,
      customAttributes,
      createdAt: now,
      updatedAt: now,
    }

    this.entities.set(id, entity)
    this.entityByName.set(input.canonicalName, id)
    return structuredClone(entity)
  }

  async getEntityById(id: string): Promise<BaseEntity | null> {
    const entity = this.entities.get(id)
    return entity ? structuredClone(entity) : null
  }

  async getEntityByCanonicalName(canonicalName: CanonicalName): Promise<BaseEntity | null> {
    const id = this.entityByName.get(canonicalName)
    if (!id) return null
    return this.getEntityById(id)
  }

  async updateEntity(id: string, input: UpdateEntityInput): Promise<BaseEntity> {
    const existing = this.entities.get(id)
    if (!existing) throw new EntityNotFoundError(id)

    const updated: BaseEntity = {
      ...existing,
      ...input,
      id,
      canonicalName: existing.canonicalName,
      isBuiltIn: existing.isBuiltIn,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }
    this.entities.set(id, updated)
    return structuredClone(updated)
  }

  async deleteEntity(id: string): Promise<void> {
    const entity = this.entities.get(id)
    if (!entity) throw new EntityNotFoundError(id)

    // Cascade: remove child records
    for (const sn of entity.secondaryNames) this.secondaryNames.delete(sn.id)
    for (const ca of entity.customAttributes) this.customAttributes.delete(ca.id)

    this.entityByName.delete(entity.canonicalName)
    this.entities.delete(id)
  }

  async listEntities(
    filter?: { entityType?: string; isBuiltIn?: boolean; tags?: string[] },
    page?: Page
  ): Promise<PagedResult<BaseEntity>> {
    let items = Array.from(this.entities.values())

    if (filter?.entityType !== undefined) {
      items = items.filter(e => e.entityType === filter.entityType)
    }
    if (filter?.isBuiltIn !== undefined) {
      items = items.filter(e => e.isBuiltIn === filter.isBuiltIn)
    }
    if (filter?.tags && filter.tags.length > 0) {
      items = items.filter(e => filter.tags!.every(t => e.tags.includes(t)))
    }

    return paginate(items.map(e => structuredClone(e)), page)
  }

  async searchEntities(
    query: string,
    filter?: { entityType?: string },
    page?: Page
  ): Promise<PagedResult<EntitySearchResult>> {
    let items = Array.from(this.entities.values())

    if (filter?.entityType) {
      items = items.filter(e => e.entityType === filter.entityType)
    }

    const results: EntitySearchResult[] = items
      .map(entity => {
        const { score, matchedOn } = scoreSearch(query, entity)
        return { entity: structuredClone(entity), matchedOn, score }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)

    return paginate(results, page)
  }

  async hasIncomingLinks(canonicalName: CanonicalName): Promise<boolean> {
    for (const link of this.links.values()) {
      if (link.targetCanonicalName === canonicalName) return true
    }
    return false
  }

  // ── Secondary Names ────────────────────────────────────────────────────

  async addSecondaryName(
    entityId: string,
    input: Omit<SecondaryName, 'id' | 'entityId'>
  ): Promise<SecondaryName> {
    const entity = this.entities.get(entityId)
    if (!entity) throw new EntityNotFoundError(entityId)

    const id = newId()
    const record: SecondaryName = { ...input, id, entityId }
    this.secondaryNames.set(id, record)
    entity.secondaryNames.push(record)
    entity.updatedAt = nowIso()
    return structuredClone(record)
  }

  async updateSecondaryName(
    nameId: string,
    input: Partial<Pick<SecondaryName, 'name' | 'languageTag' | 'visible' | 'sortOrder'>>
  ): Promise<SecondaryName> {
    const record = this.secondaryNames.get(nameId)
    if (!record) throw new EntityNotFoundError(nameId)

    const updated = { ...record, ...input }
    this.secondaryNames.set(nameId, updated)

    // Update inline copy on entity
    const entity = this.entities.get(record.entityId)
    if (entity) {
      const idx = entity.secondaryNames.findIndex(n => n.id === nameId)
      if (idx >= 0) entity.secondaryNames[idx] = updated
      entity.updatedAt = nowIso()
    }
    return structuredClone(updated)
  }

  async deleteSecondaryName(nameId: string): Promise<void> {
    const record = this.secondaryNames.get(nameId)
    if (!record) throw new EntityNotFoundError(nameId)

    const entity = this.entities.get(record.entityId)
    if (entity) {
      entity.secondaryNames = entity.secondaryNames.filter(n => n.id !== nameId)
      entity.updatedAt = nowIso()
    }
    this.secondaryNames.delete(nameId)
  }

  // ── Custom Attributes ──────────────────────────────────────────────────

  async addCustomAttribute(
    entityId: string,
    input: Omit<CustomAttribute, 'id' | 'entityId'>
  ): Promise<CustomAttribute> {
    const entity = this.entities.get(entityId)
    if (!entity) throw new EntityNotFoundError(entityId)

    const id = newId()
    const record: CustomAttribute = { ...input, id, entityId }
    this.customAttributes.set(id, record)
    entity.customAttributes.push(record)
    entity.updatedAt = nowIso()
    return structuredClone(record)
  }

  async updateCustomAttribute(
    attrId: string,
    input: Partial<Pick<CustomAttribute, 'key' | 'value' | 'label' | 'sortOrder'>>
  ): Promise<CustomAttribute> {
    const record = this.customAttributes.get(attrId)
    if (!record) throw new EntityNotFoundError(attrId)

    const updated = { ...record, ...input }
    this.customAttributes.set(attrId, updated)

    const entity = this.entities.get(record.entityId)
    if (entity) {
      const idx = entity.customAttributes.findIndex(a => a.id === attrId)
      if (idx >= 0) entity.customAttributes[idx] = updated
      entity.updatedAt = nowIso()
    }
    return structuredClone(updated)
  }

  async deleteCustomAttribute(attrId: string): Promise<void> {
    const record = this.customAttributes.get(attrId)
    if (!record) throw new EntityNotFoundError(attrId)

    const entity = this.entities.get(record.entityId)
    if (entity) {
      entity.customAttributes = entity.customAttributes.filter(a => a.id !== attrId)
      entity.updatedAt = nowIso()
    }
    this.customAttributes.delete(attrId)
  }

  // ── Links ──────────────────────────────────────────────────────────────

  async createLink(input: CreateLinkInput): Promise<Link> {
    const id = newId()
    const now = nowIso()
    const link: Link = { ...input, id, createdAt: now, updatedAt: now }
    this.links.set(id, link)
    return structuredClone(link)
  }

  async getLinkById(id: string): Promise<Link | null> {
    const link = this.links.get(id)
    return link ? structuredClone(link) : null
  }

  async updateLink(id: string, input: UpdateLinkInput): Promise<Link> {
    const existing = this.links.get(id)
    if (!existing) throw new LinkNotFoundError(id)

    const updated: Link = { ...existing, ...input, id, updatedAt: nowIso() }
    this.links.set(id, updated)
    return structuredClone(updated)
  }

  async deleteLink(id: string): Promise<void> {
    if (!this.links.has(id)) throw new LinkNotFoundError(id)
    this.links.delete(id)
  }

  async queryLinks(query: LinkQuery): Promise<PagedResult<Link>> {
    let items = Array.from(this.links.values())

    if (query.involvedCanonicalName) {
      const name = query.involvedCanonicalName
      const dir = query.direction ?? 'both'
      items = items.filter(l => {
        if (dir === 'outgoing') return l.sourceCanonicalName === name
        if (dir === 'incoming') return l.targetCanonicalName === name
        return l.sourceCanonicalName === name || l.targetCanonicalName === name
      })
    } else {
      if (query.sourceCanonicalName) {
        items = items.filter(l => l.sourceCanonicalName === query.sourceCanonicalName)
      }
      if (query.targetCanonicalName) {
        items = items.filter(l => l.targetCanonicalName === query.targetCanonicalName)
      }
    }

    if (query.labels && query.labels.length > 0) {
      items = items.filter(l => query.labels!.includes(l.label))
    }

    if (query.traditions && query.traditions.length > 0) {
      const tradSet = new Set(query.traditions)
      items = items.filter(l =>
        // Universal links always pass through
        l.traditionScope.length === 0 ||
        l.traditionScope.some(t => tradSet.has(t))
      )
    }

    if (query.isBuiltIn !== undefined) {
      items = items.filter(l => l.isBuiltIn === query.isBuiltIn)
    }

    return paginate(
      items.map(l => structuredClone(l)),
      query.limit !== undefined ? { limit: query.limit, offset: query.offset ?? 0 } : undefined
    )
  }

  // ── Traditions ─────────────────────────────────────────────────────────

  async createTradition(input: CreateTraditionInput): Promise<Tradition> {
    if (this.traditionByName.has(input.canonicalName)) {
      throw new CanonicalNameConflictError(input.canonicalName)
    }

    const id = newId()
    const now = nowIso()

    const attributionFields: AttributionField[] = (input.attributionFields ?? []).map(f => {
      const fieldId = newId()
      const record: AttributionField = {
        ...f,
        id: fieldId,
        traditionCanonicalName: input.canonicalName,
      }
      this.attributionFields.set(fieldId, record)
      return record
    })

    const ownedLinkLabels = [...new Set(attributionFields.map(f => f.linkLabel))]

    const tradition: Tradition = {
      ...input,
      id,
      attributionFields,
      ownedLinkLabels,
      createdAt: now,
      updatedAt: now,
    }

    this.traditions.set(id, tradition)
    this.traditionByName.set(input.canonicalName, id)
    return structuredClone(tradition)
  }

  async getTraditionById(id: string): Promise<Tradition | null> {
    const t = this.traditions.get(id)
    return t ? structuredClone(t) : null
  }

  async getTraditionByCanonicalName(canonicalName: CanonicalName): Promise<Tradition | null> {
    const id = this.traditionByName.get(canonicalName)
    if (!id) return null
    return this.getTraditionById(id)
  }

  async updateTradition(id: string, input: UpdateTraditionInput): Promise<Tradition> {
    const existing = this.traditions.get(id)
    if (!existing) throw new TraditionNotFoundError(id)

    const updated: Tradition = {
      ...existing,
      ...input,
      id,
      canonicalName: existing.canonicalName,
      isBuiltIn: existing.isBuiltIn,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }
    this.traditions.set(id, updated)
    return structuredClone(updated)
  }

  async deleteTradition(id: string): Promise<void> {
    const tradition = this.traditions.get(id)
    if (!tradition) throw new TraditionNotFoundError(id)

    // Cascade: remove attribution fields
    for (const field of tradition.attributionFields) {
      this.attributionFields.delete(field.id)
    }
    this.traditionByName.delete(tradition.canonicalName)
    this.traditions.delete(id)
  }

  async listTraditions(filter?: { isBuiltIn?: boolean }): Promise<Tradition[]> {
    let items = Array.from(this.traditions.values())
    if (filter?.isBuiltIn !== undefined) {
      items = items.filter(t => t.isBuiltIn === filter.isBuiltIn)
    }
    return items.map(t => structuredClone(t))
  }

  // ── Attribution Fields ─────────────────────────────────────────────────

  async addAttributionField(
    traditionId: string,
    input: Omit<AttributionField, 'id' | 'traditionCanonicalName'>
  ): Promise<AttributionField> {
    const tradition = this.traditions.get(traditionId)
    if (!tradition) throw new TraditionNotFoundError(traditionId)

    const id = newId()
    const record: AttributionField = {
      ...input,
      id,
      traditionCanonicalName: tradition.canonicalName,
    }
    this.attributionFields.set(id, record)
    tradition.attributionFields.push(record)
    if (!tradition.ownedLinkLabels.includes(input.linkLabel)) {
      tradition.ownedLinkLabels.push(input.linkLabel)
    }
    tradition.updatedAt = nowIso()
    return structuredClone(record)
  }

  async updateAttributionField(
    fieldId: string,
    input: Partial<Pick<AttributionField, 'displayName' | 'targetEntityType' | 'allowMultiple' | 'sortOrder'>>
  ): Promise<AttributionField> {
    const record = this.attributionFields.get(fieldId)
    if (!record) throw new TraditionNotFoundError(fieldId)

    const updated = { ...record, ...input }
    this.attributionFields.set(fieldId, updated)

    // Update inline copy on tradition
    const traditionId = this.traditionByName.get(record.traditionCanonicalName)
    if (traditionId) {
      const tradition = this.traditions.get(traditionId)
      if (tradition) {
        const idx = tradition.attributionFields.findIndex(f => f.id === fieldId)
        if (idx >= 0) tradition.attributionFields[idx] = updated
        tradition.updatedAt = nowIso()
      }
    }
    return structuredClone(updated)
  }

  async deleteAttributionField(fieldId: string): Promise<void> {
    const record = this.attributionFields.get(fieldId)
    if (!record) throw new TraditionNotFoundError(fieldId)

    const traditionId = this.traditionByName.get(record.traditionCanonicalName)
    if (traditionId) {
      const tradition = this.traditions.get(traditionId)
      if (tradition) {
        tradition.attributionFields = tradition.attributionFields.filter(f => f.id !== fieldId)
        // Recompute owned labels
        tradition.ownedLinkLabels = [...new Set(tradition.attributionFields.map(f => f.linkLabel))]
        tradition.updatedAt = nowIso()
      }
    }
    this.attributionFields.delete(fieldId)
  }

  // ── Tags ───────────────────────────────────────────────────────────────

  async listAllTags(): Promise<string[]> {
    const tags = new Set<string>()
    for (const entity of this.entities.values()) {
      for (const tag of entity.tags) tags.add(tag)
    }
    return Array.from(tags).sort()
  }

  // ── Transactions ───────────────────────────────────────────────────────

  async transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
    // In-memory is always consistent; no true transaction needed.
    // We still call through the same adapter instance.
    return fn(this)
  }
}
