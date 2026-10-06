/**
 * journal-import.ts
 * Single-entry export/import for a journal entry and the readings grouped
 * under it — the entry-scoped counterpart to the full backup at
 * Settings > Data (export-import.ts), for sharing or archiving one entry at
 * a time instead of the whole database.
 *
 * The file is Markdown (.md), matching the app's own native notes format
 * (RichTextEditor/RichTextRenderer already serialise entry/reading notes as
 * Markdown) rather than raw JSON — readable and editable in any text editor.
 * Each reading section reuses readingToMarkdown() (reading-export.ts), the
 * same renderer behind a single reading's own "Export as Markdown" button.
 *
 * For a lossless round-trip, the exact data is also embedded as a hidden
 * HTML comment at the top of the file. On import, that comment (when present
 * and valid) is used directly — same id-preserving INSERT OR IGNORE
 * semantics as the old JSON format, and a plain .json file from that old
 * format still imports correctly too. When the comment is absent (a
 * hand-written note, an edited file, or someone re-importing a single
 * reading's own bare Markdown export — which has no entry wrapper and no
 * hidden comment at all), the file is instead parsed best-effort from its
 * visible prose: deck/spread/card names are matched by display name against
 * built-in and custom data, unmatched cards are skipped, and an unmatched
 * deck/spread falls back to a free reading rather than failing outright.
 */

import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { GrimoireEngine, Reading, SpreadDefinition } from '@grimoire/core'
import { newId, nowIso } from '@grimoire/core'
import type { JournalEntry } from './reading-db'
import { importJournalEntry, importReading } from './reading-db'
import { readingToMarkdown } from './reading-export'
import { BUILT_IN_DECK_FILTERS, BUILT_IN_SPREADS } from './built-in-data'
import { getAllCustomDecks, getAllCustomSpreads, spreadRecordToDefinition } from './custom-db'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journal-entry'
}

interface JournalEntryExportFile {
  version: '1'
  exportedAt: string
  entry: JournalEntry
  readings: Reading[]
}

const HIDDEN_MARKER = 'grimoire-journal-entry:v1'

// ─── Export ─────────────────────────────────────────────────────────────────

/** Index both parent deck IDs and variant IDs → display label, built-in only
 *  (matches the fallback already accepted elsewhere for a reading's own deck
 *  label — see ReadingRow's deckNameById in journal/index.tsx). */
const builtInDeckNameById = new Map<string, string>()
for (const d of BUILT_IN_DECK_FILTERS) {
  builtInDeckNameById.set(d.id, d.displayName)
  for (const v of d.variants ?? []) {
    builtInDeckNameById.set(v.id, `${d.displayName} — ${v.label}`)
  }
}

async function buildReadingSection(
  reading: Reading, engine: GrimoireEngine, spreadById: Map<string, SpreadDefinition>
): Promise<string> {
  const spread = reading.spreadId ? spreadById.get(reading.spreadId) ?? null : null
  const deckName = builtInDeckNameById.get(reading.deckId) ?? reading.deckId
  const positionNames = new Map((spread?.positions ?? []).map(p => [p.id, p.name]))

  const uniqueCns = [...new Set(reading.cards.map(c => c.cardCanonicalName))]
  const entities = await Promise.all(uniqueCns.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
  const entityNames = new Map<string, string>()
  uniqueCns.forEach((cn, i) => {
    const e = entities[i]
    if (e) entityNames.set(cn, e.primaryDisplayName)
  })

  return readingToMarkdown(reading, spread?.displayName ?? null, deckName, positionNames, entityNames)
}

/**
 * Exports one journal entry plus the readings grouped under it as a single
 * Markdown file — the write-side counterpart to pickAndImportJournalEntry().
 * Returns null if the user cancelled the Save dialog, otherwise the saved path.
 */
export async function exportJournalEntry(
  entry: JournalEntry, readings: Reading[], engine: GrimoireEngine, spreadById: Map<string, SpreadDefinition>
): Promise<string | null> {
  const path = await save({
    defaultPath: `${slugify(entry.title ?? 'journal-entry')}.md`,
    filters: [{ name: 'Journal Entry (Markdown)', extensions: ['md'] }],
  })
  if (!path) return null

  const payload: JournalEntryExportFile = { version: '1', exportedAt: new Date().toISOString(), entry, readings }

  const lines: string[] = [
    `<!-- ${HIDDEN_MARKER}\n${JSON.stringify(payload)}\n-->`,
    '',
    `# ${entry.title ?? 'Journal Entry'}`,
    '',
    `**Date:** ${new Date(`${entry.entryDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
  ]
  if (entry.notes.trim()) {
    lines.push(entry.notes.trim(), '')
  }

  if (readings.length) {
    lines.push('---', '')
    for (const reading of readings) {
      lines.push(await buildReadingSection(reading, engine, spreadById))
      lines.push('', '---', '')
    }
  }

  await writeTextFile(path, lines.join('\n'))
  return path
}

// ─── Import ─────────────────────────────────────────────────────────────────

export interface JournalEntryImportSummary {
  title: string
  entryAlreadyExisted: boolean
  readingsImported: number
  readingsAlreadyExisted: number
  /** Set when the file had no embedded exact data and was reconstructed from
   *  its visible Markdown instead — a best-effort, potentially lossy parse. */
  reconstructedFromMarkdown: boolean
  /** Cards mentioned in the Markdown that couldn't be matched to any entity
   *  (only meaningful when reconstructedFromMarkdown is true). */
  cardsSkipped: number
}

function isJournalEntryShape(v: unknown): v is JournalEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.entryDate === 'string' && typeof e.notes === 'string'
}

function isExportFileShape(v: unknown): v is JournalEntryExportFile {
  if (typeof v !== 'object' || v === null) return false
  const f = v as Record<string, unknown>
  return f.version === '1' && isJournalEntryShape(f.entry)
}

/** Extracts and validates the hidden lossless payload, whether it's inside an
 *  HTML comment (current Markdown format) or is the entire file (old .json
 *  format, or a hand-renamed copy of one). Returns null if neither is found. */
function extractExactPayload(text: string): JournalEntryExportFile | null {
  const commentMatch = new RegExp(`<!--\\s*${HIDDEN_MARKER}\\s*([\\s\\S]*?)-->`).exec(text)
  const candidates = commentMatch ? [commentMatch[1]] : [text]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim())
      if (isExportFileShape(parsed)) {
        return { version: '1', exportedAt: parsed.exportedAt ?? new Date().toISOString(), entry: parsed.entry, readings: Array.isArray(parsed.readings) ? parsed.readings : [] }
      }
    } catch { /* not JSON, or not this shape — try the next candidate */ }
  }
  return null
}

async function importExactPayload(payload: JournalEntryExportFile): Promise<JournalEntryImportSummary> {
  const { inserted: entryInserted } = await importJournalEntry(payload.entry)

  let readingsImported = 0
  let readingsAlreadyExisted = 0
  for (const r of payload.readings) {
    const { inserted } = await importReading(r)
    if (inserted) readingsImported++
    else readingsAlreadyExisted++
  }

  return {
    title: payload.entry.title ?? 'Journal Entry',
    entryAlreadyExisted: !entryInserted,
    readingsImported,
    readingsAlreadyExisted,
    reconstructedFromMarkdown: false,
    cardsSkipped: 0,
  }
}

// ─── Best-effort Markdown reconstruction (no embedded exact data) ──────────

interface ParsedCard {
  positionName: string | null
  cardName: string
  reversed: boolean
}

interface ParsedReadingBlock {
  spreadName: string | null
  deckName: string | null
  question: string | null
  dateLabel: string | null
  cards: ParsedCard[]
  notes: string
}

/** Parses one reading's rendered section (readingToMarkdown's own output shape). */
function parseReadingBlock(block: string): ParsedReadingBlock {
  const lines = block.split('\n')
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++

  let spreadName: string | null = null
  let deckName: string | null = null
  if (lines[i]?.startsWith('# ')) {
    // Split on the FIRST " — " only — a variant-qualified deck name (e.g.
    // "Rider-Waite-Smith — Full 78") legitimately contains the same
    // separator, so a naive split(' — ') would truncate it.
    const title = lines[i].slice(2).trim()
    const sepIdx = title.indexOf(' — ')
    const first = sepIdx === -1 ? title : title.slice(0, sepIdx)
    const second = sepIdx === -1 ? null : title.slice(sepIdx + 3)
    spreadName = first && first !== 'Free Reading' ? first.trim() : null
    deckName = second?.trim() ?? null
    i++
  }

  let question: string | null = null
  let dateLabel: string | null = null
  const cards: ParsedCard[] = []
  const notesLines: string[] = []
  let section: 'none' | 'cards' | 'notes' = 'none'

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed === '---') break
    if (/^\*".*"\*$/.test(trimmed)) { question = trimmed.slice(2, -2); continue }
    if (trimmed.startsWith('**Date:**')) { dateLabel = trimmed.slice('**Date:**'.length).trim(); continue }
    if (trimmed === '## Cards') { section = 'cards'; continue }
    if (trimmed === '## Notes') { section = 'notes'; continue }
    if (trimmed.startsWith('## ')) { section = 'none'; continue } // e.g. Astrological Snapshot — not reconstructed
    if (section === 'cards' && trimmed.startsWith('- ')) {
      const m = /^-\s(?:\*\*(.+?)\*\*\s—\s)?(.+?)(\s\*\(reversed\)\*)?$/.exec(trimmed)
      if (m) cards.push({ positionName: m[1]?.trim() ?? null, cardName: m[2].trim(), reversed: !!m[3] })
      continue
    }
    if (section === 'notes') notesLines.push(lines[i])
  }

  return { spreadName, deckName, question, dateLabel, cards, notes: notesLines.join('\n').trim() }
}

async function findDeckIdByName(name: string): Promise<string | null> {
  const lower = name.trim().toLowerCase()
  for (const d of BUILT_IN_DECK_FILTERS) {
    if (d.displayName.toLowerCase() === lower) return d.id
    for (const v of d.variants ?? []) {
      if (`${d.displayName} — ${v.label}`.toLowerCase() === lower) return v.id
    }
  }
  const customDecks = await getAllCustomDecks()
  return customDecks.find(r => r.displayName.toLowerCase() === lower)?.id ?? null
}

async function findSpreadByName(name: string): Promise<SpreadDefinition | null> {
  const lower = name.trim().toLowerCase()
  const builtIn = BUILT_IN_SPREADS.find(s => s.displayName.toLowerCase() === lower)
  if (builtIn) return builtIn
  const customSpreads = await getAllCustomSpreads()
  return customSpreads.map(spreadRecordToDefinition).find(s => s.displayName.toLowerCase() === lower) ?? null
}

/** Best-effort "human date string" → YYYY-MM-DDT12:00:00.000Z, falling back
 *  to the given date when unparseable (locale-dependent — readingToMarkdown
 *  writes dates via toLocaleDateString, which isn't reliably machine-parseable
 *  in every locale; midday-anchored the same way daily-reading.ts anchors
 *  dates with no real time-of-day). */
function parseDateLabel(label: string | null, fallback: string): string {
  if (label) {
    const d = new Date(label)
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T12:00:00.000Z`
    }
  }
  return fallback
}

async function buildReadingFromParsed(
  parsed: ParsedReadingBlock, engine: GrimoireEngine, fallbackReadingDate: string
): Promise<{ reading: Reading; cardsSkipped: number }> {
  const deckId = (parsed.deckName && await findDeckIdByName(parsed.deckName)) || parsed.deckName || 'unknown'
  const spread = parsed.spreadName ? await findSpreadByName(parsed.spreadName) : null
  const isFreeReading = !spread || spread.positions.length === 0
  const positionIdByName = new Map((spread?.positions ?? []).map(p => [p.name.toLowerCase(), p.id]))

  let cardsSkipped = 0
  const cards: Reading['cards'] = []
  let drawOrder = 1
  for (const c of parsed.cards) {
    const results = await engine.adapter.searchEntities(c.cardName, undefined, { offset: 0, limit: 1 })
    const match = results.items[0]?.entity
    if (!match) { cardsSkipped++; continue }
    cards.push({
      id: '',
      cardCanonicalName: match.canonicalName,
      positionId: isFreeReading || !c.positionName ? null : (positionIdByName.get(c.positionName.toLowerCase()) ?? null),
      drawOrder: drawOrder++,
      orientation: c.reversed ? 'reversed' : 'upright',
    })
  }

  const reading: Reading = {
    id: newId(),
    createdAt: nowIso(),
    readingDate: parseDateLabel(parsed.dateLabel, fallbackReadingDate),
    deckId,
    spreadId: isFreeReading ? null : spread!.id,
    isFreeReading,
    cards,
    question: parsed.question,
    subject: 'self',
    notes: parsed.notes,
    tags: [],
    traditionSnapshot: [],
    astroSnapshot: null,
    journalEntryId: null,
  }
  return { reading, cardsSkipped }
}

/**
 * Reconstructs an entry + readings from arbitrary Markdown with no embedded
 * exact data — either this app's own export with the hidden comment stripped
 * out, or a single reading's bare "Export as Markdown" file re-purposed as an
 * entry import (readingToMarkdown's format has no entry wrapper or "---"
 * separators at all, so the whole file is treated as one reading block in
 * that case, with a synthesised entry wrapping it).
 */
async function reconstructFromMarkdown(text: string, engine: GrimoireEngine): Promise<{ entry: JournalEntry; readings: Reading[]; cardsSkipped: number }> {
  const today = new Date()
  const fallbackEntryDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const fallbackReadingDate = `${fallbackEntryDate}T12:00:00.000Z`

  const blocks = text.split(/\n---\n/)

  let title: string | null = null
  let entryNotes = ''
  let entryDate = fallbackEntryDate
  let readingBlocks: string[]

  if (blocks.length === 1) {
    // No "---" anywhere — a bare single-reading export, no entry wrapper.
    readingBlocks = [text]
  } else {
    // First block is the entry's own title/date/notes preamble.
    const preambleLines = blocks[0].split('\n')
    let i = 0
    while (i < preambleLines.length && !preambleLines[i].trim()) i++
    if (preambleLines[i]?.startsWith('# ')) { title = preambleLines[i].slice(2).trim(); i++ }
    const notesLines: string[] = []
    for (; i < preambleLines.length; i++) {
      const trimmed = preambleLines[i].trim()
      if (trimmed.startsWith('**Date:**')) { entryDate = parseDateLabel(trimmed.slice('**Date:**'.length).trim(), fallbackReadingDate).slice(0, 10); continue }
      notesLines.push(preambleLines[i])
    }
    entryNotes = notesLines.join('\n').trim()
    readingBlocks = blocks.slice(1).filter(b => b.trim())
  }

  let cardsSkipped = 0
  const readings: Reading[] = []
  for (const block of readingBlocks) {
    const parsed = parseReadingBlock(block)
    const { reading, cardsSkipped: skipped } = await buildReadingFromParsed(parsed, engine, fallbackReadingDate)
    cardsSkipped += skipped
    readings.push(reading)
  }

  // A bare single-reading file has no entry title of its own — borrow the
  // reading's "Spread — Deck" heading so the entry isn't left unnamed.
  if (title === null && blocks.length === 1) {
    const parsed = parseReadingBlock(text)
    title = [parsed.spreadName ?? 'Free Reading', parsed.deckName].filter(Boolean).join(' — ')
    entryDate = readings[0]?.readingDate.slice(0, 10) ?? fallbackEntryDate
  }

  const entry: JournalEntry = {
    id: newId(),
    createdAt: nowIso(),
    entryDate,
    title,
    notes: entryNotes,
    tags: [],
  }
  for (const r of readings) r.journalEntryId = entry.id

  return { entry, readings, cardsSkipped }
}

/**
 * Shows a native Open dialog for a .md (or legacy .json) file exported by
 * exportJournalEntry and imports it. Returns null if the user cancelled;
 * throws on a file that's neither valid exact data nor parseable Markdown.
 */
export async function pickAndImportJournalEntry(engine: GrimoireEngine): Promise<JournalEntryImportSummary | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'Journal Entry', extensions: ['md', 'json'] }],
  })
  if (!path || Array.isArray(path)) return null

  const text = await readTextFile(path)

  const exact = extractExactPayload(text)
  if (exact) return importExactPayload(exact)

  if (!text.trim()) throw new Error('Import file is empty.')

  const { entry, readings, cardsSkipped } = await reconstructFromMarkdown(text, engine)
  const { inserted: entryInserted } = await importJournalEntry(entry)
  let readingsImported = 0
  for (const r of readings) {
    const { inserted } = await importReading(r)
    if (inserted) readingsImported++
  }

  return {
    title: entry.title ?? 'Journal Entry',
    entryAlreadyExisted: !entryInserted,
    readingsImported,
    readingsAlreadyExisted: readings.length - readingsImported,
    reconstructedFromMarkdown: true,
    cardsSkipped,
  }
}
