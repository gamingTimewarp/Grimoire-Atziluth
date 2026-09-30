/**
 * journal-import.ts
 * Single-entry export/import for a journal entry and the readings grouped
 * under it — the entry-scoped counterpart to the full backup at
 * Settings > Data (export-import.ts), for sharing or archiving one entry at
 * a time instead of the whole database.
 *
 * IDs are preserved on import (INSERT OR IGNORE, same merge semantics as the
 * full backup) — re-importing a file whose entry id already exists here is a
 * safe no-op rather than a duplicate. Readings keep their journalEntryId, so
 * the grouping round-trips without any extra wiring.
 */

import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { Reading } from '@grimoire/core'
import type { JournalEntry } from './reading-db'
import { importJournalEntry, importReading } from './reading-db'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journal-entry'
}

interface JournalEntryExportFile {
  version: '1'
  exportedAt: string
  entry: JournalEntry
  readings: Reading[]
}

/**
 * Exports one journal entry plus the readings grouped under it as a single
 * file — the write-side counterpart to pickAndImportJournalEntry(). Returns
 * null if the user cancelled the Save dialog, otherwise the saved path.
 */
export async function exportJournalEntry(entry: JournalEntry, readings: Reading[]): Promise<string | null> {
  const path = await save({
    defaultPath: `${slugify(entry.title ?? 'journal-entry')}.json`,
    filters: [{ name: 'Journal Entry', extensions: ['json'] }],
  })
  if (!path) return null

  const payload: JournalEntryExportFile = {
    version: '1',
    exportedAt: new Date().toISOString(),
    entry,
    readings,
  }
  await writeTextFile(path, JSON.stringify(payload, null, 2))
  return path
}

export interface JournalEntryImportSummary {
  title: string
  entryAlreadyExisted: boolean
  readingsImported: number
  readingsAlreadyExisted: number
}

function isJournalEntryShape(v: unknown): v is JournalEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.entryDate === 'string' && typeof e.notes === 'string'
}

/**
 * Shows a native Open dialog for a .json file exported by exportJournalEntry
 * and imports it. Returns null if the user cancelled; throws on malformed
 * files (bad JSON, wrong version, missing/invalid "entry").
 */
export async function pickAndImportJournalEntry(): Promise<JournalEntryImportSummary | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Journal Entry', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as Partial<JournalEntryExportFile>

  if (parsed.version !== '1') {
    throw new Error(`Unsupported import file version: ${parsed.version ?? '(none)'}`)
  }
  if (!isJournalEntryShape(parsed.entry)) {
    throw new Error('Import file is missing a valid "entry" object.')
  }

  const { inserted: entryInserted } = await importJournalEntry(parsed.entry)

  let readingsImported = 0
  let readingsAlreadyExisted = 0
  for (const r of parsed.readings ?? []) {
    const { inserted } = await importReading(r)
    if (inserted) readingsImported++
    else readingsAlreadyExisted++
  }

  return {
    title: parsed.entry.title ?? 'Journal Entry',
    entryAlreadyExisted: !entryInserted,
    readingsImported,
    readingsAlreadyExisted,
  }
}
