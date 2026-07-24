/**
 * reading.ts
 * Zustand store managing an in-progress reading session.
 */

import { create } from 'zustand'
import type { BaseEntity, CardOrientation, Reading, CreateReadingInput } from '@grimoire/core'
import type { DeckFilter, SpreadDefinition } from '@/lib/built-in-data'
import type { SpreadPosition } from '@grimoire/core'
import { nowIso } from '@grimoire/core'
import { saveReading } from '@/lib/reading-db'
import { getNatalChart } from '@/lib/astro-engine'
import { getHomeLocation } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'

/** One card as drawn during the reading flow. */
export interface DrawnCard {
  card: BaseEntity
  positionId: string | null
  drawOrder: number
  orientation: CardOrientation
}

type ReadingStep = 'deck' | 'spread' | 'draw' | 'notes' | 'complete'

interface ReadingStore {
  // Step tracking
  step: ReadingStep

  // Selections
  selectedDeck: DeckFilter | null
  selectedSpread: SpreadDefinition | null
  /**
   * Whether reversed cards can be drawn in this reading. Initialised from the
   * deck's own reversalEnabled default whenever a deck is selected, but the user
   * can override it (in either direction) for this specific reading before drawing.
   */
  reversalsEnabled: boolean

  /** Shuffled deck of card entities. */
  shuffledCards: BaseEntity[]
  /** Index into shuffledCards for next draw. */
  drawIndex: number

  /** Cards drawn so far. */
  drawnCards: DrawnCard[]

  /** Current position being drawn (index into spread.positions, ordered by drawOrder). */
  currentPositionIndex: number

  // Finalization
  question: string
  notes: string
  tags: string[]
  subject: string

  // Completed reading
  savedReading: Reading | null

  // Actions
  setDeck: (deck: DeckFilter) => void
  /** Overrides reversalsEnabled for this reading only, independent of the deck default. */
  setReversalsEnabled: (enabled: boolean) => void
  setSpread: (spread: SpreadDefinition) => void
  startDraw: (shuffledCards: BaseEntity[]) => void
  /** Draw the next card; orientation is chosen automatically based on deck reversal setting. */
  drawCard: () => void
  /** Manually flip the last drawn card's orientation (upright ↔ reversed). */
  flipLastCard: () => void
  /** Draw one extra clarifier card outside of spread positions (positionId stays null, step unchanged). */
  drawClarifier: () => void
  setQuestion: (question: string) => void
  setNotes: (notes: string) => void
  setTags: (tags: string[]) => void
  setSubject: (subject: string) => void
  saveAndFinish: () => Promise<void>
  reset: () => void
}

const initialState = {
  step: 'deck' as ReadingStep,
  selectedDeck: null,
  selectedSpread: null,
  reversalsEnabled: true,
  shuffledCards: [],
  drawIndex: 0,
  drawnCards: [],
  currentPositionIndex: 0,
  question: '',
  notes: '',
  tags: [],
  subject: 'self',
  savedReading: null,
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useReadingStore = create<ReadingStore>((set, get) => ({
  ...initialState,

  setDeck(deck) {
    set({ selectedDeck: deck, reversalsEnabled: deck.reversalEnabled, step: 'spread' })
  },

  setReversalsEnabled(enabled) {
    set({ reversalsEnabled: enabled })
  },

  setSpread(spread) {
    set({ selectedSpread: spread, step: 'draw' })
  },

  startDraw(shuffledCards) {
    set({ shuffledCards: fisherYates(shuffledCards), drawIndex: 0, drawnCards: [], currentPositionIndex: 0 })
  },

  drawCard() {
    const { shuffledCards, drawIndex, drawnCards, currentPositionIndex, selectedSpread, reversalsEnabled } = get()
    if (drawIndex >= shuffledCards.length) return

    const card = shuffledCards[drawIndex]
    const isFree = !selectedSpread || selectedSpread.positions.length === 0
    const positions: SpreadPosition[] = isFree ? [] : [...selectedSpread!.positions].sort((a, b) => a.drawOrder - b.drawOrder)
    const position = positions[currentPositionIndex] ?? null

    // Auto-determine orientation: reversed 50% of the time if reversals are enabled
    // for this reading (defaults to the deck's setting, but can be overridden per-reading)
    const orientation: CardOrientation =
      reversalsEnabled && Math.random() < 0.5 ? 'reversed' : 'upright'

    const drawn: DrawnCard = {
      card,
      positionId: position?.id ?? null,
      drawOrder: drawnCards.length + 1,
      orientation,
    }

    const nextDrawn = [...drawnCards, drawn]
    const nextPositionIndex = currentPositionIndex + 1
    const allPositionsFilled = !isFree && nextPositionIndex >= positions.length

    set({
      drawnCards: nextDrawn,
      drawIndex: drawIndex + 1,
      currentPositionIndex: nextPositionIndex,
      // Stay on 'draw' so the user can draw clarifiers before proceeding to notes
      step: 'draw',
    })
  },

  flipLastCard() {
    const { drawnCards } = get()
    if (!drawnCards.length) return
    const last = drawnCards[drawnCards.length - 1]
    const flipped = { ...last, orientation: last.orientation === 'reversed' ? 'upright' : 'reversed' } as DrawnCard
    set({ drawnCards: [...drawnCards.slice(0, -1), flipped] })
  },

  drawClarifier() {
    const { shuffledCards, drawIndex, drawnCards, reversalsEnabled } = get()
    if (drawIndex >= shuffledCards.length) return
    const card = shuffledCards[drawIndex]
    const orientation: CardOrientation =
      reversalsEnabled && Math.random() < 0.5 ? 'reversed' : 'upright'
    set({
      drawnCards: [...drawnCards, { card, positionId: null, drawOrder: drawnCards.length + 1, orientation }],
      drawIndex: drawIndex + 1,
    })
  },

  setQuestion(question) { set({ question }) },
  setNotes(notes) { set({ notes }) },
  setTags(tags) { set({ tags }) },
  setSubject(subject) { set({ subject }) },

  async saveAndFinish() {
    const { selectedDeck, selectedSpread, drawnCards, question, notes, tags, subject } = get()
    if (!selectedDeck) return

    // Capture astrological snapshot at time of saving
    let astroSnapshot = null
    try {
      const loc = getHomeLocation()
      const { astrologyMode, houseSystem } = loadTraditionSettings()
      astroSnapshot = getNatalChart(new Date(), loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode)
    } catch (e) {
      console.error('Astro snapshot failed:', e)
    }

    const input: CreateReadingInput = {
      readingDate: nowIso(),
      deckId: selectedDeck.id,
      spreadId: selectedSpread?.id ?? null,
      isFreeReading: !selectedSpread || selectedSpread.positions.length === 0,
      cards: drawnCards.map(dc => ({
        id: '',
        cardCanonicalName: dc.card.canonicalName,
        positionId: dc.positionId,
        drawOrder: dc.drawOrder,
        orientation: dc.orientation,
      })),
      question: question.trim() || null,
      subject: subject || null,
      notes,
      tags,
      traditionSnapshot: [],
      astroSnapshot: null,
    }

    const saved = await saveReading(input, { astroSnapshot })
    set({ savedReading: saved, step: 'complete' })
  },

  reset() {
    set(initialState)
  },
}))
