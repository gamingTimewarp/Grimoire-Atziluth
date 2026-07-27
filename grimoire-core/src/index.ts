/**
 * grimoire-core — public API
 * Import everything you need from '@grimoire/core'
 */

// Types
export type * from './types/index.js'

// Constants
export * from './constants/index.js'

// Slug utilities
export * from './slugs/index.js'

// Errors
export * from './utils/errors.js'

// ID utilities
export { newId, nowIso } from './utils/id.js'

// Adapters
export { InMemoryAdapter } from './adapters/in-memory/index.js'
export { SqliteAdapter } from './adapters/sqlite/index.js'

// Engines
export { EntityEngine } from './engines/entity-engine.js'
export { GraphEngine } from './engines/graph-engine.js'
export { TraditionEngine } from './engines/tradition-engine.js'
export { GrimoireEngine, createGrimoireEngine } from './engines/grimoire-engine.js'
export type { GrimoireEngineOptions } from './engines/grimoire-engine.js'

// Seeder
export { Seeder, loadSeedDirectory } from './seeder/index.js'
export type * from './seeder/seed-schema.js'

// Divination model
export type * from './types/divination.types.js'

// Calendar systems
export type { CalendarDate, CalendarSystem, MonthKey } from './calendars/index.js'
export {
  CALENDAR_SYSTEMS,
  HebrewCalendarSystem,
  IslamicCalendarSystem,
  ChineseCalendarSystem,
  HinduCalendarSystem,
  gregorianToDayCount,
  dayCountToGregorian,
} from './calendars/index.js'
