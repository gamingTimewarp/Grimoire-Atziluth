import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { GrimoireEngine } from '@grimoire/core'
import { useEngineStore } from '@/stores/engine'
import { useStudyStore } from '@/stores/study'
import {
  getLastResult, getAllCardStates,
  getStreak, getSessionHistory,
  getStudyPreset, DEFAULT_PRESET_ID,
} from '@/lib/quiz-db'
import type { LastResult, QuizSettings, SessionHistoryEntry, CardState } from '@/lib/quiz-db'
import {
  countDueCards, getProgressStats, getEntityProgressList,
  discoverGroupOverviews, groupByNamespace, TAROT_DECK_OPTIONS,
} from '@/lib/quiz-engine'
import type { EntityTypeStats, EntityProgressRow, GroupOverview, NamespaceGroup, TarotDeckOption } from '@/lib/quiz-engine'
import { Button } from '@/components/ui/Button'
import { EntityLink } from '@/components/ui/EntityLink'
import { Settings2, PlayCircle } from 'lucide-react'

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

function EntityProgressRowView({ row }: { row: EntityProgressRow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <EntityLink canonicalName={row.entity.canonicalName} style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
        {row.entity.primaryDisplayName}
      </EntityLink>
      <span style={{ fontSize: '11px', color: row.due > 0 ? 'var(--color-accent)' : 'var(--color-text-subtle)', flexShrink: 0 }}>
        {row.due > 0 ? `${row.due}/${row.total} due` : row.nextDue ? `next ${row.nextDue}` : `${row.total}/${row.total} mature`}
      </span>
    </div>
  )
}

/** tarot.card spans several decks under one entityType (RWS/Thoth/TdM/Etteilla/
 * Lenormand/Playing Cards) — without this, expanding "Cards" dumps 400+ entities
 * from every deck into one flat alphabetical list. Splits by the same deck tags
 * TAROT_DECK_OPTIONS/fetchQuizEntities already use, so each deck becomes its own
 * collapsible, independently-sorted group, mirroring the preset builder's own
 * per-deck breakdown for this exact entity type. */
function DeckSubgroup({ deck, rows }: { deck: TarotDeckOption; rows: EntityProgressRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const due = rows.reduce((sum, r) => sum + r.due, 0)
  return (
    <div>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', fontSize: '9px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
          {deck.label} <span style={{ color: 'var(--color-text-subtle)' }}>({rows.length})</span>
        </span>
        <span style={{ fontSize: '10px', color: due > 0 ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}>
          {due > 0 ? `${due} due` : 'caught up'}
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: '4px', paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '220px', overflowY: 'auto' }}>
          {rows.map(r => <EntityProgressRowView key={r.entity.canonicalName} row={r} />)}
        </div>
      )}
    </div>
  )
}

function EntityTypeRow({ stat, engine, settings, allStates }: {
  stat: EntityTypeStats
  engine: GrimoireEngine
  settings: QuizSettings
  allStates: Map<string, CardState>
}) {
  const { breakdown, total, due } = stat
  const cats = (['new', 'learning', 'review', 'mature'] as const)
  const [expanded, setExpanded] = useState(false)
  const [rows, setRows] = useState<EntityProgressRow[] | null>(null)

  useEffect(() => {
    if (!expanded || rows !== null) return
    getEntityProgressList(engine.adapter, stat.entityType, settings, allStates).then(setRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const deckGroups = stat.entityType === 'tarot.card' && rows
    ? TAROT_DECK_OPTIONS
        .map(deck => ({ deck, rows: rows.filter(r => r.entity.tags.includes(deck.tag)) }))
        .filter(g => g.rows.length > 0)
    : null

  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', fontSize: '10px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
          {stat.label}
        </span>
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
      {expanded && (
        <div style={{ marginTop: '8px', paddingLeft: '15px' }}>
          {rows === null ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>No enabled question types for this entity type.</div>
          ) : deckGroups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {deckGroups.map(({ deck, rows: deckRows }) => (
                <DeckSubgroup key={deck.id} deck={deck} rows={deckRows} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '220px', overflowY: 'auto' }}>
              {rows.map(r => <EntityProgressRowView key={r.entity.canonicalName} row={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Groups entity types by tradition namespace (same groupByNamespace used by
 * the preset builder's "Entity Types & Fields" section) so the dashboard
 * mirrors that structure — e.g. Qabalah's Sephiroth/Qliphoth/Paths collapse
 * under one "Qabalah" header instead of sitting as three flat top-level rows. */
function ProgressGroupRow({ group, engine, settings, allStates, expanded, onToggle }: {
  group: NamespaceGroup<EntityTypeStats>
  engine: GrimoireEngine
  settings: QuizSettings
  allStates: Map<string, CardState>
  expanded: boolean
  onToggle: () => void
}) {
  const due = group.items.reduce((sum, s) => sum + s.due, 0)
  const total = group.items.reduce((sum, s) => sum + s.total, 0)
  return (
    <div style={{ marginBottom: '14px' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 0', cursor: 'pointer',
          borderBottom: '1px solid var(--color-border)', marginBottom: expanded ? '10px' : '0',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
          {group.overviewCanonicalName ? (
            <EntityLink canonicalName={group.overviewCanonicalName} style={{ fontWeight: 500 }} title={`View ${group.label} in Reference`}>
              {group.label}
            </EntityLink>
          ) : group.label}
        </span>
        <span style={{ fontSize: '11px', color: due > 0 ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}>
          {due > 0 ? `${due} due` : 'all caught up'} · {total} total
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: '4px' }}>
          {group.items.map(s => (
            <EntityTypeRow key={s.entityType} stat={s} engine={engine} settings={settings} allStates={allStates} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function StudyPage() {
  const navigate   = useNavigate()
  const { engine } = useEngineStore()
  const { step: sessionStep } = useStudyStore()

  const [lastResult,   setLastResult]   = useState<LastResult | null>(null)
  const [settings,     setSettings]     = useState<QuizSettings | null>(null)
  const [dueCount,     setDueCount]     = useState<{ due: number; total: number } | null>(null)
  const [streak,       setStreak]       = useState<number>(0)
  const [history,      setHistory]      = useState<SessionHistoryEntry[]>([])
  const [statsPerType, setStatsPerType] = useState<EntityTypeStats[]>([])
  const [cardStates,   setCardStates]   = useState<Map<string, CardState> | null>(null)
  const [groupOverviews, setGroupOverviews] = useState<Map<string, GroupOverview>>(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      const [lr, defaultPreset, states, str, hist, overviews] = await Promise.all([
        getLastResult(),
        getStudyPreset(DEFAULT_PRESET_ID),
        getAllCardStates(),
        getStreak(),
        getSessionHistory(90),
        discoverGroupOverviews(engine.adapter),
      ])
      setGroupOverviews(overviews)
      // The dashboard's aggregate progress reflects the Default preset's scope;
      // other presets' own history is available from the presets page.
      const cfg = defaultPreset?.settings
      if (!cfg) { setLoading(false); return }
      setLastResult(lr)
      setSettings(cfg)
      setCardStates(states)
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

  const groups = useMemo(() => groupByNamespace(statsPerType, groupOverviews), [statsPerType, groupOverviews])
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

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
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study/presets' })}>
          <Settings2 size={13} /> Manage Presets
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
            onClick={() => navigate({ to: sessionStep === 'session' ? '/study/session' : '/study/new' })}
            disabled={sessionStep !== 'session' && dueCount.due === 0}
          >
            <PlayCircle size={15} />
            {sessionStep === 'session' ? 'Resume Session' : dueCount.due > 0 ? 'Start Session' : 'Nothing Due'}
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
            {engine && settings && cardStates && groups.map(g => (
              <ProgressGroupRow
                key={g.key}
                group={g}
                engine={engine}
                settings={settings}
                allStates={cardStates}
                expanded={expandedGroups.has(g.key)}
                onToggle={() => toggleGroup(g.key)}
              />
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
