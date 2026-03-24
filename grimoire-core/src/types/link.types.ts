/**
 * link.types.ts
 * Directed edges in the Grimoire Atziluth knowledge graph.
 *
 * Links serve double duty:
 *   1. General semantic connections between entities ("corresponds-to", "opposes", …)
 *   2. Tradition-scoped attributions ("attributed-planet", "attributed-path", …)
 *
 * Attributions are NOT a separate data structure — they are links whose
 * `traditionScope` is non-empty. A tradition "owns" certain link labels;
 * setting traditionScope to that tradition's canonicalName causes the link
 * to surface when that tradition is active.
 *
 * Universal links (traditionScope = []) appear regardless of active traditions.
 */

import type { CanonicalName, LinkLabel } from './entity.types.js'

// ─── Core Link ────────────────────────────────────────────────────────────────

export interface Link {
  /** UUID */
  id: string
  sourceCanonicalName: CanonicalName
  targetCanonicalName: CanonicalName
  label: LinkLabel
  /**
   * If true, the link is shown on both the source and target entity pages.
   * If false, it only appears on the source entity page.
   */
  bidirectional: boolean
  /**
   * The traditions that assert this link.
   * Empty array → universal link (shown regardless of active traditions).
   * Non-empty → link surfaces only when at least one listed tradition is active.
   */
  traditionScope: string[]  // tradition canonicalName slugs
  /** True = part of built-in dataset; False = user-created */
  isBuiltIn: boolean
  /** Optional annotation on this specific link */
  note?: string
  /** Any additional structured data (e.g. confidence, source citation) */
  extendedData: Record<string, unknown>
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export type CreateLinkInput = Omit<Link, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateLinkInput = Partial<
  Pick<Link, 'label' | 'bidirectional' | 'traditionScope' | 'note' | 'extendedData'>
>

// ─── Query ────────────────────────────────────────────────────────────────────

export type LinkDirection = 'outgoing' | 'incoming' | 'both'

export interface LinkQuery {
  /** Return only links where this entity is the source */
  sourceCanonicalName?: CanonicalName
  /** Return only links where this entity is the target */
  targetCanonicalName?: CanonicalName
  /**
   * Return links where this entity is source OR target.
   * Mutually exclusive with sourceCanonicalName / targetCanonicalName.
   */
  involvedCanonicalName?: CanonicalName
  /** Applies to involvedCanonicalName — which side to return links from */
  direction?: LinkDirection
  /** Filter to specific link labels */
  labels?: LinkLabel[]
  /**
   * Filter to links that belong to at least one of these traditions,
   * OR are universal (traditionScope = []).
   * Omitting this returns all links regardless of tradition.
   */
  traditions?: string[]
  isBuiltIn?: boolean
  limit?: number
  offset?: number
}
