/**
 * custom-import.ts
 * JSON batch import (and a matching template export) for custom entities —
 * the many-at-once counterpart to the one-at-a-time forms in
 * custom/new.tsx and custom/$cn.tsx. Every read/write here deliberately
 * mirrors those two forms' exact validation and dual-write (SQLite +
 * live adapter) calls, just looped over many rows with a create-vs-update
 * branch based on whether the canonical name already exists.
 *
 * File I/O follows the same Tauri dialog+fs pattern as export-import.ts
 * and art-pack-import.ts (single-file selection only — Tauri's dialog
 * plugin has no folder/multi-file picker on mobile).
 */

import type { GrimoireEngine } from '@grimoire/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { saveCustomEntity, saveCustomLink } from './custom-db'

// ─── Schema ─────────────────────────────────────────────────────────────────

export interface ImportLinkInput {
  target: string
  label: string
  bidirectional?: boolean
  note?: string
}

export interface ImportEntityInput {
  canonicalName: string
  entityType: string
  displayName: string
  description?: string
  userNotes?: string
  tags?: string[]
  extendedData?: Record<string, unknown>
  links?: ImportLinkInput[]
}

export interface ImportRowResult {
  canonicalName: string
  status: 'created' | 'updated' | 'skipped'
  message?: string
}

export interface ImportLinkResult {
  source: string
  target: string
  label: string
  status: 'created' | 'skipped'
  message?: string
}

export interface ImportSummary {
  entities: ImportRowResult[]
  links: ImportLinkResult[]
}

/** Same rule the single-entity form enforces (custom/new.tsx). */
const CANONICAL_NAME_PATTERN = /^[a-z0-9][\w.-]*$/

export function isValidImportCanonicalName(cn: string): boolean {
  return CANONICAL_NAME_PATTERN.test(cn)
}

// ─── Row validation (pure — no I/O) ────────────────────────────────────────

type ValidationResult =
  | { ok: true; value: ImportEntityInput }
  | { ok: false; message: string }

export function validateEntityRow(row: unknown): ValidationResult {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return { ok: false, message: 'Entity entry is not an object.' }
  }
  const r = row as Record<string, unknown>

  const canonicalName = typeof r.canonicalName === 'string' ? r.canonicalName.trim() : ''
  if (!canonicalName) return { ok: false, message: 'Missing canonicalName.' }
  if (!isValidImportCanonicalName(canonicalName)) {
    return { ok: false, message: `Invalid canonicalName "${canonicalName}" — must be lowercase letters, numbers, hyphens, and dots.` }
  }

  const entityType = typeof r.entityType === 'string' ? r.entityType.trim() : ''
  if (!entityType) return { ok: false, message: 'Missing entityType.' }

  const displayName = typeof r.displayName === 'string' ? r.displayName.trim() : ''
  if (!displayName) return { ok: false, message: 'Missing displayName.' }

  const description = typeof r.description === 'string' ? r.description : ''
  const userNotes = typeof r.userNotes === 'string' ? r.userNotes : ''
  const tags = Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : []
  const extendedData = (typeof r.extendedData === 'object' && r.extendedData !== null && !Array.isArray(r.extendedData))
    ? r.extendedData as Record<string, unknown>
    : {}

  const links: ImportLinkInput[] = []
  if (Array.isArray(r.links)) {
    for (const l of r.links) {
      if (typeof l !== 'object' || l === null) continue
      const lr = l as Record<string, unknown>
      const target = typeof lr.target === 'string' ? lr.target.trim() : ''
      const label = typeof lr.label === 'string' ? lr.label.trim() : ''
      if (!target || !label) continue
      links.push({
        target, label,
        bidirectional: typeof lr.bidirectional === 'boolean' ? lr.bidirectional : false,
        note: typeof lr.note === 'string' ? lr.note : '',
      })
    }
  }

  return { ok: true, value: { canonicalName, entityType, displayName, description, userNotes, tags, extendedData, links } }
}

/**
 * Validates every row and rejects in-file duplicate canonical names (the
 * second+ occurrence is reported as skipped, not silently overwritten — a
 * repeated canonical name in one batch is almost certainly a mistake).
 */
export function dedupeAndValidate(rows: unknown[]): { valid: ImportEntityInput[]; results: ImportRowResult[] } {
  const seen = new Set<string>()
  const valid: ImportEntityInput[] = []
  const results: ImportRowResult[] = []

  for (const row of rows) {
    const parsed = validateEntityRow(row)
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

// ─── Batch create/update + links (needs the live engine) ──────────────────

/**
 * Creates or updates every already-validated row, then a second pass creates
 * links for rows that succeeded — so a link's target can point to another
 * entity earlier in the same batch, not just a pre-existing one.
 */
export async function importEntitiesBatch(engine: GrimoireEngine, entities: ImportEntityInput[]): Promise<ImportSummary> {
  const entityResults: ImportRowResult[] = []
  const succeeded: ImportEntityInput[] = []

  for (const row of entities) {
    const existing = await engine.adapter.getEntityByCanonicalName(row.canonicalName)
    if (existing?.isBuiltIn) {
      entityResults.push({ canonicalName: row.canonicalName, status: 'skipped', message: 'Canonical name belongs to a built-in entity.' })
      continue
    }

    const now = new Date().toISOString()
    try {
      if (existing) {
        await saveCustomEntity({
          id: existing.id, canonicalName: row.canonicalName, entityType: row.entityType, displayName: row.displayName,
          description: row.description ?? '', userNotes: row.userNotes ?? '',
          tags: row.tags ?? [], extendedData: row.extendedData ?? {},
          createdAt: existing.createdAt, updatedAt: now,
        })
        await engine.adapter.updateEntity(existing.id, {
          primaryDisplayName: row.displayName,
          description: row.description || undefined,
          userNotes: row.userNotes || undefined,
          tags: row.tags ?? [], extendedData: row.extendedData ?? {},
        })
        entityResults.push({ canonicalName: row.canonicalName, status: 'updated' })
      } else {
        await saveCustomEntity({
          id: crypto.randomUUID(), canonicalName: row.canonicalName, entityType: row.entityType, displayName: row.displayName,
          description: row.description ?? '', userNotes: row.userNotes ?? '',
          tags: row.tags ?? [], extendedData: row.extendedData ?? {},
          createdAt: now, updatedAt: now,
        })
        await engine.adapter.createEntity({
          canonicalName: row.canonicalName, entityType: row.entityType, primaryDisplayName: row.displayName,
          description: row.description || undefined,
          userNotes: row.userNotes || undefined,
          tags: row.tags ?? [], extendedData: row.extendedData ?? {},
          isBuiltIn: false,
        })
        entityResults.push({ canonicalName: row.canonicalName, status: 'created' })
      }
      succeeded.push(row)
    } catch (err) {
      entityResults.push({ canonicalName: row.canonicalName, status: 'skipped', message: err instanceof Error ? err.message : 'Failed to save entity.' })
    }
  }

  const linkResults: ImportLinkResult[] = []
  for (const row of succeeded) {
    for (const link of row.links ?? []) {
      const target = await engine.adapter.getEntityByCanonicalName(link.target)
      if (!target) {
        linkResults.push({ source: row.canonicalName, target: link.target, label: link.label, status: 'skipped', message: `Entity "${link.target}" not found.` })
        continue
      }
      try {
        await saveCustomLink({
          id: crypto.randomUUID(), sourceCn: row.canonicalName, targetCn: link.target,
          label: link.label, traditionScope: [], bidirectional: link.bidirectional ?? false,
          note: link.note ?? '', createdAt: new Date().toISOString(),
        })
        await engine.adapter.createLink({
          sourceCanonicalName: row.canonicalName, targetCanonicalName: link.target,
          label: link.label, bidirectional: link.bidirectional ?? false,
          traditionScope: [], isBuiltIn: false, note: link.note || undefined, extendedData: {},
        })
        linkResults.push({ source: row.canonicalName, target: link.target, label: link.label, status: 'created' })
      } catch (err) {
        linkResults.push({ source: row.canonicalName, target: link.target, label: link.label, status: 'skipped', message: err instanceof Error ? err.message : 'Failed to save link.' })
      }
    }
  }

  return { entities: entityResults, links: linkResults }
}

// ─── File picking ───────────────────────────────────────────────────────────

interface ImportFile {
  version?: string
  entities?: unknown[]
}

/**
 * Shows a native Open dialog for a .json file and imports it. Returns null
 * if the user cancelled; throws if the file isn't valid JSON, has an
 * unsupported version, or has no "entities" array — those are whole-file
 * problems, unlike individual row/link failures, which are partial (see
 * ImportSummary) rather than fatal.
 */
export async function pickAndImportCustomEntities(engine: GrimoireEngine): Promise<ImportSummary | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Custom Entities', extensions: ['json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)
  const parsed = JSON.parse(text) as ImportFile

  if (parsed.version !== '1') {
    throw new Error(`Unsupported import file version: ${parsed.version ?? '(none)'}`)
  }
  if (!Array.isArray(parsed.entities)) {
    throw new Error('Import file is missing an "entities" array.')
  }

  const { valid, results: dedupeResults } = dedupeAndValidate(parsed.entities)
  const batch = await importEntitiesBatch(engine, valid)

  return {
    entities: [...dedupeResults, ...batch.entities],
    links: batch.links,
  }
}

// ─── Template export ────────────────────────────────────────────────────────

const IMPORT_TEMPLATE = {
  version: '1',
  $comment:
    'Batch-import file for Grimoire Atziluth custom entities. Only "version" and "entities" ' +
    'are read by the importer — this comment field (and any other unrecognised key) is ' +
    'ignored, so feel free to remove it. Each entity needs canonicalName, entityType, and ' +
    'displayName; everything else is optional. Re-importing a file whose canonicalName ' +
    'already matches an existing CUSTOM entity updates it in place rather than duplicating ' +
    'it; a canonicalName matching a BUILT-IN entity is rejected instead, to protect built-in ' +
    'data. Links can point to any existing entity (built-in or custom) or to another entity ' +
    'defined later in this same file.',
  entities: [
    {
      canonicalName: 'custom.herb.example-minimal',
      entityType: 'herb',
      displayName: 'Example Herb (minimal)',
    },
    {
      canonicalName: 'custom.deity.example-full',
      entityType: 'deity',
      displayName: 'Example Deity (full)',
      description: 'A longer description of this entity, shown on its Reference page.',
      userNotes: 'Private notes only you see.',
      tags: ['example', 'template'],
      extendedData: {
        domain: 'wisdom',
        favoredColor: 'blue',
        attributes: ['patient', 'watchful'],
      },
      links: [
        { target: 'astrology.planet.mercury', label: 'associated-with', bidirectional: true, note: 'Example link to a built-in entity.' },
        { target: 'custom.herb.example-minimal', label: 'corresponds-to', bidirectional: false, note: 'Example link to another entity defined in this same file.' },
      ],
    },
  ],
}

/**
 * Shows a native Save dialog and writes the template file. Returns null if
 * the user cancelled, otherwise the saved path.
 */
export async function exportImportTemplate(): Promise<string | null> {
  const path = await save({
    defaultPath: 'custom-entities-template.json',
    filters: [{ name: 'Custom Entities', extensions: ['json'] }],
  })
  if (!path) return null
  await writeTextFile(path, JSON.stringify(IMPORT_TEMPLATE, null, 2))
  return path
}
