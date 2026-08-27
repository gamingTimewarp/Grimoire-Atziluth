import { describe, it, expect } from 'vitest'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { EntityEngine } from '../src/engines/entity-engine.js'
import { GraphEngine } from '../src/engines/graph-engine.js'
import { TraditionEngine } from '../src/engines/tradition-engine.js'
import { TraditionId } from '../src/constants/tradition-ids.js'
import {
  CanonicalNameConflictError,
  ImmutableTraditionError,
  TraditionNotFoundError,
  InvalidCanonicalNameError,
} from '../src/utils/errors.js'
import { theFool, aleph, mars } from './fixtures/entities.fixture.js'
import { goldenDawnTradition, thothTradition } from './fixtures/traditions.fixture.js'
import { foolToAleph, foolToKether, foolToAirGD } from './fixtures/links.fixture.js'

// Air element entity (needed for element attribution tests)
const airElement = {
  canonicalName: 'astrology.element.air',
  entityType: 'astrology.element',
  primaryDisplayName: 'Air',
  tags: ['element'],
  isBuiltIn: true,
  extendedData: {},
}

async function makeEngines() {
  const adapter = new InMemoryAdapter()
  const entities = new EntityEngine(adapter)
  const graph = new GraphEngine(adapter)
  const traditions = new TraditionEngine(adapter)

  await entities.createEntity(theFool)
  await entities.createEntity(aleph)
  await entities.createEntity(mars)
  await entities.createEntity(airElement)

  return { adapter, entities, graph, traditions }
}

describe('TraditionEngine.createTradition', () => {
  it('creates a tradition with attribution fields', async () => {
    const { traditions } = await makeEngines()
    const tradition = await traditions.createTradition(goldenDawnTradition)

    expect(tradition.canonicalName).toBe(TraditionId.GOLDEN_DAWN)
    expect(tradition.displayName).toBe('Golden Dawn')
    expect(tradition.isBuiltIn).toBe(true)
    expect(tradition.attributionFields).toHaveLength(5)
    expect(tradition.ownedLinkLabels).toContain('attributed-planet')
    expect(tradition.ownedLinkLabels).toContain('attributed-letter')
  })

  it('throws CanonicalNameConflictError on duplicate', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await expect(traditions.createTradition(goldenDawnTradition)).rejects.toThrow(CanonicalNameConflictError)
  })

  it('throws InvalidCanonicalNameError for invalid canonical names', async () => {
    const { traditions } = await makeEngines()
    await expect(
      traditions.createTradition({ ...goldenDawnTradition, canonicalName: 'invalid name!' })
    ).rejects.toThrow(InvalidCanonicalNameError)
  })
})

describe('TraditionEngine.getTradition', () => {
  it('retrieves by canonicalName', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    const t = await traditions.getTradition(TraditionId.GOLDEN_DAWN)
    expect(t.displayName).toBe('Golden Dawn')
  })

  it('throws TraditionNotFoundError for missing traditions', async () => {
    const { traditions } = await makeEngines()
    await expect(traditions.getTradition('tradition.nonexistent')).rejects.toThrow(TraditionNotFoundError)
  })
})

describe('TraditionEngine.updateTradition', () => {
  it('throws ImmutableTraditionError for built-in traditions', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await expect(
      traditions.updateTradition(TraditionId.GOLDEN_DAWN, { displayName: 'Hacked' })
    ).rejects.toThrow(ImmutableTraditionError)
  })

  it('updates a user tradition', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition({ ...goldenDawnTradition, isBuiltIn: false })
    const updated = await traditions.updateTradition(TraditionId.GOLDEN_DAWN, {
      displayName: 'My Custom GD',
    })
    expect(updated.displayName).toBe('My Custom GD')
  })
})

describe('TraditionEngine.forkTradition', () => {
  it('forks a built-in tradition', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)

    const fork = await traditions.forkTradition(
      TraditionId.GOLDEN_DAWN,
      'tradition.my-gd',
      'My Golden Dawn'
    )
    expect(fork.canonicalName).toBe('tradition.my-gd')
    expect(fork.isBuiltIn).toBe(false)
    expect(fork.forkedFromCanonicalName).toBe(TraditionId.GOLDEN_DAWN)
    expect(fork.attributionFields).toHaveLength(5)
    expect(fork.displayName).toBe('My Golden Dawn')
  })

  it('throws CanonicalNameConflictError if new name exists', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await traditions.createTradition(thothTradition)
    await expect(
      traditions.forkTradition(TraditionId.GOLDEN_DAWN, TraditionId.THOTH_CROWLEY, 'Conflict')
    ).rejects.toThrow(CanonicalNameConflictError)
  })
})

describe('TraditionEngine.getAttributionsForEntity', () => {
  it('returns empty result when no traditions requested', async () => {
    const { traditions } = await makeEngines()
    const result = await traditions.getAttributionsForEntity('tarot.major.the-fool', [])
    expect(result.byTradition).toHaveLength(0)
  })

  it('returns tradition-scoped attributions', async () => {
    const { traditions, graph } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await graph.createLink(foolToAleph)  // GD + Thoth

    const result = await traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN]
    )

    expect(result.byTradition).toHaveLength(1)
    const gdResult = result.byTradition[0]!
    expect(gdResult.tradition.canonicalName).toBe(TraditionId.GOLDEN_DAWN)
    expect(gdResult.fields['attributed-letter']).toHaveLength(1)
    expect(gdResult.fields['attributed-letter']![0]!.targetCanonicalName).toBe('letter.hebrew.aleph')
  })

  it('includes universal links in all tradition results', async () => {
    const { traditions, graph } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    // foolToKether is a universal corresponds-to link — but GD doesn't own "corresponds-to"
    // so it won't appear in GD's attribution panel (expected behaviour)
    await graph.createLink(foolToKether)
    await graph.createLink(foolToAleph)  // GD owns attributed-letter

    const result = await traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN]
    )
    const gdResult = result.byTradition[0]!
    // Only GD-owned labels appear; universal corresponds-to is not a GD field
    expect(gdResult.fields['attributed-letter']).toHaveLength(1)
  })

  it('returns attributions for multiple traditions simultaneously', async () => {
    const { traditions, graph } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await traditions.createTradition(thothTradition)
    await graph.createLink(foolToAleph)  // attributed to both GD and Thoth

    const result = await traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN, TraditionId.THOTH_CROWLEY]
    )

    expect(result.byTradition).toHaveLength(2)
    const gdResult = result.byTradition.find(t => t.tradition.canonicalName === TraditionId.GOLDEN_DAWN)!
    const thothResult = result.byTradition.find(t => t.tradition.canonicalName === TraditionId.THOTH_CROWLEY)!

    expect(gdResult.fields['attributed-letter']).toHaveLength(1)
    expect(thothResult.fields['attributed-letter']).toHaveLength(1)
  })

  it('isolates tradition-specific links correctly', async () => {
    const { traditions, graph } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await traditions.createTradition(thothTradition)
    await graph.createLink(foolToAirGD)  // GD only — attributed-element

    const result = await traditions.getAttributionsForEntity(
      'tarot.major.the-fool',
      [TraditionId.GOLDEN_DAWN, TraditionId.THOTH_CROWLEY]
    )

    const gdResult = result.byTradition.find(t => t.tradition.canonicalName === TraditionId.GOLDEN_DAWN)!
    const thothResult = result.byTradition.find(t => t.tradition.canonicalName === TraditionId.THOTH_CROWLEY)!

    // GD sees the air attribution
    expect(gdResult.fields['attributed-element']).toHaveLength(1)
    // Thoth does NOT see the GD-only attribution
    expect(thothResult.fields['attributed-element']).toHaveLength(0)
  })

  it('throws TraditionNotFoundError for missing traditions', async () => {
    const { traditions } = await makeEngines()
    await expect(
      traditions.getAttributionsForEntity('tarot.major.the-fool', ['tradition.nonexistent'])
    ).rejects.toThrow(TraditionNotFoundError)
  })
})

describe('TraditionEngine.getAttributionsForEntities', () => {
  it('returns results for multiple entities', async () => {
    const { traditions, graph, entities } = await makeEngines()
    await entities.createEntity({ ...aleph, canonicalName: 'tarot.major.the-magician', primaryDisplayName: 'The Magician', isBuiltIn: true })
    await traditions.createTradition(goldenDawnTradition)
    await graph.createLink(foolToAleph)

    const results = await traditions.getAttributionsForEntities(
      ['tarot.major.the-fool', 'tarot.major.the-magician'],
      [TraditionId.GOLDEN_DAWN]
    )

    expect(results).toHaveLength(2)
    expect(results[0]!.entityCanonicalName).toBe('tarot.major.the-fool')
    expect(results[1]!.entityCanonicalName).toBe('tarot.major.the-magician')
  })
})

describe('TraditionEngine.getTraditionsForLinkLabel', () => {
  it('returns traditions that own a label', async () => {
    const { traditions } = await makeEngines()
    await traditions.createTradition(goldenDawnTradition)
    await traditions.createTradition(thothTradition)

    const result = await traditions.getTraditionsForLinkLabel('attributed-planet')
    expect(result.length).toBe(2)
    const names = result.map(t => t.canonicalName)
    expect(names).toContain(TraditionId.GOLDEN_DAWN)
    expect(names).toContain(TraditionId.THOTH_CROWLEY)
  })
})
