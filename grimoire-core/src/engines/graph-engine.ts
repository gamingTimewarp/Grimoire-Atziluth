/**
 * graph-engine.ts
 * Business logic for link (edge) management and graph traversal.
 * The "graph" in Grimoire Atziluth is a directed multigraph where nodes
 * are entities and edges are links. This engine handles the edge layer.
 */

import type { StorageAdapter, Page, PagedResult } from '../types/storage.types.js'
import type { CanonicalName, LinkLabel } from '../types/entity.types.js'
import type { CreateLinkInput, Link, LinkDirection, LinkQuery, UpdateLinkInput } from '../types/link.types.js'
import {
  DuplicateLinkError,
  ImmutableLinkError,
  LinkNotFoundError,
} from '../utils/errors.js'

export class GraphEngine {
  constructor(private readonly adapter: StorageAdapter) {}

  // ── Link CRUD ──────────────────────────────────────────────────────────

  async createLink(input: CreateLinkInput): Promise<Link> {
    // Check for duplicate directed link (same source, target, label)
    const exists = await this.linkExists(
      input.sourceCanonicalName,
      input.targetCanonicalName,
      input.label
    )
    if (exists) {
      throw new DuplicateLinkError(input.sourceCanonicalName, input.targetCanonicalName, input.label)
    }
    return this.adapter.createLink(input)
  }

  async getLink(id: string): Promise<Link> {
    const link = await this.adapter.getLinkById(id)
    if (!link) throw new LinkNotFoundError(id)
    return link
  }

  async updateLink(id: string, input: UpdateLinkInput): Promise<Link> {
    const existing = await this.adapter.getLinkById(id)
    if (!existing) throw new LinkNotFoundError(id)
    if (existing.isBuiltIn) throw new ImmutableLinkError(id, 'update')
    return this.adapter.updateLink(id, input)
  }

  /** Update a built-in link (bypasses immutability — for seeding only) */
  async updateLinkUnchecked(id: string, input: UpdateLinkInput): Promise<Link> {
    const existing = await this.adapter.getLinkById(id)
    if (!existing) throw new LinkNotFoundError(id)
    return this.adapter.updateLink(id, input)
  }

  async deleteLink(id: string): Promise<void> {
    const existing = await this.adapter.getLinkById(id)
    if (!existing) throw new LinkNotFoundError(id)
    if (existing.isBuiltIn) throw new ImmutableLinkError(id, 'delete')
    await this.adapter.deleteLink(id)
  }

  // ── Querying ───────────────────────────────────────────────────────────

  async queryLinks(query: LinkQuery, page?: Page): Promise<PagedResult<Link>> {
    const limit = query.limit ?? page?.limit
    const offset = query.offset ?? page?.offset
    return this.adapter.queryLinks({
      ...query,
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    })
  }

  /**
   * Returns all links where the entity is source or target (depth-1 neighbours).
   * This is the primary graph traversal call used by the UI entity page.
   *
   * To traverse deeper: the caller navigates to a neighbour entity and calls
   * getNeighbours() again on that entity — this is the hyperlink-style navigation
   * described in the spec.
   */
  async getNeighbours(
    canonicalName: CanonicalName,
    options: {
      labels?: LinkLabel[]
      traditions?: string[]
      direction?: LinkDirection
    } = {}
  ): Promise<Link[]> {
    const result = await this.adapter.queryLinks({
      involvedCanonicalName: canonicalName,
      direction: options.direction ?? 'both',
      ...(options.labels !== undefined ? { labels: options.labels } : {}),
      ...(options.traditions !== undefined ? { traditions: options.traditions } : {}),
    })
    return result.items
  }

  /**
   * Returns all links between two specific entities, in either direction.
   */
  async getLinksBetween(
    aCanonicalName: CanonicalName,
    bCanonicalName: CanonicalName
  ): Promise<Link[]> {
    const [forwardResult, reverseResult] = await Promise.all([
      this.adapter.queryLinks({
        sourceCanonicalName: aCanonicalName,
        targetCanonicalName: bCanonicalName,
      }),
      this.adapter.queryLinks({
        sourceCanonicalName: bCanonicalName,
        targetCanonicalName: aCanonicalName,
      }),
    ])
    return [...forwardResult.items, ...reverseResult.items]
  }

  // ── Validation ─────────────────────────────────────────────────────────

  async linkExists(
    sourceCanonicalName: CanonicalName,
    targetCanonicalName: CanonicalName,
    label: LinkLabel
  ): Promise<boolean> {
    const result = await this.adapter.queryLinks({
      sourceCanonicalName,
      targetCanonicalName,
      labels: [label],
      limit: 1,
    })
    return result.total > 0
  }

  async countIncomingLinks(targetCanonicalName: CanonicalName): Promise<number> {
    const result = await this.adapter.queryLinks({
      targetCanonicalName,
      direction: 'incoming',
    })
    return result.total
  }
}
