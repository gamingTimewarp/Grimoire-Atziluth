/**
 * study.ts
 * Zustand store managing an in-progress study session.
 *
 * Mirrors reading.ts's persisted step machine: choosing a preset, and progress
 * through the actual quiz, survive navigation and app restarts. Previously
 * Study kept session progress only in component refs inside session.tsx, so a
 * refresh mid-session silently discarded everything — this is the fix for that
 * gap, the same way reading.ts prevents losing an in-progress reading.
 *
 * Per-question interaction state (the current Question text, whether it's
 * flipped/revealed, fill-in-blank input) stays local to session.tsx — it's
 * cheaply regenerable from `cards[cardIndex]` and not worth persisting; what
 * matters for "don't lose my progress" is the card queue and how far through
 * it the user got, which this store owns.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudyPreset, QuizSettings } from '@/lib/quiz-db'
import type { SessionCard } from '@/lib/quiz-engine'

type StudyStep = 'preset' | 'session' | 'complete'

interface StudyStore {
  step: StudyStep

  activePreset: StudyPreset | null
  /** Resolved settings actually used to build the session — the chosen
   * preset's settings, with any one-time (unsaved) overrides applied on top. */
  sessionConfig: QuizSettings | null

  cards: SessionCard[]
  cardIndex: number
  reviewed: number
  correct: number
  /** Cards dropped without ever reaching `advanceCard` — no resolvable answer
   * could be generated for them (see `skipCard`). Tracked separately from
   * `reviewed` so the Session Complete screen can explain why its total is
   * lower than the number of cards the user actually selected, instead of
   * silently reporting a shrunken denominator with no context. */
  skipped: number

  /** Selects a preset as the basis for the next session; stays on the 'preset'
   * step so the user can review/customize before starting. */
  choosePreset: (preset: StudyPreset) => void
  /** Applies one-time overrides to the session config without touching the
   * saved preset itself. */
  updateOneTimeConfig: (config: QuizSettings) => void
  startSession: (cards: SessionCard[]) => void
  /** Records the outcome of the current card and advances the resume position
   * to `nextIndex` (passed explicitly, not just +1, since cards with no
   * resolvable answer are skipped locally without going through this action). */
  advanceCard: (nextIndex: number, wasCorrect: boolean) => void
  /** Records that a card was dropped because no resolvable question could be
   * generated for it — doesn't touch `cardIndex`, mirroring `advanceCard`'s
   * existing "resuming just re-attempts and re-skips it" behavior. */
  skipCard: () => void
  completeSession: () => void
  /** Leaves a finished or abandoned session and returns to the preset-picker
   * step, clearing the queue and tally — but keeps activePreset/sessionConfig
   * intact, so a one-time customization survives into the next session
   * instead of silently reverting to the chosen preset's saved settings. Used
   * by "End Session" and "Back to Overview"; `reset` (below) is the harder
   * full wipe for anywhere that genuinely wants a clean slate. */
  endSession: () => void
  reset: () => void
}

const initialState = {
  step: 'preset' as StudyStep,
  activePreset: null,
  sessionConfig: null,
  cards: [],
  cardIndex: 0,
  reviewed: 0,
  correct: 0,
  skipped: 0,
}

type PersistedStudyState = Pick<StudyStore,
  | 'step' | 'activePreset' | 'sessionConfig' | 'cards' | 'cardIndex' | 'reviewed' | 'correct' | 'skipped'
>

export const useStudyStore = create<StudyStore>()(persist((set, get) => ({
  ...initialState,

  choosePreset(preset) {
    set({ activePreset: preset, sessionConfig: preset.settings, step: 'preset' })
  },

  updateOneTimeConfig(config) {
    set({ sessionConfig: config })
  },

  startSession(cards) {
    set({ cards, cardIndex: 0, reviewed: 0, correct: 0, skipped: 0, step: 'session' })
  },

  advanceCard(nextIndex, wasCorrect) {
    const { reviewed, correct } = get()
    set({
      cardIndex: nextIndex,
      reviewed: reviewed + 1,
      correct: wasCorrect ? correct + 1 : correct,
    })
  },

  skipCard() {
    set({ skipped: get().skipped + 1 })
  },

  completeSession() {
    set({ step: 'complete' })
  },

  endSession() {
    set({ step: 'preset', cards: [], cardIndex: 0, reviewed: 0, correct: 0, skipped: 0 })
  },

  reset() {
    set(initialState)
  },
}), {
  name: 'grimoire:study-session',
  partialize: (state): PersistedStudyState => {
    // A finished session is already recorded (quiz_session_history / last
    // result) — don't resurrect its "just completed" screen on next launch.
    // Only reset the session-instance fields (the finished queue/tally) back
    // to their initial values; keep activePreset/sessionConfig as-is so a
    // one-time customization survives into the next session instead of
    // silently reverting to the chosen preset's saved settings every time.
    if (state.step === 'complete') {
      return {
        step: 'preset', activePreset: state.activePreset, sessionConfig: state.sessionConfig,
        cards: [], cardIndex: 0, reviewed: 0, correct: 0, skipped: 0,
      }
    }
    const { step, activePreset, sessionConfig, cards, cardIndex, reviewed, correct, skipped } = state
    return { step, activePreset, sessionConfig, cards, cardIndex, reviewed, correct, skipped }
  },
}))
