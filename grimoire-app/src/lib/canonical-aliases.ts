/**
 * canonical-aliases.ts
 *
 * Registry of renamed entity canonical names.  When a built-in entity is
 * renamed in a data update, add an entry here so that bookmarks, journal
 * links, and imported backups that reference the old name still resolve
 * correctly.
 *
 * Format:  'old.canonical.name': 'new.canonical.name'
 *
 * Aliases are transitive: if A→B and B→C, resolveCanonicalName('A') returns
 * 'C'.  Keep chains short (1 hop) and update the map when chains form.
 */
export const CANONICAL_ALIASES: Record<string, string> = {
  // ── Add entries here when built-in entities are renamed ──────────────────
  // Example: 'tarot.major.the-fool': 'tarot.major.fool',
}

/**
 * Resolve a canonical name through the alias chain.
 * Returns the current name; identical to the input if no alias exists.
 */
export function resolveCanonicalName(name: string): string {
  let current = name
  const seen = new Set<string>()
  while (CANONICAL_ALIASES[current] !== undefined && !seen.has(current)) {
    seen.add(current)
    current = CANONICAL_ALIASES[current]
  }
  return current
}

/**
 * Migrate canonical names stored in localStorage (bookmarks, recently-viewed).
 * Rewrites any entries that appear as keys in CANONICAL_ALIASES to their
 * current names.  Call once at app startup.
 */
export function migrateStoredCanonicalNames(): void {
  const keys = ['grimoire:bookmarks', 'grimoire:recently-viewed']
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw) as string[]
      const migrated = arr.map(resolveCanonicalName)
      if (migrated.some((v, i) => v !== arr[i])) {
        localStorage.setItem(key, JSON.stringify(migrated))
      }
    } catch { /* ignore malformed entries */ }
  }
}
