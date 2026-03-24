/**
 * slug.ts
 * Canonical name validation and generation utilities.
 *
 * Format: "<namespace>.<type>.<slug>"
 * Examples:
 *   "tarot.major.the-fool"
 *   "qabalah.sephira.kether"
 *   "astrology.planet.mars"
 *   "tradition.golden-dawn"  (namespace + slug only; type segment omitted for traditions)
 *
 * Rules for each segment:
 *   - Lowercase ASCII letters, digits, and hyphens only
 *   - No leading or trailing hyphens
 *   - No consecutive hyphens
 *   - Minimum 1 character
 */

import { InvalidCanonicalNameError } from '../utils/errors.js'

const SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Validate a single slug segment (no dots, no spaces, lowercase + hyphens only) */
export function isValidSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment)
}

/** Validate a full canonical name (must have at least 2 dot-separated segments) */
export function isValidCanonicalName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  const parts = name.split('.')
  if (parts.length < 2) return false
  return parts.every(isValidSegment)
}

/**
 * Assert a canonical name is valid; throw InvalidCanonicalNameError if not.
 */
export function assertValidCanonicalName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new InvalidCanonicalNameError(name, 'must be a non-empty string')
  }
  const parts = name.split('.')
  if (parts.length < 2) {
    throw new InvalidCanonicalNameError(name, 'must contain at least two dot-separated segments')
  }
  for (const part of parts) {
    if (!isValidSegment(part)) {
      throw new InvalidCanonicalNameError(
        name,
        `segment "${part}" must be lowercase alphanumeric with hyphens (no leading/trailing hyphens)`
      )
    }
  }
}

/**
 * Convert an arbitrary display string into a valid slug segment.
 * Strips diacritics, lowercases, replaces non-alphanumeric runs with hyphens,
 * trims leading/trailing hyphens.
 */
export function toSegment(display: string): string {
  return display
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')           // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-')            // collapse consecutive hyphens
}

/**
 * Build a canonical name from two or more segments.
 * Each segment is validated; throws if any is invalid.
 */
export function buildCanonicalName(...segments: string[]): string {
  if (segments.length < 2) {
    throw new InvalidCanonicalNameError(
      segments.join('.'),
      'must have at least two segments'
    )
  }
  for (const seg of segments) {
    if (!isValidSegment(seg)) {
      throw new InvalidCanonicalNameError(
        segments.join('.'),
        `segment "${seg}" is invalid`
      )
    }
  }
  return segments.join('.')
}

/**
 * Parse a canonical name into its component segments.
 * Throws if invalid.
 */
export function parseCanonicalName(name: string): string[] {
  assertValidCanonicalName(name)
  return name.split('.')
}

/**
 * Return the top-level namespace of a canonical name.
 * e.g. "tarot.major.the-fool" → "tarot"
 */
export function getNamespace(name: string): string {
  assertValidCanonicalName(name)
  const first = name.split('.')[0]
  if (!first) throw new InvalidCanonicalNameError(name, 'has no namespace segment')
  return first
}
