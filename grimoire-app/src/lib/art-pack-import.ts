/**
 * art-pack-import.ts
 * Bulk import of user-supplied custom art packs for the built-in art groups
 * (Tarot decks, Runes, Geomancy, Mahjong, Lenormand, Playing Cards, Alchemy Metals).
 *
 * A pack is a named folder of images the user picks via a directory dialog.
 * Files are matched against each group's member entities using the same
 * "canonical name with dots replaced by hyphens" convention as the bundled
 * /art/ packs (e.g. tarot.major.rws.the-fool -> tarot-major-rws-the-fool.<ext>),
 * so a folder shaped like the built-in convention just works.
 */

import type { GrimoireEngine } from '@grimoire/core'
import type { BaseEntity } from '@grimoire/core'
import { open } from '@tauri-apps/plugin-dialog'
import { readDir } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import type { ArtGroup } from './art-store'
import { artGroupForEntityType } from './art-store'
import {
  saveCustomArtPack, deleteCustomArtPack, saveArtPackFile, getArtPackFile,
} from './custom-db'
import type { CustomArtPackRecord } from './custom-db'
import { copyFileIntoPack, removePackDir, resolvePackFileUrl } from './custom-art'

/** Which entityTypes to scan when looking for a group's member entities. */
const GROUP_ENTITY_TYPES: Record<ArtGroup, string[]> = {
  'tarot-rws':       ['tarot.card'],
  'tarot-tdm':       ['tarot.card'],
  'tarot-thoth':     ['tarot.card'],
  'tarot-etteilla':  ['tarot.card'],
  lenormand:         ['tarot.card'],
  'playing-cards':   ['tarot.card'],
  runes:             ['rune', 'ogham.letter'],
  geomancy:          ['geomancy.figure'],
  mahjong:           ['divination.mahjong-tile'],
  'alchemy-metals':  ['alchemy.metal'],
}

/** Lists every entity that belongs to a given art group, via the same classification EntityArt uses. */
export async function listGroupMembers(engine: GrimoireEngine, group: ArtGroup): Promise<BaseEntity[]> {
  const entityTypes = GROUP_ENTITY_TYPES[group]
  const seen = new Map<string, BaseEntity>()
  for (const entityType of entityTypes) {
    const result = await engine.adapter.listEntities({ entityType }, { offset: 0, limit: 2000 })
    for (const e of result.items) {
      if (artGroupForEntityType(e.entityType, e.canonicalName) === group) seen.set(e.canonicalName, e)
    }
  }
  return [...seen.values()]
}

export interface ImportResult {
  pack: CustomArtPackRecord
  matched: number
  total: number
  unmatched: string[]
}

/**
 * Opens a directory picker, scans it for images matching the group's member
 * entities, copies matches into the pack's folder, and records the mapping.
 * Returns null if the user cancelled the directory dialog.
 */
export async function importCustomArtPack(
  engine: GrimoireEngine,
  group: ArtGroup,
  name: string,
): Promise<ImportResult | null> {
  const sourceDir = await open({ directory: true, multiple: false })
  if (!sourceDir || Array.isArray(sourceDir)) return null

  const entries = await readDir(sourceDir)
  const filesBySlug = new Map<string, string>()  // slug (no ext) -> full filename
  for (const entry of entries) {
    if (!entry.isFile) continue
    const dot = entry.name.lastIndexOf('.')
    if (dot <= 0) continue
    filesBySlug.set(entry.name.slice(0, dot).toLowerCase(), entry.name)
  }

  const members = await listGroupMembers(engine, group)
  const now = new Date().toISOString()
  const pack: CustomArtPackRecord = {
    id: crypto.randomUUID(),
    artGroup: group,
    name,
    createdAt: now,
    updatedAt: now,
  }
  await saveCustomArtPack(pack)

  let matched = 0
  const unmatched: string[] = []
  for (const entity of members) {
    const slug = entity.canonicalName.replace(/\./g, '-').toLowerCase()
    const fileName = filesBySlug.get(slug)
    if (!fileName) { unmatched.push(entity.canonicalName); continue }
    const sourcePath = await join(sourceDir, fileName)
    await copyFileIntoPack(pack.id, sourcePath, fileName)
    await saveArtPackFile(pack.id, entity.canonicalName, fileName)
    matched++
  }

  return { pack, matched, total: members.length, unmatched }
}

/** Deletes a custom art pack's database rows and on-disk files. */
export async function deleteCustomArtPackFully(packId: string): Promise<void> {
  await deleteCustomArtPack(packId)
  await removePackDir(packId)
}

const urlPromiseCache = new Map<string, Promise<string | null>>()

/** Resolves a custom pack's image URL for an entity, or null if the pack has no file for it. */
export function resolvePackImageUrl(packId: string, canonicalName: string): Promise<string | null> {
  const key = `${packId}::${canonicalName}`
  let p = urlPromiseCache.get(key)
  if (!p) {
    p = (async () => {
      const fileName = await getArtPackFile(packId, canonicalName)
      if (!fileName) return null
      return resolvePackFileUrl(packId, fileName)
    })()
    urlPromiseCache.set(key, p)
  }
  return p
}
