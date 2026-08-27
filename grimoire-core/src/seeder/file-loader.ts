/**
 * file-loader.ts
 * Reads grimoire-data/ JSON files from disk (Node.js / Tauri sidecar).
 * Returns a SeedData object ready to be passed to Seeder.
 *
 * Note: Uses synchronous fs.readFileSync — appropriate for startup seeding.
 * For browser/WASM environments, swap this with an async fetch-based loader.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type {
  SeedData,
  SeedManifest,
  EntitySeedFile,
  LinkSeedFile,
  TraditionSeedFile,
  EntitySeedRecord,
  LinkSeedRecord,
  TraditionSeedRecord,
} from './seed-schema.js'

/**
 * Load all seed data from a grimoire-data/ directory.
 * Reads manifest.json first, then all referenced files in declared order.
 *
 * @param dataDir - Absolute or relative path to the grimoire-data/ directory
 */
export function loadSeedDirectory(dataDir: string): SeedData {
  const manifestPath = join(dataDir, 'manifest.json')

  let manifest: SeedManifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as SeedManifest
  } catch (e) {
    throw new Error(`Failed to read seed manifest at "${manifestPath}": ${String(e)}`, { cause: e })
  }

  const traditions: TraditionSeedRecord[] = []
  const entities: EntitySeedRecord[] = []
  const links: LinkSeedRecord[] = []

  for (const group of manifest.loadOrder) {
    for (const filePath of group.files) {
      const fullPath = join(dataDir, filePath)
      let raw: unknown
      try {
        raw = JSON.parse(readFileSync(fullPath, 'utf-8'))
      } catch (e) {
        throw new Error(`Failed to read seed file "${fullPath}": ${String(e)}`, { cause: e })
      }

      if (group.type === 'traditions') {
        const file = raw as TraditionSeedFile
        if (file.tradition) traditions.push(file.tradition)
      } else if (group.type === 'entities') {
        const file = raw as EntitySeedFile
        if (Array.isArray(file.entities)) entities.push(...file.entities)
      } else if (group.type === 'links') {
        const file = raw as LinkSeedFile
        if (Array.isArray(file.links)) links.push(...file.links)
      }
    }
  }

  return { manifest, traditions, entities, links }
}
