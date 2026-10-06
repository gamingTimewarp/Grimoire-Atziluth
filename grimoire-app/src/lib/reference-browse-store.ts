/**
 * reference-browse-store.ts
 * localStorage persistence for the Reference page's top-level browse grid
 * ABC/Topic sort toggle, so it survives navigating away and back instead of
 * resetting to "ABC" every time the page remounts.
 */

export type BrowseSortMode = 'alpha' | 'topic'

const KEY = 'grimoire:reference-browse-sort'

export function loadBrowseSortMode(): BrowseSortMode {
  try {
    return localStorage.getItem(KEY) === 'topic' ? 'topic' : 'alpha'
  } catch {
    return 'alpha'
  }
}

export function saveBrowseSortMode(mode: BrowseSortMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch { /* ignore */ }
}
