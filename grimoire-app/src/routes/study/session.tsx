import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useReducer, useCallback, useRef, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import { useStudyStore } from '@/stores/study'
import {
  upsertCardState, saveLastResult, appendSessionHistory, sm2,
} from '@/lib/quiz-db'
import type { QuestionMode } from '@/lib/quiz-db'
import { generateQuestion, classifyMatch } from '@/lib/quiz-engine'
import type { SessionCard, Question } from '@/lib/quiz-engine'
import { Button } from '@/components/ui/Button'
import { EntityArt } from '@/components/ui/EntityArt'
import { EntityLink } from '@/components/ui/EntityLink'
import { ArrowLeft, Pause, StopCircle } from 'lucide-react'
import { formatEntityType } from '@/lib/format'
import { discoverGroupOverviews, traditionLabelForEntity } from '@/lib/entity-attributes'
import type { GroupOverview } from '@/lib/entity-attributes'
import { artGroupForEntityType, loadArtSettings, firstNonSymbolicPack } from '@/lib/art-store'

export const Route = createFileRoute('/study/session')({
  component: SessionPage,
})

// ─── State machine ────────────────────────────────────────────────────────────

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'question'; card: SessionCard; question: Question; idx: number; total: number; fibInput: string }
  | {
      kind: 'revealed'; card: SessionCard; question: Question; idx: number; total: number
      autoCorrect: boolean | null; rating: number
      /** Set only for a fill-in-blank answer accepted by fuzzy tolerance but not
       * an exact match to anything in acceptableAnswers — surfaces the likely
       * typo instead of silently crediting it as if it were spelled correctly,
       * which would otherwise reinforce the misspelling. */
      fibNearMiss?: { typed: string; correct: string }
    }
  | { kind: 'complete'; reviewed: number; correct: number; skipped: number }

type Action =
  | { type: 'LOADED'; cards: SessionCard[] }
  | { type: 'SHOW_QUESTION'; card: SessionCard; question: Question; idx: number; total: number }
  | { type: 'FIB_INPUT'; value: string }
  | { type: 'FLIP' }                              // flashcard: show answer
  | { type: 'SELECT_OPTION'; correct: boolean }   // multiple-choice: pick option
  | { type: 'DONT_KNOW' }                         // multiple-choice/image-recognition: opt out instead of guessing
  | { type: 'SUBMIT_FIB' }                        // fill-in-blank: check answer
  | { type: 'SET_RATING'; rating: number }        // override rating
  | { type: 'CONFIRM_RATING' }                    // proceed to next card / complete
  | { type: 'COMPLETE'; reviewed: number; correct: number; skipped: number }
  | { type: 'ERROR' }

function reducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case 'LOADED':
      return action.cards.length === 0 ? { kind: 'empty' } : state
    case 'SHOW_QUESTION':
      return {
        kind: 'question',
        card: action.card, question: action.question,
        idx: action.idx, total: action.total, fibInput: '',
      }
    case 'FIB_INPUT':
      if (state.kind !== 'question') return state
      return { ...state, fibInput: action.value }
    case 'FLIP':
      if (state.kind !== 'question') return state
      return {
        kind: 'revealed',
        card: state.card, question: state.question,
        idx: state.idx, total: state.total,
        autoCorrect: null, rating: 3,
      }
    case 'SELECT_OPTION': {
      if (state.kind !== 'question') return state
      const rating = action.correct ? 4 : 1
      return {
        kind: 'revealed',
        card: state.card, question: state.question,
        idx: state.idx, total: state.total,
        autoCorrect: action.correct, rating,
      }
    }
    case 'DONT_KNOW': {
      if (state.kind !== 'question') return state
      // Rating 0 ("Blackout") rather than the usual wrong-guess default of 1 —
      // the user is explicitly asserting no recall at all, not "picked wrong
      // but it rang a bell." Distinct from SELECT_OPTION so a lucky random
      // click on the correct option can never masquerade as real knowledge
      // and inflate the SM-2 interval for something the user doesn't know.
      return {
        kind: 'revealed',
        card: state.card, question: state.question,
        idx: state.idx, total: state.total,
        autoCorrect: false, rating: 0,
      }
    }
    case 'SUBMIT_FIB': {
      if (state.kind !== 'question') return state
      // Accept any known alternate spelling/transliteration, not just the one
      // displayed on reveal (e.g. "Malkhut" or "Malkouth" for "Malkuth").
      const acceptable = state.question.mode === 'fill-in-blank' ? state.question.acceptableAnswers : [state.question.answer]
      const typed = state.fibInput
      const classified = acceptable.map(alt => ({ alt, kind: classifyMatch(typed, alt) }))
      const correct = classified.some(c => c.kind !== 'none')
      // 'exact' and 'substring' are both genuine, clean matches — substring
      // is the designed leniency for keyword-list answers (e.g. typing just
      // "New beginnings" against a Lenormand meaning stored as "New
      // beginnings, spontaneity, a free spirit"), not a typo. Only flag a
      // near-miss when the *only* reason it matched was the character-edit
      // tolerance, which is what's actually likely to be a misspelling.
      const hasCleanMatch = classified.some(c => c.kind === 'exact' || c.kind === 'substring')
      const near = classified.find(c => c.kind === 'near')
      return {
        kind: 'revealed',
        card: state.card, question: state.question,
        idx: state.idx, total: state.total,
        autoCorrect: correct, rating: correct ? 4 : 1,
        // Credit it as correct (they clearly knew the right answer), but flag
        // the near-miss so a genuine typo doesn't just look like a clean win —
        // otherwise the same misspelling would keep getting silently reinforced.
        fibNearMiss: (!hasCleanMatch && near) ? { typed, correct: near.alt } : undefined,
      }
    }
    case 'SET_RATING':
      if (state.kind !== 'revealed') return state
      return { ...state, rating: action.rating }
    case 'CONFIRM_RATING':
      return state  // handled externally via side-effect
    case 'COMPLETE':
      return { kind: 'complete', reviewed: action.reviewed, correct: action.correct, skipped: action.skipped }
    case 'ERROR':
      return { kind: 'empty' }
    default:
      return state
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  0: 'Blackout', 1: 'Fail', 2: 'Hard', 3: 'OK', 4: 'Good', 5: 'Perfect',
}

/** Always-present opt-out for multiple-choice/image-recognition — a random
 * guess landing on the correct option would otherwise be indistinguishable
 * from real recall, inflating the SM-2 interval for something the user
 * doesn't actually know. Styled distinctly (dashed, muted) so it doesn't read
 * as just another answer choice. */
function DontKnowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px', marginTop: '2px', background: 'none',
        border: '1px dashed var(--color-border)', borderRadius: '6px',
        color: 'var(--color-text-subtle)', fontSize: '12px', textAlign: 'left',
        fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      I don&rsquo;t know
    </button>
  )
}

function SessionPage() {
  const navigate   = useNavigate()
  const { engine } = useEngineStore()
  const [phase, dispatch] = useReducer(reducer, { kind: 'loading' })

  // Card queue and config come from the persisted study store (built by
  // /study/new before navigating here) — snapshot once at mount; progress is
  // tracked going forward via store actions (advanceCard/completeSession),
  // which is what makes a mid-session refresh resumable.
  const cardsRef    = useRef<SessionCard[]>(useStudyStore.getState().cards)
  const configRef   = useRef(useStudyStore.getState().sessionConfig)
  const presetIdRef = useRef(useStudyStore.getState().activePreset?.id ?? null)

  // Tradition labels (e.g. "Tarot" vs "Lenormand") for disambiguating same-named
  // entities across traditions — loaded once, cheap, doesn't change mid-session.
  const [groupOverviews, setGroupOverviews] = useState<Map<string, GroupOverview>>(new Map())
  useEffect(() => {
    if (!engine) return
    discoverGroupOverviews(engine.adapter).then(setGroupOverviews).catch(console.error)
  }, [engine])

  // ── Pick mode ──────────────────────────────────────────────────────────────
  const pickMode = useCallback((): QuestionMode => {
    const modes = configRef.current?.enabledModes ?? ['flashcard']
    return modes[Math.floor(Math.random() * modes.length)]
  }, [])

  const finishSession = useCallback(async () => {
    const { reviewed, correct, skipped } = useStudyStore.getState()
    const result = {
      completedAt:   new Date().toISOString(),
      cardsReviewed: reviewed,
      cardsCorrect:  correct,
      presetId:      presetIdRef.current,
    }
    await saveLastResult(result)
    await appendSessionHistory(result)
    useStudyStore.getState().completeSession()
    dispatch({ type: 'COMPLETE', reviewed: result.cardsReviewed, correct: result.cardsCorrect, skipped })
  }, [])

  // ── Load card and show question ────────────────────────────────────────────
  const loadCard = useCallback(async (idx: number) => {
    if (!engine || !configRef.current) return
    const cards = cardsRef.current
    const card = cards[idx]
    if (!card) return

    const mode     = pickMode()
    const question = await generateQuestion(card.entity, card.def, mode, engine.adapter, configRef.current)
    if (!question) {
      // Skip card with no resolvable answer — not persisted as "advanced"
      // (resuming would just re-attempt and re-skip it, which is harmless),
      // but still counted so Session Complete can explain a shrunken total
      // instead of silently under-reporting it.
      useStudyStore.getState().skipCard()
      if (idx + 1 >= cards.length) {
        await finishSession()
      } else {
        await loadCard(idx + 1)
      }
      return
    }
    dispatch({ type: 'SHOW_QUESTION', card, question, idx, total: cards.length })
  }, [engine, pickMode, finishSession])

  // ── Initialise session ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!engine) return
    const cards = cardsRef.current
    if (cards.length === 0 || !configRef.current) {
      navigate({ to: '/study/new' })
      return
    }
    ;(async () => {
      try {
        dispatch({ type: 'LOADED', cards })
        const startIdx = useStudyStore.getState().cardIndex
        if (startIdx >= cards.length) {
          await finishSession()
        } else {
          await loadCard(startIdx)
        }
      } catch (e) {
        console.error('Session load error:', e)
        dispatch({ type: 'ERROR' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  // ── Confirm rating and advance ─────────────────────────────────────────────
  const confirmRating = useCallback(async () => {
    if (phase.kind !== 'revealed') return
    const { card, rating, autoCorrect, idx } = phase

    // Update SM-2 state
    const newState = sm2(card.state, rating as 0|1|2|3|4|5)
    await upsertCardState(newState)

    const wasCorrect = autoCorrect !== null ? autoCorrect : rating >= 3
    const nextIdx = idx + 1
    useStudyStore.getState().advanceCard(nextIdx, wasCorrect)

    if (nextIdx >= cardsRef.current.length) {
      await finishSession()
    } else {
      await loadCard(nextIdx)
    }
  }, [phase, loadCard, finishSession])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase.kind === 'loading') return (
    <div style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Building session…</div>
  )

  if (phase.kind === 'empty') return (
    <div style={{ maxWidth: '500px' }}>
      <Button variant="ghost" size="sm" onClick={() => { useStudyStore.getState().endSession(); navigate({ to: '/study' }) }} style={{ marginBottom: '20px' }}>
        <ArrowLeft size={13} /> Back
      </Button>
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>No cards due</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>All caught up! Check back later or adjust your settings.</div>
      </div>
    </div>
  )

  if (phase.kind === 'complete') {
    const pct = phase.reviewed > 0 ? Math.round((phase.correct / phase.reviewed) * 100) : 0
    return (
      <div style={{ maxWidth: '500px' }}>
        <div style={{ padding: '40px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Session Complete</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '28px' }}>
            <div>
              <div style={{ fontSize: '40px', fontWeight: 300, color: 'var(--color-text)', lineHeight: 1 }}>
                {phase.correct}/{phase.reviewed}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>correct</div>
            </div>
            <div>
              <div style={{ fontSize: '40px', fontWeight: 300, color: pct >= 70 ? 'var(--color-accent)' : pct >= 50 ? '#c47a4a' : 'var(--color-danger)', lineHeight: 1 }}>
                {pct}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>accuracy</div>
            </div>
          </div>

          {/* Explains why the total above can be lower than the number of cards
              selected — otherwise "7/10" for a 20-card session reads as a bug. */}
          {phase.skipped > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '20px' }}>
              {phase.skipped} of {phase.reviewed + phase.skipped} selected card{phase.skipped === 1 ? '' : 's'} {phase.skipped === 1 ? 'was' : 'were'} skipped — no answerable question could be generated for {phase.skipped === 1 ? 'it' : 'them'}.
            </div>
          )}

          {(() => {
            const seen = new Map<string, SessionCard>()
            for (const c of cardsRef.current) if (!seen.has(c.entity.canonicalName)) seen.set(c.entity.canonicalName, c)
            const uniqueCards = [...seen.values()]
            if (uniqueCards.length === 0) return null
            return (
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Cards in This Session
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', maxHeight: '160px', overflowY: 'auto' }}>
                  {uniqueCards.map(c => (
                    <EntityLink key={c.entity.canonicalName} canonicalName={c.entity.canonicalName} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {c.entity.primaryDisplayName}
                    </EntityLink>
                  ))}
                </div>
              </div>
            )
          })()}

          <Button onClick={() => { useStudyStore.getState().endSession(); navigate({ to: '/study' }) }}>Back to Overview</Button>
        </div>
      </div>
    )
  }

  // ── Question + revealed phases ─────────────────────────────────────────────
  const { card, question, idx, total } = phase
  const traditionLabel = traditionLabelForEntity(card.entity, groupOverviews)

  // Symbolic art packs render a generic per-rank/per-figure glyph that doesn't
  // distinguish between decks sharing the same group schema (e.g. Deux de
  // Deniers and Two of Pentacles render identically) — substitute the group's
  // classic pack so image-recognition stays answerable. Any other selected
  // pack (including custom ones) is left untouched.
  const imagePackOverride = (() => {
    if (question.mode !== 'image-recognition') return undefined
    const group = artGroupForEntityType(question.entity.entityType, question.entity.canonicalName)
    if (!group) return undefined
    const { packByGroup } = loadArtSettings()
    return packByGroup[group] === 'symbolic' ? (firstNonSymbolicPack(group) ?? undefined) : undefined
  })()

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Leaves without touching progress — the session stays resumable
              (study/index.tsx shows "Resume Session" while step === 'session'). */}
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
            <Pause size={13} /> Pause Session
          </Button>
          {/* Actually discards the in-progress queue/tally via endSession(),
              unlike Pause — the card only asks for confirmation here since it's
              the one action that genuinely throws progress away. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!window.confirm('End this session? Progress on unanswered cards will be lost.')) return
              useStudyStore.getState().endSession()
              navigate({ to: '/study' })
            }}
          >
            <StopCircle size={13} /> End Session
          </Button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          {idx + 1} / {total}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((idx) / total) * 100}%`, background: 'var(--color-accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>

      {/* Tradition — always visible, disambiguates same-named entities across
          traditions (e.g. The Tower in Tarot vs. Lenormand, Mercury in Astrology
          vs. Alchemy). Safe to show before reveal: it never gives away which
          specific entity this is, only which family it belongs to. */}
      <div style={{
        display: 'inline-block', marginBottom: '10px', padding: '3px 10px',
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'var(--color-accent)', background: 'rgba(180,156,90,0.12)',
        border: '1px solid var(--color-accent-muted)', borderRadius: '4px',
      }}>
        {traditionLabel}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px', color: 'var(--color-text-subtle)', flexWrap: 'wrap' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatEntityType(card.entity.entityType)}</span>
        <span>·</span>
        <span>{card.def.label}</span>
        <span>·</span>
        <span style={{ fontFamily: 'monospace' }}>{question.mode}</span>
        {card.isNew && <><span>·</span><span style={{ color: 'var(--color-accent)' }}>new</span></>}
        {/* Only shown once revealed — before that, linking out would spoil
            image-recognition and fill-in-blank/flashcard guessing. */}
        {phase.kind === 'revealed' && (
          <>
            <span>·</span>
            <EntityLink canonicalName={card.entity.canonicalName} style={{ color: 'var(--color-accent)' }}>
              View in Reference
            </EntityLink>
          </>
        )}
      </div>

      {/* Card */}
      <div style={{ padding: '28px 28px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)', minHeight: '160px', marginBottom: '16px' }}>

        {/* IMAGE RECOGNITION — art shown prominently above the prompt */}
        {question.mode === 'image-recognition' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <EntityArt entity={question.entity} width={120} height={190} hideLabel packIdOverride={imagePackOverride} />
          </div>
        )}

        <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          {question.prompt}
        </div>

        {/* FLASHCARD — question side */}
        {question.mode === 'flashcard' && phase.kind === 'question' && (
          <Button onClick={() => dispatch({ type: 'FLIP' })}>Show Answer</Button>
        )}

        {/* FLASHCARD — revealed */}
        {question.mode === 'flashcard' && phase.kind === 'revealed' && (
          <div style={{ fontSize: '20px', fontWeight: 300, color: 'var(--color-text)', lineHeight: 1.4 }}>
            {question.answer}
          </div>
        )}

        {/* IMAGE RECOGNITION (multiple-choice style) */}
        {question.mode === 'image-recognition' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((opt, i) => {
              const isSelected = phase.kind === 'revealed'
              const isCorrect  = opt === question.answer
              let bg = 'var(--color-surface-1)'
              let border = 'var(--color-border)'
              if (isSelected && isCorrect) { bg = 'rgba(100,160,100,0.15)'; border = '#4a8a4a' }
              return (
                <button
                  key={i}
                  disabled={phase.kind === 'revealed'}
                  onClick={() => dispatch({ type: 'SELECT_OPTION', correct: opt === question.answer })}
                  style={{
                    padding: '10px 14px', background: bg, border: `1px solid ${border}`,
                    borderRadius: '6px', cursor: phase.kind === 'question' ? 'pointer' : 'default',
                    color: 'var(--color-text)', fontSize: '13px', textAlign: 'left',
                    fontFamily: 'inherit', opacity: (isSelected && !isCorrect) ? 0.5 : 1,
                  }}
                >
                  {opt}
                </button>
              )
            })}
            {phase.kind === 'question' && <DontKnowButton onClick={() => dispatch({ type: 'DONT_KNOW' })} />}
            {phase.kind === 'revealed' && phase.autoCorrect === false && (
              <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>
                Correct answer: {question.answer}
              </div>
            )}
          </div>
        )}

        {/* MULTIPLE CHOICE */}
        {question.mode === 'multiple-choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((opt, i) => {
              const isSelected = phase.kind === 'revealed'
              const isCorrect  = opt === question.answer
              const wasChosen  = isSelected && phase.autoCorrect !== null &&
                ((phase.autoCorrect && isCorrect) || (!phase.autoCorrect && i === question.options.findIndex(o =>
                  phase.kind === 'revealed' && o !== question.answer && phase.autoCorrect === false
                    ? o === question.options.find(x => x !== question.answer)
                    : false
                )))
              let bg = 'var(--color-surface-1)'
              let border = 'var(--color-border)'
              if (isSelected) {
                if (isCorrect)   { bg = 'rgba(100,160,100,0.15)'; border = '#4a8a4a' }
              }
              return (
                <button
                  key={i}
                  disabled={phase.kind === 'revealed'}
                  onClick={() => dispatch({ type: 'SELECT_OPTION', correct: opt === question.answer })}
                  style={{
                    padding: '10px 14px', background: bg, border: `1px solid ${border}`,
                    borderRadius: '6px', cursor: phase.kind === 'question' ? 'pointer' : 'default',
                    color: 'var(--color-text)', fontSize: '13px', textAlign: 'left',
                    fontFamily: 'inherit', opacity: (isSelected && !isCorrect) ? 0.5 : 1,
                  }}
                >
                  {opt}
                </button>
              )
            })}
            {phase.kind === 'question' && <DontKnowButton onClick={() => dispatch({ type: 'DONT_KNOW' })} />}
            {phase.kind === 'revealed' && phase.autoCorrect === false && (
              <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>
                Correct answer: {question.answer}
              </div>
            )}
          </div>
        )}

        {/* FILL IN BLANK */}
        {question.mode === 'fill-in-blank' && phase.kind === 'question' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              autoFocus
              value={phase.fibInput}
              onChange={e => dispatch({ type: 'FIB_INPUT', value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && phase.fibInput.trim() && dispatch({ type: 'SUBMIT_FIB' })}
              placeholder="Your answer…"
              style={{
                flex: 1, padding: '9px 12px',
                background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
                borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <Button
              disabled={!phase.fibInput.trim()}
              onClick={() => dispatch({ type: 'SUBMIT_FIB' })}
            >Check</Button>
          </div>
        )}
        {question.mode === 'fill-in-blank' && phase.kind === 'revealed' && (
          <div>
            <div style={{ fontSize: '13px', color: phase.autoCorrect ? 'var(--color-accent)' : 'var(--color-danger)', marginBottom: '8px' }}>
              {phase.autoCorrect ? 'Correct!' : 'Incorrect'}
            </div>
            {phase.fibNearMiss && (
              <div style={{ fontSize: '12px', color: '#c47a4a', marginBottom: '8px' }}>
                Close — you wrote &ldquo;{phase.fibNearMiss.typed}&rdquo;; the exact spelling is &ldquo;{phase.fibNearMiss.correct}&rdquo;.
              </div>
            )}
            <div style={{ fontSize: '16px', color: 'var(--color-text)' }}>
              Answer: <strong>{question.answer}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Rating buttons (always shown in revealed phase) */}
      {phase.kind === 'revealed' && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Rate your recall (0–5)
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {([0,1,2,3,4,5] as const).map(r => (
              <button
                key={r}
                onClick={() => dispatch({ type: 'SET_RATING', rating: r })}
                style={{
                  padding: '7px 12px', border: '1px solid',
                  borderColor: phase.rating === r ? 'var(--color-accent)' : 'var(--color-border)',
                  borderRadius: '5px', cursor: 'pointer',
                  background: phase.rating === r ? 'rgba(180,156,90,0.15)' : 'var(--color-surface-1)',
                  color: phase.rating === r ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontSize: '12px', fontFamily: 'inherit', fontWeight: phase.rating === r ? 600 : 400,
                }}
              >
                {r} · {RATING_LABELS[r]}
              </button>
            ))}
          </div>
          <Button onClick={confirmRating}>
            {idx + 1 >= cardsRef.current.length ? 'Finish Session' : 'Next Card →'}
          </Button>
        </div>
      )}
    </div>
  )
}
