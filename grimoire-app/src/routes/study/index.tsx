import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import {
  getSettings, getLastResult, getAllCardStates,
  getStreak, getSessionHistory,
} from '@/lib/quiz-db'
import type { LastResult, QuizSettings, SessionHistoryEntry } from '@/lib/quiz-db'
import {
  countDueCards, getProgressStats,
} from '@/lib/quiz-engine'
import type { EntityTypeStats } from '@/lib/quiz-engine'
import { Button } from '@/components/ui/Button'
import { Settings, PlayCircle } from 'lucide-react'

export const Route = createFileRoute('/study/')({
  component: StudyPage,
})

// ─── Colour palette for SM-2 state categories ──────────────────────────────────

const CAT_COLOR = {
  new:      'var(--color-text-subtle)',
  learning: '#c4922a',
  review:   '#7ab0d0',
  mature:   '#5a9a6a',
} as const

const CAT_LABEL = {
  new: 'New', learning: 'Learning', review: 'Review', mature: 'Mature',
} as const

// ─── Stacked progress bar ──────────────────────────────────────────────────────

function ProgressBar({ stats }: { stats: EntityTypeStats[] }) {
  const totals = stats.reduce(
    (acc, s) => {
      acc.new      += s.breakdown.new
      acc.learning += s.breakdown.learning
      acc.review   += s.breakdown.review
      acc.mature   += s.breakdown.mature
      return acc
    },
    { new: 0, learning: 0, review: 0, mature: 0 },
  )
  const grand = totals.new + totals.learning + totals.review + totals.mature
  if (grand === 0) return null

  const segments = (['new', 'learning', 'review', 'mature'] as const).map(cat => ({
    cat,
    count: totals[cat],
    pct: (totals[cat] / grand) * 100,
  }))

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {segments.map(({ cat, count }) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: CAT_COLOR[cat], flexShrink: 0 }} />
            <span style={{ color: CAT_COLOR[cat] }}>{count}</span>
            <span>{CAT_LABEL[cat]}</span>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--color-surface-1)' }}>
        {segments.filter(s => s.pct > 0).map(({ cat, pct }) => (
          <div
            key={cat}
            style={{ width: `${pct}%`, background: CAT_COLOR[cat], transition: 'width 0.3s' }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Session sparkline (last 14 days) ─────────────────────────────────────────

function SessionSparkline({ history }: { history: SessionHistoryEntry[] }) {
  // Build a map of YYYY-MM-DD → { reviewed, correct }
  const dayMap = new Map<string, { reviewed: number; correct: number }>()
  for (const h of history) {
    const day = h.completedAt.slice(0, 10)
    const prev = dayMap.get(day) ?? { reviewed: 0, correct: 0 }
    dayMap.set(day, {
      reviewed: prev.reviewed + h.cardsReviewed,
      correct:  prev.correct  + h.cardsCorrect,
    })
  }

  // Build 14 consecutive day slots ending today
  const slots: Array<{ date: string; pct: number | null; reviewed: number }> = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const data = dayMap.get(key)
    slots.push({
      date:     key,
      pct:      data && data.reviewed > 0 ? (data.correct / data.reviewed) * 100 : null,
      reviewed: data?.reviewed ?? 0,
    })
  }

  if (slots.every(s => s.pct === null)) return null

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Last 14 Days
      </div>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '40px' }}>
        {slots.map(slot => (
          <div
            key={slot.date}
            title={slot.pct !== null ? `${slot.date}: ${Math.round(slot.pct)}% accuracy (${slot.reviewed} cards)` : slot.date}
            style={{
              flex: 1,
              height: slot.pct !== null ? `${Math.max(4, slot.pct * 0.4)}px` : '2px',
              background: slot.pct !== null
                ? slot.pct >= 80 ? 'var(--color-accent)'
                  : slot.pct >= 50 ? '#c47a4a'
                  : 'var(--color-danger, #c44)'
                : 'var(--color-border)',
              borderRadius: '2px 2px 0 0',
              opacity: slot.pct !== null ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--color-text-subtle)' }}>
        <span>14d ago</span>
        <span>today</span>
      </div>
    </div>
  )
}

// ─── Entity type rows ─────────────────────────────────────────────────────────

function EntityTypeRow({ stat }: { stat: EntityTypeStats }) {
  const { breakdown, total, due } = stat
  const cats = (['new', 'learning', 'review', 'mature'] as const)

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{stat.label}</span>
        <span style={{ fontSize: '11px', color: due > 0 ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}>
          {due > 0 ? `${due} due` : 'all caught up'} · {total} total
        </span>
      </div>
      <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'var(--color-surface-1)' }}>
        {cats.map(cat => {
          const pct = total > 0 ? (breakdown[cat] / total) * 100 : 0
          return pct > 0 ? (
            <div key={cat} style={{ width: `${pct}%`, background: CAT_COLOR[cat] }} />
          ) : null
        })}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function StudyPage() {
  const navigate   = useNavigate()
  const { engine } = useEngineStore()

  const [lastResult,   setLastResult]   = useState<LastResult | null>(null)
  const [settings,     setSettings]     = useState<QuizSettings | null>(null)
  const [dueCount,     setDueCount]     = useState<{ due: number; total: number } | null>(null)
  const [streak,       setStreak]       = useState<number>(0)
  const [history,      setHistory]      = useState<SessionHistoryEntry[]>([])
  const [statsPerType, setStatsPerType] = useState<EntityTypeStats[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      const [lr, cfg, states, str, hist] = await Promise.all([
        getLastResult(),
        getSettings(),
        getAllCardStates(),
        getStreak(),
        getSessionHistory(90),
      ])
      setLastResult(lr)
      setSettings(cfg)
      setStreak(str)
      setHistory(hist)
      const [counts, perType] = await Promise.all([
        countDueCards(engine.adapter, cfg, states),
        getProgressStats(engine.adapter, cfg, states),
      ])
      setDueCount(counts)
      setStatsPerType(perType)
      setLoading(false)
    })()
  }, [engine])

  const pct = lastResult && lastResult.cardsReviewed > 0
    ? Math.round((lastResult.cardsCorrect / lastResult.cardsReviewed) * 100)
    : null

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Study</h1>
          {streak > 0 && (
            <div style={{ fontSize: '13px', color: 'var(--color-accent)' }}>
              {streak} day streak
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study/settings' })}>
          <Settings size={13} /> Settings
        </Button>
      </div>

      {/* Due count + start */}
      {!loading && dueCount && (
        <div style={{ marginBottom: '20px', padding: '20px 22px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 300, color: dueCount.due > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)', lineHeight: 1 }}>
              {dueCount.due}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
              due · {dueCount.total} total
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: '/study/session' })}
            disabled={dueCount.due === 0}
          >
            <PlayCircle size={15} />
            {dueCount.due > 0 ? 'Start Session' : 'Nothing Due'}
          </Button>
        </div>
      )}

      {loading && (
        <div style={{ padding: '20px 22px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)', marginBottom: '20px' }}>
          Computing progress…
        </div>
      )}

      {/* Progress overview */}
      {statsPerType.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
            Progress
          </div>
          <div style={{ marginBottom: '16px' }}>
            <ProgressBar stats={statsPerType} />
          </div>
          <div>
            {statsPerType.map(s => (
              <EntityTypeRow key={s.entityType} stat={s} />
            ))}
          </div>
        </div>
      )}

      {/* Session history sparkline */}
      {history.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <SessionSparkline history={history} />
        </div>
      )}

      {/* Last session result */}
      {lastResult && pct !== null && (
        <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            Last Session — {new Date(lastResult.completedAt).toLocaleDateString()}
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 300, color: 'var(--color-text)', lineHeight: 1 }}>
                {lastResult.cardsCorrect}/{lastResult.cardsReviewed}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>correct</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 300, lineHeight: 1, color: pct >= 70 ? 'var(--color-accent)' : pct >= 50 ? '#c47a4a' : 'var(--color-danger, #c44)' }}>
                {pct}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>accuracy</div>
            </div>
          </div>
        </div>
      )}

      {!lastResult && !loading && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          No sessions yet. Start a session to begin building your review history.
        </div>
      )}

      {settings && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          Session size: {settings.sessionSize} cards ·{' '}
          {settings.enabledEntityTypes.length} entity types ·{' '}
          {settings.enabledModes.join(', ')}
        </div>
      )}
    </div>
  )
}
