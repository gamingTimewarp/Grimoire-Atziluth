/**
 * bookmarks-store.ts
 * localStorage-backed list of bookmarked entity canonical names.
 */

import { resolveCanonicalName } from './canonical-aliases'

const KEY = 'grimoire:bookmarks'

export function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function addBookmark(cn: string): void {
  const resolved = resolveCanonicalName(cn)
  const current = getBookmarks()
  if (!current.includes(resolved)) {
    localStorage.setItem(KEY, JSON.stringify([...current, resolved]))
  }
}

export function removeBookmark(cn: string): void {
  const resolved = resolveCanonicalName(cn)
  const current = getBookmarks()
  localStorage.setItem(KEY, JSON.stringify(current.filter(b => b !== resolved)))
}

export function isBookmarked(cn: string): boolean {
  return getBookmarks().includes(resolveCanonicalName(cn))
}

export function toggleBookmark(cn: string): boolean {
  if (isBookmarked(cn)) {
    removeBookmark(cn)
    return false
  } else {
    addBookmark(cn)
    return true
  }
}
