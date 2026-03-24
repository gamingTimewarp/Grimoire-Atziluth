/**
 * schema.ts
 * SQLite DDL for Grimoire Core.
 * Applied by the migration runner on initialize().
 */

export const SCHEMA_VERSION = 1

export const MIGRATIONS: Record<number, string> = {
  1: /* sql */ `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_version (
      version    INTEGER NOT NULL,
      applied_at TEXT    NOT NULL
    );

    -- ─── entities ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS entities (
      id                    TEXT    PRIMARY KEY,
      canonical_name        TEXT    NOT NULL UNIQUE,
      entity_type           TEXT    NOT NULL,
      primary_display_name  TEXT    NOT NULL,
      description           TEXT,
      user_notes            TEXT,
      extended_data         TEXT    NOT NULL DEFAULT '{}',
      tags                  TEXT    NOT NULL DEFAULT '[]',
      is_built_in           INTEGER NOT NULL DEFAULT 0,
      forked_from_canonical TEXT,
      created_at            TEXT    NOT NULL,
      updated_at            TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entities_entity_type
      ON entities (entity_type);

    CREATE INDEX IF NOT EXISTS idx_entities_is_built_in
      ON entities (is_built_in);

    CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts
      USING fts5(
        id UNINDEXED,
        canonical_name,
        primary_display_name,
        content='entities',
        content_rowid='rowid'
      );

    CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities BEGIN
      INSERT INTO entities_fts(rowid, id, canonical_name, primary_display_name)
        VALUES (new.rowid, new.id, new.canonical_name, new.primary_display_name);
    END;

    CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, id, canonical_name, primary_display_name)
        VALUES ('delete', old.rowid, old.id, old.canonical_name, old.primary_display_name);
    END;

    CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, id, canonical_name, primary_display_name)
        VALUES ('delete', old.rowid, old.id, old.canonical_name, old.primary_display_name);
      INSERT INTO entities_fts(rowid, id, canonical_name, primary_display_name)
        VALUES (new.rowid, new.id, new.canonical_name, new.primary_display_name);
    END;

    -- ─── secondary_names ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS secondary_names (
      id           TEXT    PRIMARY KEY,
      entity_id    TEXT    NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      name         TEXT    NOT NULL,
      language_tag TEXT    NOT NULL,
      visible      INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_secondary_names_entity_id
      ON secondary_names (entity_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS secondary_names_fts
      USING fts5(
        id UNINDEXED,
        entity_id UNINDEXED,
        name,
        content='secondary_names',
        content_rowid='rowid'
      );

    CREATE TRIGGER IF NOT EXISTS secondary_names_ai AFTER INSERT ON secondary_names BEGIN
      INSERT INTO secondary_names_fts(rowid, id, entity_id, name)
        VALUES (new.rowid, new.id, new.entity_id, new.name);
    END;

    CREATE TRIGGER IF NOT EXISTS secondary_names_ad AFTER DELETE ON secondary_names BEGIN
      INSERT INTO secondary_names_fts(secondary_names_fts, rowid, id, entity_id, name)
        VALUES ('delete', old.rowid, old.id, old.entity_id, old.name);
    END;

    CREATE TRIGGER IF NOT EXISTS secondary_names_au AFTER UPDATE ON secondary_names BEGIN
      INSERT INTO secondary_names_fts(secondary_names_fts, rowid, id, entity_id, name)
        VALUES ('delete', old.rowid, old.id, old.entity_id, old.name);
      INSERT INTO secondary_names_fts(rowid, id, entity_id, name)
        VALUES (new.rowid, new.id, new.entity_id, new.name);
    END;

    -- ─── custom_attributes ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS custom_attributes (
      id         TEXT    PRIMARY KEY,
      entity_id  TEXT    NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      key        TEXT    NOT NULL,
      value      TEXT    NOT NULL DEFAULT 'null',
      label      TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE (entity_id, key)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_attributes_entity_id
      ON custom_attributes (entity_id);

    -- ─── entity_tags (denormalised pivot for indexed tag queries) ─────────
    CREATE TABLE IF NOT EXISTS entity_tags (
      entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      tag       TEXT NOT NULL,
      PRIMARY KEY (entity_id, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_entity_tags_tag
      ON entity_tags (tag);

    -- ─── links ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS links (
      id                    TEXT    PRIMARY KEY,
      source_canonical_name TEXT    NOT NULL REFERENCES entities(canonical_name),
      target_canonical_name TEXT    NOT NULL REFERENCES entities(canonical_name),
      label                 TEXT    NOT NULL,
      bidirectional         INTEGER NOT NULL DEFAULT 0,
      tradition_scope       TEXT    NOT NULL DEFAULT '[]',
      is_built_in           INTEGER NOT NULL DEFAULT 0,
      note                  TEXT,
      extended_data         TEXT    NOT NULL DEFAULT '{}',
      created_at            TEXT    NOT NULL,
      updated_at            TEXT    NOT NULL,
      UNIQUE (source_canonical_name, target_canonical_name, label)
    );

    CREATE INDEX IF NOT EXISTS idx_links_source
      ON links (source_canonical_name);

    CREATE INDEX IF NOT EXISTS idx_links_target
      ON links (target_canonical_name);

    CREATE INDEX IF NOT EXISTS idx_links_label
      ON links (label);

    CREATE INDEX IF NOT EXISTS idx_links_source_label
      ON links (source_canonical_name, label);

    CREATE INDEX IF NOT EXISTS idx_links_target_label
      ON links (target_canonical_name, label);

    -- ─── link_tradition_scope (denormalised pivot) ─────────────────────
    CREATE TABLE IF NOT EXISTS link_tradition_scope (
      link_id                  TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      tradition_canonical_name TEXT NOT NULL,
      PRIMARY KEY (link_id, tradition_canonical_name)
    );

    CREATE INDEX IF NOT EXISTS idx_link_tradition_scope_tradition
      ON link_tradition_scope (tradition_canonical_name);

    -- ─── traditions ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS traditions (
      id                    TEXT    PRIMARY KEY,
      canonical_name        TEXT    NOT NULL UNIQUE,
      display_name          TEXT    NOT NULL,
      description           TEXT,
      owned_link_labels     TEXT    NOT NULL DEFAULT '[]',
      is_built_in           INTEGER NOT NULL DEFAULT 0,
      forked_from_canonical TEXT,
      created_at            TEXT    NOT NULL,
      updated_at            TEXT    NOT NULL
    );

    -- ─── attribution_fields ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS attribution_fields (
      id                       TEXT    PRIMARY KEY,
      tradition_id             TEXT    NOT NULL REFERENCES traditions(id) ON DELETE CASCADE,
      tradition_canonical_name TEXT    NOT NULL,
      link_label               TEXT    NOT NULL,
      display_name             TEXT    NOT NULL,
      target_entity_type       TEXT,
      allow_multiple           INTEGER NOT NULL DEFAULT 1,
      sort_order               INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_attribution_fields_tradition_id
      ON attribution_fields (tradition_id);

    CREATE INDEX IF NOT EXISTS idx_attribution_fields_link_label
      ON attribution_fields (link_label);
  `,
}
