import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { GraphEngine } from '../src/engines/graph-engine.js'
import { EntityEngine } from '../src/engines/entity-engine.js'
import { TraditionId } from '../src/constants/tradition-ids.js'
import {
  DuplicateLinkError,
  ImmutableLinkError,
  LinkNotFoundError,
} from '../src/utils/errors.js'
import { theFool, kether, mars, aleph } from './fixtures/entities.fixture.js'
import { foolToAleph, foolToKether, foolToAirGD } from './fixtures/links.fixture.js'

async function makeEngines() {
  const adapter = new InMemoryAdapter()
  const entities = new EntityEngine(adapter)
  const graph = new GraphEngine(adapter)

  // Seed entities
  await entities.createEntity(theFool)
  await entities.createEntity(kether)
  await entities.createEntity(mars)
  await entities.createEntity(aleph)

  return { adapter, entities, graph }
}

describe('GraphEngine.createLink', () => {
  it('creates a link between two entities', async () => {
    const { graph } = await makeEngines()
    const link = await graph.createLink(foolToAleph)

    expect(link.sourceCanonicalName).toBe('tarot.major.the-fool')
    expect(link.targetCanonicalName).toBe('letter.hebrew.aleph')
    expect(link.label).toBe('attributed-letter')
    expect(link.traditionScope).toContain(TraditionId.GOLDEN_DAWN)
    expect(link.id).toBeTruthy()
  })

  it('creates a universal link (traditionScope = [])', async () => {
    const { graph } = await makeEngines()
    const link = await graph.createLink(foolToKether)
    expect(link.traditionScope).toHaveLength(0)
    expect(link.bidirectional).toBe(true)
  })

  it('throws DuplicateLinkError for duplicate source/target/label', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)
    await expect(graph.createLink(foolToAleph)).rejects.toThrow(DuplicateLinkError)
  })
})

describe('GraphEngine.getLink', () => {
  it('retrieves a link by id', async () => {
    const { graph } = await makeEngines()
    const created = await graph.createLink(foolToAleph)
    const retrieved = await graph.getLink(created.id)
    expect(retrieved.id).toBe(created.id)
  })

  it('throws LinkNotFoundError for missing links', async () => {
    const { graph } = await makeEngines()
    await expect(graph.getLink('nonexistent-id')).rejects.toThrow(LinkNotFoundError)
  })
})

describe('GraphEngine.updateLink', () => {
  it('updates a user link', async () => {
    const { graph } = await makeEngines()
    const created = await graph.createLink({ ...foolToAleph, isBuiltIn: false })
    const updated = await graph.updateLink(created.id, { note: 'Updated note' })
    expect(updated.note).toBe('Updated note')
  })

  it('throws ImmutableLinkError for built-in links', async () => {
    const { graph } = await makeEngines()
    const created = await graph.createLink(foolToAleph)  // isBuiltIn: true
    await expect(graph.updateLink(created.id, { note: 'x' })).rejects.toThrow(ImmutableLinkError)
  })
})

describe('GraphEngine.deleteLink', () => {
  it('deletes a user link', async () => {
    const { graph } = await makeEngines()
    const link = await graph.createLink({ ...foolToAleph, isBuiltIn: false })
    await graph.deleteLink(link.id)
    await expect(graph.getLink(link.id)).rejects.toThrow(LinkNotFoundError)
  })

  it('throws ImmutableLinkError for built-in links', async () => {
    const { graph } = await makeEngines()
    const link = await graph.createLink(foolToAleph)
    await expect(graph.deleteLink(link.id)).rejects.toThrow(ImmutableLinkError)
  })
})

describe('GraphEngine.getNeighbours', () => {
  it('returns all depth-1 links for an entity', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)
    await graph.createLink(foolToKether)

    const links = await graph.getNeighbours('tarot.major.the-fool')
    expect(links).toHaveLength(2)
  })

  it('filters by direction=outgoing', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)
    await graph.createLink(foolToKether)

    // Aleph also has a link coming FROM the fool — let's check kether outgoing from Kether POV
    const links = await graph.getNeighbours('tarot.major.the-fool', { direction: 'outgoing' })
    expect(links.every(l => l.sourceCanonicalName === 'tarot.major.the-fool')).toBe(true)
  })

  it('filters by label', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)
    await graph.createLink(foolToKether)

    const links = await graph.getNeighbours('tarot.major.the-fool', {
      labels: ['attributed-letter'],
    })
    expect(links).toHaveLength(1)
    expect(links[0]?.targetCanonicalName).toBe('letter.hebrew.aleph')
  })

  it('filters by tradition', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)     // GD + Thoth
    await graph.createLink(foolToKether)    // universal
    await graph.createLink(foolToAirGD)     // GD only — but no air entity, still a valid link

    // When filtering to GD only, universal links pass through, GD-specific links pass through
    const links = await graph.getNeighbours('tarot.major.the-fool', {
      traditions: [TraditionId.GOLDEN_DAWN],
    })
    // Should include both GD-scoped links and universal links
    expect(links.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GraphEngine.getLinksBetween', () => {
  it('returns links in both directions', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)

    const links = await graph.getLinksBetween('tarot.major.the-fool', 'letter.hebrew.aleph')
    expect(links).toHaveLength(1)

    // Reverse lookup also works
    const reverse = await graph.getLinksBetween('letter.hebrew.aleph', 'tarot.major.the-fool')
    expect(reverse).toHaveLength(1)
  })
})

describe('GraphEngine.linkExists', () => {
  it('returns true when link exists', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)
    const exists = await graph.linkExists(
      'tarot.major.the-fool',
      'letter.hebrew.aleph',
      'attributed-letter'
    )
    expect(exists).toBe(true)
  })

  it('returns false when link does not exist', async () => {
    const { graph } = await makeEngines()
    const exists = await graph.linkExists(
      'tarot.major.the-fool',
      'letter.hebrew.aleph',
      'attributed-letter'
    )
    expect(exists).toBe(false)
  })
})

describe('GraphEngine.countIncomingLinks', () => {
  it('counts links pointing to an entity', async () => {
    const { graph } = await makeEngines()
    await graph.createLink(foolToAleph)

    const count = await graph.countIncomingLinks('letter.hebrew.aleph')
    expect(count).toBe(1)
  })

  it('returns 0 when no incoming links', async () => {
    const { graph } = await makeEngines()
    const count = await graph.countIncomingLinks('tarot.major.the-fool')
    expect(count).toBe(0)
  })
})
