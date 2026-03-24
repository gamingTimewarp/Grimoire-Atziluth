import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useReducer, useCallback, useRef } from 'react'
import { useEngineStore } from '@/stores/engine'
import {
  getSettings, getAllCardStates, upsertCardState, saveLastResult, appendSessionHistory, sm2,
} from '@/lib/quiz-db'
import type { CardState, QuizSettings, QuestionMode } from '@/lib/quiz-db'
import { buildSession, generateQuestion, fuzzyMatch } from '@/lib/quiz-engine'
import type { SessionCard, Question } from '@/lib/quiz-engine'
import { Button } from '@/components/ui/Button'
import { EntityArt } from '@/components/ui/EntityArt'
import { ArrowLeft } from 'lucide-react'
import { formatEntityType } from '@/lib/format'

export const Route = createFileRoute('/study/session')({
  component: SessionPage,
})

// ─── State machine ────────────────────────────────────────────────────────────

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'question'; card: SessionCard; question: Question; idx: number; total: number; fibInput: string }
  | { kind: 'revealed'; card: SessionCard; question: Question; idx: number; total: number; autoCorrect: boolean | null; rating: number }
  | { kind: 'complete'; reviewed: number; correct: number }

type Action =
  | { type: 'LOADED'; cards: SessionCard[] }
  | { type: 'SHOW_QUESTION'; card: SessionCard; question: Question; idx: number; total: number }
  | { type: 'FIB_INPUT'; value: string }
  | { type: 'FLIP' }                              // flashcard: show answer
  | { type: 'SELECT_OPTION'; correct: boolean }   // multiple-choice: pick option
  | { type: 'SUBMIT_FIB' }                        // fill-in-blank: check answer
  | { type: 'SET_RATING'; rating: number }        // override rating
  | { type: 'CONFIRM_RATING' }                    // proceed to next card / complete
  | { type: 'COMPLETE'; reviewed: number; correct: number }
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
    case 'SUBMIT_FIB': {
      if (state.kind !== 'question') return state
      const correct = fuzzyMatch(state.fibInput, state.question.answer)
      return {
        kind: 'revealed',
        card: state.card, question: state.question,
        idx: state.idx, total: state.total,
        autoCorrect: correct, rating: correct ? 4 : 1,
      }
    }
    case 'SET_RATING':
      if (state.kind !== 'revealed') return state
      return { ...state, rating: action.rating }
    case 'CONFIRM_RATING':
      return state  // handled externally via side-effect
    case 'COMPLETE':
      return { kind: 'complete', reviewed: action.reviewed, correct: action.correct }
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

function SessionPage() {
  const navigate   = useNavigate()
  const { engine } = useEngineStore()
  const [phase, dispatch] = useReducer(reducer, { kind: 'loading' })

  // Session data held in refs to avoid stale closure issues
  const cardsRef    = useRef<SessionCard[]>([])
  const idxRef      = useRef(0)
  const reviewedRef = useRef(0)
  const correctRef  = useRef(0)
  const settingsRef = useRef<QuizSettings | null>(null)

  // ── Pick mode ──────────────────────────────────────────────────────────────
  const pickMode = useCallback((): QuestionMode => {
    const modes = settingsRef.current?.enabledModes ?? ['flashcard']
    return modes[Math.floor(Math.random() * modes.length)]
  }, [])

  // ── Load card and show question ────────────────────────────────────────────
  const loadCard = useCallback(async (cards: SessionCard[], idx: number) => {
    if (!engine || !settingsRef.current) return
    const card = cards[idx]
    if (!card) return

    const mode     = pickMode()
    const question = await generateQuestion(card.entity, card.def, mode, engine.adapter, settingsRef.current)
    if (!question) {
      // Skip card with no resolvable answer
      idxRef.current = idx + 1
      if (idx + 1 >= cards.length) {
        dispatch({ type: 'COMPLETE', reviewed: reviewedRef.current, correct: correctRef.current })
      } else {
        await loadCard(cards, idx + 1)
      }
      return
    }
    dispatch({ type: 'SHOW_QUESTION', card, question, idx, total: cards.length })
  }, [engine, pickMode])

  // ── Initialise session ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!engine) return
    ;(async () => {
      try {
        const [settings, allStates] = await Promise.all([getSettings(), getAllCardStates()])
        settingsRef.current = settings
        const cards = await buildSession(engine.adapter, settings, allStates)
        cardsRef.current = cards
        dispatch({ type: 'LOADED', cards })
        if (cards.length > 0) await loadCard(cards, 0)
      } catch (e) {
        console.error('Session load error:', e)
        dispatch({ type: 'ERROR' })
      }
    })()
  }, [engine, loadCard])

  // ── Confirm rating and advance ─────────────────────────────────────────────
  const confirmRating = useCallback(async () => {
    if (phase.kind !== 'revealed') return
    const { card, rating, autoCorrect } = phase

    // Update SM-2 state
    const newState = sm2(card.state, rating as 0|1|2|3|4|5)
    await upsertCardState(newState)

    // Track stats
    reviewedRef.current++
    if (autoCorrect !== null ? autoCorrect : rating >= 3) correctRef.current++

    const nextIdx = idxRef.current + 1
    idxRef.current = nextIdx

    if (nextIdx >= cardsRef.current.length) {
      const result = {
        completedAt:   new Date().toISOString(),
        cardsReviewed: reviewedRef.current,
        cardsCorrect:  correctRef.current,
      }
      await saveLastResult(result)
      await appendSessionHistory(result)
      dispatch({ type: 'COMPLETE', reviewed: result.cardsReviewed, correct: result.cardsCorrect })
    } else {
      await loadCard(cardsRef.current, nextIdx)
    }
  }, [phase, loadCard])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase.kind === 'loading') return (
    <div style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Building session…</div>
  )

  if (phase.kind === 'empty') return (
    <div style={{ maxWidth: '500px' }}>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })} style={{ marginBottom: '20px' }}>
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
          <Button onClick={() => navigate({ to: '/study' })}>Back to Overview</Button>
        </div>
      </div>
    )
  }

  // ── Question + revealed phases ─────────────────────────────────────────────
  const { card, question, idx, total } = phase

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
          <ArrowLeft size={13} /> End Session
        </Button>
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          {idx + 1} / {total}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((idx) / total) * 100}%`, background: 'var(--color-accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatEntityType(card.entity.entityType)}</span>
        <span>·</span>
        <span>{card.def.label}</span>
        <span>·</span>
        <span style={{ fontFamily: 'monospace' }}>{question.mode}</span>
        {card.isNew && <><span>·</span><span style={{ color: 'var(--color-accent)' }}>new</span></>}
      </div>

      {/* Card */}
      <div style={{ padding: '28px 28px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)', minHeight: '160px', marginBottom: '16px' }}>

        {/* IMAGE RECOGNITION — art shown prominently above the prompt */}
        {question.mode === 'image-recognition' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <EntityArt entity={question.entity} width={120} height={190} />
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
            {idxRef.current + 1 >= cardsRef.current.length ? 'Finish Session' : 'Next Card →'}
          </Button>
        </div>
      )}
    </div>
  )
}
