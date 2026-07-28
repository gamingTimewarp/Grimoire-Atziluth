/**
 * quiz-logic.ts
 * Pure, platform-agnostic functions shared by quiz-db and quiz-engine.
 * No Tauri imports — safe to unit-test directly with Vitest.
 */

import type { CardState } from './quiz-db'

// ─── Card state classification ─────────────────────────────────────────────────

export type CardStateCategory = 'new' | 'learning' | 'review' | 'mature'

/**
 * Classifies a CardState (or absence of one) into an SM-2 learning stage.
 *
 * - new:      never reviewed (no state, or nextDue === null)
 * - learning: seen but repetition < 2 (still in initial learning phase)
 * - review:   repetition ≥ 2 but interval < 21 days
 * - mature:   interval ≥ 21 days (well-established)
 */
export function classifyCardState(state: CardState | undefined): CardStateCategory {
  if (!state || state.nextDue === null) return 'new'
  if (state.repetition < 2)             return 'learning'
  if (state.intervalDays < 21)          return 'review'
  return 'mature'
}

// ─── SM-2 algorithm ────────────────────────────────────────────────────────────

/**
 * Standard SM-2 spaced repetition algorithm.
 * rating: 0–2 = fail (reset), 3–5 = pass (advance)
 */
export function sm2(state: CardState, rating: 0|1|2|3|4|5): CardState {
  let { repetition, intervalDays, easeFactor } = state

  if (rating >= 3) {
    if (repetition === 0)      intervalDays = 1
    else if (repetition === 1) intervalDays = 6
    else                       intervalDays = Math.round(intervalDays * easeFactor)
    repetition += 1
  } else {
    repetition  = 0
    intervalDays = 1
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))

  const due = new Date()
  due.setDate(due.getDate() + intervalDays)

  return {
    ...state,
    repetition,
    intervalDays,
    easeFactor,
    nextDue:      due.toISOString().slice(0, 10),
    lastReviewed: new Date().toISOString().slice(0, 10),
  }
}

// ─── Fuzzy match ───────────────────────────────────────────────────────────────

const normalizeForMatch = (s: string): string => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

/**
 * Classifies how (if at all) a fill-in-blank input matches an expected answer:
 * - 'exact': identical after normalising case/punctuation/whitespace.
 * - 'substring': one contains the other, for answers longer than 6 chars —
 *   e.g. typing just "New beginnings" against a Lenormand meaning stored as
 *   "New beginnings, spontaneity, a free spirit". This is a deliberate,
 *   designed leniency for keyword-list answers (the user typed one real,
 *   complete, correctly-spelled keyword), not a near-miss typo.
 * - 'near': matched only via the up-to-2-character-edit tolerance for short
 *   answers — genuinely likely to be a misspelling of the intended answer.
 * - 'none': no match by any rule.
 *
 * Purely numeric answers (card numbers, path numbers, etc.) never get 'near':
 * a one-digit edit distance away is a different, legitimately wrong number
 * (17 is not a typo for 16), not a plausible misspelling.
 */
export type MatchKind = 'exact' | 'substring' | 'near' | 'none'

export function classifyMatch(input: string, answer: string): MatchKind {
  const ni = normalizeForMatch(input)
  const na = normalizeForMatch(answer)
  if (!ni) return 'none'
  if (ni === na) return 'exact'
  if (na.length > 6 && (na.includes(ni) || ni.includes(na))) return 'substring'
  if (/^[0-9]+$/.test(na)) return 'none'
  if (na.length > 20 || ni.length > 20) return 'none'
  let diff = 0
  for (let i = 0; i < Math.max(ni.length, na.length); i++) {
    if (ni[i] !== na[i]) diff++
    if (diff > 2) return 'none'
  }
  return 'near'
}

/** True if input is the expected answer exactly, ignoring case/punctuation/whitespace only. */
export function exactMatch(input: string, answer: string): boolean {
  return classifyMatch(input, answer) === 'exact'
}

/**
 * Fuzzy-matches a fill-in-blank input against the expected answer.
 * - Normalises to lowercase, strips non-alphanumeric characters
 * - Allows substring match for long answers
 * - Allows up to 2 character edits for short answers (≤ 20 chars)
 */
export function fuzzyMatch(input: string, answer: string): boolean {
  return classifyMatch(input, answer) !== 'none'
}

// ─── Streak computation ────────────────────────────────────────────────────────

/**
 * Computes the current study streak from a list of session dates (ISO strings).
 * A streak is the number of consecutive calendar days (ending today or yesterday)
 * on which at least one session was completed.
 */
export function computeStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0

  // Unique days (YYYY-MM-DD)
  const days = new Set(sessionDates.map(d => d.slice(0, 10)))
  const today = new Date().toISOString().slice(0, 10)

  // Walk back from today; if today has no session, start from yesterday
  let streak = 0
  const cursor = new Date()

  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  // Safety: limit to 3650 days
  for (let i = 0; i < 3650; i++) {
    const dateStr = cursor.toISOString().slice(0, 10)
    if (days.has(dateStr)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
