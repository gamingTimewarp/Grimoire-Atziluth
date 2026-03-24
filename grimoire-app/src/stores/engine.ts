/**
 * engine.ts
 * Zustand store managing the GrimoireEngine singleton.
 * On first use, seeds the InMemoryAdapter from bundled JSON data.
 */

import { create } from 'zustand'
import { InMemoryAdapter, createGrimoireEngine } from '@grimoire/core'
import type { GrimoireEngine } from '@grimoire/core'
import { loadBundledSeedData } from '@/lib/seed-loader'
import { initCustomDb, seedCustomIntoEngine } from '@/lib/custom-db'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface EngineStore {
  engine: GrimoireEngine | null
  status: Status
  error: string | null
  initialize: () => Promise<void>
}

export const useEngineStore = create<EngineStore>((set, get) => ({
  engine: null,
  status: 'idle',
  error: null,

  async initialize() {
    if (get().status !== 'idle') return
    set({ status: 'loading' })

    try {
      const adapter = new InMemoryAdapter()
      // Seed from bundled grimoire-data JSON (Vite virtual module)
      const seedData = loadBundledSeedData()

      // createGrimoireEngine normally expects a dataDir for Node.js file loading.
      // Here we bypass that and seed manually from pre-loaded data.
      const { Seeder } = await import('@grimoire/core')
      // Build engine without auto-seeding (no dataDir)
      const engine = await createGrimoireEngine(adapter)
      const seeder = new Seeder(engine, false)
      await seeder.seedIfNeeded(seedData)
      await initCustomDb()
      await seedCustomIntoEngine(adapter)

      set({ engine, status: 'ready' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ status: 'error', error: message })
    }
  },
}))
