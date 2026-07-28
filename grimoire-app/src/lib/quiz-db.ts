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
  /** Which preset the session was run with — null for sessions run before presets existed. */
  presetId?: string | null
}

export type QuestionMode = 'flashcard' | 'multiple-choice' | 'fill-in-blank' | 'image-recognition' | 'image-choice'

export interface QuizSettings {
  sessionSize: number
  multipleChoiceCount: number
  enabledModes: QuestionMode[]
  enabledEntityTypes: string[]
  /** entityType → enabled question-type keys */
  enabledQuestionTypes: Record<string, string[]>
  includeUserCards: boolean
  /**
   * Which tarot deck IDs (see TAROT_DECK_OPTIONS in quiz-engine.ts) contribute
   * 'tarot.card' entities to study sessions — independent of the display-name
   * default set in Settings → Traditions. Empty/missing means "all decks",
   * which preserves behavior for settings saved before this field existed.
   */
  tarotDecks: string[]
}

export const DEFAULT_SETTINGS: QuizSettings = {
  sessionSize: 20,
  multipleChoiceCount: 4,
  enabledModes: ['flashcard', 'multiple-choice', 'fill-in-blank', 'image-recognition', 'image-choice'],
  enabledEntityTypes: [
    'tarot.card',
    'lenormand.card',
    'playing.card',
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
    'lenormand.card':        ['image:name', 'field:cardNumber', 'field:uprightMeaning', 'field:rulingPlanet'],
    'playing.card':          ['image:name', 'field:suit', 'field:rank'],
    'qabalah.sephira':       ['field:number', 'field:hebrewName', 'field:divineName', 'link:attributed-archangel', 'field:planet', 'field:pillar'],
    'qabalah.qliphoth':      ['field:correspondingSephira', 'field:meaning', 'field:principle'],
    'qabalah.path':          ['field:pathNumber', 'field:hebrewLetter', 'field:element', 'field:gdTarotCard', 'link:attributed-upper-terminus', 'link:attributed-lower-terminus'],
    'astrology.planet':      ['image:name', 'field:symbol', 'field:dayOfWeek', 'field:metalAlchemy', 'field:exaltedIn'],
    'astrology.zodiac-sign': ['image:name', 'field:symbol', 'field:element', 'field:modality', 'field:traditionalRuler'],
    'letter.hebrew':         ['image:name', 'field:letterForm', 'field:numericalValue', 'field:element', 'field:planet', 'field:zodiacSign', 'field:gdTarotCard'],
    'rune':                  ['image:name', 'field:runeGlyph', 'field:phoneme', 'field:meaning', 'field:element', 'field:aett'],
    'geomancy.figure':       ['image:name', 'field:element', 'field:quality'],
    'goetia.demon':          ['field:number', 'field:rank', 'field:legions'],
    'iching.hexagram':       ['image:name', 'field:number', 'field:chineseName', 'field:upperTrigram', 'field:lowerTrigram'],
  },
  includeUserCards: false,
  // Lenormand and Playing Cards are no longer part of this list — they're
  // their own entityTypes now (lenormand.card/playing.card), toggled via
  // enabledEntityTypes above like any other tradition, not this deck picker.
  tarotDecks: ['rws', 'thoth', 'tdm', 'etteilla'],
}

/** The starting point for the Blank preset — genuinely empty (no entity types
 * selected) rather than a copy of DEFAULT_SETTINGS, so "customize from
 * scratch" actually starts from scratch instead of from Default's choices. */
export const BLANK_SETTINGS: QuizSettings = {
  sessionSize: 20,
  multipleChoiceCount: 4,
  enabledModes: ['flashcard', 'multiple-choice', 'fill-in-blank', 'image-recognition', 'image-choice'],
  enabledEntityTypes: [],
  enabledQuestionTypes: {},
  includeUserCards: false,
  tarotDecks: [],
}

// ─── Built-in themed presets ─────────────────────────────────────────────────
// Curated starting points narrower than Default's broad cross-tradition taste
// or deeper into traditions Default only lightly touches. Every field/link
// chosen below was checked against real seed data for population rate first
// (the same audit that caught the 44%-unanswerable problem in Default years
// ago) — sparse or array-shaped fields are skipped even when discoverable, so
// these presets don't quietly reintroduce that class of bug.

interface BuiltInPresetDef {
  id: string
  displayName: string
  description: string
  settings: QuizSettings
}

const ALL_TAROT_DECKS = ['rws', 'thoth', 'tdm', 'etteilla']

function preset(
  id: string,
  displayName: string,
  description: string,
  enabledQuestionTypes: Record<string, string[]>,
  /** Default session length, sized proportionally to how many answerable
   * (entity, question-type) cards the preset's own fields/links actually
   * produce (measured via buildSession against real seed data) — a preset
   * covering a small corpus shouldn't default to the same 20 cards/session
   * as one covering a much larger one. */
  sessionSize: number,
  opts: { tarotDecks?: string[] } = {},
): BuiltInPresetDef {
  return {
    id,
    displayName,
    description,
    settings: {
      sessionSize,
      multipleChoiceCount: 4,
      enabledModes: ['flashcard', 'multiple-choice', 'fill-in-blank', 'image-recognition', 'image-choice'],
      enabledEntityTypes: Object.keys(enabledQuestionTypes),
      enabledQuestionTypes,
      includeUserCards: false,
      tarotDecks: opts.tarotDecks ?? [],
    },
  }
}

export const BUILT_IN_PRESETS: BuiltInPresetDef[] = [
  preset(
    'golden-dawn-correspondences', 'Golden Dawn Correspondences',
    'Cross-tradition drill on the interlocking Tarot–Hebrew letter–Qabalah path–planetary/zodiacal attribution system.',
    {
      'tarot.card':            ['image:name', 'field:cardNumber', 'field:uprightMeaning', 'link:gd-tarot-letter', 'link:gd-tarot-planet', 'link:gd-tarot-sign'],
      'qabalah.sephira':       ['field:number', 'field:hebrewName', 'field:divineName', 'link:attributed-archangel', 'field:planet', 'field:pillar'],
      'qabalah.path':          ['field:pathNumber', 'field:hebrewLetter', 'field:element', 'field:gdTarotCard', 'link:attributed-upper-terminus', 'link:attributed-lower-terminus'],
      'letter.hebrew':         ['image:name', 'field:letterForm', 'field:numericalValue', 'field:element', 'field:planet', 'field:zodiacSign', 'field:gdTarotCard'],
      'astrology.planet':      ['image:name', 'field:symbol', 'field:dayOfWeek', 'field:metalAlchemy', 'field:exaltedIn'],
      'astrology.zodiac-sign': ['image:name', 'field:symbol', 'field:element', 'field:modality', 'field:traditionalRuler'],
    },
    30,
    { tarotDecks: ALL_TAROT_DECKS },
  ),
  preset(
    'tarot-deep-dive', 'Tarot Deep Dive',
    'Focused practice on the full 78-card structure across Rider-Waite-Smith, Thoth, Tarot de Marseille, and Etteilla.',
    {
      'tarot.card': ['image:name', 'field:cardNumber', 'field:uprightMeaning', 'link:gd-tarot-letter', 'link:gd-tarot-planet', 'link:gd-tarot-sign'],
    },
    25,
    { tarotDecks: ALL_TAROT_DECKS },
  ),
  preset(
    'qabalah-deep-dive', 'Qabalah Deep Dive',
    'The complete Tree of Life and its shadow: Sephiroth, Qliphoth, Paths, Pillars, Worlds, Partzufim, Triangles, and the Tunnels of Set.',
    {
      'qabalah.sephira':        ['field:number', 'field:hebrewName', 'field:divineName', 'link:attributed-archangel', 'field:planet', 'field:pillar'],
      'qabalah.qliphoth':       ['field:correspondingSephira', 'field:meaning', 'field:principle'],
      'qabalah.path':           ['field:pathNumber', 'field:hebrewLetter', 'field:element', 'field:gdTarotCard', 'link:attributed-upper-terminus', 'link:attributed-lower-terminus'],
      'qabalah.pillar':         ['field:side', 'field:polarity'],
      'qabalah.world':          ['field:hebrewName', 'field:meaning', 'field:element', 'field:tarotSuit'],
      'qabalah.partzuf':        ['field:world', 'field:divineName', 'link:corresponds-to'],
      'qabalah.triangle':       ['field:position', 'field:world'],
      'qabalah.tunnel-of-set':  ['field:pathNumber', 'field:correspondingPath', 'field:fromQliphoth', 'field:toQliphoth'],
      'qabalah.divine-name':    ['field:hebrewSpelling', 'field:sephira', 'link:composed-of'],
    },
    15,
  ),
  preset(
    'ceremonial-magic', 'Ceremonial Magic',
    'Goetia, angelic hierarchies, Enochian magic, and ritual tools — the grimoire-magic tradition.',
    {
      'goetia.demon':                  ['field:number', 'field:rank', 'field:legions'],
      'angel.archangel':               ['field:sephiraCorrespondence', 'field:hebrewName', 'field:etymologyMeaning', 'field:planet'],
      'angel.order':                   ['field:sephiraCorrespondence', 'field:divineName', 'field:worldCorrespondence', 'field:christianEquivalent'],
      'angel.shem':                    ['field:hebrewName', 'field:zodiacSign', 'field:element', 'link:opposes'],
      'angel.planetary-intelligence':  ['field:planetCN', 'field:gematriaValue', 'field:kameaCN'],
      'enochian.aethyr':               ['field:aethyrNumber'],
      'enochian.governor':             ['field:aethyrName', 'field:orderInAethyr', 'link:governs-aethyr'],
      'enochian.tablet':               ['field:element', 'field:dimensions', 'field:squareCount'],
      'magic.circle':                  ['field:circleType', 'field:tradition'],
      'magic.hexagram':                ['field:planet', 'field:planetColor', 'field:godname'],
      'magic.kamea':                   ['field:planet', 'field:magicConstant', 'field:intelligenceName', 'field:spiritName'],
      'magic.pentagram':               ['field:element', 'field:variant', 'field:elementColor', 'field:tarotSuit'],
      'planetary-hour.day-ruler':      ['field:dayOfWeek', 'field:planet', 'field:latinDayName'],
    },
    25,
  ),
  preset(
    'world-mythology', 'World Mythology',
    'Comparative pantheons: Egyptian, Greek, Norse, and Celtic deities.',
    {
      'deity.egyptian': ['field:planetCN', 'field:romanEquivalent', 'link:corresponds-to'],
      'deity.greek':    ['field:planetCN', 'field:romanEquivalent', 'link:syncretic-form'],
      'norse.deity':    ['field:tribe', 'field:planetCN', 'link:deity-rune'],
      'norse.world':    ['field:yggdrasilPosition', 'field:element'],
      'celtic.deity':   ['field:pantheon', 'field:festival'],
    },
    10,
  ),
  preset(
    'divination-systems', 'Divination Systems',
    'Fortune-telling methods beyond Tarot: Runes, Geomancy, I Ching, Ogham, Lenormand, and Playing Cards.',
    {
      'rune':             ['image:name', 'field:runeGlyph', 'field:phoneme', 'field:meaning', 'field:element', 'field:aett'],
      'geomancy.figure':  ['image:name', 'field:element', 'field:quality'],
      'iching.hexagram':  ['image:name', 'field:number', 'field:chineseName', 'field:upperTrigram', 'field:lowerTrigram'],
      'iching.trigram':   ['field:chineseName', 'field:nature', 'field:chineseElement', 'field:animal'],
      'ogham.letter':     ['image:name', 'field:treeName', 'field:meaning', 'field:element', 'link:attributed-deity'],
      'lenormand.card':   ['image:name', 'field:cardNumber', 'field:uprightMeaning', 'field:rulingPlanet'],
      'playing.card':     ['image:name', 'field:suit', 'field:rank'],
    },
    25,
  ),
  preset(
    'vedic-yogic-systems', 'Vedic & Yogic Systems',
    'Chakras, Tattwas, Ayurvedic Doshas, Jyotish dashas, and the subtle body of Yoga.',
    {
      'chakra':               ['field:location', 'field:colour', 'field:element', 'field:deity', 'field:seedMantra'],
      'tattwa':               ['field:element', 'field:shape', 'field:color', 'field:sanskritMeaning'],
      'tattwa.combination':   ['field:outerElement', 'field:innerElement', 'field:outerTattwa'],
      'ayurveda.dosha':       ['field:bodySeat', 'field:season', 'field:sense'],
      'vedic.mahabhuta':      ['field:sensory', 'field:senseOrgan', 'field:chakraCorrespondence'],
      'jyotish.mahadasha':    ['field:lord', 'field:durationYears', 'field:nature'],
      'jyotish.antardasha':   ['field:antardashaLord', 'field:mahadashaLord', 'field:durationYears'],
      'jyotish.gem':          ['field:planetName', 'field:hindiName', 'field:sanskritTransliteration'],
      'yoga.kosha':           ['field:type', 'field:stateOfConsciousness', 'field:correspondingBody'],
      'yoga.prana':           ['field:direction', 'field:location', 'field:function'],
    },
    20,
  ),
  preset(
    'chinese-systems', 'Chinese Systems',
    'I Ching, Chinese Zodiac, Wu Xing, Taoist immortals, and Feng Shui.',
    {
      'iching.hexagram':        ['image:name', 'field:number', 'field:chineseName', 'field:upperTrigram', 'field:lowerTrigram'],
      'iching.trigram':         ['field:chineseName', 'field:nature', 'field:chineseElement', 'field:animal'],
      'chinese-zodiac.animal':  ['field:chineseChar', 'field:pinyin', 'field:wuxingElement', 'field:earthlyBranch'],
      'chinese-zodiac.branch':  ['field:chineseChar', 'field:associatedAnimal', 'field:direction', 'field:season'],
      'chinese-zodiac.stem':    ['field:chineseChar', 'field:wuxingElement', 'field:planet'],
      'wuxing.phase':           ['field:chineseCharacter', 'field:colour', 'field:planet', 'field:generatesPhase'],
      'taoism.immortal':        ['field:emblem', 'field:patronOf', 'field:dynasty'],
      'taoism.principle':       ['field:chineseCharacter', 'field:complement', 'field:westernPolarity'],
      'fengshui.flying-star':   ['field:englishName', 'field:element', 'field:lifeArea'],
      'fengshui.mountain':      ['field:direction', 'field:mountainType', 'field:element'],
      'compass.direction':      ['field:abbreviation', 'field:type'],
    },
    20,
  ),
]

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
  preset_id: string | null
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
  // Which preset a session was run with — nullable so pre-existing history rows
  // (and sessions run before a preset was chosen) stay valid with no backfill.
  for (const col of [
    'ALTER TABLE quiz_session_history ADD COLUMN preset_id TEXT',
  ]) {
    try { await db.execute(col) } catch { /* column already exists */ }
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS quiz_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_presets (
      id           TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      settings     TEXT NOT NULL,
      is_default   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    )
  `)
  // Marks the reserved "Blank" starter preset — nullable-safe default 0 so
  // pre-existing presets (including Default) are simply "not blank".
  for (const col of [
    'ALTER TABLE study_presets ADD COLUMN is_blank INTEGER NOT NULL DEFAULT 0',
    // Marks the curated BUILT_IN_PRESETS — hidden from Manage Presets and
    // protected from edit/delete, same nullable-safe default-0 pattern.
    'ALTER TABLE study_presets ADD COLUMN is_built_in INTEGER NOT NULL DEFAULT 0',
  ]) {
    try { await db.execute(col) } catch { /* column already exists */ }
  }
  await ensureDefaultPreset()
  await ensureBlankPreset()
  await ensureBuiltInPresets()
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
    `INSERT INTO quiz_session_history (completed_at, cards_reviewed, cards_correct, preset_id)
     VALUES (?, ?, ?, ?)`,
    [entry.completedAt, entry.cardsReviewed, entry.cardsCorrect, entry.presetId ?? null],
  )
}

export async function getSessionHistory(limit = 90): Promise<SessionHistoryEntry[]> {
  const db = await getDb()
  const rows = await db.select<HistoryRow[]>(
    `SELECT completed_at, cards_reviewed, cards_correct, preset_id
     FROM quiz_session_history
     ORDER BY completed_at DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map(r => ({
    completedAt:   r.completed_at,
    cardsReviewed: r.cards_reviewed,
    cardsCorrect:  r.cards_correct,
    presetId:      r.preset_id,
  }))
}

/** Session history for one specific preset, most recent first. */
export async function getSessionHistoryForPreset(presetId: string, limit = 90): Promise<SessionHistoryEntry[]> {
  const db = await getDb()
  const rows = await db.select<HistoryRow[]>(
    `SELECT completed_at, cards_reviewed, cards_correct, preset_id
     FROM quiz_session_history
     WHERE preset_id = ?
     ORDER BY completed_at DESC
     LIMIT ?`,
    [presetId, limit],
  )
  return rows.map(r => ({
    completedAt:   r.completed_at,
    cardsReviewed: r.cards_reviewed,
    cardsCorrect:  r.cards_correct,
    presetId:      r.preset_id,
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
    try {
      const parsed = JSON.parse(rows[0].value) as Partial<QuizSettings>
      // Settings saved before `tarotDecks` existed won't have it — default to all decks.
      return { ...structuredClone(DEFAULT_SETTINGS), ...parsed, tarotDecks: parsed.tarotDecks ?? structuredClone(DEFAULT_SETTINGS.tarotDecks) }
    } catch { /* fall through */ }
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

// ─── Study presets ─────────────────────────────────────────────────────────────
// Named, saveable session configurations — the Study equivalent of Reading's
// custom decks/spreads (see custom-db.ts). Two non-deletable presets always
// exist: "Default" (the built-in starter configuration) and "Blank" (a
// genuinely empty starting point for building your own from scratch, since
// Default is always separately available and doesn't need to double as one).

export interface StudyPreset {
  id: string
  displayName: string
  description: string
  settings: QuizSettings
  isDefault: boolean
  /** The reserved empty starter preset — silently selected on first launch
   * instead of Default, so a new custom preset starts from nothing rather
   * than a copy of Default's choices. Can't be used to start a session
   * directly (see the isBlank guard in /study/new) or updated in place
   * (use "Save as New Preset"), only saved-as or edited via Manage Presets. */
  isBlank: boolean
  /** A curated BUILT_IN_PRESETS entry — still selectable to start a session
   * (see /study/new), but hidden from Manage Presets and immune to edit/delete
   * so users can't accidentally alter or lose the curated starting points. */
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
}

type PresetRow = {
  id: string
  display_name: string
  description: string
  settings: string
  is_default: number
  is_blank: number
  is_built_in: number
  created_at: string
  updated_at: string
}

function rowToPreset(r: PresetRow): StudyPreset {
  return {
    id:          r.id,
    displayName: r.display_name,
    description: r.description,
    settings:    JSON.parse(r.settings) as QuizSettings,
    isDefault:   !!r.is_default,
    isBlank:     !!r.is_blank,
    isBuiltIn:   !!r.is_built_in,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  }
}

export const DEFAULT_PRESET_ID = 'default'
export const BLANK_PRESET_ID = 'blank'

async function ensureDefaultPreset(): Promise<void> {
  const db = await getDb()
  const rows = await db.select<{ id: string }[]>(
    'SELECT id FROM study_presets WHERE id = ?', [DEFAULT_PRESET_ID],
  )
  if (rows.length > 0) return
  const now = new Date().toISOString()
  await saveStudyPreset({
    id: DEFAULT_PRESET_ID,
    displayName: 'Default',
    description: 'The built-in starter configuration, covering the original core traditions.',
    settings: structuredClone(DEFAULT_SETTINGS),
    isDefault: true,
    isBlank: false,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  })
}

async function ensureBlankPreset(): Promise<void> {
  const db = await getDb()
  const rows = await db.select<{ id: string }[]>(
    'SELECT id FROM study_presets WHERE id = ?', [BLANK_PRESET_ID],
  )
  if (rows.length > 0) return
  const now = new Date().toISOString()
  await saveStudyPreset({
    id: BLANK_PRESET_ID,
    displayName: 'Blank',
    description: 'An empty starting point — select entity types below, then save as a new preset.',
    settings: structuredClone(BLANK_SETTINGS),
    isDefault: false,
    isBlank: true,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  })
}

const BUILT_IN_PRESETS_SEEDED_KEY = 'built_in_presets_seeded'

/** Every BUILT_IN_PRESETS id, for the delete guard below. */
const BUILT_IN_PRESET_IDS = new Set(BUILT_IN_PRESETS.map(p => p.id))

/**
 * Seeds the curated themed presets (BUILT_IN_PRESETS) exactly once, ever —
 * tracked via a quiz_meta flag rather than per-preset-ID existence like
 * Default/Blank, since even though these are now protected from user
 * edit/delete (isBuiltIn, see StudyPreset), a future content update to
 * BUILT_IN_PRESETS still shouldn't silently resurrect/overwrite whatever
 * the user has come to rely on — seeding only ever happens once.
 */
async function ensureBuiltInPresets(): Promise<void> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM quiz_meta WHERE key = ?', [BUILT_IN_PRESETS_SEEDED_KEY],
  )
  if (rows.length > 0) return
  const now = new Date().toISOString()
  for (const p of BUILT_IN_PRESETS) {
    await saveStudyPreset({
      id: p.id,
      displayName: p.displayName,
      description: p.description,
      settings: structuredClone(p.settings),
      isDefault: false,
      isBlank: false,
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    })
  }
  await db.execute(
    `INSERT OR REPLACE INTO quiz_meta (key, value) VALUES (?, '1')`, [BUILT_IN_PRESETS_SEEDED_KEY],
  )
}

export async function getAllStudyPresets(): Promise<StudyPreset[]> {
  const db = await getDb()
  const rows = await db.select<PresetRow[]>(
    'SELECT * FROM study_presets ORDER BY is_default DESC, is_blank DESC, display_name ASC',
  )
  return rows.map(rowToPreset)
}

export async function getStudyPreset(id: string): Promise<StudyPreset | null> {
  const db = await getDb()
  const rows = await db.select<PresetRow[]>('SELECT * FROM study_presets WHERE id = ?', [id])
  return rows[0] ? rowToPreset(rows[0]) : null
}

export async function saveStudyPreset(p: StudyPreset): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO study_presets
       (id, display_name, description, settings, is_default, is_blank, is_built_in, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.displayName, p.description, JSON.stringify(p.settings),
     p.isDefault ? 1 : 0, p.isBlank ? 1 : 0, p.isBuiltIn ? 1 : 0, p.createdAt, p.updatedAt],
  )
}

/** No-ops for Default, Blank, and any built-in preset — Default/Blank can still
 * be edited, just not deleted; built-in presets are hidden from Manage Presets
 * entirely (see /study/presets), so this is a defense-in-depth backstop rather
 * than the primary protection. */
export async function deleteStudyPreset(id: string): Promise<void> {
  if (id === DEFAULT_PRESET_ID || id === BLANK_PRESET_ID || BUILT_IN_PRESET_IDS.has(id)) return
  const db = await getDb()
  await db.execute('DELETE FROM study_presets WHERE id = ?', [id])
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
  presets: StudyPreset[]
}> {
  const map = await getAllCardStates()
  const [settings, lastResult, sessionHistory, presets] = await Promise.all([
    getSettings(),
    getLastResult(),
    getSessionHistory(365),
    getAllStudyPresets(),
  ])
  return { settings, cardStates: Array.from(map.values()), lastResult, sessionHistory, presets }
}

export async function importQuizData(data: {
  settings?: QuizSettings
  cardStates?: CardState[]
  lastResult?: LastResult | null
  sessionHistory?: SessionHistoryEntry[]
  presets?: StudyPreset[]
}): Promise<void> {
  if (data.settings)    await saveSettings(data.settings)
  if (data.lastResult)  await saveLastResult(data.lastResult)
  if (data.cardStates) {
    for (const s of data.cardStates) await upsertCardState(s)
  }
  if (data.sessionHistory) {
    for (const h of data.sessionHistory) await appendSessionHistory(h)
  }
  if (data.presets) {
    for (const p of data.presets) await saveStudyPreset(p)
  }
}
