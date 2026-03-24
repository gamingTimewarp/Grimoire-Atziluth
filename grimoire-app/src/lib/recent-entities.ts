/**
 * recent-entities.ts
 * localStorage-backed recency list for entity reference page visits.
 */

const STORAGE_KEY = 'grimoire:recently-viewed'
const MAX_ENTRIES  = 20

export type RecentEntity = {
  canonicalName: string
  displayName: string
  entityType: string
  visitedAt: number  // Date.now()
}

function load(): RecentEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentEntity[]
  } catch {
    return []
  }
}

function save(items: RecentEntity[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/** Record a visit. Moves existing entries to the front; deduplicates by canonical name. */
export function recordRecentEntity(canonicalName: string, displayName: string, entityType: string): void {
  const items = load().filter(e => e.canonicalName !== canonicalName)
  items.unshift({ canonicalName, displayName, entityType, visitedAt: Date.now() })
  save(items.slice(0, MAX_ENTRIES))
}

/** Returns the most recently visited entities, newest first. */
export function getRecentEntities(limit = 8): RecentEntity[] {
  return load().slice(0, limit)
}

/** Removes a single entry from the recency list. */
export function removeRecentEntity(canonicalName: string): void {
  save(load().filter(e => e.canonicalName !== canonicalName))
}

/** Clears all recent entities. */
export function clearRecentEntities(): void {
  localStorage.removeItem(STORAGE_KEY)
}
