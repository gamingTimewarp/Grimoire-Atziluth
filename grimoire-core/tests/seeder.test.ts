/**
 * seeder.test.ts
 * Integration test: loads the actual grimoire-data/ seed directory and
 * verifies entity counts, key canonical names, and cross-entity links.
 *
 * This test runs against the real JSON files — it will fail if any
 * seed file is malformed or references a non-existent canonical name.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { createGrimoireEngine, GrimoireEngine } from '../src/engines/grimoire-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../grimoire-data')

describe('Seeder integration — grimoire-data/', () => {
  let engine: GrimoireEngine

  beforeAll(async () => {
    engine = await createGrimoireEngine(new InMemoryAdapter(), {
      dataDir: DATA_DIR,
      verbose: false,
    })
  }, 60_000) // allow up to 60 s for loading ~700 entities + links

  // ─── Sentinel ────────────────────────────────────────────────────────────

  it('seeds the sentinel entity (tarot.major.rws.the-fool)', async () => {
    const entity = await engine.adapter.getEntityByCanonicalName('tarot.major.rws.the-fool')
    expect(entity).not.toBeNull()
    expect(entity!.primaryDisplayName).toBe('The Fool')
  })

  // ─── Entity counts ───────────────────────────────────────────────────────

  it('loads at least 700 entities', async () => {
    const result = await engine.adapter.listEntities({}, { offset: 0, limit: 1 })
    expect(result.total).toBeGreaterThanOrEqual(700)
  })

  it('loads 22 RWS major arcana', async () => {
    const major = await engine.adapter.listEntities(
      { tags: ['major-arcana', 'rider-waite-smith'] },
      { offset: 0, limit: 100 }
    )
    expect(major.items.length).toBe(22)
  })

  it('loads 22 Thoth major arcana', async () => {
    const major = await engine.adapter.listEntities(
      { tags: ['major-arcana', 'thoth'] },
      { offset: 0, limit: 100 }
    )
    expect(major.items.length).toBe(22)
  })

  it('loads 11 sephiroth (including Da\'ath)', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'qabalah.sephira' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(11)
  })

  it('loads 22 Qabalistic paths', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'qabalah.path' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(22)
  })

  it('loads 10 Qliphothic shells', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'qabalah.qliphoth' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(10)
  })

  it('loads 22 Hebrew letters', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'letter.hebrew' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(22)
  })

  it('loads 24 Elder Futhark runes', async () => {
    const result = await engine.adapter.listEntities(
      { tags: ['elder-futhark'] },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(24)
  })

  it('loads 64 I Ching hexagrams', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'iching.hexagram' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(64)
  })

  it('loads 72 Goetia demons', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'goetia.demon' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(72)
  })

  it('loads 13 zodiac signs (including Ophiuchus)', async () => {
    const result = await engine.adapter.listEntities(
      { entityType: 'astrology.zodiac-sign' },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(13)
  })

  it('loads 7 classical chakras', async () => {
    const result = await engine.adapter.listEntities(
      { tags: ['chakra', 'classical'] },
      { offset: 0, limit: 100 }
    )
    expect(result.items.length).toBe(7)
  })

  // ─── Key entity content ───────────────────────────────────────────────────

  it('Kether has expected display name and sephira number', async () => {
    const kether = await engine.adapter.getEntityByCanonicalName('qabalah.sephira.kether')
    expect(kether).not.toBeNull()
    expect(kether!.primaryDisplayName).toBe('Kether')
    expect(kether!.extendedData.number).toBe(1)
  })

  it('The Emperor has correct card number', async () => {
    const emperor = await engine.adapter.getEntityByCanonicalName('tarot.major.rws.the-emperor')
    expect(emperor).not.toBeNull()
    expect(emperor!.extendedData.cardNumber).toBe(4)
  })

  it('Thoth Adjustment has card number 8 (restoring Marseille order)', async () => {
    const adjustment = await engine.adapter.getEntityByCanonicalName('tarot.major.thoth.adjustment')
    expect(adjustment).not.toBeNull()
    expect(adjustment!.extendedData.cardNumber).toBe(8)
  })

  it('Thoth Lust has card number 11 (restoring Marseille order)', async () => {
    const lust = await engine.adapter.getEntityByCanonicalName('tarot.major.thoth.lust')
    expect(lust).not.toBeNull()
    expect(lust!.extendedData.cardNumber).toBe(11)
  })

  it('Fehu (first Elder Futhark rune) has correct glyph and aett', async () => {
    const fehu = await engine.adapter.getEntityByCanonicalName('rune.elder-futhark.fehu')
    expect(fehu).not.toBeNull()
    expect(fehu!.extendedData.runeGlyph).toBe('ᚠ')
    expect(fehu!.extendedData.aett).toBe('norse.deity.freya')
    expect(fehu!.extendedData.orderNumber).toBe(1)
  })

  it('Hexagram 1 (Qian) has correct display name and pinyin', async () => {
    const qian = await engine.adapter.getEntityByCanonicalName('iching.hexagram.1')
    expect(qian).not.toBeNull()
    expect(qian!.primaryDisplayName).toBe('Qian — The Creative')
    expect(qian!.extendedData.pinyin).toBe('Qiān')
  })

  it('Bael (#1 Goetia) is a King with 66 legions', async () => {
    const bael = await engine.adapter.getEntityByCanonicalName('goetia.demon.bael')
    expect(bael).not.toBeNull()
    expect(bael!.extendedData.rank).toBe('King')
    expect(bael!.extendedData.legions).toBe(66)
  })

  // ─── Structural links ────────────────────────────────────────────────────

  it('Path 13 connects Kether to Tiphareth', async () => {
    const upper = await engine.adapter.queryLinks({
      sourceCanonicalName: 'qabalah.path.13',
      labels: ['attributed-upper-terminus'],
    })
    expect(upper.items.length).toBe(1)
    expect(upper.items[0].targetCanonicalName).toBe('qabalah.sephira.kether')

    const lower = await engine.adapter.queryLinks({
      sourceCanonicalName: 'qabalah.path.13',
      labels: ['attributed-lower-terminus'],
    })
    expect(lower.items.length).toBe(1)
    expect(lower.items[0].targetCanonicalName).toBe('qabalah.sephira.tiphareth')
  })

  it('Kether is linked to Thaumiel as its Qliphothic shell', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'qabalah.sephira.kether',
      labels: ['attributed-qliphothic-shell'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('qabalah.qliphoth.thaumiel')
  })

  it('Aleph is linked to Path 11', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'letter.hebrew.aleph',
      labels: ['path'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('qabalah.path.11')
  })

  it('RWS Wands suit is linked to Fire element', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.suit.rws.wands',
      labels: ['suit-element'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('astrology.element.fire')
  })

  it('RWS The Fool corresponds to Thoth The Fool and TdM Le Mat', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.major.rws.the-fool',
      labels: ['corresponds-to'],
    })
    const targets = links.items.map(l => l.targetCanonicalName)
    expect(targets).toContain('tarot.major.thoth.the-fool')
    expect(targets).toContain('tarot.major.tdm.le-mat')
  })

  // ─── Tradition-scoped links ───────────────────────────────────────────────

  it('GD tradition links RWS The Fool to Hebrew Aleph', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.major.rws.the-fool',
      labels: ['gd-tarot-letter'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('letter.hebrew.aleph')
    expect(links.items[0].traditionScope).toContain('golden-dawn')
  })

  it('GD tradition links RWS The Star to Aquarius (via Tzaddi)', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.major.rws.the-star',
      labels: ['gd-tarot-sign'],
    })
    const zodiacLink = links.items.find(l =>
      l.targetCanonicalName === 'astrology.zodiac-sign.aquarius'
    )
    expect(zodiacLink).toBeDefined()
    expect(zodiacLink!.traditionScope).toContain('golden-dawn')
  })

  it('Thoth tradition assigns The Emperor to Path 28 (Tzaddi swap)', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.major.thoth.the-emperor',
      labels: ['thoth-tarot-path'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('qabalah.path.28')
  })

  it('Thoth tradition assigns The Star to Path 15 (Heh swap)', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'tarot.major.thoth.the-star',
      labels: ['thoth-tarot-path'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('qabalah.path.15')
  })

  it('Jewish Kabbalah links digit 1 to Kether', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'numerology.digit.1',
      labels: ['kabbalistic-digit-sephira'],
    })
    const kether = links.items.find(l => l.targetCanonicalName === 'qabalah.sephira.kether')
    expect(kether).toBeDefined()
    expect(kether!.traditionScope).toContain('jewish-kabbalah')
  })

  it('Pythagorean numerology links digit 1 to the Sun', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'numerology.digit.1',
      labels: ['pythagorean-digit-planet'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('astrology.planet.sol')
  })

  it('Sunday is ruled by the Sun', async () => {
    const links = await engine.adapter.queryLinks({
      sourceCanonicalName: 'planetary-hour.day-ruler.sunday-sun',
      labels: ['day-ruled-by'],
    })
    expect(links.items.length).toBe(1)
    expect(links.items[0].targetCanonicalName).toBe('astrology.planet.sol')
  })

  // ─── Idempotency ─────────────────────────────────────────────────────────

  it('seeding twice does not double-count entities', async () => {
    const countBefore = (await engine.adapter.listEntities({}, { offset: 0, limit: 1 })).total

    // Re-seed (seeder skips if sentinel exists)
    const { loadSeedDirectory } = await import('../src/seeder/file-loader.js')
    const { Seeder } = await import('../src/seeder/seeder.js')
    const data = loadSeedDirectory(DATA_DIR)
    const seeder = new Seeder(engine, false)
    const result = await seeder.seedIfNeeded(data)

    expect(result.skipped).toBe(true)

    const countAfter = (await engine.adapter.listEntities({}, { offset: 0, limit: 1 })).total
    expect(countAfter).toBe(countBefore)
  })
})
