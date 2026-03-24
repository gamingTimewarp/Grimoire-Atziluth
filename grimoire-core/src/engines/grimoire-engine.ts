/**
 * grimoire-engine.ts
 * The public facade for all of Grimoire Core.
 *
 * Consumers (UI layer, Tauri commands, tests) should interact with this
 * class exclusively. It wires together EntityEngine, GraphEngine, and
 * TraditionEngine over a shared StorageAdapter.
 *
 * Usage (without seeding):
 *   const engine = await createGrimoireEngine(new InMemoryAdapter())
 *
 * Usage (with built-in dataset seeding):
 *   const engine = await createGrimoireEngine(new SqliteAdapter('./db.sqlite'), {
 *     dataDir: '/path/to/grimoire-data',
 *   })
 */

import type { StorageAdapter } from '../types/storage.types.js'
import { EntityEngine } from './entity-engine.js'
import { GraphEngine } from './graph-engine.js'
import { TraditionEngine } from './tradition-engine.js'
import { NotInitializedError } from '../utils/errors.js'

export interface GrimoireEngineOptions {
  /**
   * Path to the grimoire-data/ directory.
   * When provided, built-in datasets are seeded on first run.
   */
  dataDir?: string
  /** Log seeder progress to console. Default: false */
  verbose?: boolean
}

export class GrimoireEngine {
  private _initialized = false

  readonly entities: EntityEngine
  readonly graph: GraphEngine
  readonly traditions: TraditionEngine
  readonly adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
    this.entities = new EntityEngine(adapter)
    this.graph = new GraphEngine(adapter)
    this.traditions = new TraditionEngine(adapter)
  }

  /**
   * Initialize the engine and its underlying storage adapter.
   * When options.dataDir is provided, seeds built-in datasets on first run.
   * Idempotent — safe to call multiple times.
   */
  async initialize(options?: GrimoireEngineOptions): Promise<void> {
    if (this._initialized) return
    await this.adapter.initialize()
    this._initialized = true

    if (options?.dataDir) {
      // Dynamic imports keep the seeder out of the critical path when not used
      const { loadSeedDirectory } = await import('../seeder/file-loader.js')
      const { Seeder } = await import('../seeder/seeder.js')
      const data = loadSeedDirectory(options.dataDir)
      const seeder = new Seeder(this, options.verbose ?? false)
      await seeder.seedIfNeeded(data)
    }
  }

  /**
   * Graceful shutdown. Closes the storage adapter.
   */
  async close(): Promise<void> {
    await this.adapter.close()
    this._initialized = false
  }

  get isInitialized(): boolean {
    return this._initialized
  }

  /** Assert the engine has been initialized; throw if not */
  assertInitialized(): void {
    if (!this._initialized) throw new NotInitializedError()
  }
}

/**
 * Factory function — preferred entry point.
 * Returns an initialized GrimoireEngine instance.
 */
export async function createGrimoireEngine(
  adapter: StorageAdapter,
  options?: GrimoireEngineOptions
): Promise<GrimoireEngine> {
  const engine = new GrimoireEngine(adapter)
  await engine.initialize(options)
  return engine
}
