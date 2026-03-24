/**
 * seed-schema.ts
 * TypeScript types for grimoire-data/ JSON seed files.
 * These types describe the shape of every JSON file in the data directory.
 */

// ─── Entity seed ──────────────────────────────────────────────────────────────

export interface SecondaryNameSeed {
  name: string
  languageTag: string
  visible?: boolean   // default: true
  sortOrder?: number  // default: index
}

export interface EntitySeedRecord {
  canonicalName: string
  entityType: string
  primaryDisplayName: string
  description?: string
  secondaryNames?: SecondaryNameSeed[]
  tags?: string[]
  extendedData?: Record<string, unknown>
}

export interface EntitySeedFile {
  version: number
  entities: EntitySeedRecord[]
}

// ─── Link seed ────────────────────────────────────────────────────────────────

export interface LinkSeedRecord {
  source: string        // source canonicalName
  target: string        // target canonicalName
  label: string
  bidirectional?: boolean    // default: false
  traditionScope?: string[]  // default: [] (universal)
  note?: string
}

export interface LinkSeedFile {
  version: number
  links: LinkSeedRecord[]
}

// ─── Tradition seed ───────────────────────────────────────────────────────────

export interface AttributionFieldSeed {
  linkLabel: string
  displayName: string
  targetEntityType?: string
  allowMultiple?: boolean   // default: false
  sortOrder?: number
}

export interface TraditionSeedRecord {
  canonicalName: string
  displayName: string
  description?: string
  attributionFields: AttributionFieldSeed[]
}

export interface TraditionSeedFile {
  version: number
  tradition: TraditionSeedRecord
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

export interface ManifestGroup {
  type: 'traditions' | 'entities' | 'links'
  files: string[]
}

export interface SeedManifest {
  version: number
  seedVersion: string
  /** canonicalName of an entity that must exist for seeding to be considered done */
  sentinelEntity: string
  loadOrder: ManifestGroup[]
}

// ─── Aggregated data passed to Seeder ─────────────────────────────────────────

export interface SeedData {
  manifest: SeedManifest
  traditions: TraditionSeedRecord[]
  entities: EntitySeedRecord[]
  links: LinkSeedRecord[]
}

export interface SeedStats {
  traditions: number
  entities: number
  links: number
}

export interface SeedResult {
  /** True if seeding was skipped (already done) */
  skipped: boolean
  stats: SeedStats
}
