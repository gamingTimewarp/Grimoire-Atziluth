/**
 * reading-db.ts
 * Thin service layer for persisting readings to SQLite via the Tauri SQL plugin.
 */

import Database from '@tauri-apps/plugin-sql'
import type { Reading, CreateReadingInput } from '@grimoire/core'
import { newId, nowIso } from '@grimoire/core'
import { getHomeLocation } from '@/lib/settings-store'
import { todayInZone } from '@/lib/timezone'

const DB_URL = 'sqlite:grimoire.db'

let _db: Database | null = null

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load(DB_URL)
  }
  return _db
}

export async function initReadingDb(): Promise<void> {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS readings (
      id               TEXT PRIMARY KEY,
      created_at       TEXT NOT NULL,
      reading_date     TEXT NOT NULL,
      deck_id          TEXT NOT NULL,
      spread_id        TEXT,
      is_free_reading  INTEGER NOT NULL DEFAULT 0,
      is_daily         INTEGER NOT NULL DEFAULT 0,
      subject          TEXT,
      notes            TEXT NOT NULL DEFAULT '',
      tags             TEXT NOT NULL DEFAULT '[]',
      tradition_snapshot TEXT NOT NULL DEFAULT '[]',
      astro_snapshot   TEXT
    )
  `)
  // Migration: add columns for existing DBs that predate them
  for (const col of [
    'ALTER TABLE readings ADD COLUMN is_daily INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE readings ADD COLUMN astro_snapshot TEXT',
    'ALTER TABLE readings ADD COLUMN question TEXT',
  ]) {
    try { await db.execute(col) } catch { /* column already exists */ }
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_cards (
      id                   TEXT PRIMARY KEY,
      reading_id           TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      card_canonical_name  TEXT NOT NULL,
      position_id          TEXT,
      draw_order           INTEGER NOT NULL,
      orientation          TEXT NOT NULL DEFAULT 'upright'
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL,
      entry_date  TEXT NOT NULL,
      title       TEXT,
      notes       TEXT NOT NULL DEFAULT '',
      tags        TEXT NOT NULL DEFAULT '[]'
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS journal_entity_links (
      id             TEXT PRIMARY KEY,
      entry_id       TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      canonical_name TEXT NOT NULL,
      UNIQUE(entry_id, canonical_name)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_entity_links (
      id             TEXT PRIMARY KEY,
      reading_id     TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      canonical_name TEXT NOT NULL,
      UNIQUE(reading_id, canonical_name)
    )
  `)
}

type ReadingRow = {
  id: string
  created_at: string
  reading_date: string
  deck_id: string
  spread_id: string | null
  is_free_reading: number
  is_daily: number
  question: string | null
  subject: string | null
  notes: string
  tags: string
  tradition_snapshot: string
  astro_snapshot: string | null
}

type ReadingCardRow = {
  id: string
  reading_id: string
  card_canonical_name: string
  position_id: string | null
  draw_order: number
  orientation: string
}

function rowToReading(row: ReadingRow, cards: ReadingCardRow[]): Reading {
  return {
    id: row.id,
    createdAt: row.created_at,
    readingDate: row.reading_date,
    deckId: row.deck_id,
    spreadId: row.spread_id,
    isFreeReading: row.is_free_reading === 1,
    isDaily: row.is_daily === 1,
    question: row.question ?? null,
    subject: row.subject,
    notes: row.notes,
    tags: JSON.parse(row.tags) as string[],
    traditionSnapshot: JSON.parse(row.tradition_snapshot) as string[],
    astroSnapshot: row.astro_snapshot ? JSON.parse(row.astro_snapshot) : null,
    cards: cards.map(c => ({
      id: c.id,
      cardCanonicalName: c.card_canonical_name,
      positionId: c.position_id,
      drawOrder: c.draw_order,
      orientation: c.orientation as Reading['cards'][number]['orientation'],
    })),
  }
}

export async function saveReading(
  input: CreateReadingInput,
  options?: { isDaily?: boolean; astroSnapshot?: object | null },
): Promise<Reading> {
  const db = await getDb()
  const id = newId()
  const now = nowIso()

  await db.execute(
    `INSERT INTO readings (id, created_at, reading_date, deck_id, spread_id, is_free_reading,
       is_daily, question, subject, notes, tags, tradition_snapshot, astro_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, now, input.readingDate, input.deckId, input.spreadId,
      input.isFreeReading ? 1 : 0,
      options?.isDaily ? 1 : 0,
      input.question ?? null,
      input.subject, input.notes,
      JSON.stringify(input.tags), JSON.stringify(input.traditionSnapshot),
      options?.astroSnapshot ? JSON.stringify(options.astroSnapshot) : null,
    ]
  )

  for (const card of input.cards) {
    const cardId = newId()
    await db.execute(
      `INSERT INTO reading_cards (id, reading_id, card_canonical_name, position_id, draw_order, orientation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cardId, id, card.cardCanonicalName, card.positionId, card.drawOrder, card.orientation]
    )
  }

  const reading = await getReadingById(id)
  return reading!
}

export async function getReadingById(id: string): Promise<Reading | null> {
  const db = await getDb()
  const rows = await db.select<ReadingRow[]>('SELECT * FROM readings WHERE id = ?', [id])
  if (!rows.length) return null
  const cards = await db.select<ReadingCardRow[]>(
    'SELECT * FROM reading_cards WHERE reading_id = ? ORDER BY draw_order',
    [id]
  )
  return rowToReading(rows[0], cards)
}

// ─── Journal entries (standalone, no cards) ───────────────────────────────────

export interface JournalEntry {
  id: string
  createdAt: string
  entryDate: string
  title: string | null
  notes: string
  tags: string[]
}

export async function saveJournalEntry(input: {
  title?: string
  notes: string
  entryDate: string
}): Promise<JournalEntry> {
  const db = await getDb()
  const id = newId()
  const now = nowIso()
  await db.execute(
    `INSERT INTO journal_entries (id, created_at, entry_date, title, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, now, input.entryDate, input.title ?? null, input.notes, '[]']
  )
  return { id, createdAt: now, entryDate: input.entryDate, title: input.title ?? null, notes: input.notes, tags: [] }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM journal_entries WHERE id = ?', [id])
}

export async function deleteReading(id: string): Promise<void> {
  const db = await getDb()
  // reading_cards cascade-deletes via FK ON DELETE CASCADE
  await db.execute('DELETE FROM readings WHERE id = ?', [id])
}

export async function listJournalEntries(limit = 50, offset = 0): Promise<JournalEntry[]> {
  const db = await getDb()
  const rows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    'SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ? OFFSET ?',
    [limit, offset]
  )
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))
}

export async function listReadingsByMonth(year: number, month: number): Promise<Reading[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const db = await getDb()
  const rows = await db.select<ReadingRow[]>(
    `SELECT * FROM readings WHERE reading_date LIKE ? ORDER BY reading_date`,
    [`${prefix}%`]
  )
  if (!rows.length) return []
  const ids = rows.map(r => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const cards = await db.select<ReadingCardRow[]>(
    `SELECT * FROM reading_cards WHERE reading_id IN (${placeholders}) ORDER BY draw_order`,
    ids
  )
  const cardsByReading = new Map<string, ReadingCardRow[]>()
  for (const c of cards) {
    const list = cardsByReading.get(c.reading_id) ?? []
    list.push(c)
    cardsByReading.set(c.reading_id, list)
  }
  return rows.map(r => rowToReading(r, cardsByReading.get(r.id) ?? []))
}

export async function listJournalEntriesByMonth(year: number, month: number): Promise<JournalEntry[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const db = await getDb()
  const rows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    `SELECT * FROM journal_entries WHERE entry_date LIKE ? ORDER BY entry_date`,
    [`${prefix}%`]
  )
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))
}

/**
 * Every reading made on this calendar month+day, across all years (e.g. "on this
 * day" lookback) — a string-slice match against the 'MM-DD' portion of
 * reading_date, matching this file's existing LIKE-prefix convention rather than
 * introducing SQLite date functions used nowhere else here.
 */
export async function listReadingsOnThisDay(month: number, day: number): Promise<Reading[]> {
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const db = await getDb()
  const rows = await db.select<ReadingRow[]>(
    `SELECT * FROM readings WHERE substr(reading_date, 6, 5) = ? ORDER BY reading_date DESC`,
    [mmdd]
  )
  if (!rows.length) return []
  const ids = rows.map(r => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const cards = await db.select<ReadingCardRow[]>(
    `SELECT * FROM reading_cards WHERE reading_id IN (${placeholders}) ORDER BY draw_order`,
    ids
  )
  const cardsByReading = new Map<string, ReadingCardRow[]>()
  for (const c of cards) {
    const list = cardsByReading.get(c.reading_id) ?? []
    list.push(c)
    cardsByReading.set(c.reading_id, list)
  }
  return rows.map(r => rowToReading(r, cardsByReading.get(r.id) ?? []))
}

/** Journal-entry counterpart to listReadingsOnThisDay — see its comment. */
export async function listJournalEntriesOnThisDay(month: number, day: number): Promise<JournalEntry[]> {
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const db = await getDb()
  const rows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    `SELECT * FROM journal_entries WHERE substr(entry_date, 6, 5) = ? ORDER BY entry_date DESC`,
    [mmdd]
  )
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))
}

export async function getTodaysDailyReading(): Promise<Reading | null> {
  const db = await getDb()
  // "Today" per the user's configured home-location zone, not UTC or the
  // device's own zone — matches how createDailyReadingIfAbsent() stores
  // readingDate, so the existence check and the stored value always agree
  // regardless of what zone was active when the reading was first created.
  const today = todayInZone(getHomeLocation()?.timezone)
  const rows = await db.select<ReadingRow[]>(
    `SELECT * FROM readings WHERE is_daily = 1 AND reading_date LIKE ? ORDER BY created_at DESC LIMIT 1`,
    [`${today}%`]
  )
  if (!rows.length) return null
  const cards = await db.select<ReadingCardRow[]>(
    'SELECT * FROM reading_cards WHERE reading_id = ? ORDER BY draw_order',
    [rows[0].id]
  )
  return rowToReading(rows[0], cards)
}

export async function listTodaysActivity(): Promise<{
  readings: Reading[]
  entries: JournalEntry[]
}> {
  const db = await getDb()
  // "Today" per the user's configured home-location zone, not UTC — see
  // getTodaysDailyReading() above for why.
  const today = todayInZone(getHomeLocation()?.timezone)
  const readingRows = await db.select<ReadingRow[]>(
    `SELECT * FROM readings WHERE reading_date LIKE ? ORDER BY created_at DESC`,
    [`${today}%`]
  )
  const entryRows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    `SELECT * FROM journal_entries WHERE entry_date LIKE ? ORDER BY created_at DESC`,
    [`${today}%`]
  )

  let readings: Reading[] = []
  if (readingRows.length) {
    const ids = readingRows.map(r => r.id)
    const placeholders = ids.map(() => '?').join(',')
    const cards = await db.select<ReadingCardRow[]>(
      `SELECT * FROM reading_cards WHERE reading_id IN (${placeholders}) ORDER BY draw_order`,
      ids
    )
    const cardsByReading = new Map<string, ReadingCardRow[]>()
    for (const c of cards) {
      const list = cardsByReading.get(c.reading_id) ?? []
      list.push(c)
      cardsByReading.set(c.reading_id, list)
    }
    readings = readingRows.map(r => rowToReading(r, cardsByReading.get(r.id) ?? []))
  }

  const entries: JournalEntry[] = entryRows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))

  return { readings, entries }
}

// ─── Journal entity links ─────────────────────────────────────────────────────

export async function getEntityLinksForEntry(entryId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ canonical_name: string }[]>(
    'SELECT canonical_name FROM journal_entity_links WHERE entry_id = ? ORDER BY rowid',
    [entryId]
  )
  return rows.map(r => r.canonical_name)
}

export async function addEntityLinkToEntry(entryId: string, canonicalName: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR IGNORE INTO journal_entity_links (id, entry_id, canonical_name) VALUES (?, ?, ?)',
    [newId(), entryId, canonicalName]
  )
}

export async function removeEntityLinkFromEntry(entryId: string, canonicalName: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'DELETE FROM journal_entity_links WHERE entry_id = ? AND canonical_name = ?',
    [entryId, canonicalName]
  )
}

// ─── Reading entity links ─────────────────────────────────────────────────────

export async function getEntityLinksForReading(readingId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ canonical_name: string }[]>(
    'SELECT canonical_name FROM reading_entity_links WHERE reading_id = ? ORDER BY rowid',
    [readingId]
  )
  return rows.map(r => r.canonical_name)
}

export async function addEntityLinkToReading(readingId: string, canonicalName: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR IGNORE INTO reading_entity_links (id, reading_id, canonical_name) VALUES (?, ?, ?)',
    [newId(), readingId, canonicalName]
  )
}

export async function removeEntityLinkFromReading(readingId: string, canonicalName: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'DELETE FROM reading_entity_links WHERE reading_id = ? AND canonical_name = ?',
    [readingId, canonicalName]
  )
}

export async function getReadingsForEntity(canonicalName: string): Promise<Reading[]> {
  const db = await getDb()
  const rows = await db.select<ReadingRow[]>(
    `SELECT r.* FROM readings r
     INNER JOIN reading_entity_links rel ON rel.reading_id = r.id
     WHERE rel.canonical_name = ?
     ORDER BY r.reading_date DESC`,
    [canonicalName]
  )
  if (!rows.length) return []
  const ids = rows.map(r => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const cards = await db.select<ReadingCardRow[]>(
    `SELECT * FROM reading_cards WHERE reading_id IN (${placeholders}) ORDER BY draw_order`,
    ids
  )
  const cardsByReading = new Map<string, ReadingCardRow[]>()
  for (const c of cards) {
    const list = cardsByReading.get(c.reading_id) ?? []
    list.push(c)
    cardsByReading.set(c.reading_id, list)
  }
  return rows.map(r => rowToReading(r, cardsByReading.get(r.id) ?? []))
}

export async function getEntriesForEntity(canonicalName: string): Promise<JournalEntry[]> {
  const db = await getDb()
  const rows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    `SELECT je.* FROM journal_entries je
     INNER JOIN journal_entity_links jel ON jel.entry_id = je.id
     WHERE jel.canonical_name = ?
     ORDER BY je.entry_date DESC`,
    [canonicalName]
  )
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))
}

// ─── Bulk export/import helpers ───────────────────────────────────────────────

export async function getAllJournalEntityLinks(): Promise<{ entryId: string; canonicalName: string }[]> {
  const db = await getDb()
  const rows = await db.select<{ entry_id: string; canonical_name: string }[]>(
    'SELECT entry_id, canonical_name FROM journal_entity_links ORDER BY rowid'
  )
  return rows.map(r => ({ entryId: r.entry_id, canonicalName: r.canonical_name }))
}

/** Import a reading preserving its original id. Skips if id already exists. */
export async function importReading(r: Reading): Promise<void> {
  const db = await getDb()
  const inserted = await db.execute(
    `INSERT OR IGNORE INTO readings
       (id, created_at, reading_date, deck_id, spread_id, is_free_reading, is_daily,
        question, subject, notes, tags, tradition_snapshot, astro_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id, r.createdAt, r.readingDate, r.deckId, r.spreadId,
      r.isFreeReading ? 1 : 0, r.isDaily ? 1 : 0,
      r.question ?? null,
      r.subject, r.notes,
      JSON.stringify(r.tags), JSON.stringify(r.traditionSnapshot),
      r.astroSnapshot ? JSON.stringify(r.astroSnapshot) : null,
    ]
  )
  if ((inserted as { rowsAffected: number }).rowsAffected === 0) return
  for (const card of r.cards) {
    await db.execute(
      `INSERT OR IGNORE INTO reading_cards
         (id, reading_id, card_canonical_name, position_id, draw_order, orientation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [card.id || newId(), r.id, card.cardCanonicalName, card.positionId, card.drawOrder, card.orientation]
    )
  }
}

/** Import a journal entry preserving its original id. Skips if id already exists. */
export async function importJournalEntry(e: JournalEntry): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR IGNORE INTO journal_entries (id, created_at, entry_date, title, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [e.id, e.createdAt, e.entryDate, e.title ?? null, e.notes, JSON.stringify(e.tags)]
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export async function searchJournalEntries(query: string, limit = 8): Promise<JournalEntry[]> {
  const db = await getDb()
  const like = `%${query}%`
  const rows = await db.select<{ id: string; created_at: string; entry_date: string; title: string | null; notes: string; tags: string }[]>(
    `SELECT * FROM journal_entries WHERE title LIKE ? OR notes LIKE ? ORDER BY entry_date DESC LIMIT ?`,
    [like, like, limit]
  )
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    entryDate: r.entry_date,
    title: r.title,
    notes: r.notes,
    tags: JSON.parse(r.tags) as string[],
  }))
}

export async function listReadings(limit = 50, offset = 0): Promise<Reading[]> {
  const db = await getDb()
  const rows = await db.select<ReadingRow[]>(
    'SELECT * FROM readings ORDER BY reading_date DESC LIMIT ? OFFSET ?',
    [limit, offset]
  )
  if (!rows.length) return []

  const ids = rows.map(r => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const cards = await db.select<ReadingCardRow[]>(
    `SELECT * FROM reading_cards WHERE reading_id IN (${placeholders}) ORDER BY draw_order`,
    ids
  )

  const cardsByReading = new Map<string, ReadingCardRow[]>()
  for (const c of cards) {
    const list = cardsByReading.get(c.reading_id) ?? []
    list.push(c)
    cardsByReading.set(c.reading_id, list)
  }

  return rows.map(r => rowToReading(r, cardsByReading.get(r.id) ?? []))
}

/** Fetch every reading. Suitable for analytics (SQLite is fast; ~10k rows is fine). */
export async function getAllReadings(): Promise<Reading[]> {
  return listReadings(10_000, 0)
}

/**
 * Count readings and journal entries older than the given cutoff date.
 * Returns how many records would be deleted by archiveOlderThan().
 */
export async function countOlderThan(cutoffDate: Date): Promise<{ readings: number; journalEntries: number }> {
  const db = await getDb()
  const iso = cutoffDate.toISOString().slice(0, 10)
  const [rRows, jRows] = await Promise.all([
    db.select<{ n: number }[]>('SELECT COUNT(*) as n FROM readings WHERE reading_date < ?', [iso]),
    db.select<{ n: number }[]>('SELECT COUNT(*) as n FROM journal_entries WHERE entry_date < ?', [iso]),
  ])
  return { readings: rRows[0]?.n ?? 0, journalEntries: jRows[0]?.n ?? 0 }
}

/**
 * Permanently delete all readings and journal entries whose date is before
 * the given cutoff.  Associated cards and entity links cascade-delete via FK.
 * Returns the counts of deleted records.
 */
export async function archiveOlderThan(cutoffDate: Date): Promise<{ readings: number; journalEntries: number }> {
  const counts = await countOlderThan(cutoffDate)
  const db  = await getDb()
  const iso = cutoffDate.toISOString().slice(0, 10)
  await db.execute('DELETE FROM readings       WHERE reading_date < ?', [iso])
  await db.execute('DELETE FROM journal_entries WHERE entry_date   < ?', [iso])
  return counts
}
