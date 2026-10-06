/**
 * ritual-io.ts
 * Export/import a Practice page ritual (pinned references, ritual-space
 * correspondence picks, widget slots, notes) as a JSON file, or save/load it
 * as a custom entity — entityType 'ritual', the same flat type the Custom
 * page's manual "New Entity" form already offers ("Ritual / Practice") — so
 * a saved ritual is browsable there like any other custom entity.
 */

import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { GrimoireEngine } from '@grimoire/core'
import { saveCustomEntity, getAllCustomEntities } from './custom-db'
import type { CustomEntityRecord } from './custom-db'
import type { RitualWidgetState } from './practice-store'

export interface RitualSnapshot {
  pinnedCanonicalNames: string[]
  slotPicks: Record<string, string>
  widgetSlots: Record<string, RitualWidgetState>
  notes: string
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Slugify + a short random suffix, same approach as custom-db.ts's
 *  generateDeckCanonicalName — guarantees uniqueness by construction, since
 *  this has no user-facing canonical-name field to show a collision error against. */
function newRitualCanonicalName(displayName: string): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `custom.ritual.${slugify(displayName) || 'ritual'}-${suffix}`
}

function isRitualSnapshot(v: unknown): v is RitualSnapshot {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return Array.isArray(r.pinnedCanonicalNames)
    && typeof r.slotPicks === 'object' && r.slotPicks !== null
    && typeof r.widgetSlots === 'object' && r.widgetSlots !== null
    && typeof r.notes === 'string'
}

// ─── File export/import ─────────────────────────────────────────────────────

interface RitualExportFile {
  version: '1'
  exportedAt: string
  displayName: string
  ritual: RitualSnapshot
}

/** Shows a native Save dialog and writes the ritual as JSON. Returns null if
 *  the user cancelled. */
export async function exportRitualToFile(snapshot: RitualSnapshot, displayName: string): Promise<string | null> {
  const path = await save({
    defaultPath: `${slugify(displayName) || 'ritual'}.json`,
    filters: [{ name: 'Ritual', extensions: ['json'] }],
  })
  if (!path) return null

  const file: RitualExportFile = {
    version: '1',
    exportedAt: new Date().toISOString(),
    displayName,
    ritual: snapshot,
  }
  await writeTextFile(path, JSON.stringify(file, null, 2))
  return path
}

/** Shows a native Open dialog for a ritual .json file. Returns null if the
 *  user cancelled; throws if the file isn't valid JSON, has an unsupported
 *  version, or has no usable "ritual" section. */
export async function pickAndImportRitualFile(): Promise<{ displayName: string; snapshot: RitualSnapshot } | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Ritual', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as Partial<RitualExportFile>

  if (parsed.version !== '1') {
    throw new Error(`Unsupported ritual file version: ${parsed.version ?? '(none)'}`)
  }
  if (!isRitualSnapshot(parsed.ritual)) {
    throw new Error('Ritual file is missing or has an invalid "ritual" section.')
  }

  return { displayName: parsed.displayName || 'Imported Ritual', snapshot: parsed.ritual }
}

// ─── Save/load as a custom entity ───────────────────────────────────────────

/** Persists the ritual both to the custom-entities table and into the live
 *  engine adapter, mirroring custom/new.tsx's save flow exactly — without the
 *  engine.adapter.createEntity() call, the saved ritual wouldn't be visible
 *  to the Custom page (or this session's "Load Saved Ritual" list) until a
 *  full app restart re-seeds custom entities from the DB. */
export async function saveRitualAsCustomEntity(
  engine: GrimoireEngine,
  snapshot: RitualSnapshot,
  displayName: string,
): Promise<void> {
  const now = new Date().toISOString()
  const canonicalName = newRitualCanonicalName(displayName)
  const extendedData = snapshot as unknown as Record<string, unknown>
  const record: CustomEntityRecord = {
    id: crypto.randomUUID(),
    canonicalName,
    entityType: 'ritual',
    displayName,
    description: '',
    userNotes: '',
    tags: ['ritual'],
    extendedData,
    createdAt: now,
    updatedAt: now,
  }
  await saveCustomEntity(record)
  await engine.adapter.createEntity({
    canonicalName, entityType: 'ritual', primaryDisplayName: displayName,
    tags: ['ritual'], extendedData,
    isBuiltIn: false,
  })
}

/** Custom entities of type 'ritual' that actually hold a ritual snapshot —
 *  a user could also hand-create a plain 'ritual' entity via the Custom
 *  page's "New Entity" form, which has no snapshot to load, so those are
 *  filtered out here rather than surfaced as a broken "Load" option. */
export async function getSavedRituals(): Promise<{ record: CustomEntityRecord; snapshot: RitualSnapshot }[]> {
  const all = await getAllCustomEntities()
  const rituals: { record: CustomEntityRecord; snapshot: RitualSnapshot }[] = []
  for (const record of all) {
    if (record.entityType === 'ritual' && isRitualSnapshot(record.extendedData)) {
      rituals.push({ record, snapshot: record.extendedData })
    }
  }
  return rituals
}
