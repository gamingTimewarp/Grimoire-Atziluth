/**
 * entity-export.ts
 * Export live entities (built-in or custom) as JSON, in the same
 * {version, entities} schema custom-import.ts already reads — so an exported
 * file can be re-imported elsewhere. This is the write-side counterpart to
 * that file's read-side; row shape and file shape are deliberately identical.
 */

import type { BaseEntity } from '@grimoire/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { getCustomLinksForEntity } from './custom-db'
import type { CustomDeckRecord } from './custom-db'
import type { ImportEntityInput, ImportLinkInput } from './custom-import'

interface ExportFile {
  version: '1'
  exportedAt: string
  entities: ImportEntityInput[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

/**
 * Maps a live entity to the row shape custom-import.ts reads back in.
 * Only custom entities get their outgoing links attached — a built-in
 * entity's links are static seed data, not something re-import should try
 * to recreate, and only outgoing (source === this entity) links are
 * included, since ImportLinkInput has no way to express incoming direction.
 */
async function entityToExportRow(entity: BaseEntity): Promise<ImportEntityInput> {
  let links: ImportLinkInput[] | undefined
  if (!entity.isBuiltIn) {
    const outgoing = (await getCustomLinksForEntity(entity.canonicalName))
      .filter(l => l.sourceCn === entity.canonicalName)
    if (outgoing.length > 0) {
      links = outgoing.map(l => ({
        target: l.targetCn,
        label: l.label,
        bidirectional: l.bidirectional,
        note: l.note || undefined,
      }))
    }
  }

  return {
    canonicalName: entity.canonicalName,
    entityType: entity.entityType,
    displayName: entity.primaryDisplayName,
    description: entity.description || undefined,
    userNotes: entity.userNotes || undefined,
    tags: entity.tags.length > 0 ? entity.tags : undefined,
    extendedData: Object.keys(entity.extendedData).length > 0 ? entity.extendedData : undefined,
    links,
  }
}

/** A custom deck hasn't necessarily been fetched as a live BaseEntity where the
 *  caller already has it (e.g. the Custom page's deck list) — mirrors the exact
 *  entity shape seedCustomIntoEngine() creates for it, so exporting from either
 *  source produces the same row. */
function deckRecordToExportRow(d: CustomDeckRecord): ImportEntityInput {
  return {
    canonicalName: d.canonicalName,
    entityType: 'custom.deck',
    displayName: d.displayName,
    description: d.description || undefined,
    tags: ['deck'],
    extendedData: {
      members: d.cardCanonicalNames,
      cardCount: d.cardCanonicalNames.length,
      reversalEnabled: d.reversalEnabled,
    },
  }
}

async function saveExportFile(entities: ImportEntityInput[], defaultFileName: string): Promise<string | null> {
  const path = await save({
    defaultPath: defaultFileName,
    filters: [{ name: 'Entity Export', extensions: ['json'] }],
  })
  if (!path) return null

  const file: ExportFile = {
    version: '1',
    exportedAt: new Date().toISOString(),
    entities,
  }
  await writeTextFile(path, JSON.stringify(file, null, 2))
  return path
}

/** Exports a single entity. Returns null if the user cancelled the Save dialog. */
export async function exportSingleEntity(entity: BaseEntity): Promise<string | null> {
  const row = await entityToExportRow(entity)
  return saveExportFile([row], `${slugify(entity.canonicalName.replace(/\./g, '-'))}.json`)
}

/** Exports a custom deck record (see deckRecordToExportRow for why this takes
 *  the record rather than a live entity). */
export async function exportDeckRecord(deck: CustomDeckRecord): Promise<string | null> {
  return saveExportFile([deckRecordToExportRow(deck)], `${slugify(deck.displayName)}.json`)
}

/** Exports every given custom deck record as one file (bulk "export all decks"). */
export async function exportDeckRecords(decks: CustomDeckRecord[], suggestedFileNameBase: string): Promise<string | null> {
  return saveExportFile(decks.map(deckRecordToExportRow), `${slugify(suggestedFileNameBase)}.json`)
}

/** Exports a set of entities (an overview/deck's members, or a bulk "export
 *  all") as one file. */
export async function exportEntitySet(entities: BaseEntity[], suggestedFileNameBase: string): Promise<string | null> {
  const rows = await Promise.all(entities.map(entityToExportRow))
  return saveExportFile(rows, `${slugify(suggestedFileNameBase)}.json`)
}
