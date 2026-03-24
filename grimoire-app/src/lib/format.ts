/**
 * format.ts
 * Display-formatting helpers for entity types and tag slugs.
 */

/** Convert a dotted entity type slug to readable text.
 *  e.g. "tarot.card" → "Tarot Card", "astrology.planet" → "Planet" */
export function formatEntityType(entityType: string): string {
  const parts = entityType.split('.')
  // Drop generic namespace prefixes when the last segment is descriptive enough
  const last = parts[parts.length - 1]
  return toTitleCase(last.replace(/-/g, ' '))
}

/** Convert a hyphenated tag slug to readable text.
 *  e.g. "rider-waite-smith" → "Rider Waite Smith", "major-arcana" → "Major Arcana" */
export function formatTag(tag: string): string {
  return toTitleCase(tag.replace(/-/g, ' '))
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
