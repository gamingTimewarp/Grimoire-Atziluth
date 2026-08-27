/**
 * engine.test.ts
 * Integration tests for the GrimoireEngine facade.
 * Tests the full stack: facade → engines → adapter → data.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { createGrimoireEngine, GrimoireEngine } from '../src/engines/grimoire-engine.js'
import { TraditionId } from '../src/constants/tradition-ids.js'
import { NotInitializedError } from '../src/utils/errors.js'
import { theFool, kether, mars, aleph } from './fixtures/entities.fixture.js'
import { goldenDawnTradition, thothTradition } from './fixtures/traditions.fixture.js'
import { foolToAleph, foolToKether } from './fixtures/links.fixture.js'

describe('GrimoireEngine lifecycle', () => {
  it('initializes via createGrimoireEngine factory', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())
    expect(engine.isInitialized).toBe(true)
    await engine.close()
    expect(engine.isInitialized).toBe(false)
  })

  it('is idempotently initializable', async () => {
    const engine = new GrimoireEngine(new InMemoryAdapter())
    await engine.initialize()
    await engine.initialize()  // second call is no-op
    expect(engine.isInitialized).toBe(true)
    await engine.close()
  })
})

describe('GrimoireEngine integration', () => {
  it('creates entities, links, and traditions through the facade', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())

    // Create entities
    const fool = await engine.entities.createEntity(theFool)
    const alephEntity = await engine.entities.createEntity(aleph)

    // Create tradition
    const gd = await engine.traditions.createTradition(goldenDawnTradition)

    // Create attribution link
    const link = await engine.graph.createLink(foolToAleph)

    // Query attributions
    const attrs = await engine.traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN]
    )

    expect(attrs.byTradition).toHaveLength(1)
    expect(attrs.byTradition[0]!.fields['attributed-letter']).toHaveLength(1)
    expect(attrs.byTradition[0]!.fields['attributed-letter']![0]!.targetPrimaryDisplayName).toBe('Aleph')

    await engine.close()
  })

  it('graph traversal: getNeighbours returns depth-1 links', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())

    await engine.entities.createEntity(theFool)
    await engine.entities.createEntity(kether)
    await engine.entities.createEntity(aleph)
    await engine.graph.createLink(foolToKether)
    await engine.graph.createLink(foolToAleph)

    // The Fool has 2 neighbours
    const foolLinks = await engine.graph.getNeighbours('tarot.major.the-fool')
    expect(foolLinks).toHaveLength(2)

    // Kether has 1 incoming link (from fool, bidirectional)
    const ketherLinks = await engine.graph.getNeighbours('qabalah.sephira.kether')
    expect(ketherLinks).toHaveLength(1)

    await engine.close()
  })

  it('multiple traditions surface different attributions for the same entity', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())

    await engine.entities.createEntity(theFool)
    await engine.entities.createEntity(aleph)

    await engine.traditions.createTradition(goldenDawnTradition)
    await engine.traditions.createTradition(thothTradition)

    // foolToAleph has scope [GD, Thoth] — both traditions see it
    await engine.graph.createLink(foolToAleph)

    const attrs = await engine.traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN, TraditionId.THOTH_CROWLEY]
    )

    expect(attrs.byTradition).toHaveLength(2)
    for (const tradResult of attrs.byTradition) {
      expect(tradResult.fields['attributed-letter']).toHaveLength(1)
    }

    await engine.close()
  })

  it('global search finds entities by name', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())

    await engine.entities.createEntity(theFool)
    await engine.entities.createEntity(kether)
    await engine.entities.createEntity(mars)

    const results = await engine.entities.searchEntities('kether')
    expect(results.items).toHaveLength(1)
    expect(results.items[0]!.entity.canonicalName).toBe('qabalah.sephira.kether')

    await engine.close()
  })

  it('fork tradition and update independently', async () => {
    const engine = await createGrimoireEngine(new InMemoryAdapter())

    await engine.traditions.createTradition(goldenDawnTradition)
    const fork = await engine.traditions.forkTradition(
      TraditionId.GOLDEN_DAWN,
      'tradition.my-gd',
      'My GD Variant'
    )

    expect(fork.isBuiltIn).toBe(false)
    const updated = await engine.traditions.updateTradition('tradition.my-gd', {
      displayName: 'Renamed GD',
    })
    expect(updated.displayName).toBe('Renamed GD')

    // Original is unchanged
    const original = await engine.traditions.getTradition(TraditionId.GOLDEN_DAWN)
    expect(original.displayName).toBe('Golden Dawn')

    await engine.close()
  })
})
