/**
 * quiz-engine.ts
 * Question-type definitions, session building, question generation, and progress stats.
 *
 * Pure logic (sm2, fuzzyMatch, classifyCardState) lives in quiz-logic.ts.
 */

import type { BaseEntity, Link } from '@grimoire/core'
import type { StorageAdapter } from '@grimoire/core'
import type { CardState, QuizSettings, QuestionMode } from './quiz-db'
import { fuzzyMatch, exactMatch, classifyMatch, classifyCardState } from './quiz-logic'
export type { MatchKind } from './quiz-logic'
import { artGroupForEntityType } from './art-store'
import {
  resolveAttributeValue, hasSymbolicArt, getAttributeEntries,
  formatFieldLabel, formatLinkLabel, looksLikeCanonicalName,
} from './entity-attributes'
import type { GroupOverview } from './entity-attributes'
import { formatEntityType, formatTag } from './format'
export { fuzzyMatch, exactMatch, classifyMatch }

// ─── Question type definitions ─────────────────────────────────────────────────

export interface QuestionTypeDef {
  key: string          // e.g. "field:cardNumber", "link:gd-tarot-letter", "image:name"
  label: string        // human readable: "Card Number"
  type: 'field' | 'link' | 'image'
  fieldKey?: string    // extendedData key (for type=field)
  linkLabel?: string   // link label to query outgoing links (for type=link)
}

/**
 * Returns true if this entity has a distinct visual representation for image
 * recognition — delegates to hasSymbolicArt (entity-attributes.ts), which is
 * derived directly from EntityArt's actual rendering dispatch so this can never
 * drift out of sync with what the art component really renders. Passes
 * canonicalName through so shared entityTypes (tarot.card spans Tarot proper,
 * Lenormand, and Playing Cards) resolve to their own real art group instead of
 * defaulting to Tarot's — Lenormand cards do have their own art (a Classic
 * pack using their traditional playing-card insets) and are fully valid
 * image-recognition subjects once Study substitutes it in for Symbolic (see
 * the art-pack override in session.tsx), so there's no reason to exclude them.
 */
function hasVisualRepresentation(entity: BaseEntity): boolean {
  return hasSymbolicArt(entity.entityType, entity.canonicalName)
}

/**
 * Entity types with no quiz-worthy content of their own — meta/structural
 * scaffolding (a tradition's own description, a deck's own metadata, calendar
 * date-math nodes) rather than lore an entity type's own instances embody. This
 * is the one hand-maintained list left in the discovery system, since there's no
 * structural signal in the data itself to tell "meta" from "content."
 */
const NON_QUIZZABLE_ENTITY_TYPES = new Set([
  'system.overview',
  'system.tradition',
  'tarot.deck',
  'tarot.suit',
  'lenormand.deck',
  'playing.deck',
  'playing.suit',
  'divination.spread',
  'calendar.month',
  'calendar.season',
  'calendar.sabbat',
])

export interface DiscoveredEntityType {
  entityType: string
  label: string
  count: number
}

/**
 * Lists every entity type actually present in seeded + custom data (minus the
 * small non-quizzable denylist above), so Study's entity-type picker can never
 * fall behind grimoire-data — a new entity type becomes selectable the moment
 * entities of that type exist, with no matching code change required.
 */
export async function discoverEntityTypes(adapter: StorageAdapter): Promise<DiscoveredEntityType[]> {
  const probe = await adapter.listEntities({}, { offset: 0, limit: 1 })
  const all = await adapter.listEntities({}, { offset: 0, limit: probe.total })
  const counts = new Map<string, number>()
  for (const e of all.items) counts.set(e.entityType, (counts.get(e.entityType) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([entityType]) => !NON_QUIZZABLE_ENTITY_TYPES.has(entityType))
    .map(([entityType, count]) => ({ entityType, label: formatEntityType(entityType), count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// discoverGroupOverviews now lives in entity-attributes.ts (it's general-purpose,
// also used by Reference's top-level browse list) — re-exported here so existing
// callers (quiz-discovery-hooks.ts) don't need to change their import path.
export { discoverGroupOverviews } from './entity-attributes'
export type { GroupOverview } from './entity-attributes'

// ─── Namespace grouping ─────────────────────────────────────────────────────────
// Groups anything keyed by entityType under its dot-namespace prefix (e.g.
// "qabalah.sephira"/"qabalah.path" → group "qabalah"). Generic over the item
// shape so the same grouping — and the same group labels/overview links — can
// be reused for both the preset editor's DiscoveredEntityType[] and the Study
// dashboard's EntityTypeStats[], instead of each screen growing its own
// grouping logic that can quietly drift out of sync with the other.

export function groupKey(entityType: string): string {
  const dot = entityType.indexOf('.')
  return dot === -1 ? entityType : entityType.slice(0, dot)
}

export interface NamespaceGroup<T> {
  key: string
  label: string
  /** Set only when a real system.overview entity represents this whole group —
   * lets the header link out to it instead of just showing plain text. */
  overviewCanonicalName?: string
  items: T[]
}

/**
 * Groups use a real overview entity's own display name + canonical name when
 * one is tagged for this group (via extendedData.entityTypeGroup, see
 * discoverGroupOverviews), falling back to the auto-formatted namespace key
 * for any group that doesn't have one yet — so nothing breaks if data is
 * stale or a brand new namespace shows up before an overview is authored for it.
 */
export function groupByNamespace<T extends { entityType: string }>(
  items: T[],
  groupOverviews: Map<string, GroupOverview>,
): NamespaceGroup<T>[] {
  const byKey = new Map<string, T[]>()
  for (const item of items) {
    const key = groupKey(item.entityType)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(item)
  }
  return [...byKey.entries()]
    .map(([key, groupItems]) => {
      const overview = groupOverviews.get(key)
      return {
        key,
        label: overview?.label ?? formatTag(key),
        overviewCanonicalName: overview?.canonicalName,
        items: groupItems,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

// The full link table is small (a few thousand rows) and effectively static
// for the lifetime of a session — cache it once rather than re-querying it for
// every entity type discovered.
let _allLinksCache: Promise<Link[]> | null = null
async function getAllLinksCached(adapter: StorageAdapter): Promise<Link[]> {
  if (!_allLinksCache) {
    _allLinksCache = adapter.queryLinks({ limit: 10000 }).then(r => r.items)
  }
  return _allLinksCache
}

/** `${sourceCanonicalName}::${label}` for every existing link — an O(1)
 * applicability lookup for link-type defs, built from the same cached link
 * table `discoverQuestionDefs` already loads, instead of a query per pair. */
async function getLinkExistenceIndex(adapter: StorageAdapter): Promise<Set<string>> {
  const links = await getAllLinksCached(adapter)
  return new Set(links.map(l => `${l.sourceCanonicalName}::${l.label}`))
}

/**
 * Returns true if resolveAnswer (below) would find a real value for this
 * (entity, def) pair — same null conditions, without the canonical-name →
 * display-name resolution work resolveAnswer also does, since only "is there
 * an answer at all" matters here.
 *
 * This matters because discoverQuestionDefs registers a question type for an
 * *entity type* the moment any single sampled entity has it — so most individual
 * entities of that type can legitimately have nothing to answer for a given def
 * (e.g. only Major Arcana cards carry Golden Dawn Hebrew-letter attributions,
 * not the full 78-card deck; only 3 of 22 Hebrew letters are elemental rather
 * than planetary/zodiacal). Used by buildSession and the progress-stats
 * functions so a session's "due" pool and dashboard counts only ever include
 * cards that can actually produce a question — otherwise a large fraction of
 * a session silently gets skipped at play time with no explanation, and the
 * dashboard's due-counts overstate how many cards a session will really draw.
 */
function isAnswerable(entity: BaseEntity, def: QuestionTypeDef, linkExistence: Set<string>): boolean {
  if (def.type === 'image') return hasVisualRepresentation(entity)
  if (def.type === 'field') {
    const raw = entity.extendedData[def.fieldKey!]
    const value = Array.isArray(raw) ? (raw.length > 0 ? raw[0] : null) : raw
    return value !== null && value !== undefined && value !== ''
  }
  return linkExistence.has(`${entity.canonicalName}::${def.linkLabel}`)
}

/**
 * Discovers the quiz-worthy fields and outgoing link labels of a given entity
 * type by sampling its actual seeded entities — this function *is* the
 * question-type table now, computed from live data instead of hand-curated, so
 * adding, renaming, or removing an extendedData field on any entity of this
 * type is reflected here automatically. Field candidates that are arrays or
 * long free-text (paragraph-length lore, not answer-shaped) are excluded, since
 * a flashcard/multiple-choice answer needs to be a short, singular value.
 */
export async function discoverQuestionDefs(adapter: StorageAdapter, entityType: string): Promise<QuestionTypeDef[]> {
  const sample = await adapter.listEntities({ entityType }, { offset: 0, limit: 300 })
  const entities = sample.items
  if (entities.length === 0) return []

  const fieldKeys = new Set<string>()
  for (const entity of entities) {
    for (const [key, value] of getAttributeEntries(entity.extendedData)) {
      if (Array.isArray(value)) continue
      if (typeof value === 'string' && value.length > 80 && !looksLikeCanonicalName(value)) continue
      fieldKeys.add(key)
    }
  }
  const fieldDefs: QuestionTypeDef[] = [...fieldKeys].sort().map(key => ({
    key: `field:${key}`, label: formatFieldLabel(key), type: 'field', fieldKey: key,
  }))

  const cnSet = new Set(entities.map(e => e.canonicalName))
  const allLinks = await getAllLinksCached(adapter)
  const linkLabels = new Set<string>()
  for (const link of allLinks) {
    if (cnSet.has(link.sourceCanonicalName)) linkLabels.add(link.label)
  }
  const linkDefs: QuestionTypeDef[] = [...linkLabels].sort().map(label => ({
    key: `link:${label}`, label: formatLinkLabel(label), type: 'link', linkLabel: label,
  }))

  const imageDefs: QuestionTypeDef[] = hasSymbolicArt(entityType)
    ? [{ key: 'image:name', label: 'Visual Name Recognition', type: 'image' }]
    : []

  return [...imageDefs, ...fieldDefs, ...linkDefs]
}

/** "tarot.card" → "Cards" — a light pluralization for dashboard category labels
 * (the singular form from formatEntityType is correct everywhere else, e.g.
 * "Name this card"). Doesn't reproduce a few idiomatic irregular plurals the old
 * hand-curated table had (Sephiroth, Qliphoth) — an accepted, minor wording
 * tradeoff of automatic coverage across every entity type instead of a fixed list. */
function pluralizeEntityTypeLabel(entityType: string): string {
  const label = formatEntityType(entityType)
  return label.endsWith('s') ? label : `${label}s`
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
  /** acceptableAnswers includes `answer` plus any of its entity's visible
   * secondary names (alternate transliterations/spellings) — fill-in-blank is
   * the only mode that fuzzy-matches free-typed text, so it's the only one
   * that needs more than a single canonical string to check against. */
  | { mode: 'fill-in-blank';      prompt: string; answer: string; acceptableAnswers: string[] }
  | { mode: 'image-recognition';  prompt: string; answer: string; entity: BaseEntity; options: string[] }

// ─── Progress stats ────────────────────────────────────────────────────────────

export interface EntityTypeStats {
  entityType: string
  label: string
  total: number
  due: number
  breakdown: { new: number; learning: number; review: number; mature: number }
}

// ─── Tarot deck options ─────────────────────────────────────────────────────────

/**
 * 'tarot.card' spans several distinct decks (RWS, Thoth, Tarot de Marseille, etc.),
 * each tagged in grimoire-data. Study sessions let the user pick which decks
 * contribute cards, independently of the display-name default in Settings → Traditions.
 */
export interface TarotDeckOption {
  id: string
  label: string
  tag: string
}

// Lenormand and Playing Cards used to be here too, filtered by tag within the
// shared 'tarot.card' entityType — now that they're their own entityTypes
// (lenormand.card/playing.card), they're selected the same way any other
// entity type is, via settings.enabledEntityTypes, not this deck picker.
export const TAROT_DECK_OPTIONS: TarotDeckOption[] = [
  { id: 'rws',      label: 'Rider-Waite-Smith',  tag: 'rider-waite-smith' },
  { id: 'thoth',    label: 'Thoth',              tag: 'thoth' },
  { id: 'tdm',      label: 'Tarot de Marseille', tag: 'tarot-de-marseille' },
  { id: 'etteilla', label: 'Etteilla',           tag: 'etteilla' },
]

/**
 * Fetch entities for a given entityType, respecting the selected tarot decks
 * when entityType is 'tarot.card' (a union across each selected deck's tag,
 * since listEntities' `tags` filter is AND-within-a-call).
 * All other entity types are unaffected and behave as before.
 */
async function fetchQuizEntities(
  adapter: StorageAdapter,
  entityType: string,
  settings: QuizSettings,
  limit: number,
): Promise<BaseEntity[]> {
  const isBuiltInFilter = settings.includeUserCards ? {} : { isBuiltIn: true as const }

  if (entityType === 'tarot.card') {
    const deckIds = settings.tarotDecks.length > 0
      ? new Set(settings.tarotDecks)
      : new Set(TAROT_DECK_OPTIONS.map(d => d.id))
    const tags = TAROT_DECK_OPTIONS.filter(d => deckIds.has(d.id)).map(d => d.tag)

    const seen = new Map<string, BaseEntity>()
    for (const tag of tags) {
      const result = await adapter.listEntities({ entityType, tags: [tag], ...isBuiltInFilter }, { offset: 0, limit })
      for (const e of result.items) seen.set(e.canonicalName, e)
    }
    return [...seen.values()]
  }

  const result = await adapter.listEntities({ entityType, ...isBuiltInFilter }, { offset: 0, limit })
  return result.items
}

export async function getProgressStats(
  adapter: StorageAdapter,
  settings: QuizSettings,
  allStates: Map<string, CardState>,
): Promise<EntityTypeStats[]> {
  const today = new Date().toISOString().slice(0, 10)
  const results: EntityTypeStats[] = []
  const linkExistence = await getLinkExistenceIndex(adapter)

  for (const entityType of settings.enabledEntityTypes) {
    const allDefs     = await discoverQuestionDefs(adapter, entityType)
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const items = await fetchQuizEntities(adapter, entityType, settings, 1000)

    let total = 0, due = 0
    const breakdown = { new: 0, learning: 0, review: 0, mature: 0 }

    for (const entity of items) {
      for (const def of defs) {
        if (!isAnswerable(entity, def, linkExistence)) continue
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
      label: pluralizeEntityTypeLabel(entityType),
      total,
      due,
      breakdown,
    })
  }

  return results
}

export interface EntityProgressRow {
  entity: BaseEntity
  due: number
  total: number
  /** Earliest scheduled next-due date among this entity's question types that
   * aren't due yet, or null if none are scheduled (all new, or all due now). */
  nextDue: string | null
}

/** Per-entity drill-down for one entity type — the same shape getProgressStats
 * aggregates, broken out per entity so a dashboard row can expand into a list. */
export async function getEntityProgressList(
  adapter: StorageAdapter,
  entityType: string,
  settings: QuizSettings,
  allStates: Map<string, CardState>,
): Promise<EntityProgressRow[]> {
  const today = new Date().toISOString().slice(0, 10)
  const allDefs     = await discoverQuestionDefs(adapter, entityType)
  const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
  const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
  if (defs.length === 0) return []

  const items = await fetchQuizEntities(adapter, entityType, settings, 1000)
  const linkExistence = await getLinkExistenceIndex(adapter)

  return items
    .map(entity => {
      let due = 0, total = 0
      let nextDue: string | null = null
      for (const def of defs) {
        if (!isAnswerable(entity, def, linkExistence)) continue
        total++
        const key   = `${entity.canonicalName}::${def.key}`
        const state = allStates.get(key)
        if (!state || state.nextDue == null || state.nextDue <= today) {
          due++
        } else if (nextDue === null || state.nextDue < nextDue) {
          nextDue = state.nextDue
        }
      }
      return { entity, due, total, nextDue }
    })
    // Native display names, not the Reading tradition preference — Study is
    // about the specific entities/decks selected, not a homogenized view.
    .sort((a, b) => a.entity.primaryDisplayName.localeCompare(b.entity.primaryDisplayName))
}

// ─── Answer resolution ─────────────────────────────────────────────────────────

interface ResolvedAnswer {
  display: string
  /** display plus every visible secondary name of the entity the answer
   * refers to (alternate transliterations/spellings, e.g. Malkuth/Malkhut/
   * Malkouth) — just [display] when the answer isn't tied to a specific
   * entity (a plain field value with no canonical-name target). */
  acceptable: string[]
}

/** display + all visible secondary names, deduplicated. */
function alternateNames(entity: BaseEntity): string[] {
  return [...new Set([entity.primaryDisplayName, ...entity.secondaryNames.filter(n => n.visible).map(n => n.name)])]
}

/**
 * Always resolves native display names (entity.primaryDisplayName), never the
 * Reading tradition preference (primaryBySystem) — Study tests the specific
 * deck/tradition an entity actually belongs to, so a Thoth card should always
 * answer to "Art," never get silently renamed to "Temperance" because the
 * user reads with a Golden Dawn preference elsewhere in the app. Passing `{}`
 * to resolveAttributeValue (rather than changing its shared signature, which
 * Reference also relies on) achieves the same "always fall through to the
 * entity's own name" behavior for canonical-name-valued fields.
 */
async function resolveAnswer(
  entity: BaseEntity,
  def: QuestionTypeDef,
  adapter: StorageAdapter,
): Promise<ResolvedAnswer | null> {
  if (def.type === 'image') {
    return { display: entity.primaryDisplayName, acceptable: alternateNames(entity) }
  }
  if (def.type === 'field') {
    const resolved = await resolveAttributeValue(entity.extendedData[def.fieldKey!], adapter, {})
    if (!resolved) return null
    if (resolved.linkTarget) {
      const target = await adapter.getEntityByCanonicalName(resolved.linkTarget)
      if (target) return { display: resolved.display, acceptable: alternateNames(target) }
    }
    return { display: resolved.display, acceptable: [resolved.display] }
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
  if (!target) return { display: link.targetCanonicalName, acceptable: [link.targetCanonicalName] }
  return { display: target.primaryDisplayName, acceptable: alternateNames(target) }
}

/**
 * Name-recognition distractors, scoped to the same art group as the entity
 * being asked about — e.g. only other Rider-Waite-Smith cards, never Thoth or
 * Tarot de Marseille. Without this, the same archetypal card carries a
 * different name per deck (RWS "Strength" = Thoth "Lust" = TdM "La Force"),
 * so an unscoped pool could offer another deck's name for what is, visually
 * and conceptually, the identical card — indistinguishable from the correct
 * answer rather than a genuine wrong option. Entity types with no art-group
 * concept (i.e. only one natural population) are unaffected: `group` is null
 * and every candidate of the same entityType is eligible, same as before.
 */
async function pickNameDistractors(
  entity: BaseEntity,
  adapter: StorageAdapter,
  count: number,
): Promise<string[]> {
  const correct = entity.primaryDisplayName
  const group   = artGroupForEntityType(entity.entityType, entity.canonicalName)
  // High enough to cover an entire entity type's population (tarot.card alone
  // is 400+) — a truncated fetch used to be tolerable when candidates were
  // pooled across all decks regardless of order, but now that they're scoped
  // to the same deck, a deck whose entities happen to fall outside a smaller
  // window would come up with zero candidates instead of just fewer.
  const result  = await adapter.listEntities({ entityType: entity.entityType }, { offset: 0, limit: 1000 })
  const candidates = result.items
    .filter(e => e.canonicalName !== entity.canonicalName)
    .filter(e => !group || artGroupForEntityType(e.entityType, e.canonicalName) === group)
    .map(e => e.primaryDisplayName)
    .filter(name => name !== correct)
  return pickRandom(candidates, count)
}

async function pickDistractors(
  correctAnswer: string,
  entity: BaseEntity,
  def: QuestionTypeDef,
  adapter: StorageAdapter,
  count: number,
): Promise<string[]> {
  const candidates: string[] = []

  if (def.type === 'field') {
    // Same full-population reasoning as pickNameDistractors above.
    const result = await adapter.listEntities({ entityType: entity.entityType }, { offset: 0, limit: 1000 })
    for (const e of result.items) {
      const resolved = await resolveAttributeValue(e.extendedData[def.fieldKey!], adapter, {})
      const s = resolved?.display
      if (s && s !== correctAnswer && !candidates.includes(s)) candidates.push(s)
    }
  } else {
    const result = await adapter.queryLinks({ labels: [def.linkLabel!], limit: 300 })
    for (const link of result.items) {
      const target = await adapter.getEntityByCanonicalName(link.targetCanonicalName)
      if (target) {
        const name = target.primaryDisplayName
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
  // An image:name def has nothing to ask if the entity has no visual
  // representation to recognize (e.g. Lenormand cards, excluded by policy in
  // hasVisualRepresentation despite sharing tarot.card's entityType) — treat
  // it as unanswerable. Without this, the two redirects below infinite-loop:
  // image-type defs always redirect toward image-recognition mode, and
  // image-recognition always redirects entities with no art *away* from it,
  // bouncing forever for exactly this combination.
  if (def.type === 'image' && !hasVisualRepresentation(entity)) return null

  // ── image:name defs prefer image-recognition when it's available ─────────────
  // Only redirect when image-recognition is actually enabled — otherwise this
  // falls through to the "Standard modes" section below, which already knows
  // how to ask a def.type === 'image' question by name alone (see resolveAnswer
  // and the multiple-choice distractor branch). Redirecting unconditionally
  // used to infinite-loop when image-recognition was disabled in settings: the
  // computed fallback mode ('multiple-choice') still isn't 'image-recognition',
  // so this same check would fire again on the very next call, forever.
  if (def.type === 'image' && mode !== 'image-recognition' && settings.enabledModes.includes('image-recognition')) {
    return generateQuestion(entity, def, 'image-recognition', adapter, settings)
  }

  // ── Image recognition mode ──────────────────────────────────────────────────
  if (mode === 'image-recognition') {
    // Only applies to entities with distinct visual representations
    if (!hasVisualRepresentation(entity)) {
      return generateQuestion(entity, def, 'multiple-choice', adapter, settings)
    }

    const typeLabel = formatEntityType(entity.entityType).toLowerCase()

    let answer: string
    let prompt: string
    let distractors: string[]

    if (def.type === 'image') {
      // Name recognition: show art, identify the entity
      answer = entity.primaryDisplayName
      prompt = `Name this ${typeLabel}`
      distractors = await pickNameDistractors(entity, adapter, settings.multipleChoiceCount - 1)
    } else {
      // Attribute recognition: show art, identify an attribute without seeing the name
      const attrAnswer = await resolveAnswer(entity, def, adapter)
      if (!attrAnswer) return null
      answer = attrAnswer.display
      prompt = `What is the ${def.label.toLowerCase()} of this?`
      distractors = await pickDistractors(answer, entity, def, adapter, settings.multipleChoiceCount - 1)
    }

    if (distractors.length < 1) return null
    const options = [answer, ...distractors].sort(() => Math.random() - 0.5)
    return { mode: 'image-recognition', prompt, answer, entity, options }
  }

  // ── Standard modes ──────────────────────────────────────────────────────────
  const resolved = await resolveAnswer(entity, def, adapter)
  if (!resolved) return null
  const answer = resolved.display

  // For image:name questions outside image-recognition mode, fall back to standard name prompt
  const entityName = entity.primaryDisplayName
  const prompt = def.type === 'image'
    ? `What is the name of this entity?`
    : `What is the ${def.label.toLowerCase()} of ${entityName}?`

  if (mode === 'flashcard')     return { mode: 'flashcard',     prompt, answer }
  if (mode === 'fill-in-blank') return { mode: 'fill-in-blank', prompt, answer, acceptableAnswers: resolved.acceptable }

  // Multiple choice — fall back to flashcard if not enough distractors
  const distractors = def.type === 'image'
    ? await pickNameDistractors(entity, adapter, settings.multipleChoiceCount - 1)
    : await pickDistractors(answer, entity, def, adapter, settings.multipleChoiceCount - 1)
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
  const linkExistence = await getLinkExistenceIndex(adapter)

  for (const entityType of settings.enabledEntityTypes) {
    const allDefs     = await discoverQuestionDefs(adapter, entityType)
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const items = await fetchQuizEntities(adapter, entityType, settings, 500)

    for (const entity of items) {
      for (const def of defs) {
        if (!isAnswerable(entity, def, linkExistence)) continue
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
    const allDefs     = await discoverQuestionDefs(adapter, entityType)
    const enabledKeys = settings.enabledQuestionTypes[entityType] ?? []
    const defs        = allDefs.filter(d => enabledKeys.includes(d.key))
    if (defs.length === 0) continue

    const items = await fetchQuizEntities(adapter, entityType, settings, 1000)

    for (const entity of items) {
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
