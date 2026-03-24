import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAdapter } from '../src/adapters/in-memory/index.js'
import { EntityEngine } from '../src/engines/entity-engine.js'
import { EntityType } from '../src/constants/entity-types.js'
import {
  CanonicalNameConflictError,
  EntityNotFoundError,
  ImmutableEntityError,
  InvalidCanonicalNameError,
} from '../src/utils/errors.js'
import { theFool, kether, mars } from './fixtures/entities.fixture.js'

function makeEngine() {
  const adapter = new InMemoryAdapter()
  return { adapter, engine: new EntityEngine(adapter) }
}

describe('EntityEngine.createEntity', () => {
  it('creates an entity with all base fields', async () => {
    const { engine } = makeEngine()
    const entity = await engine.createEntity(theFool)

    expect(entity.canonicalName).toBe('tarot.major.the-fool')
    expect(entity.primaryDisplayName).toBe('The Fool')
    expect(entity.isBuiltIn).toBe(true)
    expect(entity.id).toBeTruthy()
    expect(entity.createdAt).toBeTruthy()
    expect(entity.secondaryNames).toHaveLength(2)
    expect(entity.secondaryNames[0]?.name).toBe('Le Mat')
  })

  it('throws InvalidCanonicalNameError for invalid canonical names', async () => {
    const { engine } = makeEngine()
    await expect(
      engine.createEntity({ ...theFool, canonicalName: 'bad name!' })
    ).rejects.toThrow(InvalidCanonicalNameError)
  })

  it('throws CanonicalNameConflictError on duplicate', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await expect(engine.createEntity(theFool)).rejects.toThrow(CanonicalNameConflictError)
  })

  it('stores extendedData correctly', async () => {
    const { engine } = makeEngine()
    const entity = await engine.createEntity(theFool)
    expect(entity.extendedData['cardNumber']).toBe(0)
    expect(entity.extendedData['arcana']).toBe('major')
  })

  it('stores tags', async () => {
    const { engine } = makeEngine()
    const entity = await engine.createEntity(theFool)
    expect(entity.tags).toContain('major-arcana')
    expect(entity.tags).toContain('tarot')
  })
})

describe('EntityEngine.getEntity', () => {
  it('retrieves by canonicalName', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    const entity = await engine.getEntity('tarot.major.the-fool')
    expect(entity.primaryDisplayName).toBe('The Fool')
  })

  it('throws EntityNotFoundError for missing entities', async () => {
    const { engine } = makeEngine()
    await expect(engine.getEntity('tarot.major.nonexistent')).rejects.toThrow(EntityNotFoundError)
  })
})

describe('EntityEngine.updateEntity', () => {
  it('updates mutable fields', async () => {
    const { engine } = makeEngine()
    await engine.createEntity({ ...theFool, isBuiltIn: false })
    const updated = await engine.updateEntity('tarot.major.the-fool', {
      primaryDisplayName: 'The Fool (Edited)',
      userNotes: 'My notes',
    })
    expect(updated.primaryDisplayName).toBe('The Fool (Edited)')
    expect(updated.userNotes).toBe('My notes')
    expect(updated.canonicalName).toBe('tarot.major.the-fool')
  })

  it('throws ImmutableEntityError for built-in entities', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await expect(
      engine.updateEntity('tarot.major.the-fool', { primaryDisplayName: 'Hacked' })
    ).rejects.toThrow(ImmutableEntityError)
  })

  it('throws EntityNotFoundError for missing entities', async () => {
    const { engine } = makeEngine()
    await expect(
      engine.updateEntity('tarot.major.nonexistent', { primaryDisplayName: 'X' })
    ).rejects.toThrow(EntityNotFoundError)
  })
})

describe('EntityEngine.deleteEntity', () => {
  it('deletes a user entity', async () => {
    const { engine } = makeEngine()
    await engine.createEntity({ ...kether, isBuiltIn: false })
    await engine.deleteEntity('qabalah.sephira.kether')
    await expect(engine.getEntity('qabalah.sephira.kether')).rejects.toThrow(EntityNotFoundError)
  })

  it('throws ImmutableEntityError for built-in entities', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(kether)
    await expect(engine.deleteEntity('qabalah.sephira.kether')).rejects.toThrow(ImmutableEntityError)
  })
})

describe('EntityEngine.forkEntity', () => {
  it('clones a built-in entity with new canonicalName', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)

    const fork = await engine.forkEntity('tarot.major.the-fool', 'tarot.major.my-fool')
    expect(fork.canonicalName).toBe('tarot.major.my-fool')
    expect(fork.isBuiltIn).toBe(false)
    expect(fork.forkedFromCanonicalName).toBe('tarot.major.the-fool')
    expect(fork.primaryDisplayName).toBe('The Fool')
    expect(fork.secondaryNames).toHaveLength(2)
  })

  it('throws CanonicalNameConflictError if new name already exists', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity({ ...mars, isBuiltIn: false })
    await expect(
      engine.forkEntity('tarot.major.the-fool', 'astrology.planet.mars')
    ).rejects.toThrow(CanonicalNameConflictError)
  })

  it('throws InvalidCanonicalNameError for invalid new names', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await expect(
      engine.forkEntity('tarot.major.the-fool', 'bad name!')
    ).rejects.toThrow(InvalidCanonicalNameError)
  })
})

describe('EntityEngine.listEntities', () => {
  it('returns all entities by default', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    await engine.createEntity(mars)
    const result = await engine.listEntities()
    expect(result.total).toBe(3)
  })

  it('filters by entityType', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    const result = await engine.listEntities({ entityType: EntityType.TAROT_CARD })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.canonicalName).toBe('tarot.major.the-fool')
  })

  it('filters by tag', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    const result = await engine.listEntities({ tags: ['qabalah'] })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.canonicalName).toBe('qabalah.sephira.kether')
  })

  it('supports pagination', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    await engine.createEntity(mars)
    const page1 = await engine.listEntities({}, { limit: 2, offset: 0 })
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(3)
  })
})

describe('EntityEngine.searchEntities', () => {
  it('finds entities by partial name match', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    const result = await engine.searchEntities('fool')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.entity.canonicalName).toBe('tarot.major.the-fool')
  })

  it('finds entities by secondary name', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    const result = await engine.searchEntities('Le Mat')
    expect(result.items.some(r => r.entity.canonicalName === 'tarot.major.the-fool')).toBe(true)
  })

  it('returns empty array for no matches', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    const result = await engine.searchEntities('zzznomatch')
    expect(result.items).toHaveLength(0)
  })
})

describe('EntityEngine secondary names', () => {
  it('adds a secondary name', async () => {
    const { engine } = makeEngine()
    const entity = await engine.createEntity({ ...theFool, isBuiltIn: false, secondaryNames: [] })
    const name = await engine.addSecondaryName('tarot.major.the-fool', {
      name: 'Der Narr',
      languageTag: 'de',
      visible: true,
      sortOrder: 0,
    })
    expect(name.name).toBe('Der Narr')
    expect(name.languageTag).toBe('de')
    expect(name.id).toBeTruthy()
  })

  it('updates a secondary name visibility', async () => {
    const { engine } = makeEngine()
    await engine.createEntity({ ...theFool, isBuiltIn: false })
    const entity = await engine.getEntity('tarot.major.the-fool')
    const nameId = entity.secondaryNames[0]!.id
    const updated = await engine.updateSecondaryName(nameId, { visible: false })
    expect(updated.visible).toBe(false)
  })

  it('removes a secondary name', async () => {
    const { engine } = makeEngine()
    await engine.createEntity({ ...theFool, isBuiltIn: false })
    const entity = await engine.getEntity('tarot.major.the-fool')
    const nameId = entity.secondaryNames[0]!.id
    await engine.removeSecondaryName(nameId)
    const refreshed = await engine.getEntity('tarot.major.the-fool')
    expect(refreshed.secondaryNames.find(n => n.id === nameId)).toBeUndefined()
  })
})

describe('EntityEngine custom attributes', () => {
  it('adds a custom attribute', async () => {
    const { engine } = makeEngine()
    await engine.createEntity({ ...theFool, isBuiltIn: false, customAttributes: [] })
    const attr = await engine.addCustomAttribute('tarot.major.the-fool', {
      key: 'personal-note',
      value: 'This card resonates with me.',
      sortOrder: 0,
    })
    expect(attr.key).toBe('personal-note')
    expect(attr.value).toBe('This card resonates with me.')
  })
})

describe('EntityEngine.listAllTags', () => {
  it('returns all distinct tags', async () => {
    const { engine } = makeEngine()
    await engine.createEntity(theFool)
    await engine.createEntity(kether)
    const tags = await engine.listAllTags()
    expect(tags).toContain('tarot')
    expect(tags).toContain('qabalah')
    expect(tags).toContain('major-arcana')
  })
})
