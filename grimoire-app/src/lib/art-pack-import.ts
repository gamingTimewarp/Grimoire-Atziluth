/**
 * art-pack-import.ts
 * Bulk import of user-supplied custom art packs for the built-in art groups
 * (Tarot decks, Runes, Geomancy, Mahjong, Lenormand, Playing Cards, Alchemy Metals).
 *
 * A pack is a named .zip archive of images the user picks via a single-file
 * dialog. This (not a directory dialog, and not multi-file selection) is
 * deliberate: Tauri's dialog plugin does not implement folder picking on
 * mobile at all — it rejects with FolderPickerNotImplemented — and selecting
 * dozens of files individually is unworkable on a phone. A single zip works
 * identically on every platform and is extracted client-side (fflate), so no
 * native unzip dependency is needed.
 *
 * Files are matched against each group's member entities using the same
 * "canonical name with dots replaced by hyphens" convention as the bundled
 * /art/ packs (e.g. tarot.major.rws.the-fool -> tarot-major-rws-the-fool.<ext>).
 */

import type { GrimoireEngine } from '@grimoire/core'
import type { BaseEntity } from '@grimoire/core'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { unzipSync } from 'fflate'
import type { ArtGroup } from './art-store'
import { artGroupForEntityType } from './art-store'
import {
  saveCustomArtPack, deleteCustomArtPack, saveArtPackFile, getArtPackFile,
} from './custom-db'
import type { CustomArtPackRecord } from './custom-db'
import { writeFileIntoPack, removePackDir, resolvePackFileUrl } from './custom-art'

/** Extracts the filename from a zip entry path, tolerating both '/' and '\' separators. */
function basenameOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

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
 * Opens a single-file picker for a .zip archive, extracts it in memory, matches
 * entries against the group's member entities, writes matches into the pack's
 * folder, and records the mapping. Returns null if the user cancelled the
 * dialog, or throws if the file isn't a valid zip.
 */
export async function importCustomArtPack(
  engine: GrimoireEngine,
  group: ArtGroup,
  name: string,
): Promise<ImportResult | null> {
  const zipPath = await open({
    multiple: false,
    filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
  })
  if (!zipPath || Array.isArray(zipPath)) return null

  const zipBytes = await readFile(zipPath)
  const entries = unzipSync(zipBytes)

  const filesBySlug = new Map<string, { fileName: string; data: Uint8Array }>()  // slug (no ext) -> file
  for (const [entryPath, data] of Object.entries(entries)) {
    if (entryPath.endsWith('/') || data.length === 0) continue  // directory entries
    const fileName = basenameOf(entryPath)
    const dot = fileName.lastIndexOf('.')
    if (dot <= 0) continue
    filesBySlug.set(fileName.slice(0, dot).toLowerCase(), { fileName, data })
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
    const file = filesBySlug.get(slug)
    if (!file) { unmatched.push(entity.canonicalName); continue }
    await writeFileIntoPack(pack.id, file.fileName, file.data)
    await saveArtPackFile(pack.id, entity.canonicalName, file.fileName)
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
