/**
 * duplicate-attribute-fields.test.ts
 * Regression guard for a UI bug found in the Sephiroth (Divine Name) and Ogham
 * (Deity) reference pages: an entity's extendedData carried a plain key that
 * auto-formats (via formatFieldLabel) to the exact same label as an
 * attributed-* link already rendered — clickable — in the Reference page's
 * Attributes panel. The result was two rows sharing one label, only one of
 * them a link.
 *
 * This test scans the real seed data for the same pattern: any entity that is
 * party to an attributed-* link AND also carries an extendedData key matching
 * that link's label. Known, already-mitigated cases (hidden from the raw data
 * table via additionalHiddenKeys in
 * grimoire-app/src/routes/reference/$canonicalName.tsx) are recorded in
 * ALLOWED_DUPLICATES below. Anything else means a new data entry reintroduced
 * the bug: either delete the redundant extendedData field, or — if it's
 * intentional — add a hide-set entry in $canonicalName.tsx and an allowlist
 * entry here.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { createGrimoireEngine, GrimoireEngine } from '../src/engines/grimoire-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../grimoire-data')

/** `${entityType}::${key}` pairs already mitigated in $canonicalName.tsx's
 *  additionalHiddenKeys — kept in the data (sometimes as source material for
 *  the link itself) but hidden from the generic extendedData table. */
const ALLOWED_DUPLICATES = new Set([
  'qabalah.sephira::divineName',
  'wuxing.phase::season',
  'alchemy.metal::planet',
  'enochian.tablet::element',
  'geomancy.figure::planet',
  'geomancy.figure::zodiacSign',
  'ogham.letter::element',
])

/** "attributed-divine-name" -> "divineName"; "attributed-zodiac-sign" -> "zodiacSign" */
function attributedLabelToKey(label: string): string {
  const [first, ...rest] = label.slice('attributed-'.length).split('-')
  return first + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

describe('Data integrity — no duplicated attribute fields', () => {
  let engine: GrimoireEngine

  beforeAll(async () => {
    engine = await createGrimoireEngine(new InMemoryAdapter(), {
      dataDir: DATA_DIR,
      verbose: false,
    })
  }, 60_000)

  it('no entity extendedData field shadows an attributed-* link under the same auto-generated label', async () => {
    const allLinks = await engine.adapter.queryLinks({})
    const attributionLinks = allLinks.items.filter(l => l.label.startsWith('attributed-'))

    const { items: allEntities } = await engine.adapter.listEntities({}, { offset: 0, limit: 5000 })
    const byName = new Map(allEntities.map(e => [e.canonicalName, e]))

    const offenders: string[] = []

    for (const link of attributionLinks) {
      const key = attributedLabelToKey(link.label)
      const candidates = link.bidirectional
        ? [link.sourceCanonicalName, link.targetCanonicalName]
        : [link.sourceCanonicalName]

      for (const cn of candidates) {
        const entity = byName.get(cn)
        if (!entity) continue
        const value = entity.extendedData[key]
        if (value === null || value === undefined || value === '') continue

        const allowKey = `${entity.entityType}::${key}`
        if (ALLOWED_DUPLICATES.has(allowKey)) continue

        offenders.push(
          `${cn} (${entity.entityType}) has extendedData.${key} = ${JSON.stringify(value)}, ` +
          `which duplicates the "${link.label}" link's auto-generated label. Either remove the ` +
          `redundant extendedData field, or if it's intentional, hide it in $canonicalName.tsx's ` +
          `additionalHiddenKeys and add "${allowKey}" to ALLOWED_DUPLICATES above.`
        )
      }
    }

    expect(offenders).toEqual([])
  })
})
