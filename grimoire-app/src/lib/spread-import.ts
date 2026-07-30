/**
 * spread-import.ts
 * JSON batch import/export (and a matching template export) for custom
 * spreads — the spread equivalent of custom-import.ts. Spreads have no
 * canonical name (they're not entities), so create-vs-update instead
 * matches on displayName (case-insensitive) against already-saved custom
 * spreads, and positions are plain SQLite data rather than dual-written to
 * the live adapter.
 */

import type { SpreadPosition } from '@grimoire/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { getAllCustomSpreads, saveCustomSpread } from './custom-db'
import type { CustomSpreadRecord } from './custom-db'

// ─── Schema ─────────────────────────────────────────────────────────────────

const ORIENTATION_RULES = new Set(['upright-reversed', 'directional', 'none'])

export interface ImportPositionInput {
  name: string
  meaning?: string
  drawOrder?: number
  orientationRule?: 'upright-reversed' | 'directional' | 'none'
  x?: number
  y?: number
  z?: number
}

export interface ImportSpreadInput {
  displayName: string
  description?: string
  positions?: ImportPositionInput[]
}

export interface ImportSpreadRowResult {
  displayName: string
  status: 'created' | 'updated' | 'skipped'
  message?: string
}

export interface ImportSpreadSummary {
  spreads: ImportSpreadRowResult[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

function newSpreadId(): string {
  return `custom-spread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function newPositionId(): string {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function clampCoord(v: number | undefined, fallback: number): number {
  return Math.max(0, Math.min(4, v ?? fallback))
}

// ─── Row validation (pure — no I/O) ────────────────────────────────────────

type ValidationResult =
  | { ok: true; value: ImportSpreadInput }
  | { ok: false; message: string }

function validatePositionRow(row: unknown): ImportPositionInput | null {
  if (typeof row !== 'object' || row === null) return null
  const r = row as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return null
  return {
    name,
    meaning: typeof r.meaning === 'string' ? r.meaning : undefined,
    drawOrder: typeof r.drawOrder === 'number' ? r.drawOrder : undefined,
    orientationRule: typeof r.orientationRule === 'string' && ORIENTATION_RULES.has(r.orientationRule)
      ? r.orientationRule as ImportPositionInput['orientationRule']
      : undefined,
    x: typeof r.x === 'number' ? r.x : undefined,
    y: typeof r.y === 'number' ? r.y : undefined,
    z: typeof r.z === 'number' ? r.z : undefined,
  }
}

export function validateSpreadRow(row: unknown): ValidationResult {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return { ok: false, message: 'Spread entry is not an object.' }
  }
  const r = row as Record<string, unknown>

  const displayName = typeof r.displayName === 'string' ? r.displayName.trim() : ''
  if (!displayName) return { ok: false, message: 'Missing displayName.' }

  const description = typeof r.description === 'string' ? r.description : ''
  const positions = Array.isArray(r.positions)
    ? r.positions.map(validatePositionRow).filter((p): p is ImportPositionInput => p !== null)
    : []

  return { ok: true, value: { displayName, description, positions } }
}

/** Validates every row and rejects in-file duplicate display names (case-
 *  insensitive) — spreads have no canonical name to dedupe on instead. */
export function dedupeAndValidateSpreads(rows: unknown[]): { valid: ImportSpreadInput[]; results: ImportSpreadRowResult[] } {
  const seen = new Set<string>()
  const valid: ImportSpreadInput[] = []
  const results: ImportSpreadRowResult[] = []

  for (const row of rows) {
    const parsed = validateSpreadRow(row)
    if (!parsed.ok) {
      const recovered = (typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>).displayName === 'string')
        ? (row as Record<string, unknown>).displayName as string
        : '(unknown)'
      results.push({ displayName: recovered, status: 'skipped', message: parsed.message })
      continue
    }
    const key = parsed.value.displayName.trim().toLowerCase()
    if (seen.has(key)) {
      results.push({ displayName: parsed.value.displayName, status: 'skipped', message: 'Duplicate display name in this file.' })
      continue
    }
    seen.add(key)
    valid.push(parsed.value)
  }

  return { valid, results }
}

// ─── Batch create/update ────────────────────────────────────────────────────

export async function importSpreadsBatch(spreads: ImportSpreadInput[]): Promise<ImportSpreadRowResult[]> {
  const existingSpreads = await getAllCustomSpreads()
  const results: ImportSpreadRowResult[] = []

  for (const row of spreads) {
    const existing = existingSpreads.find(s => s.displayName.trim().toLowerCase() === row.displayName.trim().toLowerCase())

    const positions: SpreadPosition[] = (row.positions ?? []).map((p, i) => ({
      id: newPositionId(),
      name: p.name,
      meaning: p.meaning ?? '',
      drawOrder: p.drawOrder ?? i + 1,
      orientationRule: p.orientationRule ?? 'upright-reversed',
      x: clampCoord(p.x, i % 5),
      y: clampCoord(p.y, Math.floor(i / 5) * 2),
      z: clampCoord(p.z, 0),
    }))
    const now = new Date().toISOString()

    try {
      const record: CustomSpreadRecord = {
        id: existing?.id ?? newSpreadId(),
        displayName: row.displayName,
        description: row.description ?? '',
        positions,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await saveCustomSpread(record)
      results.push({ displayName: row.displayName, status: existing ? 'updated' : 'created' })
    } catch (err) {
      results.push({ displayName: row.displayName, status: 'skipped', message: err instanceof Error ? err.message : 'Failed to save spread.' })
    }
  }

  return results
}

// ─── File picking ───────────────────────────────────────────────────────────

interface SpreadImportFile {
  version?: string
  spreads?: unknown[]
}

/** Shows a native Open dialog for a .json file and imports it. Returns null
 *  if the user cancelled; throws on whole-file problems (bad JSON, wrong
 *  version, missing "spreads" array). */
export async function pickAndImportCustomSpreads(): Promise<ImportSpreadSummary | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Custom Spreads', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as SpreadImportFile

  if (parsed.version !== '1') {
    throw new Error(`Unsupported import file version: ${parsed.version ?? '(none)'}`)
  }
  if (!Array.isArray(parsed.spreads)) {
    throw new Error('Import file is missing a "spreads" array.')
  }

  const { valid, results: dedupeResults } = dedupeAndValidateSpreads(parsed.spreads)
  const batchResults = await importSpreadsBatch(valid)

  return { spreads: [...dedupeResults, ...batchResults] }
}

// ─── Template export ────────────────────────────────────────────────────────

const SPREAD_IMPORT_TEMPLATE = {
  version: '1',
  $comment:
    'Batch-import file for Grimoire Atziluth custom spreads. Only "version" and ' +
    '"spreads" are read by the importer — this comment field (and any other ' +
    'unrecognised key) is ignored, so feel free to remove it. Each spread needs ' +
    'displayName; everything else is optional — omit "positions" entirely for a ' +
    'free-form (single/open draw) spread. Re-importing a file whose displayName ' +
    'matches an existing custom spread (case-insensitive) updates it in place rather ' +
    'than duplicating it. x/y/z are grid coordinates 0-4; orientationRule is one of ' +
    '"upright-reversed", "directional", or "none".',
  spreads: [
    { displayName: 'Example Spread (minimal / free-form)' },
    {
      displayName: 'Example Spread (full, 3 positions)',
      description: 'A longer description of this spread, shown in the Custom Spreads list.',
      positions: [
        { name: 'Past', meaning: 'What led to this situation.', drawOrder: 1, orientationRule: 'upright-reversed', x: 0, y: 0, z: 0 },
        { name: 'Present', meaning: 'The current state of things.', drawOrder: 2, orientationRule: 'upright-reversed', x: 1, y: 0, z: 0 },
        { name: 'Future', meaning: 'Where this is heading.', drawOrder: 3, orientationRule: 'upright-reversed', x: 2, y: 0, z: 0 },
      ],
    },
  ],
}

/** Shows a native Save dialog and writes the template file. Returns null if
 *  the user cancelled, otherwise the saved path. */
export async function exportSpreadImportTemplate(): Promise<string | null> {
  const path = await save({
    defaultPath: 'custom-spreads-template.json',
    filters: [{ name: 'Custom Spreads', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify(SPREAD_IMPORT_TEMPLATE, null, 2))
  return path
}

// ─── Live export ────────────────────────────────────────────────────────────

function spreadRecordToExportRow(s: CustomSpreadRecord): ImportSpreadInput {
  return {
    displayName: s.displayName,
    description: s.description || undefined,
    positions: s.positions.length > 0
      ? s.positions.map(p => ({
          name: p.name, meaning: p.meaning || undefined, drawOrder: p.drawOrder,
          orientationRule: p.orientationRule, x: p.x, y: p.y, z: p.z,
        }))
      : undefined,
  }
}

/** Exports the given custom spread records as one {version, spreads} file —
 *  the write-side counterpart to pickAndImportCustomSpreads. */
export async function exportCustomSpreads(spreads: CustomSpreadRecord[], suggestedFileNameBase: string): Promise<string | null> {
  const path = await save({
    defaultPath: `${slugify(suggestedFileNameBase)}.json`,
    filters: [{ name: 'Custom Spreads', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify({
    version: '1' as const,
    exportedAt: new Date().toISOString(),
    spreads: spreads.map(spreadRecordToExportRow),
  }, null, 2))
  return path
}

export async function exportCustomSpread(s: CustomSpreadRecord): Promise<string | null> {
  return exportCustomSpreads([s], s.displayName)
}
