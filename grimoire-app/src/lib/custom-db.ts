/**
 * custom-db.ts
 * SQLite persistence for user-created entities and links.
 * Tables: custom_entities, custom_links
 *
 * Provides seedCustomIntoEngine(adapter) to seed custom data into
 * the InMemoryAdapter at boot.
 */

import Database from '@tauri-apps/plugin-sql'
import type { StorageAdapter, SpreadPosition } from '@grimoire/core'
import type { SpreadDefinition, DeckFilter } from './built-in-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomEntityRecord {
  id: string
  canonicalName: string
  entityType: string
  displayName: string
  description: string
  userNotes: string
  tags: string[]
  extendedData: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CustomLinkRecord {
  id: string
  sourceCn: string
  targetCn: string
  label: string
  traditionScope: string[]
  bidirectional: boolean
  note: string
  createdAt: string
}

// ─── DB bootstrap ──────────────────────────────────────────────────────────────

let _db: Database | null = null
async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load('sqlite:grimoire.db')
  return _db
}

export async function initCustomDb(): Promise<void> {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_entities (
      id             TEXT PRIMARY KEY,
      canonical_name TEXT UNIQUE NOT NULL,
      entity_type    TEXT NOT NULL,
      display_name   TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      user_notes     TEXT NOT NULL DEFAULT '',
      tags           TEXT NOT NULL DEFAULT '[]',
      extended_data  TEXT NOT NULL DEFAULT '{}',
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_traditions (
      id           TEXT PRIMARY KEY,
      canonical_name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      rel_types    TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_secondary_names (
      id           TEXT PRIMARY KEY,
      entity_cn    TEXT NOT NULL,
      tradition_cn TEXT NOT NULL,
      name         TEXT NOT NULL,
      language_tag TEXT NOT NULL,
      visible      INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_decks (
      id                   TEXT PRIMARY KEY,
      display_name         TEXT NOT NULL,
      description          TEXT NOT NULL DEFAULT '',
      reversal_enabled     INTEGER NOT NULL DEFAULT 0,
      card_canonical_names TEXT NOT NULL DEFAULT '[]',
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_spreads (
      id            TEXT PRIMARY KEY,
      display_name  TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      positions     TEXT NOT NULL DEFAULT '[]',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_links (
      id              TEXT PRIMARY KEY,
      source_cn       TEXT NOT NULL,
      target_cn       TEXT NOT NULL,
      label           TEXT NOT NULL,
      tradition_scope TEXT NOT NULL DEFAULT '[]',
      bidirectional   INTEGER NOT NULL DEFAULT 0,
      note            TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entity_annotations (
      canonical_name TEXT PRIMARY KEY,
      note           TEXT NOT NULL DEFAULT '',
      updated_at     TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_art_packs (
      id          TEXT PRIMARY KEY,
      art_group   TEXT NOT NULL,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_art_pack_files (
      pack_id        TEXT NOT NULL REFERENCES custom_art_packs(id) ON DELETE CASCADE,
      canonical_name TEXT NOT NULL,
      file_name      TEXT NOT NULL,
      PRIMARY KEY (pack_id, canonical_name)
    )
  `)
}

// ─── Entity annotations ───────────────────────────────────────────────────────

/** Returns the user's personal annotation for an entity, or '' if none exists. */
export async function getEntityAnnotation(canonicalName: string): Promise<string> {
  const db = await getDb()
  const rows = await db.select<{ note: string }[]>(
    'SELECT note FROM entity_annotations WHERE canonical_name = ?',
    [canonicalName],
  )
  return rows[0]?.note ?? ''
}

/** Upserts the user's personal annotation for an entity. Deletes the row if note is empty. */
export async function saveEntityAnnotation(canonicalName: string, note: string): Promise<void> {
  const db = await getDb()
  if (note.trim() === '') {
    await db.execute('DELETE FROM entity_annotations WHERE canonical_name = ?', [canonicalName])
  } else {
    await db.execute(
      `INSERT INTO entity_annotations (canonical_name, note, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(canonical_name) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`,
      [canonicalName, note, new Date().toISOString()],
    )
  }
}

// ─── Entity CRUD ──────────────────────────────────────────────────────────────

type EntityRow = {
  id: string
  canonical_name: string
  entity_type: string
  display_name: string
  description: string
  user_notes: string
  tags: string
  extended_data: string
  created_at: string
  updated_at: string
}

function rowToEntity(r: EntityRow): CustomEntityRecord {
  return {
    id:            r.id,
    canonicalName: r.canonical_name,
    entityType:    r.entity_type,
    displayName:   r.display_name,
    description:   r.description,
    userNotes:     r.user_notes,
    tags:          JSON.parse(r.tags) as string[],
    extendedData:  JSON.parse(r.extended_data) as Record<string, unknown>,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  }
}

export async function getAllCustomEntities(): Promise<CustomEntityRecord[]> {
  const db = await getDb()
  const rows = await db.select<EntityRow[]>(
    'SELECT * FROM custom_entities ORDER BY display_name ASC',
  )
  return rows.map(rowToEntity)
}

export async function getCustomEntityByCN(cn: string): Promise<CustomEntityRecord | null> {
  const db = await getDb()
  const rows = await db.select<EntityRow[]>(
    'SELECT * FROM custom_entities WHERE canonical_name = ?', [cn],
  )
  return rows[0] ? rowToEntity(rows[0]) : null
}

export async function saveCustomEntity(e: CustomEntityRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_entities
       (id, canonical_name, entity_type, display_name, description, user_notes, tags, extended_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id, e.canonicalName, e.entityType, e.displayName,
      e.description, e.userNotes,
      JSON.stringify(e.tags), JSON.stringify(e.extendedData),
      e.createdAt, e.updatedAt,
    ],
  )
}

export async function deleteCustomEntityByCN(cn: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_entities WHERE canonical_name = ?', [cn])
  await db.execute('DELETE FROM custom_links WHERE source_cn = ? OR target_cn = ?', [cn, cn])
}

// ─── Link CRUD ────────────────────────────────────────────────────────────────

type LinkRow = {
  id: string
  source_cn: string
  target_cn: string
  label: string
  tradition_scope: string
  bidirectional: number
  note: string
  created_at: string
}

function rowToLink(r: LinkRow): CustomLinkRecord {
  return {
    id:             r.id,
    sourceCn:       r.source_cn,
    targetCn:       r.target_cn,
    label:          r.label,
    traditionScope: JSON.parse(r.tradition_scope) as string[],
    bidirectional:  r.bidirectional === 1,
    note:           r.note,
    createdAt:      r.created_at,
  }
}

export async function getCustomLinksForEntity(cn: string): Promise<CustomLinkRecord[]> {
  const db = await getDb()
  const rows = await db.select<LinkRow[]>(
    'SELECT * FROM custom_links WHERE source_cn = ? OR target_cn = ? ORDER BY created_at ASC',
    [cn, cn],
  )
  return rows.map(rowToLink)
}

export async function saveCustomLink(link: CustomLinkRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_links
       (id, source_cn, target_cn, label, tradition_scope, bidirectional, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      link.id, link.sourceCn, link.targetCn, link.label,
      JSON.stringify(link.traditionScope),
      link.bidirectional ? 1 : 0,
      link.note, link.createdAt,
    ],
  )
}

export async function deleteCustomLink(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_links WHERE id = ?', [id])
}

export async function getAllCustomLinks(): Promise<CustomLinkRecord[]> {
  const db = await getDb()
  const rows = await db.select<LinkRow[]>('SELECT * FROM custom_links ORDER BY created_at ASC')
  return rows.map(rowToLink)
}

// ─── Tradition CRUD ───────────────────────────────────────────────────────────

export interface CustomRelType {
  linkLabel: string
  displayName: string
  targetEntityType: string
  allowMultiple: boolean
}

export interface CustomTraditionRecord {
  id: string
  canonicalName: string
  displayName: string
  description: string
  relTypes: CustomRelType[]
  createdAt: string
  updatedAt: string
}

type TraditionRow = {
  id: string
  canonical_name: string
  display_name: string
  description: string
  rel_types: string
  created_at: string
  updated_at: string
}

function rowToTradition(r: TraditionRow): CustomTraditionRecord {
  return {
    id:            r.id,
    canonicalName: r.canonical_name,
    displayName:   r.display_name,
    description:   r.description,
    relTypes:      JSON.parse(r.rel_types) as CustomRelType[],
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  }
}

export async function getAllCustomTraditions(): Promise<CustomTraditionRecord[]> {
  const db = await getDb()
  const rows = await db.select<TraditionRow[]>('SELECT * FROM custom_traditions ORDER BY display_name ASC')
  return rows.map(rowToTradition)
}

export async function getCustomTraditionByCN(cn: string): Promise<CustomTraditionRecord | null> {
  const db = await getDb()
  const rows = await db.select<TraditionRow[]>('SELECT * FROM custom_traditions WHERE canonical_name = ?', [cn])
  return rows[0] ? rowToTradition(rows[0]) : null
}

export async function saveCustomTradition(t: CustomTraditionRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_traditions
       (id, canonical_name, display_name, description, rel_types, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.canonicalName, t.displayName, t.description,
     JSON.stringify(t.relTypes), t.createdAt, t.updatedAt],
  )
}

export async function deleteCustomTraditionByCN(cn: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_traditions WHERE canonical_name = ?', [cn])
  await db.execute('DELETE FROM custom_secondary_names WHERE tradition_cn = ?', [cn])
  await db.execute(
    "DELETE FROM custom_links WHERE tradition_scope LIKE ?",
    [`%${cn}%`],
  )
}

// ─── Secondary Name CRUD ──────────────────────────────────────────────────────

export interface CustomSecondaryNameRecord {
  id: string
  entityCn: string
  traditionCn: string
  name: string
  languageTag: string
  visible: boolean
  sortOrder: number
  createdAt: string
}

type SNameRow = {
  id: string
  entity_cn: string
  tradition_cn: string
  name: string
  language_tag: string
  visible: number
  sort_order: number
  created_at: string
}

function rowToSName(r: SNameRow): CustomSecondaryNameRecord {
  return {
    id:          r.id,
    entityCn:    r.entity_cn,
    traditionCn: r.tradition_cn,
    name:        r.name,
    languageTag: r.language_tag,
    visible:     r.visible === 1,
    sortOrder:   r.sort_order,
    createdAt:   r.created_at,
  }
}

export async function getCustomSecondaryNamesForTradition(traditionCn: string): Promise<CustomSecondaryNameRecord[]> {
  const db = await getDb()
  const rows = await db.select<SNameRow[]>(
    'SELECT * FROM custom_secondary_names WHERE tradition_cn = ? ORDER BY created_at ASC', [traditionCn],
  )
  return rows.map(rowToSName)
}

export async function saveCustomSecondaryName(n: CustomSecondaryNameRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_secondary_names
       (id, entity_cn, tradition_cn, name, language_tag, visible, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [n.id, n.entityCn, n.traditionCn, n.name, n.languageTag, n.visible ? 1 : 0, n.sortOrder, n.createdAt],
  )
}

export async function deleteCustomSecondaryName(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_secondary_names WHERE id = ?', [id])
}

export async function getCustomLinksForTradition(traditionCn: string): Promise<CustomLinkRecord[]> {
  const all = await getAllCustomLinks()
  return all.filter(l => l.traditionScope.includes(traditionCn))
}

// ─── Deck CRUD ────────────────────────────────────────────────────────────────

export interface CustomDeckRecord {
  id: string
  displayName: string
  description: string
  reversalEnabled: boolean
  cardCanonicalNames: string[]
  createdAt: string
  updatedAt: string
}

type DeckRow = {
  id: string
  display_name: string
  description: string
  reversal_enabled: number
  card_canonical_names: string
  created_at: string
  updated_at: string
}

function rowToDeck(r: DeckRow): CustomDeckRecord {
  return {
    id:                 r.id,
    displayName:        r.display_name,
    description:        r.description,
    reversalEnabled:    r.reversal_enabled === 1,
    cardCanonicalNames: JSON.parse(r.card_canonical_names) as string[],
    createdAt:          r.created_at,
    updatedAt:          r.updated_at,
  }
}

export function deckRecordToFilter(r: CustomDeckRecord): DeckFilter {
  return {
    id:                 r.id,
    displayName:        r.displayName,
    description:        r.description,
    reversalEnabled:    r.reversalEnabled,
    cardCanonicalNames: r.cardCanonicalNames,
  }
}

export async function getAllCustomDecks(): Promise<CustomDeckRecord[]> {
  const db = await getDb()
  const rows = await db.select<DeckRow[]>(
    'SELECT * FROM custom_decks ORDER BY display_name ASC',
  )
  return rows.map(rowToDeck)
}

export async function saveCustomDeck(d: CustomDeckRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_decks
       (id, display_name, description, reversal_enabled, card_canonical_names, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.id, d.displayName, d.description, d.reversalEnabled ? 1 : 0,
     JSON.stringify(d.cardCanonicalNames), d.createdAt, d.updatedAt],
  )
}

export async function deleteCustomDeck(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_decks WHERE id = ?', [id])
}

// ─── Spread CRUD ──────────────────────────────────────────────────────────────

export interface CustomSpreadRecord {
  id: string
  displayName: string
  description: string
  positions: SpreadPosition[]
  createdAt: string
  updatedAt: string
}

type SpreadRow = {
  id: string
  display_name: string
  description: string
  positions: string
  created_at: string
  updated_at: string
}

function rowToSpread(r: SpreadRow): CustomSpreadRecord {
  return {
    id:          r.id,
    displayName: r.display_name,
    description: r.description,
    positions:   JSON.parse(r.positions) as SpreadPosition[],
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  }
}

export function spreadRecordToDefinition(r: CustomSpreadRecord): SpreadDefinition {
  return {
    id:          r.id,
    displayName: r.displayName,
    description: r.description,
    isBuiltIn:   false,
    positions:   r.positions,
  }
}

export async function getAllCustomSpreads(): Promise<CustomSpreadRecord[]> {
  const db = await getDb()
  const rows = await db.select<SpreadRow[]>(
    'SELECT * FROM custom_spreads ORDER BY display_name ASC',
  )
  return rows.map(rowToSpread)
}

export async function saveCustomSpread(s: CustomSpreadRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_spreads
       (id, display_name, description, positions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [s.id, s.displayName, s.description, JSON.stringify(s.positions), s.createdAt, s.updatedAt],
  )
}

export async function deleteCustomSpread(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_spreads WHERE id = ?', [id])
}

// ─── Engine seeding ───────────────────────────────────────────────────────────

/**
 * Load all custom entities and links from SQLite and seed them into
 * the InMemoryAdapter so they are available app-wide.
 */
export async function seedCustomIntoEngine(adapter: StorageAdapter): Promise<void> {
  const db = await getDb()

  const entityRows = await db.select<EntityRow[]>('SELECT * FROM custom_entities')
  for (const r of entityRows) {
    const e = rowToEntity(r)
    try {
      await adapter.createEntity({
        canonicalName:       e.canonicalName,
        entityType:          e.entityType,
        primaryDisplayName:  e.displayName,
        description:         e.description || undefined,
        userNotes:           e.userNotes   || undefined,
        tags:                e.tags,
        extendedData:        e.extendedData,
        isBuiltIn:           false,
      })
    } catch {
      // Ignore if already seeded (idempotent)
    }
  }

  // Seed custom traditions
  const tradRows = await db.select<TraditionRow[]>('SELECT * FROM custom_traditions')
  for (const r of tradRows) {
    const t = rowToTradition(r)
    try {
      await adapter.createTradition({
        canonicalName: t.canonicalName,
        displayName:   t.displayName,
        description:   t.description || undefined,
        isBuiltIn:     false,
        attributionFields: t.relTypes.map((rt, i) => ({
          linkLabel:        rt.linkLabel,
          displayName:      rt.displayName,
          targetEntityType: rt.targetEntityType || undefined,
          allowMultiple:    rt.allowMultiple,
          sortOrder:        i,
        })),
      })
    } catch { /* already seeded */ }
  }

  // Seed custom secondary names onto existing entities
  const snameRows = await db.select<SNameRow[]>('SELECT * FROM custom_secondary_names')
  for (const r of snameRows) {
    const entity = await adapter.getEntityByCanonicalName(r.entity_cn)
    if (!entity) continue
    try {
      await adapter.addSecondaryName(entity.id, {
        name:        r.name,
        languageTag: r.language_tag,
        visible:     r.visible === 1,
        sortOrder:   r.sort_order,
      })
    } catch { /* already seeded */ }
  }

  const linkRows = await db.select<LinkRow[]>('SELECT * FROM custom_links')
  for (const r of linkRows) {
    const l = rowToLink(r)
    try {
      await adapter.createLink({
        sourceCanonicalName: l.sourceCn,
        targetCanonicalName: l.targetCn,
        label:               l.label,
        bidirectional:       l.bidirectional,
        traditionScope:      l.traditionScope,
        isBuiltIn:           false,
        note:                l.note || undefined,
        extendedData:        {},
      })
    } catch {
      // Ignore duplicates
    }
  }
}

// ─── Custom art packs ──────────────────────────────────────────────────────────

export interface CustomArtPackRecord {
  id: string
  artGroup: string
  name: string
  createdAt: string
  updatedAt: string
}

type ArtPackRow = {
  id: string
  art_group: string
  name: string
  created_at: string
  updated_at: string
}

function rowToArtPack(r: ArtPackRow): CustomArtPackRecord {
  return { id: r.id, artGroup: r.art_group, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }
}

export async function getAllCustomArtPacks(): Promise<CustomArtPackRecord[]> {
  const db = await getDb()
  const rows = await db.select<ArtPackRow[]>('SELECT * FROM custom_art_packs ORDER BY name ASC')
  return rows.map(rowToArtPack)
}

export async function getCustomArtPacksForGroup(artGroup: string): Promise<CustomArtPackRecord[]> {
  const db = await getDb()
  const rows = await db.select<ArtPackRow[]>('SELECT * FROM custom_art_packs WHERE art_group = ? ORDER BY name ASC', [artGroup])
  return rows.map(rowToArtPack)
}

export async function saveCustomArtPack(pack: CustomArtPackRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_art_packs (id, art_group, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [pack.id, pack.artGroup, pack.name, pack.createdAt, pack.updatedAt],
  )
}

export async function deleteCustomArtPack(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_art_pack_files WHERE pack_id = ?', [id])
  await db.execute('DELETE FROM custom_art_packs WHERE id = ?', [id])
}

export async function getArtPackFiles(packId: string): Promise<{ canonicalName: string; fileName: string }[]> {
  const db = await getDb()
  const rows = await db.select<{ canonical_name: string; file_name: string }[]>(
    'SELECT canonical_name, file_name FROM custom_art_pack_files WHERE pack_id = ?', [packId],
  )
  return rows.map(r => ({ canonicalName: r.canonical_name, fileName: r.file_name }))
}

export async function getArtPackFile(packId: string, canonicalName: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<{ file_name: string }[]>(
    'SELECT file_name FROM custom_art_pack_files WHERE pack_id = ? AND canonical_name = ?', [packId, canonicalName],
  )
  return rows[0]?.file_name ?? null
}

export async function saveArtPackFile(packId: string, canonicalName: string, fileName: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_art_pack_files (pack_id, canonical_name, file_name) VALUES (?, ?, ?)`,
    [packId, canonicalName, fileName],
  )
}
