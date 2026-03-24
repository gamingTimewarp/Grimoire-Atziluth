/**
 * quiz-engine.ts
 * Question-type definitions, session building, question generation, and progress stats.
 *
 * Pure logic (sm2, fuzzyMatch, classifyCardState) lives in quiz-logic.ts.
 */

import type { BaseEntity } from '@grimoire/core'
import type { StorageAdapter } from '@grimoire/core'
import type { CardState, QuizSettings, QuestionMode } from './quiz-db'
import { fuzzyMatch, classifyCardState } from './quiz-logic'
import { loadTraditionSettings, resolveDisplayName } from './tradition-store'
export { fuzzyMatch }

// ─── Question type definitions ─────────────────────────────────────────────────

export interface QuestionTypeDef {
  key: string          // e.g. "field:cardNumber", "link:gd-tarot-letter", "image:name"
  label: string        // human readable: "Card Number"
  type: 'field' | 'link' | 'image'
  fieldKey?: string    // extendedData key (for type=field)
  linkLabel?: string   // link label to query outgoing links (for type=link)
}

// Entity types where image recognition is meaningful (distinct visual appearance)
export const IMAGE_RECOGNITION_ENTITY_TYPES = new Set([
  'rune',
  'geomancy.figure',
  'iching.hexagram',
  'astrology.zodiac-sign',
  'astrology.planet',
  'letter.hebrew',
])

/** Returns true if this entity has a distinct visual representation for image recognition. */
function hasVisualRepresentation(entity: BaseEntity): boolean {
  // tarot cards (but not lenormand cards which share the same entityType)
  if (entity.entityType === 'tarot.card' && !entity.canonicalName.startsWith('lenormand.')) return true
  return IMAGE_RECOGNITION_ENTITY_TYPES.has(entity.entityType)
}

export const QUESTION_TYPE_DEFS: Record<string, QuestionTypeDef[]> = {
  'tarot.card': [
    { key: 'image:name',            label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:cardNumber',      label: 'Card Number',          type: 'field', fieldKey: 'cardNumber'      },
    { key: 'field:suit',            label: 'Suit',                 type: 'field', fieldKey: 'suit'            },
    { key: 'field:uprightMeaning',  label: 'Upright Meaning',      type: 'field', fieldKey: 'uprightMeaning'  },
    { key: 'link:gd-tarot-letter',  label: 'Hebrew Letter (GD)',   type: 'link',  linkLabel: 'gd-tarot-letter' },
    { key: 'link:gd-tarot-planet',  label: 'Planet (GD)',          type: 'link',  linkLabel: 'gd-tarot-planet' },
    { key: 'link:gd-tarot-sign',    label: 'Zodiac Sign (GD)',     type: 'link',  linkLabel: 'gd-tarot-sign'  },
    { key: 'link:gd-tarot-element', label: 'Element (GD)',         type: 'link',  linkLabel: 'gd-tarot-element' },
    { key: 'link:gd-tarot-path',    label: 'Qabalistic Path (GD)', type: 'link',  linkLabel: 'gd-tarot-path'  },
  ],
  'qabalah.sephira': [
    { key: 'field:number',       label: 'Number',        type: 'field', fieldKey: 'number'       },
    { key: 'field:hebrewName',   label: 'Hebrew Name',   type: 'field', fieldKey: 'hebrewName'   },
    { key: 'field:meaning',      label: 'Meaning',       type: 'field', fieldKey: 'meaning'      },
    { key: 'field:divineName',   label: 'Divine Name',   type: 'field', fieldKey: 'divineName'   },
    { key: 'field:archangel',    label: 'Archangel',     type: 'field', fieldKey: 'archangel'    },
    { key: 'field:angelicChoir', label: 'Angelic Choir', type: 'field', fieldKey: 'angelicChoir' },
    { key: 'field:planet',       label: 'Planet',        type: 'field', fieldKey: 'planet'       },
    { key: 'field:pillar',       label: 'Pillar',        type: 'field', fieldKey: 'pillar'       },
  ],
  'qabalah.qliphoth': [
    { key: 'field:correspondingSephira', label: 'Corresponding Sephira', type: 'field', fieldKey: 'correspondingSephira' },
    { key: 'field:hebrewName',           label: 'Hebrew Name',           type: 'field', fieldKey: 'hebrewName'           },
    { key: 'field:meaning',              label: 'Meaning',               type: 'field', fieldKey: 'meaning'              },
    { key: 'field:principle',            label: 'Principle',             type: 'field', fieldKey: 'principle'            },
  ],
  'qabalah.path': [
    { key: 'field:pathNumber',         label: 'Path Number',       type: 'field', fieldKey: 'pathNumber'   },
    { key: 'field:hebrewLetter',       label: 'Hebrew Letter',     type: 'field', fieldKey: 'hebrewLetter' },
    { key: 'field:element',            label: 'Element',           type: 'field', fieldKey: 'element'      },
    { key: 'field:planet',             label: 'Planet',            type: 'field', fieldKey: 'planet'       },
    { key: 'field:gdTarotCard',        label: 'Tarot Card (GD)',   type: 'field', fieldKey: 'gdTarotCard'  },
    { key: 'link:path-upper-terminus', label: 'Upper Sephira',     type: 'link',  linkLabel: 'path-upper-terminus' },
    { key: 'link:path-lower-terminus', label: 'Lower Sephira',     type: 'link',  linkLabel: 'path-lower-terminus' },
  ],
  'astrology.planet': [
    { key: 'image:name',              label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:symbol',            label: 'Symbol',            type: 'field', fieldKey: 'symbol'            },
    { key: 'field:dayOfWeek',         label: 'Day of Week',       type: 'field', fieldKey: 'dayOfWeek'         },
    { key: 'field:metalAlchemy',      label: 'Alchemical Metal',  type: 'field', fieldKey: 'metalAlchemy'      },
    { key: 'field:exaltedIn',         label: 'Exalted In',        type: 'field', fieldKey: 'exaltedIn'         },
    { key: 'field:qabalisticSephira', label: 'Sephira',           type: 'field', fieldKey: 'qabalisticSephira' },
  ],
  'astrology.zodiac-sign': [
    { key: 'image:name',             label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:symbol',           label: 'Symbol',            type: 'field', fieldKey: 'symbol'           },
    { key: 'field:element',          label: 'Element',           type: 'field', fieldKey: 'element'          },
    { key: 'field:modality',         label: 'Modality',          type: 'field', fieldKey: 'modality'         },
    { key: 'field:traditionalRuler', label: 'Traditional Ruler', type: 'field', fieldKey: 'traditionalRuler' },
    { key: 'field:exaltation',       label: 'Exaltation',        type: 'field', fieldKey: 'exaltation'       },
    { key: 'field:hebrewLetterGD',   label: 'Hebrew Letter (GD)',type: 'field', fieldKey: 'hebrewLetterGD'   },
  ],
  'letter.hebrew': [
    { key: 'image:name',           label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:letterForm',     label: 'Hebrew Character', type: 'field', fieldKey: 'letterForm'     },
    { key: 'field:numericalValue', label: 'Numerical Value',  type: 'field', fieldKey: 'numericalValue' },
    { key: 'field:element',        label: 'Element',          type: 'field', fieldKey: 'element'        },
    { key: 'field:planet',         label: 'Planet',           type: 'field', fieldKey: 'planet'         },
    { key: 'field:zodiacSign',     label: 'Zodiac Sign',      type: 'field', fieldKey: 'zodiacSign'     },
    { key: 'field:qabalisticPath', label: 'Path Number',      type: 'field', fieldKey: 'qabalisticPath' },
    { key: 'field:gdTarotCard',    label: 'Tarot Card (GD)',  type: 'field', fieldKey: 'gdTarotCard'    },
  ],
  'rune': [
    { key: 'image:name',      label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:runeGlyph', label: 'Rune Glyph', type: 'field', fieldKey: 'runeGlyph' },
    { key: 'field:phoneme',   label: 'Phoneme',    type: 'field', fieldKey: 'phoneme'   },
    { key: 'field:meaning',   label: 'Meaning',    type: 'field', fieldKey: 'meaning'   },
    { key: 'field:element',   label: 'Element',    type: 'field', fieldKey: 'element'   },
    { key: 'field:aett',      label: 'Aett',       type: 'field', fieldKey: 'aett'      },
  ],
  'geomancy.figure': [
    { key: 'image:name',      label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:element',   label: 'Element',   type: 'field', fieldKey: 'element'  },
    { key: 'field:quality',   label: 'Quality',   type: 'field', fieldKey: 'quality'  },
  ],
  'goetia.demon': [
    { key: 'field:number',  label: 'Number',            type: 'field', fieldKey: 'number'  },
    { key: 'field:rank',    label: 'Rank',              type: 'field', fieldKey: 'rank'    },
    { key: 'field:legions', label: 'Legions Commanded', type: 'field', fieldKey: 'legions' },
  ],
  'iching.hexagram': [
    { key: 'image:name',         label: 'Visual Name Recognition', type: 'image' },
    { key: 'field:number',       label: 'Number',        type: 'field', fieldKey: 'number'       },
    { key: 'field:chineseName',  label: 'Chinese Name',  type: 'field', fieldKey: 'chineseName'  },
    { key: 'field:upperTrigram', label: 'Upper Trigram', type: 'field', fieldKey: 'upperTrigram' },
    { key: 'field:lowerTrigram', label: 'Lower Trigram', type: 'field', fieldKey: 'lowerTrigram' },
  ],
}

// ─── Session types ─────────────────────────────────────────────────────────────

export interface SessionCard {
  entity: BaseEntity
  def: QuestionTypeDef
  state: CardState
  isNew: boolean
}

export type Question =
  | { mode: 'flashcard';          prompt: string; answer: string }
  | { mode: 'multiple-choice';    prompt: string; answer: string; options: string[] }
  | { mode: 'fill-in-blank';      prompt: string; answer: string }
  | { mode: 'image-recognition';  prompt: string; answer: string; entity: BaseEntity; options: string[] }

// ─── Progress stats ────────────────────────────────────────────────────────────

export interface EntityTypeStats {
  entityType: string
  label: string
  total: number
  due: number
  breakdown: { new: number; learning: number; review: number; mature: number }
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  'tarot.card':            'Tarot Cards',
  'qabalah.sephira':       'Sephiroth',
  'qabalah.qliphoth':      'Qliphoth',
  'qabalah.path':          'Qabalistic Paths',
  'astrology.planet':      'Planets',
  'astrology.zodiac-sign': 'Zodiac Signs',
  'letter.hebrew':         'Hebrew Letters',
  'rune':                  'Elder Futhark Runes',
  'geomancy.figure':       'Geomantic Figures',
  'goetia.demon':          'Goetia Demons',
  'iching.hexagram':       'I Ching Hexagrams',
}

export async function getProgressStats(
  adapter: StorageAdapter,
  settings: QuizSettings,
  allStates: Map<string, CardState>,
): Promise<EntityTypeStats[]> {
  const today = new Date().toISOString().slice(0, 10)
  const results: EntityTypeStats[] = []

  for (const entityType of settings.enabledEntityTypes) {
    const allDefs     = QUESTION_TYPE_DEFS[entityType] ?? []
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const filter = settings.includeUserCards
      ? { entityType }
      : { entityType, isBuiltIn: true as const }

    const result = await adapter.listEntities(filter, { offset: 0, limit: 1000 })

    let total = 0, due = 0
    const breakdown = { new: 0, learning: 0, review: 0, mature: 0 }

    for (const entity of result.items) {
      for (const def of defs) {
        total++
        const key   = `${entity.canonicalName}::${def.key}`
        const state = allStates.get(key)
        const cat   = classifyCardState(state)
        breakdown[cat]++
        if (!state || state.nextDue == null || state.nextDue <= today) due++
      }
    }

    results.push({
      entityType,
      label: ENTITY_TYPE_LABELS[entityType] ?? entityType,
      total,
      due,
      breakdown,
    })
  }

  return results
}

// ─── Answer resolution ─────────────────────────────────────────────────────────

async function resolveAnswer(
  entity: BaseEntity,
  def: QuestionTypeDef,
  adapter: StorageAdapter,
  primaryBySystem: Record<string, string>,
): Promise<string | null> {
  if (def.type === 'image') {
    return resolveDisplayName(entity, primaryBySystem)
  }
  if (def.type === 'field') {
    const val = entity.extendedData[def.fieldKey!]
    if (val == null || val === '') return null
    return Array.isArray(val) ? (val[0] != null ? String(val[0]) : null) : String(val)
  }
  // Link: first outgoing link with this label
  const result = await adapter.queryLinks({
    sourceCanonicalName: entity.canonicalName,
    labels: [def.linkLabel!],
    limit: 1,
  })
  const link = result.items[0]
  if (!link) return null
  const target = await adapter.getEntityByCanonicalName(link.targetCanonicalName)
  if (!target) return link.targetCanonicalName
  return resolveDisplayName(target, primaryBySystem)
}

async function pickNameDistractors(
  entity: BaseEntity,
  adapter: StorageAdapter,
  count: number,
  primaryBySystem: Record<string, string>,
): Promise<string[]> {
  const correct = resolveDisplayName(entity, primaryBySystem)
  const result  = await adapter.listEntities({ entityType: entity.entityType }, { offset: 0, limit: 300 })
  const candidates = result.items
    .filter(e => e.canonicalName !== entity.canonicalName)
    .map(e => resolveDisplayName(e, primaryBySystem))
    .filter(name => name !== correct)
  return pickRandom(candidates, count)
}

async function pickDistractors(
  correctAnswer: string,
  entity: BaseEntity,
  def: QuestionTypeDef,
  adapter: StorageAdapter,
  count: number,
  primaryBySystem: Record<string, string>,
): Promise<string[]> {
  const candidates: string[] = []

  if (def.type === 'field') {
    const result = await adapter.listEntities({ entityType: entity.entityType }, { offset: 0, limit: 300 })
    for (const e of result.items) {
      const val = e.extendedData[def.fieldKey!]
      if (val != null && val !== '') {
        const s = Array.isArray(val) ? (val[0] != null ? String(val[0]) : null) : String(val)
        if (s && s !== correctAnswer && !candidates.includes(s)) candidates.push(s)
      }
    }
  } else {
    const result = await adapter.queryLinks({ labels: [def.linkLabel!], limit: 300 })
    for (const link of result.items) {
      const target = await adapter.getEntityByCanonicalName(link.targetCanonicalName)
      if (target) {
        const name = resolveDisplayName(target, primaryBySystem)
        if (name !== correctAnswer && !candidates.includes(name)) candidates.push(name)
      }
    }
  }

  return pickRandom(candidates, count)
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count)
}

// ─── Question generation ───────────────────────────────────────────────────────

export async function generateQuestion(
  entity: BaseEntity,
  def: QuestionTypeDef,
  mode: QuestionMode,
  adapter: StorageAdapter,
  settings: QuizSettings,
): Promise<Question | null> {
  const { primaryBySystem } = loadTraditionSettings()

  // ── image:name defs must always use image-recognition (or MC fallback) ───────
  if (def.type === 'image' && mode !== 'image-recognition') {
    const targetMode: QuestionMode = settings.enabledModes.includes('image-recognition')
      ? 'image-recognition'
      : 'multiple-choice'
    return generateQuestion(entity, def, targetMode, adapter, settings)
  }

  // ── Image recognition mode ──────────────────────────────────────────────────
  if (mode === 'image-recognition') {
    // Only applies to entities with distinct visual representations
    if (!hasVisualRepresentation(entity)) {
      return generateQuestion(entity, def, 'multiple-choice', adapter, settings)
    }

    const typeLabel = (ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType)
      .replace(/s$/, '')  // plurals → singular: "Tarot Cards" → "Tarot Card"
      .toLowerCase()

    let answer: string
    let prompt: string
    let distractors: string[]

    if (def.type === 'image') {
      // Name recognition: show art, identify the entity
      answer = resolveDisplayName(entity, primaryBySystem)
      prompt = `Name this ${typeLabel}`
      distractors = await pickNameDistractors(entity, adapter, settings.multipleChoiceCount - 1, primaryBySystem)
    } else {
      // Attribute recognition: show art, identify an attribute without seeing the name
      const attrAnswer = await resolveAnswer(entity, def, adapter, primaryBySystem)
      if (!attrAnswer) return null
      answer = attrAnswer
      prompt = `What is the ${def.label.toLowerCase()} of this?`
      distractors = await pickDistractors(answer, entity, def, adapter, settings.multipleChoiceCount - 1, primaryBySystem)
    }

    if (distractors.length < 1) return null
    const options = [answer, ...distractors].sort(() => Math.random() - 0.5)
    return { mode: 'image-recognition', prompt, answer, entity, options }
  }

  // ── Standard modes ──────────────────────────────────────────────────────────
  const answer = await resolveAnswer(entity, def, adapter, primaryBySystem)
  if (!answer) return null

  // For image:name questions outside image-recognition mode, fall back to standard name prompt
  const entityName = resolveDisplayName(entity, primaryBySystem)
  const prompt = def.type === 'image'
    ? `What is the name of this entity?`
    : `What is the ${def.label.toLowerCase()} of ${entityName}?`

  if (mode === 'flashcard')     return { mode: 'flashcard',     prompt, answer }
  if (mode === 'fill-in-blank') return { mode: 'fill-in-blank', prompt, answer }

  // Multiple choice — fall back to flashcard if not enough distractors
  const distractors = def.type === 'image'
    ? await pickNameDistractors(entity, adapter, settings.multipleChoiceCount - 1, primaryBySystem)
    : await pickDistractors(answer, entity, def, adapter, settings.multipleChoiceCount - 1, primaryBySystem)
  if (distractors.length < 1) return { mode: 'flashcard', prompt, answer }

  const options = [answer, ...distractors].sort(() => Math.random() - 0.5)
  return { mode: 'multiple-choice', prompt, answer, options }
}

// ─── Session building ──────────────────────────────────────────────────────────

export async function buildSession(
  adapter: StorageAdapter,
  settings: QuizSettings,
  allStates: Map<string, CardState>,
): Promise<SessionCard[]> {
  const today = new Date().toISOString().slice(0, 10)
  const cards: SessionCard[] = []

  for (const entityType of settings.enabledEntityTypes) {
    const allDefs     = QUESTION_TYPE_DEFS[entityType] ?? []
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const filter = settings.includeUserCards
      ? { entityType }
      : { entityType, isBuiltIn: true as const }

    const result = await adapter.listEntities(filter, { offset: 0, limit: 500 })

    for (const entity of result.items) {
      for (const def of defs) {
        const key = `${entity.canonicalName}::${def.key}`
        const existing = allStates.get(key)
        const state: CardState = existing ?? {
          entityCanonicalName: entity.canonicalName,
          questionType:        def.key,
          repetition:          0,
          intervalDays:        1,
          easeFactor:          2.5,
          nextDue:             null,
          lastReviewed:        null,
        }
        const isDue = state.nextDue == null || state.nextDue <= today
        if (isDue) cards.push({ entity, def, state, isNew: state.nextDue == null })
      }
    }
  }

  // New cards first (shuffled), then due cards (shuffled), capped at sessionSize
  const newCards = cards.filter(c =>  c.isNew).sort(() => Math.random() - 0.5)
  const dueCards = cards.filter(c => !c.isNew).sort(() => Math.random() - 0.5)
  return [...newCards, ...dueCards].slice(0, settings.sessionSize)
}

/** Count how many cards are currently due without loading entities fully */
export async function countDueCards(
  adapter: StorageAdapter,
  settings: QuizSettings,
  allStates: Map<string, CardState>,
): Promise<{ due: number; total: number }> {
  const today = new Date().toISOString().slice(0, 10)
  let due = 0, total = 0

  for (const entityType of settings.enabledEntityTypes) {
    const allDefs     = QUESTION_TYPE_DEFS[entityType] ?? []
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const filter = settings.includeUserCards
      ? { entityType }
      : { entityType, isBuiltIn: true as const }

    const result = await adapter.listEntities(filter, { offset: 0, limit: 1000 })

    for (const entity of result.items) {
      for (const def of defs) {
        total++
        const key   = `${entity.canonicalName}::${def.key}`
        const state = allStates.get(key)
        if (!state || state.nextDue == null || state.nextDue <= today) due++
      }
    }
  }

  return { due, total }
}
