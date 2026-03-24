/**
 * quiz-db.ts
 * SQLite persistence for the learning/SRS system.
 * Tables: quiz_card_state, quiz_session_history, quiz_meta.
 *
 * Pure logic (sm2, fuzzyMatch, classifyCardState) lives in quiz-logic.ts.
 */

import Database from '@tauri-apps/plugin-sql'
export { sm2, fuzzyMatch, classifyCardState } from './quiz-logic'
export type { CardStateCategory } from './quiz-logic'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardState {
  entityCanonicalName: string
  questionType: string       // "field:number", "link:gd-tarot-letter", …
  repetition: number
  intervalDays: number
  easeFactor: number
  nextDue: string | null     // ISO date "YYYY-MM-DD"
  lastReviewed: string | null
}

export interface LastResult {
  completedAt: string
  cardsReviewed: number
  cardsCorrect: number
}

export interface SessionHistoryEntry {
  completedAt: string   // ISO datetime
  cardsReviewed: number
  cardsCorrect: number
}

export type QuestionMode = 'flashcard' | 'multiple-choice' | 'fill-in-blank' | 'image-recognition'

export interface QuizSettings {
  sessionSize: number
  multipleChoiceCount: number
  enabledModes: QuestionMode[]
  enabledEntityTypes: string[]
  /** entityType → enabled question-type keys */
  enabledQuestionTypes: Record<string, string[]>
  includeUserCards: boolean
}

export const DEFAULT_SETTINGS: QuizSettings = {
  sessionSize: 20,
  multipleChoiceCount: 4,
  enabledModes: ['flashcard', 'multiple-choice', 'fill-in-blank', 'image-recognition'],
  enabledEntityTypes: [
    'tarot.card',
    'qabalah.sephira',
    'qabalah.qliphoth',
    'qabalah.path',
    'astrology.planet',
    'astrology.zodiac-sign',
    'letter.hebrew',
    'rune',
    'geomancy.figure',
    'goetia.demon',
    'iching.hexagram',
  ],
  enabledQuestionTypes: {
    'tarot.card':            ['image:name', 'field:cardNumber', 'field:uprightMeaning', 'link:gd-tarot-letter', 'link:gd-tarot-planet', 'link:gd-tarot-sign'],
    'qabalah.sephira':       ['field:number', 'field:hebrewName', 'field:divineName', 'field:archangel', 'field:planet', 'field:pillar'],
    'qabalah.qliphoth':      ['field:correspondingSephira', 'field:meaning', 'field:principle'],
    'qabalah.path':          ['field:pathNumber', 'field:hebrewLetter', 'field:element', 'field:gdTarotCard', 'link:path-upper-terminus', 'link:path-lower-terminus'],
    'astrology.planet':      ['image:name', 'field:symbol', 'field:dayOfWeek', 'field:metalAlchemy', 'field:exaltedIn'],
    'astrology.zodiac-sign': ['image:name', 'field:symbol', 'field:element', 'field:modality', 'field:traditionalRuler'],
    'letter.hebrew':         ['image:name', 'field:letterForm', 'field:numericalValue', 'field:element', 'field:planet', 'field:zodiacSign', 'field:gdTarotCard'],
    'rune':                  ['image:name', 'field:runeGlyph', 'field:phoneme', 'field:meaning', 'field:element', 'field:aett'],
    'geomancy.figure':       ['image:name', 'field:element', 'field:quality'],
    'goetia.demon':          ['field:number', 'field:rank', 'field:legions'],
    'iching.hexagram':       ['image:name', 'field:number', 'field:chineseName', 'field:upperTrigram', 'field:lowerTrigram'],
  },
  includeUserCards: false,
}

// ─── DB bootstrap ──────────────────────────────────────────────────────────────

type CardRow = {
  entity_cn: string
  question_type: string
  repetition: number
  interval_days: number
  ease_factor: number
  next_due: string | null
  last_reviewed: string | null
}

type HistoryRow = {
  completed_at: string
  cards_reviewed: number
  cards_correct: number
}

function rowToState(r: CardRow): CardState {
  return {
    entityCanonicalName: r.entity_cn,
    questionType:        r.question_type,
    repetition:          r.repetition,
    intervalDays:        r.interval_days,
    easeFactor:          r.ease_factor,
    nextDue:             r.next_due,
    lastReviewed:        r.last_reviewed,
  }
}

let _db: Database | null = null
async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load('sqlite:grimoire.db')
  return _db
}

export async function initQuizDb(): Promise<void> {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS quiz_card_state (
      entity_cn      TEXT    NOT NULL,
      question_type  TEXT    NOT NULL,
      repetition     INTEGER NOT NULL DEFAULT 0,
      interval_days  INTEGER NOT NULL DEFAULT 1,
      ease_factor    REAL    NOT NULL DEFAULT 2.5,
      next_due       TEXT,
      last_reviewed  TEXT,
      PRIMARY KEY (entity_cn, question_type)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS quiz_session_history (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      completed_at   TEXT    NOT NULL,
      cards_reviewed INTEGER NOT NULL,
      cards_correct  INTEGER NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS quiz_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

// ─── Card state ────────────────────────────────────────────────────────────────

export async function getAllCardStates(): Promise<Map<string, CardState>> {
  const db = await getDb()
  const rows = await db.select<CardRow[]>('SELECT * FROM quiz_card_state')
  const map = new Map<string, CardState>()
  for (const r of rows) {
    const state = rowToState(r)
    map.set(`${state.entityCanonicalName}::${state.questionType}`, state)
  }
  return map
}

export async function upsertCardState(state: CardState): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO quiz_card_state
       (entity_cn, question_type, repetition, interval_days, ease_factor, next_due, last_reviewed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [state.entityCanonicalName, state.questionType, state.repetition,
     state.intervalDays, state.easeFactor, state.nextDue, state.lastReviewed],
  )
}

// ─── Session history ───────────────────────────────────────────────────────────

export async function appendSessionHistory(entry: SessionHistoryEntry): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO quiz_session_history (completed_at, cards_reviewed, cards_correct)
     VALUES (?, ?, ?)`,
    [entry.completedAt, entry.cardsReviewed, entry.cardsCorrect],
  )
}

export async function getSessionHistory(limit = 90): Promise<SessionHistoryEntry[]> {
  const db = await getDb()
  const rows = await db.select<HistoryRow[]>(
    `SELECT completed_at, cards_reviewed, cards_correct
     FROM quiz_session_history
     ORDER BY completed_at DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map(r => ({
    completedAt:   r.completed_at,
    cardsReviewed: r.cards_reviewed,
    cardsCorrect:  r.cards_correct,
  }))
}

export async function getStreak(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ completed_at: string }[]>(
    'SELECT completed_at FROM quiz_session_history ORDER BY completed_at DESC LIMIT 3650',
  )
  const { computeStreak } = await import('./quiz-logic')
  return computeStreak(rows.map(r => r.completed_at))
}

// ─── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<QuizSettings> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM quiz_meta WHERE key = 'settings'`,
  )
  if (rows[0]) {
    try { return JSON.parse(rows[0].value) as QuizSettings } catch { /* fall through */ }
  }
  return structuredClone(DEFAULT_SETTINGS)
}

export async function saveSettings(settings: QuizSettings): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO quiz_meta (key, value) VALUES ('settings', ?)`,
    [JSON.stringify(settings)],
  )
}

// ─── Last result ───────────────────────────────────────────────────────────────

export async function getLastResult(): Promise<LastResult | null> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM quiz_meta WHERE key = 'last_result'`,
  )
  if (rows[0]) {
    try { return JSON.parse(rows[0].value) as LastResult } catch { /* fall through */ }
  }
  return null
}

export async function saveLastResult(result: LastResult): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO quiz_meta (key, value) VALUES ('last_result', ?)`,
    [JSON.stringify(result)],
  )
}

// ─── Export / Import ───────────────────────────────────────────────────────────

export async function exportQuizData(): Promise<{
  settings: QuizSettings
  cardStates: CardState[]
  lastResult: LastResult | null
  sessionHistory: SessionHistoryEntry[]
}> {
  const map = await getAllCardStates()
  const [settings, lastResult, sessionHistory] = await Promise.all([
    getSettings(),
    getLastResult(),
    getSessionHistory(365),
  ])
  return { settings, cardStates: Array.from(map.values()), lastResult, sessionHistory }
}

export async function importQuizData(data: {
  settings?: QuizSettings
  cardStates?: CardState[]
  lastResult?: LastResult | null
  sessionHistory?: SessionHistoryEntry[]
}): Promise<void> {
  if (data.settings)    await saveSettings(data.settings)
  if (data.lastResult)  await saveLastResult(data.lastResult)
  if (data.cardStates) {
    for (const s of data.cardStates) await upsertCardState(s)
  }
  if (data.sessionHistory) {
    for (const h of data.sessionHistory) await appendSessionHistory(h)
  }
}
