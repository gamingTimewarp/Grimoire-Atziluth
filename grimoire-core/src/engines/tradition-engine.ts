/**
 * tradition-engine.ts
 * Business logic for traditions and the core attribution query.
 *
 * Key concept: attributions are links whose traditionScope includes the
 * tradition's canonicalName. A tradition's attributionFields describe
 * which linkLabels it "owns" and how to display them.
 *
 * getAttributionsForEntity() is the primary cross-cutting query:
 * given an entity and a set of active traditions, return all attributions
 * from each tradition, grouped by field, ready for the UI to render.
 */

import type { StorageAdapter } from '../types/storage.types.js'
import type { CanonicalName } from '../types/entity.types.js'
import type {
  AttributionField,
  AttributionResult,
  AttributionValue,
  CreateTraditionInput,
  Tradition,
  TraditionAttributionResult,
  UpdateTraditionInput,
} from '../types/tradition.types.js'
import {
  CanonicalNameConflictError,
  ImmutableTraditionError,
  TraditionNotFoundError,
} from '../utils/errors.js'
import { assertValidCanonicalName } from '../slugs/slug.js'
import { newId } from '../utils/id.js'

export class TraditionEngine {
  constructor(private readonly adapter: StorageAdapter) {}

  // ── Tradition CRUD ─────────────────────────────────────────────────────

  async createTradition(input: CreateTraditionInput): Promise<Tradition> {
    assertValidCanonicalName(input.canonicalName)
    return this.adapter.createTradition(input)
  }

  async getTradition(canonicalName: CanonicalName): Promise<Tradition> {
    const tradition = await this.adapter.getTraditionByCanonicalName(canonicalName)
    if (!tradition) throw new TraditionNotFoundError(canonicalName)
    return tradition
  }

  async updateTradition(
    canonicalName: CanonicalName,
    input: UpdateTraditionInput
  ): Promise<Tradition> {
    const tradition = await this.adapter.getTraditionByCanonicalName(canonicalName)
    if (!tradition) throw new TraditionNotFoundError(canonicalName)
    if (tradition.isBuiltIn) throw new ImmutableTraditionError(canonicalName, 'update')
    return this.adapter.updateTradition(tradition.id, input)
  }

  async deleteTradition(canonicalName: CanonicalName): Promise<void> {
    const tradition = await this.adapter.getTraditionByCanonicalName(canonicalName)
    if (!tradition) throw new TraditionNotFoundError(canonicalName)
    if (tradition.isBuiltIn) throw new ImmutableTraditionError(canonicalName, 'delete')
    await this.adapter.deleteTradition(tradition.id)
  }

  async listTraditions(filter?: { isBuiltIn?: boolean }): Promise<Tradition[]> {
    return this.adapter.listTraditions(filter)
  }

  // ── Attribution Fields ─────────────────────────────────────────────────

  async addAttributionField(
    traditionCanonicalName: CanonicalName,
    input: Omit<AttributionField, 'id' | 'traditionCanonicalName'>
  ): Promise<AttributionField> {
    const tradition = await this.adapter.getTraditionByCanonicalName(traditionCanonicalName)
    if (!tradition) throw new TraditionNotFoundError(traditionCanonicalName)
    if (tradition.isBuiltIn) throw new ImmutableTraditionError(traditionCanonicalName, 'add field to')
    return this.adapter.addAttributionField(tradition.id, input)
  }

  async updateAttributionField(
    fieldId: string,
    input: Partial<Pick<AttributionField, 'displayName' | 'targetEntityType' | 'allowMultiple' | 'sortOrder'>>
  ): Promise<AttributionField> {
    return this.adapter.updateAttributionField(fieldId, input)
  }

  async removeAttributionField(fieldId: string): Promise<void> {
    return this.adapter.deleteAttributionField(fieldId)
  }

  // ── Core Attribution Query ──────────────────────────────────────────────

  /**
   * The primary tradition-aware query.
   *
   * For each requested tradition:
   *   1. Get the tradition's attributionFields (ordered by sortOrder)
   *   2. Query all links from the entity where:
   *      - label is in the tradition's ownedLinkLabels, AND
   *      - traditionScope is empty (universal) OR includes this tradition
   *   3. Group results by field
   *
   * Universal links (traditionScope=[]) are included in ALL tradition results
   * when their label matches a tradition's owned fields.
   *
   * Supports multiple active traditions simultaneously.
   */
  async getAttributionsForEntity(
    canonicalName: CanonicalName,
    traditionCanonicalNames: string[]
  ): Promise<AttributionResult> {
    if (traditionCanonicalNames.length === 0) {
      return { entityCanonicalName: canonicalName, byTradition: [] }
    }

    // Load all requested traditions in parallel
    const traditions = await Promise.all(
      traditionCanonicalNames.map(async name => {
        const t = await this.adapter.getTraditionByCanonicalName(name)
        if (!t) throw new TraditionNotFoundError(name)
        return t
      })
    )

    // Collect all owned link labels across all traditions (for a single link query)
    const allOwnedLabels = [...new Set(traditions.flatMap(t => t.ownedLinkLabels))]

    // Single link query: links from this entity with matching labels and tradition scope
    const linksResult = await this.adapter.queryLinks({
      sourceCanonicalName: canonicalName,
      labels: allOwnedLabels,
      traditions: traditionCanonicalNames,
    })

    // Load target entities for display names (batched by unique canonicalName)
    const targetNames = [...new Set(linksResult.items.map(l => l.targetCanonicalName))]
    const targetEntities = await Promise.all(
      targetNames.map(name => this.adapter.getEntityByCanonicalName(name))
    )
    const targetMap = new Map<string, { primaryDisplayName: string; entityType: string }>()
    for (const entity of targetEntities) {
      if (entity) {
        targetMap.set(entity.canonicalName, {
          primaryDisplayName: entity.primaryDisplayName,
          entityType: entity.entityType,
        })
      }
    }

    // Group links by tradition
    const byTradition: TraditionAttributionResult[] = traditions.map(tradition => {
      const fields: Record<string, AttributionValue[]> = {}

      // Initialise all fields with empty arrays (so UI knows which fields the tradition defines)
      for (const field of tradition.attributionFields) {
        fields[field.linkLabel] = []
      }

      // Populate fields from matching links
      for (const link of linksResult.items) {
        // This link belongs to this tradition if:
        //   (a) it's universal (traditionScope=[]) and this tradition owns the label, OR
        //   (b) this tradition is explicitly in the link's traditionScope
        const universalAndOwned =
          link.traditionScope.length === 0 &&
          tradition.ownedLinkLabels.includes(link.label)
        const explicitlyOwned =
          link.traditionScope.includes(tradition.canonicalName)

        if (!universalAndOwned && !explicitlyOwned) continue
        if (!tradition.ownedLinkLabels.includes(link.label)) continue

        const target = targetMap.get(link.targetCanonicalName)
        if (!target) continue

        const value: AttributionValue = {
          linkId: link.id,
          linkLabel: link.label,
          targetCanonicalName: link.targetCanonicalName,
          targetPrimaryDisplayName: target.primaryDisplayName,
          targetEntityType: target.entityType,
          ...(link.note ? { note: link.note } : {}),
        }

        if (!fields[link.label]) fields[link.label] = []
        fields[link.label]!.push(value)
      }

      return {
        tradition: {
          canonicalName: tradition.canonicalName,
          displayName: tradition.displayName,
          id: tradition.id,
        },
        entityCanonicalName: canonicalName,
        fields,
      }
    })

    return { entityCanonicalName: canonicalName, byTradition }
  }

  /**
   * Convenience method: get attributions for multiple entities simultaneously.
   * Each entity gets its own AttributionResult.
   */
  async getAttributionsForEntities(
    canonicalNames: CanonicalName[],
    traditionCanonicalNames: string[]
  ): Promise<AttributionResult[]> {
    return Promise.all(
      canonicalNames.map(name =>
        this.getAttributionsForEntity(name, traditionCanonicalNames)
      )
    )
  }

  // ── Fork ───────────────────────────────────────────────────────────────

  /**
   * Deep-clone a built-in tradition (including all AttributionFields) as a user-editable copy.
   * Does NOT clone the underlying links — those remain attributed to the original tradition.
   * The fork starts with no links; user adds attributions manually (or via import).
   */
  async forkTradition(
    sourceCanonicalName: CanonicalName,
    newCanonicalName: CanonicalName,
    newDisplayName: string
  ): Promise<Tradition> {
    assertValidCanonicalName(newCanonicalName)

    const source = await this.adapter.getTraditionByCanonicalName(sourceCanonicalName)
    if (!source) throw new TraditionNotFoundError(sourceCanonicalName)

    const conflict = await this.adapter.getTraditionByCanonicalName(newCanonicalName)
    if (conflict) throw new CanonicalNameConflictError(newCanonicalName)

    return this.adapter.createTradition({
      canonicalName: newCanonicalName,
      displayName: newDisplayName,
      description: source.description,
      isBuiltIn: false,
      forkedFromCanonicalName: sourceCanonicalName,
      attributionFields: source.attributionFields.map(f => ({
        linkLabel: f.linkLabel,
        displayName: f.displayName,
        ...(f.targetEntityType ? { targetEntityType: f.targetEntityType } : {}),
        allowMultiple: f.allowMultiple,
        sortOrder: f.sortOrder,
      })),
    })
  }

  // ── Ownership Queries ──────────────────────────────────────────────────

  /**
   * Which traditions claim ownership of a given link label?
   * Useful for: showing "this link is attributed by GD and Thoth" in the UI.
   */
  async getTraditionsForLinkLabel(linkLabel: string): Promise<Tradition[]> {
    const all = await this.adapter.listTraditions()
    return all.filter(t => t.ownedLinkLabels.includes(linkLabel))
  }
}
