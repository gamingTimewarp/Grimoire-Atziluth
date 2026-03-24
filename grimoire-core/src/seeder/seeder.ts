/**
 * seeder.ts
 * Loads grimoire-data/ seed files into the engine on first run.
 * Idempotent: skips entities/links/traditions that already exist.
 * Called automatically by GrimoireEngine.initialize() when dataDir is provided.
 */

import type { GrimoireEngine } from '../engines/grimoire-engine.js'
import { CanonicalNameConflictError, DuplicateLinkError } from '../utils/errors.js'
import type {
  SeedData,
  SeedResult,
  SeedStats,
  TraditionSeedRecord,
  EntitySeedRecord,
  LinkSeedRecord,
} from './seed-schema.js'

export class Seeder {
  constructor(
    private readonly engine: GrimoireEngine,
    private readonly verbose: boolean = false
  ) {}

  // ─── Check ────────────────────────────────────────────────────────────

  async isSeeded(sentinelEntity: string): Promise<boolean> {
    const entity = await this.engine.adapter.getEntityByCanonicalName(sentinelEntity)
    return entity !== null
  }

  // ─── Public entry points ──────────────────────────────────────────────

  /** Seed only if the sentinel entity does not exist. */
  async seedIfNeeded(data: SeedData): Promise<SeedResult> {
    const alreadySeeded = await this.isSeeded(data.manifest.sentinelEntity)
    if (alreadySeeded) {
      this.log(`Already seeded (sentinel: ${data.manifest.sentinelEntity}). Skipping.`)
      return { skipped: true, stats: { traditions: 0, entities: 0, links: 0 } }
    }
    this.log(`Seeding built-in dataset v${data.manifest.seedVersion}…`)
    return this.seed(data)
  }

  /** Unconditionally seed all data. */
  async seed(data: SeedData): Promise<SeedResult> {
    const stats: SeedStats = { traditions: 0, entities: 0, links: 0 }

    await this.seedTraditions(data.traditions, stats)
    await this.seedEntities(data.entities, stats)
    await this.seedLinks(data.links, stats)

    this.log(
      `Seeding complete. Traditions: ${stats.traditions}, Entities: ${stats.entities}, Links: ${stats.links}`
    )
    return { skipped: false, stats }
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async seedTraditions(records: TraditionSeedRecord[], stats: SeedStats): Promise<void> {
    for (const record of records) {
      try {
        await this.engine.adapter.createTradition({
          canonicalName: record.canonicalName,
          displayName: record.displayName,
          description: record.description,
          isBuiltIn: true,
          attributionFields: (record.attributionFields ?? []).map((f, i) => ({
            linkLabel: f.linkLabel,
            displayName: f.displayName,
            targetEntityType: f.targetEntityType,
            allowMultiple: f.allowMultiple ?? false,
            sortOrder: f.sortOrder ?? i,
          })),
        })
        stats.traditions++
        this.log(`  Tradition: ${record.canonicalName}`)
      } catch (e) {
        if (e instanceof CanonicalNameConflictError) {
          this.log(`  Skip (exists): tradition ${record.canonicalName}`)
        } else {
          throw new Error(`Failed to seed tradition "${record.canonicalName}": ${String(e)}`)
        }
      }
    }
  }

  private async seedEntities(records: EntitySeedRecord[], stats: SeedStats): Promise<void> {
    for (const record of records) {
      try {
        await this.engine.adapter.createEntity({
          canonicalName: record.canonicalName,
          entityType: record.entityType,
          primaryDisplayName: record.primaryDisplayName,
          description: record.description,
          extendedData: record.extendedData ?? {},
          tags: record.tags ?? [],
          isBuiltIn: true,
          secondaryNames: (record.secondaryNames ?? []).map((sn, i) => ({
            name: sn.name,
            languageTag: sn.languageTag,
            visible: sn.visible ?? true,
            sortOrder: sn.sortOrder ?? i,
          })),
        })
        stats.entities++
      } catch (e) {
        if (e instanceof CanonicalNameConflictError) {
          this.log(`  Skip (exists): entity ${record.canonicalName}`)
        } else {
          throw new Error(`Failed to seed entity "${record.canonicalName}": ${String(e)}`)
        }
      }
    }
  }

  private async seedLinks(records: LinkSeedRecord[], stats: SeedStats): Promise<void> {
    for (const record of records) {
      try {
        await this.engine.adapter.createLink({
          sourceCanonicalName: record.source,
          targetCanonicalName: record.target,
          label: record.label,
          bidirectional: record.bidirectional ?? false,
          traditionScope: record.traditionScope ?? [],
          isBuiltIn: true,
          ...(record.note ? { note: record.note } : {}),
          extendedData: {},
        })
        stats.links++
      } catch (e) {
        if (e instanceof DuplicateLinkError) {
          this.log(`  Skip (exists): link ${record.source} -[${record.label}]-> ${record.target}`)
        } else {
          throw new Error(
            `Failed to seed link "${record.source}" -[${record.label}]-> "${record.target}": ${String(e)}`
          )
        }
      }
    }
  }

  private log(msg: string): void {
    if (this.verbose) console.log(`[Seeder] ${msg}`)
  }
}
