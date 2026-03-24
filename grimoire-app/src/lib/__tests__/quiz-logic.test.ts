import { describe, it, expect } from 'vitest'
import { sm2, fuzzyMatch, classifyCardState, computeStreak } from '../quiz-logic'
import type { CardState } from '../quiz-db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<CardState> = {}): CardState {
  return {
    entityCanonicalName: 'test.entity',
    questionType:        'field:foo',
    repetition:          0,
    intervalDays:        1,
    easeFactor:          2.5,
    nextDue:             null,
    lastReviewed:        null,
    ...overrides,
  }
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayMinus(days: number): string {
  return todayPlus(-days)
}

// ─── classifyCardState ────────────────────────────────────────────────────────

describe('classifyCardState', () => {
  it('returns "new" for undefined', () => {
    expect(classifyCardState(undefined)).toBe('new')
  })

  it('returns "new" for state with null nextDue', () => {
    expect(classifyCardState(makeState({ nextDue: null }))).toBe('new')
  })

  it('returns "learning" for repetition < 2', () => {
    expect(classifyCardState(makeState({ nextDue: todayPlus(1), repetition: 0 }))).toBe('learning')
    expect(classifyCardState(makeState({ nextDue: todayPlus(6), repetition: 1 }))).toBe('learning')
  })

  it('returns "review" for repetition >= 2 and intervalDays < 21', () => {
    expect(classifyCardState(makeState({ nextDue: todayPlus(14), repetition: 2, intervalDays: 14 }))).toBe('review')
    expect(classifyCardState(makeState({ nextDue: todayPlus(20), repetition: 5, intervalDays: 20 }))).toBe('review')
  })

  it('returns "mature" for intervalDays >= 21', () => {
    expect(classifyCardState(makeState({ nextDue: todayPlus(21), repetition: 3, intervalDays: 21 }))).toBe('mature')
    expect(classifyCardState(makeState({ nextDue: todayPlus(90), repetition: 6, intervalDays: 90 }))).toBe('mature')
  })
})

// ─── sm2 ─────────────────────────────────────────────────────────────────────

describe('sm2', () => {
  it('interval 1 day on first correct answer (rep=0)', () => {
    const next = sm2(makeState(), 4)
    expect(next.repetition).toBe(1)
    expect(next.intervalDays).toBe(1)
  })

  it('interval 6 days on second correct answer (rep=1)', () => {
    const next = sm2(makeState({ repetition: 1, intervalDays: 1 }), 4)
    expect(next.repetition).toBe(2)
    expect(next.intervalDays).toBe(6)
  })

  it('scales interval by easeFactor on subsequent correct answers', () => {
    const state = makeState({ repetition: 2, intervalDays: 6, easeFactor: 2.5 })
    const next = sm2(state, 4)
    expect(next.intervalDays).toBe(Math.round(6 * 2.5))
    expect(next.repetition).toBe(3)
  })

  it('resets on failure (rating < 3)', () => {
    const state = makeState({ repetition: 5, intervalDays: 60, easeFactor: 2.5 })
    const next = sm2(state, 2)
    expect(next.repetition).toBe(0)
    expect(next.intervalDays).toBe(1)
  })

  it('increases easeFactor on rating=5', () => {
    const state = makeState({ easeFactor: 2.5 })
    const next = sm2(state, 5)
    expect(next.easeFactor).toBeGreaterThan(2.5)
  })

  it('decreases easeFactor on rating=3', () => {
    const state = makeState({ easeFactor: 2.5 })
    const next = sm2(state, 3)
    expect(next.easeFactor).toBeLessThan(2.5)
  })

  it('does not drop easeFactor below 1.3', () => {
    const state = makeState({ easeFactor: 1.3 })
    const next = sm2(state, 0)
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('sets nextDue to a future date', () => {
    const today = new Date().toISOString().slice(0, 10)
    const next = sm2(makeState(), 5)
    expect(next.nextDue).not.toBeNull()
    expect(next.nextDue! >= today).toBe(true)
  })
})

// ─── fuzzyMatch ──────────────────────────────────────────────────────────────

describe('fuzzyMatch', () => {
  it('exact match', () => {
    expect(fuzzyMatch('Kether', 'Kether')).toBe(true)
  })

  it('case insensitive', () => {
    expect(fuzzyMatch('kether', 'Kether')).toBe(true)
    expect(fuzzyMatch('KETHER', 'Kether')).toBe(true)
  })

  it('trims whitespace', () => {
    expect(fuzzyMatch('  Kether  ', 'Kether')).toBe(true)
  })

  it('strips punctuation', () => {
    expect(fuzzyMatch('The Fool', 'The Fool')).toBe(true)
    expect(fuzzyMatch('the-fool', 'The Fool')).toBe(true)
  })

  it('empty input returns false', () => {
    expect(fuzzyMatch('', 'Kether')).toBe(false)
    expect(fuzzyMatch('   ', 'Kether')).toBe(false)
  })

  it('allows up to 2 character errors for short answers', () => {
    // 'kether': K-e-t-h-e-r
    expect(fuzzyMatch('Kethir', 'Kether')).toBe(true)   // 1 error  (pos 4: i≠e)
    expect(fuzzyMatch('Kzthzr', 'Kether')).toBe(true)   // 2 errors (pos 1: z≠e, pos 4: z≠e)
    expect(fuzzyMatch('Kzthzz', 'Kether')).toBe(false)  // 3 errors (pos 1,4,5)
  })

  it('substring match for long answers', () => {
    expect(fuzzyMatch('New beginnings', 'New beginnings, spontaneity, a free spirit')).toBe(true)
  })

  it('rejects clearly wrong answer', () => {
    expect(fuzzyMatch('Malkuth', 'Kether')).toBe(false)
  })
})

// ─── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  it('returns 0 for empty history', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 1 for a session only today', () => {
    const today = new Date().toISOString()
    expect(computeStreak([today])).toBe(1)
  })

  it('returns 1 for a session only yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(computeStreak([yesterday.toISOString()])).toBe(1)
  })

  it('returns 0 if most recent session was 2+ days ago', () => {
    const old = new Date()
    old.setDate(old.getDate() - 2)
    expect(computeStreak([old.toISOString()])).toBe(0)
  })

  it('counts consecutive days correctly', () => {
    const dates = [0, 1, 2, 3].map(n => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d.toISOString()
    })
    expect(computeStreak(dates)).toBe(4)
  })

  it('stops at a gap in the streak', () => {
    // Sessions on today, yesterday, and 3 days ago (gap on day 2)
    const dates = [0, 1, 3].map(n => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d.toISOString()
    })
    expect(computeStreak(dates)).toBe(2)
  })

  it('handles multiple sessions on the same day', () => {
    const today1 = new Date().toISOString()
    const today2 = new Date(Date.now() + 3600_000).toISOString()
    const yest   = new Date()
    yest.setDate(yest.getDate() - 1)
    expect(computeStreak([today1, today2, yest.toISOString()])).toBe(2)
  })
})
