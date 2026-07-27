/**
 * divination.types.ts
 * Data model for decks, spreads, and readings.
 * Readings are user-created data; decks and spreads may be built-in or user-defined.
 */

export type CardOrientation = 'upright' | 'reversed' | 'none'

// ─── Deck ─────────────────────────────────────────────────────────────────────

/** Configuration for a card deck (built-in preset or user-defined). */
export interface DeckDefinition {
  id: string
  displayName: string
  description?: string
  isBuiltIn: boolean
  /** Canonical names of card entities included in this deck, in deck order. */
  cardCanonicalNames: string[]
  reversalEnabled: boolean
}

// ─── Spread ───────────────────────────────────────────────────────────────────

export interface SpreadPosition {
  id: string
  name: string
  meaning: string
  drawOrder: number
  /** Which axis orientation the card uses in this position. */
  orientationRule: 'upright-reversed' | 'directional' | 'none'
  /** Grid coordinates (0-4 each axis on the 5×5×5 grid). */
  x: number
  y: number
  z: number
}

/** Configuration for a spread layout. */
export interface SpreadDefinition {
  id: string
  displayName: string
  description?: string
  isBuiltIn: boolean
  /** If set, this spread is only offered when this deck ID is selected. */
  requiredDeckId?: string
  /**
   * False disables drawing clarifier cards for this spread (default true).
   * Used for spreads like the Grand Tableau that consume the entire deck by
   * definition — every card already has a place, so an extra "clarifier" pull
   * outside the layout doesn't make sense for the format.
   */
  allowClarifiers?: boolean
  positions: SpreadPosition[]
}

// ─── Reading ──────────────────────────────────────────────────────────────────

export interface ReadingCard {
  id: string
  /** Canonical name of the drawn card entity. */
  cardCanonicalName: string
  /** Spread position id; null for free readings. */
  positionId: string | null
  drawOrder: number
  orientation: CardOrientation
}

export interface Reading {
  id: string
  createdAt: string
  /** ISO datetime the user assigns to the reading (may differ from createdAt). */
  readingDate: string
  deckId: string
  spreadId: string | null
  isFreeReading: boolean
  /** True if this reading was auto-created as the daily card pull. */
  isDaily?: boolean
  cards: ReadingCard[]
  /** The user's intention or question for this reading. */
  question?: string | null
  /** 'self' or a name. */
  subject: string | null
  notes: string
  tags: string[]
  /** Canonical names of traditions active at the time of the reading. */
  traditionSnapshot: string[]
  /** Planetary positions captured at the time of the reading (JSON-serialised NatalChartData). */
  astroSnapshot: object | null
}

export type CreateReadingInput = Omit<Reading, 'id' | 'createdAt'>
