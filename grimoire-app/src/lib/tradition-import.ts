/**
 * tradition-import.ts
 * JSON batch import/export (and a matching template export) for custom
 * traditions — the tradition equivalent of custom-import.ts. Mirrors that
 * file's structure (validate -> dedupe -> batch dual-write -> file I/O)
 * and traditions.tsx's handleSave dual-write (SQLite + live adapter), just
 * looped over many rows with a create-vs-update branch based on whether the
 * canonical name already exists.
 */

import type { GrimoireEngine } from '@grimoire/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { saveCustomTradition, getCustomTraditionByCN } from './custom-db'
import type { CustomTraditionRecord, CustomRelType } from './custom-db'

// ─── Schema ─────────────────────────────────────────────────────────────────

export interface ImportRelTypeInput {
  linkLabel: string
  displayName: string
  targetEntityType?: string
  allowMultiple?: boolean
}

export interface ImportTraditionInput {
  canonicalName: string
  displayName: string
  description?: string
  relTypes?: ImportRelTypeInput[]
}

export interface ImportTraditionRowResult {
  canonicalName: string
  status: 'created' | 'updated' | 'skipped'
  message?: string
}

export interface ImportTraditionSummary {
  traditions: ImportTraditionRowResult[]
}

/** Same rule the single-entity form enforces (custom-import.ts / custom/new.tsx). */
const CANONICAL_NAME_PATTERN = /^[a-z0-9][\w.-]*$/

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

// ─── Row validation (pure — no I/O) ────────────────────────────────────────

type ValidationResult =
  | { ok: true; value: ImportTraditionInput }
  | { ok: false; message: string }

function validateRelTypeRow(row: unknown): ImportRelTypeInput | null {
  if (typeof row !== 'object' || row === null) return null
  const r = row as Record<string, unknown>
  const linkLabel = typeof r.linkLabel === 'string' ? r.linkLabel.trim() : ''
  const displayName = typeof r.displayName === 'string' ? r.displayName.trim() : ''
  if (!linkLabel || !displayName) return null
  return {
    linkLabel,
    displayName,
    targetEntityType: typeof r.targetEntityType === 'string' ? r.targetEntityType.trim() || undefined : undefined,
    allowMultiple: typeof r.allowMultiple === 'boolean' ? r.allowMultiple : false,
  }
}

export function validateTraditionRow(row: unknown): ValidationResult {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return { ok: false, message: 'Tradition entry is not an object.' }
  }
  const r = row as Record<string, unknown>

  const canonicalName = typeof r.canonicalName === 'string' ? r.canonicalName.trim() : ''
  if (!canonicalName) return { ok: false, message: 'Missing canonicalName.' }
  if (!CANONICAL_NAME_PATTERN.test(canonicalName)) {
    return { ok: false, message: `Invalid canonicalName "${canonicalName}" — must be lowercase letters, numbers, hyphens, and dots.` }
  }

  const displayName = typeof r.displayName === 'string' ? r.displayName.trim() : ''
  if (!displayName) return { ok: false, message: 'Missing displayName.' }

  const description = typeof r.description === 'string' ? r.description : ''
  const relTypes: ImportRelTypeInput[] = Array.isArray(r.relTypes)
    ? r.relTypes.map(validateRelTypeRow).filter((rt): rt is ImportRelTypeInput => rt !== null)
    : []

  return { ok: true, value: { canonicalName, displayName, description, relTypes } }
}

/** Validates every row and rejects in-file duplicate canonical names (mirrors
 *  dedupeAndValidate in custom-import.ts). */
export function dedupeAndValidateTraditions(rows: unknown[]): { valid: ImportTraditionInput[]; results: ImportTraditionRowResult[] } {
  const seen = new Set<string>()
  const valid: ImportTraditionInput[] = []
  const results: ImportTraditionRowResult[] = []

  for (const row of rows) {
    const parsed = validateTraditionRow(row)
    if (!parsed.ok) {
      const recovered = (typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>).canonicalName === 'string')
        ? (row as Record<string, unknown>).canonicalName as string
        : '(unknown)'
      results.push({ canonicalName: recovered, status: 'skipped', message: parsed.message })
      continue
    }
    if (seen.has(parsed.value.canonicalName)) {
      results.push({ canonicalName: parsed.value.canonicalName, status: 'skipped', message: 'Duplicate canonical name in this file.' })
      continue
    }
    seen.add(parsed.value.canonicalName)
    valid.push(parsed.value)
  }

  return { valid, results }
}

// ─── Batch create/update (needs the live engine) ───────────────────────────

export async function importTraditionsBatch(engine: GrimoireEngine, traditions: ImportTraditionInput[]): Promise<ImportTraditionRowResult[]> {
  const results: ImportTraditionRowResult[] = []

  for (const row of traditions) {
    const existingEntity = await engine.adapter.getTraditionByCanonicalName(row.canonicalName)
    if (existingEntity?.isBuiltIn) {
      results.push({ canonicalName: row.canonicalName, status: 'skipped', message: 'Canonical name belongs to a built-in tradition.' })
      continue
    }

    const relTypes: CustomRelType[] = (row.relTypes ?? []).map(rt => ({
      linkLabel: rt.linkLabel,
      displayName: rt.displayName,
      targetEntityType: rt.targetEntityType ?? '',
      allowMultiple: rt.allowMultiple ?? false,
    }))
    const now = new Date().toISOString()

    try {
      const existingCustom = await getCustomTraditionByCN(row.canonicalName)
      const record: CustomTraditionRecord = {
        id: existingCustom?.id ?? crypto.randomUUID(),
        canonicalName: row.canonicalName,
        displayName: row.displayName,
        description: row.description ?? '',
        relTypes,
        createdAt: existingCustom?.createdAt ?? now,
        updatedAt: now,
      }
      await saveCustomTradition(record)

      if (existingEntity) {
        // Matches the single-edit form's own limitation (traditions.tsx handleSave):
        // relTypes/attributionFields aren't updatable via updateTradition, only
        // displayName/description are. The SQLite record above is the source of
        // truth the app reads relTypes from either way.
        await engine.adapter.updateTradition(existingEntity.id, {
          displayName: record.displayName,
          description: record.description || undefined,
        }).catch(() => {})
        results.push({ canonicalName: row.canonicalName, status: 'updated' })
      } else {
        await engine.adapter.createTradition({
          canonicalName: row.canonicalName,
          displayName: record.displayName,
          description: record.description || undefined,
          isBuiltIn: false,
          attributionFields: relTypes.map((rt, i) => ({
            linkLabel: rt.linkLabel, displayName: rt.displayName,
            targetEntityType: rt.targetEntityType || undefined,
            allowMultiple: rt.allowMultiple, sortOrder: i,
          })),
        })
        results.push({ canonicalName: row.canonicalName, status: 'created' })
      }
    } catch (err) {
      results.push({ canonicalName: row.canonicalName, status: 'skipped', message: err instanceof Error ? err.message : 'Failed to save tradition.' })
    }
  }

  return results
}

// ─── File picking ───────────────────────────────────────────────────────────

interface TraditionImportFile {
  version?: string
  traditions?: unknown[]
}

/** Shows a native Open dialog for a .json file and imports it. Returns null
 *  if the user cancelled; throws on whole-file problems (bad JSON, wrong
 *  version, missing "traditions" array). */
export async function pickAndImportCustomTraditions(engine: GrimoireEngine): Promise<ImportTraditionSummary | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Custom Traditions', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as TraditionImportFile

  if (parsed.version !== '1') {
    throw new Error(`Unsupported import file version: ${parsed.version ?? '(none)'}`)
  }
  if (!Array.isArray(parsed.traditions)) {
    throw new Error('Import file is missing a "traditions" array.')
  }

  const { valid, results: dedupeResults } = dedupeAndValidateTraditions(parsed.traditions)
  const batchResults = await importTraditionsBatch(engine, valid)

  return { traditions: [...dedupeResults, ...batchResults] }
}

// ─── Template export ────────────────────────────────────────────────────────

const TRADITION_IMPORT_TEMPLATE = {
  version: '1',
  $comment:
    'Batch-import file for Grimoire Atziluth custom traditions. Only "version" and ' +
    '"traditions" are read by the importer — this comment field (and any other ' +
    'unrecognised key) is ignored, so feel free to remove it. Each tradition needs ' +
    'canonicalName and displayName; everything else is optional. Re-importing a file ' +
    'whose canonicalName already matches an existing CUSTOM tradition updates it in ' +
    'place rather than duplicating it; a canonicalName matching a BUILT-IN tradition is ' +
    'rejected instead. relTypes define the attribution fields this tradition exposes on ' +
    'entities (see the Custom Traditions editor for the same concept).',
  traditions: [
    {
      canonicalName: 'tradition.example-minimal',
      displayName: 'Example Tradition (minimal)',
    },
    {
      canonicalName: 'tradition.example-full',
      displayName: 'Example Tradition (full)',
      description: 'A longer description of this tradition, shown in the Custom Traditions list.',
      relTypes: [
        { linkLabel: 'rules-over', displayName: 'Rules Over', targetEntityType: 'custom.deity', allowMultiple: true },
        { linkLabel: 'associated-color', displayName: 'Associated Color', targetEntityType: 'colour.colour', allowMultiple: false },
      ],
    },
  ],
}

/** Shows a native Save dialog and writes the template file. Returns null if
 *  the user cancelled, otherwise the saved path. */
export async function exportTraditionImportTemplate(): Promise<string | null> {
  const path = await save({
    defaultPath: 'custom-traditions-template.json',
    filters: [{ name: 'Custom Traditions', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify(TRADITION_IMPORT_TEMPLATE, null, 2))
  return path
}

// ─── Live export ────────────────────────────────────────────────────────────

function traditionRecordToExportRow(t: CustomTraditionRecord): ImportTraditionInput {
  return {
    canonicalName: t.canonicalName,
    displayName: t.displayName,
    description: t.description || undefined,
    relTypes: t.relTypes.length > 0
      ? t.relTypes.map(rt => ({
          linkLabel: rt.linkLabel, displayName: rt.displayName,
          targetEntityType: rt.targetEntityType || undefined,
          allowMultiple: rt.allowMultiple || undefined,
        }))
      : undefined,
  }
}

/** Exports the given custom tradition records as one {version, traditions} file
 *  — the write-side counterpart to pickAndImportCustomTraditions. */
export async function exportCustomTraditions(traditions: CustomTraditionRecord[], suggestedFileNameBase: string): Promise<string | null> {
  const path = await save({
    defaultPath: `${slugify(suggestedFileNameBase)}.json`,
    filters: [{ name: 'Custom Traditions', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify({
    version: '1' as const,
    exportedAt: new Date().toISOString(),
    traditions: traditions.map(traditionRecordToExportRow),
  }, null, 2))
  return path
}

export async function exportCustomTradition(t: CustomTraditionRecord): Promise<string | null> {
  return exportCustomTraditions([t], t.displayName)
}
