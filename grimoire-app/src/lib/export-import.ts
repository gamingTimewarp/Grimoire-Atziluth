/**
 * export-import.ts
 * Full application backup (export) and restore (import).
 *
 * Export: shows a native Save dialog pre-filled with a dated filename,
 *   writes JSON via the fs plugin, then reveals the file in the OS file
 *   manager via the opener plugin.
 *
 * Import: shows a native Open dialog filtered to .json files, reads the
 *   chosen file via the fs plugin, and merges the data into the app.
 *   Existing records (same id / canonical name) are preserved.
 *
 * Quiz SRS state is intentionally excluded (large, can be rebuilt from usage).
 */

import type { Reading } from '@grimoire/core'
import type { JournalEntry } from './reading-db'
import {
  listReadings, listJournalEntries,
  getAllJournalEntityLinks, importReading,
  importJournalEntry, addEntityLinkToEntry,
} from './reading-db'
import {
  getAllCustomEntities, getAllCustomLinks,
  saveCustomEntity, saveCustomLink,
} from './custom-db'
import type { CustomEntityRecord, CustomLinkRecord } from './custom-db'
import { listNatalCharts, importNatalChart } from './natal-db'
import type { NatalChartRecord } from './natal-db'
import { resolveCanonicalName, migrateStoredCanonicalNames } from './canonical-aliases'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { dirname } from '@tauri-apps/api/path'

// ─── localStorage keys to include ─────────────────────────────────────────────

const LS_KEYS = [
  'grimoire:settings',
  'grimoire:traditions',
  'grimoire:theme',
  'grimoire:bookmarks',
  'grimoire:nav-config',
  'grimoire:art-store',
]

// ─── Backup schema ─────────────────────────────────────────────────────────────

export interface GrimoireBackup {
  version: '1'
  exportedAt: string
  appVersion: string
  localStorage: Record<string, unknown>
  customEntities: CustomEntityRecord[]
  customLinks: CustomLinkRecord[]
  natalCharts: NatalChartRecord[]
  readings: Reading[]
  journalEntries: JournalEntry[]
  journalEntityLinks: { entryId: string; canonicalName: string }[]
}

// ─── Export ────────────────────────────────────────────────────────────────────

/**
 * Returns null if the user cancelled the Save dialog, otherwise the saved path.
 */
export async function exportBackup(): Promise<string | null> {
  const [
    customEntities,
    customLinks,
    natalCharts,
    readings,
    journalEntries,
    journalEntityLinks,
  ] = await Promise.all([
    getAllCustomEntities(),
    getAllCustomLinks(),
    listNatalCharts(),
    listReadings(10000),
    listJournalEntries(10000),
    getAllJournalEntityLinks(),
  ])

  const lsData: Record<string, unknown> = {}
  for (const key of LS_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      try { lsData[key] = JSON.parse(raw) } catch { lsData[key] = raw }
    }
  }

  const backup: GrimoireBackup = {
    version: '1',
    exportedAt: new Date().toISOString(),
    appVersion: '0.1.0',
    localStorage: lsData,
    customEntities,
    customLinks,
    natalCharts,
    readings,
    journalEntries,
    journalEntityLinks,
  }

  const date = new Date().toISOString().slice(0, 10)
  const path = await save({
    defaultPath: `grimoire-atziluth-backup-${date}.json`,
    filters: [{ name: 'Grimoire Backup', extensions: ['json'] }],
  })
  if (!path) return null   // user cancelled

  await writeTextFile(path, JSON.stringify(backup, null, 2))

  // Record the timestamp so the Data settings page can show "Last backup: X days ago"
  localStorage.setItem('grimoire:last-backup', new Date().toISOString())

  // Reveal the containing folder in the OS file manager
  const dir = await dirname(path)
  await openPath(dir)

  return path
}

// ─── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  customEntities: number
  customLinks: number
  natalCharts: number
  readings: number
  journalEntries: number
  journalEntityLinks: number
}

/**
 * Shows a native Open dialog and imports the chosen backup file.
 * Returns null if the user cancelled, otherwise the import result.
 */
export async function pickAndImportBackup(): Promise<ImportResult | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Grimoire Backup', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null
  return importBackupFromPath(path)
}

export async function importBackupFromPath(path: string): Promise<ImportResult> {
  const text   = await readTextFile(path)
  const backup = JSON.parse(text) as GrimoireBackup

  if (backup.version !== '1') {
    throw new Error(`Unsupported backup version: ${backup.version}`)
  }

  // ── Restore localStorage ─────────────────────────────────────────────────
  for (const [key, value] of Object.entries(backup.localStorage ?? {})) {
    if (LS_KEYS.includes(key)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }
  // Migrate any renamed canonical names that may be stale in the restored data
  migrateStoredCanonicalNames()

  // ── Restore SQLite (INSERT OR IGNORE — merge, no overwrites) ─────────────
  let customEntities    = 0
  let customLinks       = 0
  let natalCharts       = 0
  let readings          = 0
  let journalEntries    = 0
  let journalEntityLinks = 0

  for (const e of backup.customEntities ?? []) {
    await saveCustomEntity(e)   // INSERT OR REPLACE (idempotent by canonicalName)
    customEntities++
  }

  for (const l of backup.customLinks ?? []) {
    await saveCustomLink(l)     // INSERT OR REPLACE (idempotent by id)
    customLinks++
  }

  for (const r of backup.natalCharts ?? []) {
    await importNatalChart(r)   // INSERT OR IGNORE (skips if id exists)
    natalCharts++
  }

  for (const r of backup.readings ?? []) {
    await importReading(r)      // INSERT OR IGNORE (skips if id exists)
    readings++
  }

  for (const e of backup.journalEntries ?? []) {
    await importJournalEntry(e) // INSERT OR IGNORE (skips if id exists)
    journalEntries++
  }

  for (const link of backup.journalEntityLinks ?? []) {
    await addEntityLinkToEntry(link.entryId, resolveCanonicalName(link.canonicalName)) // INSERT OR IGNORE
    journalEntityLinks++
  }

  return { customEntities, customLinks, natalCharts, readings, journalEntries, journalEntityLinks }
}
