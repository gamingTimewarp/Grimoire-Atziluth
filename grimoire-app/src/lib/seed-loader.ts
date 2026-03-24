/**
 * seed-loader.ts
 * Browser-compatible seed loader.
 * Consumes the virtual:grimoire-data module (bundled at Vite build time)
 * and converts it to the SeedData format expected by grimoire-core's Seeder.
 */

import type { SeedData, SeedManifest } from '@grimoire/core'
import rawData from 'virtual:grimoire-data'

type JsonObject = Record<string, unknown>

function asArray(v: unknown): JsonObject[] {
  return Array.isArray(v) ? (v as JsonObject[]) : []
}

/**
 * Assemble the SeedData from the bundled JSON files,
 * following the manifest's loadOrder groups.
 */
export function loadBundledSeedData(): SeedData {
  const manifestRaw = rawData['manifest.json'] as JsonObject | undefined
  if (!manifestRaw) throw new Error('virtual:grimoire-data is missing manifest.json')

  const manifest = manifestRaw as unknown as SeedManifest

  const traditions: SeedData['traditions'] = []
  const entities: SeedData['entities'] = []
  const links: SeedData['links'] = []

  for (const group of manifest.loadOrder) {
    for (const filePath of group.files) {
      const file = rawData[filePath] as JsonObject | undefined
      if (!file) {
        console.warn(`[seed-loader] Missing file in bundle: ${filePath}`)
        continue
      }

      if (group.type === 'traditions' && 'traditions' in file) {
        traditions.push(...asArray(file['traditions']) as unknown as SeedData['traditions'])
      } else if (group.type === 'entities' && 'entities' in file) {
        entities.push(...asArray(file['entities']) as unknown as SeedData['entities'])
      } else if (group.type === 'links' && 'links' in file) {
        links.push(...asArray(file['links']) as unknown as SeedData['links'])
      }
    }
  }

  return { manifest, traditions, entities, links }
}
