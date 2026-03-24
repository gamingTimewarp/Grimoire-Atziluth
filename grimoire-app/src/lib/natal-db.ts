/**
 * natal-db.ts
 * SQLite persistence for natal charts / profiles.
 */

import Database from '@tauri-apps/plugin-sql'
import { newId, nowIso } from '@grimoire/core'

const DB_URL = 'sqlite:grimoire.db'
let _db: Database | null = null
async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load(DB_URL)
  return _db
}

export async function initNatalDb(): Promise<void> {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS natal_charts (
      id                    TEXT PRIMARY KEY,
      created_at            TEXT NOT NULL,
      name                  TEXT NOT NULL,
      birth_date            TEXT NOT NULL,
      birth_time            TEXT,
      birth_lat             REAL,
      birth_lon             REAL,
      birth_location_label  TEXT,
      notes                 TEXT NOT NULL DEFAULT '',
      is_self               INTEGER NOT NULL DEFAULT 0
    )
  `)
}

export interface NatalChartRecord {
  id: string
  createdAt: string
  name: string
  birthDate: string        // YYYY-MM-DD
  birthTime: string | null // HH:MM (local), null if unknown
  birthLat: number | null
  birthLon: number | null
  birthLocationLabel: string | null
  notes: string
  isSelf: boolean
}

type NatalRow = {
  id: string
  created_at: string
  name: string
  birth_date: string
  birth_time: string | null
  birth_lat: number | null
  birth_lon: number | null
  birth_location_label: string | null
  notes: string
  is_self: number
}

function rowToRecord(r: NatalRow): NatalChartRecord {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    birthDate: r.birth_date,
    birthTime: r.birth_time,
    birthLat: r.birth_lat,
    birthLon: r.birth_lon,
    birthLocationLabel: r.birth_location_label,
    notes: r.notes,
    isSelf: r.is_self === 1,
  }
}

export async function saveNatalChart(input: Omit<NatalChartRecord, 'id' | 'createdAt'>): Promise<NatalChartRecord> {
  const db = await getDb()
  const id = newId()
  const now = nowIso()
  await db.execute(
    `INSERT INTO natal_charts
       (id, created_at, name, birth_date, birth_time, birth_lat, birth_lon, birth_location_label, notes, is_self)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, now, input.name, input.birthDate, input.birthTime ?? null,
     input.birthLat ?? null, input.birthLon ?? null,
     input.birthLocationLabel ?? null, input.notes, input.isSelf ? 1 : 0]
  )
  return { id, createdAt: now, ...input }
}

export async function updateNatalChart(id: string, input: Omit<NatalChartRecord, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE natal_charts SET
       name = ?, birth_date = ?, birth_time = ?, birth_lat = ?, birth_lon = ?,
       birth_location_label = ?, notes = ?, is_self = ?
     WHERE id = ?`,
    [input.name, input.birthDate, input.birthTime ?? null,
     input.birthLat ?? null, input.birthLon ?? null,
     input.birthLocationLabel ?? null, input.notes, input.isSelf ? 1 : 0, id]
  )
}

export async function deleteNatalChart(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM natal_charts WHERE id = ?', [id])
}

export async function listNatalCharts(): Promise<NatalChartRecord[]> {
  const db = await getDb()
  const rows = await db.select<NatalRow[]>(
    'SELECT * FROM natal_charts ORDER BY is_self DESC, name ASC'
  )
  return rows.map(rowToRecord)
}

/** Insert a chart record preserving its original id/createdAt. Skips if id already exists. */
export async function importNatalChart(r: NatalChartRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR IGNORE INTO natal_charts
       (id, created_at, name, birth_date, birth_time, birth_lat, birth_lon, birth_location_label, notes, is_self)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.createdAt, r.name, r.birthDate, r.birthTime ?? null,
     r.birthLat ?? null, r.birthLon ?? null,
     r.birthLocationLabel ?? null, r.notes, r.isSelf ? 1 : 0]
  )
}

export async function getNatalChartById(id: string): Promise<NatalChartRecord | null> {
  const db = await getDb()
  const rows = await db.select<NatalRow[]>('SELECT * FROM natal_charts WHERE id = ?', [id])
  return rows.length ? rowToRecord(rows[0]) : null
}
