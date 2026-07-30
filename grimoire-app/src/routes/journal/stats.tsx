import { createFileRoute, Link } from '@tanstack/react-router'
import { EntityLink } from '@/components/ui/EntityLink'
import React, { useEffect, useMemo, useState } from 'react'
import type { BaseEntity, Reading } from '@grimoire/core'
import { getAllReadings } from '@/lib/reading-db'
import { useEngineStore } from '@/stores/engine'
import {
  filterReadings,
  filterCardsForAggregation,
  computeCardFrequency,
  computeOrientationTotals,
  computeArcanaCounts,
  computePeriodCounts,
  computeCalendarPeriodCounts,
  computeSignMatches,
  choosePeriodGranularity,
} from '@/lib/reading-stats'
import type {
  TimeRangePreset, SeasonFilter, CardFreqEntry, PeriodCount, FilterContext,
  RetrogradeFilter,
} from '@/lib/reading-stats'
import type { MoonPhaseName } from '@/lib/astro-calc'
import { RETROGRADE_STRIP_PLANETS } from '@/lib/astro-engine'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import type { DeckFilter } from '@/lib/built-in-data'
import { getAllCustomDecks, deckRecordToFilter } from '@/lib/custom-db'
import { useSpreadById } from '@/lib/spread-hooks'
import { CALENDAR_TABS } from '@/lib/calendar-systems'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { ChevronLeft, ChevronDown, ChevronUp, Sparkles, SlidersHorizontal, X } from 'lucide-react'

export const Route = createFileRoute('/journal/stats')({
  component: StatsPage,
})

// ─── Element colours ──────────────────────────────────────────────────────────

const ELEMENT_COLOR: Record<string, string> = {
  fire:    '#e0603a',
  water:   '#4a9cc9',
  air:     '#c9a833',
  earth:   '#6aaa55',
  spirit:  '#9b7cc9',
  aether:  '#9b7cc9',
}

function elementColor(el: string | undefined): string {
  if (!el) return 'var(--color-text-muted)'
  return ELEMENT_COLOR[el.toLowerCase()] ?? 'var(--color-text-muted)'
}

// ─── Tiny reusable primitives ─────────────────────────────────────────────────

function StatBox({ label, value, sub, linkTo }: { label: string; value: string | number; sub?: string; linkTo?: string }) {
  return (
    <div style={{
      padding: '14px 18px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      flex: '1 1 0',
      minWidth: '100px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--color-text)', lineHeight: 1 }}>
        {linkTo ? <EntityLink canonicalName={linkTo} style={{ fontSize: 'inherit', fontWeight: 'inherit', textDecorationColor: 'var(--color-text-subtle)' }}>{value}</EntityLink> : value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 500,
      background: color + '22',
      color: color,
      border: `1px solid ${color}44`,
      lineHeight: '16px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
      {children}
    </h2>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const PRESETS: { id: TimeRangePreset; label: string }[] = [
  { id: '7d',   label: '7 days' },
  { id: '30d',  label: '30 days' },
  { id: '90d',  label: '3 months' },
  { id: '365d', label: '1 year' },
  { id: 'all',  label: 'All time' },
]

const SEASONS: { id: SeasonFilter; label: string }[] = [
  { id: 'all',    label: 'All' },
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
]

const REVERSAL_OPTIONS: { id: 'all' | 'yes' | 'no'; label: string }[] = [
  { id: 'all', label: 'All decks' },
  { id: 'yes', label: 'Reversible' },
  { id: 'no',  label: 'Non-reversible' },
]

// Ids match suitGroupFor's normalised output in reading-stats.ts — Pentacles/
// Discs/Coins are the same Earth suit under different decks' naming (Thoth
// spells it "disks"), and "Major Arcana" is included as if it were a fifth
// suit since users think of it the same way ("just show me the Majors").
const SUIT_OPTIONS: { id: string; label: string }[] = [
  { id: 'wands',     label: 'Wands' },
  { id: 'cups',      label: 'Cups' },
  { id: 'swords',    label: 'Swords' },
  { id: 'pentacles', label: 'Pentacles / Discs / Coins' },
  { id: 'major',     label: 'Major Arcana' },
]

const MOON_PHASE_OPTIONS: { id: MoonPhaseName; label: string }[] = [
  { id: 'New Moon',        label: 'New' },
  { id: 'Waxing Crescent', label: 'Waxing Crescent' },
  { id: 'First Quarter',   label: 'First Quarter' },
  { id: 'Waxing Gibbous',  label: 'Waxing Gibbous' },
  { id: 'Full Moon',       label: 'Full' },
  { id: 'Waning Gibbous',  label: 'Waning Gibbous' },
  { id: 'Last Quarter',    label: 'Last Quarter' },
  { id: 'Waning Crescent', label: 'Waning Crescent' },
]

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '2px' }}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: value === o.id ? 600 : 400,
            background: value === o.id ? 'var(--color-accent)' : 'transparent',
            color: value === o.id ? '#fff' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const linkButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontSize: '11px', fontFamily: 'inherit', color: 'var(--color-text-subtle)',
}

/** A MultiToggle filter section with a label and Select All / Clear All —
 * "select all" fills with every currently-visible option's id (not some fixed
 * list), so it stays correct as deck/spread options load in asynchronously. */
function MultiSelectFilterSection<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  selected: T[]
  onChange: (ids: T[]) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onChange(options.map(o => o.id))} style={linkButtonStyle}>Select all</button>
          <button onClick={() => onChange([])} style={linkButtonStyle}>Clear</button>
        </div>
      </div>
      <MultiToggle
        options={options}
        selected={selected}
        onToggle={id => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])}
      />
    </div>
  )
}

/** Non-exclusive pill toggles — for filter dimensions where more than one
 * value can be selected at once (deck, spread, suit, moon phase). Empty
 * selection means "no filter" throughout this page's filter state. */
function MultiToggle<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { id: T; label: string }[]
  selected: T[]
  onToggle: (id: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {options.map(o => {
        const active = selected.includes(o.id)
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            style={{
              padding: '4px 10px', fontSize: '11px', fontFamily: 'inherit',
              border: '1px solid', borderRadius: '4px', cursor: 'pointer',
              borderColor: active ? 'var(--color-accent-muted)' : 'var(--color-border)',
              background: active ? 'rgba(180,156,90,0.15)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Orientation split bar ────────────────────────────────────────────────────

function OrientationBar({ upright, reversed, none }: { upright: number; reversed: number; none: number }) {
  const total = upright + reversed + none
  if (total === 0) return <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No data</span>
  const uprightPct  = (upright  / total) * 100
  const reversedPct = (reversed / total) * 100
  const nonePct     = (none     / total) * 100

  return (
    <div>
      <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden', gap: '2px' }}>
        {upright > 0 && (
          <div style={{ width: `${uprightPct}%`, background: 'var(--color-accent)', transition: 'width 0.3s' }} title={`Upright: ${upright}`} />
        )}
        {reversed > 0 && (
          <div style={{ width: `${reversedPct}%`, background: '#c05040', transition: 'width 0.3s' }} title={`Reversed: ${reversed}`} />
        )}
        {none > 0 && (
          <div style={{ width: `${nonePct}%`, background: 'var(--color-border)', transition: 'width 0.3s' }} title={`No orientation: ${none}`} />
        )}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{uprightPct.toFixed(0)}%</span> upright ({upright})</span>
        {reversed > 0 && <span><span style={{ color: '#c05040', fontWeight: 600 }}>{reversedPct.toFixed(0)}%</span> reversed ({reversed})</span>}
        {none > 0 && <span>{nonePct.toFixed(0)}% no orientation ({none})</span>}
      </div>
    </div>
  )
}

function ArcanaBar({ major, minor, other }: { major: number; minor: number; other: number }) {
  const total = major + minor + other
  if (total === 0) return <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No data</span>
  const majorPct = (major / total) * 100
  const minorPct = (minor / total) * 100
  const otherPct = (other / total) * 100

  return (
    <div>
      <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden', gap: '2px' }}>
        {major > 0 && <div style={{ width: `${majorPct}%`, background: '#9b7cc9', transition: 'width 0.3s' }} title={`Major: ${major}`} />}
        {minor > 0 && <div style={{ width: `${minorPct}%`, background: 'var(--color-accent)', opacity: 0.7, transition: 'width 0.3s' }} title={`Minor: ${minor}`} />}
        {other > 0 && <div style={{ width: `${otherPct}%`, background: 'var(--color-border)', transition: 'width 0.3s' }} title={`Other: ${other}`} />}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        {major > 0 && <span><span style={{ color: '#9b7cc9', fontWeight: 600 }}>{majorPct.toFixed(0)}%</span> major ({major})</span>}
        {minor > 0 && <span><span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{minorPct.toFixed(0)}%</span> minor ({minor})</span>}
        {other > 0 && <span>{otherPct.toFixed(0)}% other ({other})</span>}
      </div>
    </div>
  )
}

// ─── Time-series SVG chart ────────────────────────────────────────────────────

function TimeSeriesChart({ periods }: { periods: PeriodCount[] }) {
  if (!periods.length) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No readings in this range.</div>
  }

  const maxCount = Math.max(...periods.map(p => p.count), 1)
  const chartH   = 80
  const labelH   = 20
  const barGap   = 3
  // Minimum bar width 8px; aim for natural width
  const barCount = periods.length
  const totalW   = 580
  const barW     = Math.max(8, Math.floor((totalW - barGap * (barCount - 1)) / barCount))
  const svgW     = barCount * (barW + barGap) - barGap

  // Show labels every N bars to avoid overlap
  const labelEvery = barCount <= 14 ? 1 : barCount <= 30 ? 2 : barCount <= 60 ? 4 : 7

  return (
    <svg
      viewBox={`0 0 ${svgW} ${chartH + labelH + 4}`}
      style={{ width: '100%', height: 'auto', maxHeight: '140px', display: 'block' }}
      aria-label="Readings over time"
    >
      {periods.map((p, i) => {
        const x   = i * (barW + barGap)
        const h   = p.count === 0 ? 0 : Math.max(2, Math.round((p.count / maxCount) * chartH))
        const y   = chartH - h
        const mid = x + barW / 2
        return (
          <g key={p.label}>
            <rect
              x={x} y={y} width={barW} height={h || 1}
              fill={p.count > 0 ? 'var(--color-accent)' : 'var(--color-border)'}
              opacity={p.count > 0 ? 0.85 : 0.25}
              rx={2}
            />
            {i % labelEvery === 0 && (
              <text
                x={mid}
                y={chartH + labelH}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-muted)"
              >
                {p.label}
              </text>
            )}
            {/* count tooltip on hover via title */}
            <title>{p.label}: {p.count} reading{p.count !== 1 ? 's' : ''}</title>
          </g>
        )
      })}
      {/* max-value grid line */}
      <line x1={0} y1={0.5} x2={svgW} y2={0.5} stroke="var(--color-border)" strokeWidth={0.5} />
      <text x={0} y={9} fontSize="8" fill="var(--color-text-muted)">{maxCount}</text>
    </svg>
  )
}

// ─── Card frequency list ──────────────────────────────────────────────────────

function CardFrequencyList({
  entries, maxCount, signMatchByCanonicalName,
}: {
  entries: CardFreqEntry[]
  maxCount: number
  /** canonicalName → unique matched-planet display names, unioned across every
   * draw of that card in the current filtered set (see computeSignMatches). */
  signMatchByCanonicalName: Map<string, Set<string>>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {entries.map((e, i) => {
        const barPct      = maxCount > 0 ? (e.count / maxCount) * 100 : 0
        const total       = e.upright + e.reversed
        const uprightPct  = total > 0 ? (e.upright  / total) * 100 : 100
        const reversedPct = total > 0 ? (e.reversed / total) * 100 : 0
        const hasOrient   = (e.upright + e.reversed) > 0
        const matchedPlanets = new Set<string>()
        for (const cn of e.canonicalNames) {
          for (const p of signMatchByCanonicalName.get(cn) ?? []) matchedPlanets.add(p)
        }

        return (
          <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
            {/* rank */}
            <span style={{ width: '22px', textAlign: 'right', color: 'var(--color-text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}.
            </span>

            {/* name — linked when the row is a single card (not a grouped
                archetype spanning several decks' canonical names, which has
                no one entity to link to) */}
            {e.canonicalNames.length === 1 ? (
              <EntityLink
                canonicalName={e.canonicalNames[0]}
                title={e.displayName}
                style={{ width: '160px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}
              >
                {e.displayName}
              </EntityLink>
            ) : (
              <span style={{ width: '160px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }} title={e.displayName}>
                {e.displayName}
              </span>
            )}

            {/* frequency bar + upright/reversed split */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              {/* main bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${barPct}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '4px', transition: 'width 0.25s' }} />
              </div>
              {/* upright/reversed mini-bar */}
              {hasOrient && (
                <div style={{ width: `${barPct}%`, height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${uprightPct}%`, height: '100%', background: 'var(--color-accent)', opacity: 0.6 }} />
                  <div style={{ width: `${reversedPct}%`, height: '100%', background: '#c05040', opacity: 0.7 }} />
                </div>
              )}
            </div>

            {/* count */}
            <span style={{ width: '28px', textAlign: 'right', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {e.count}
            </span>

            {/* U/R breakdown */}
            {hasOrient && (
              <span style={{ width: '60px', color: 'var(--color-text-muted)', flexShrink: 0, fontSize: '10px' }}>
                <span style={{ color: 'var(--color-accent)' }}>↑{e.upright}</span>
                {e.reversed > 0 && <span style={{ color: '#c05040' }}> ↓{e.reversed}</span>}
              </span>
            )}

            {/* badges */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {e.element && (
                <Pill color={elementColor(e.element)}>{e.element}</Pill>
              )}
              {e.astrological && (
                <Pill color={e.astrological.kind === 'sign' ? '#9b7cc9' : 'var(--color-text-muted)'}>
                  {e.astrological.display}
                </Pill>
              )}
              {matchedPlanets.size > 0 && (
                <Pill color="#d9b23c">
                  <Sparkles size={9} style={{ verticalAlign: '-1px', marginRight: '2px' }} />
                  {Array.from(matchedPlanets).join(', ')}
                </Pill>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function StatsPage() {
  const { engine } = useEngineStore()
  const { astrologyMode } = loadTraditionSettings()
  const spreadsById = useSpreadById()

  // Raw data
  const [allReadings, setAllReadings] = useState<Reading[]>([])
  const [loading, setLoading]         = useState(true)
  const [entityMap, setEntityMap]     = useState<Map<string, BaseEntity>>(new Map())
  const [deckFilters, setDeckFilters] = useState<Map<string, DeckFilter>>(
    new Map(BUILT_IN_DECK_FILTERS.map(d => [d.id, d])),
  )

  // Filter state
  const [preset,            setPreset]            = useState<TimeRangePreset>('all')
  const [season,             setSeason]             = useState<SeasonFilter>('all')
  const [groupEquiv,         setGroupEquiv]         = useState(false)
  const [splitByOrientation, setSplitByOrientation] = useState(false)
  const [showAllCards,       setShowAllCards]       = useState(false)
  const [deckIds,            setDeckIds]            = useState<string[]>([])
  const [spreadIds,          setSpreadIds]          = useState<string[]>([])
  const [suits,              setSuits]              = useState<string[]>([])
  const [reversalCapable,    setReversalCapable]    = useState<'all' | 'yes' | 'no'>('all')
  const [moonPhases,         setMoonPhases]         = useState<MoonPhaseName[]>([])
  const [retrograde,         setRetrograde]         = useState<RetrogradeFilter>('all')
  const [signMatchOnly,      setSignMatchOnly]      = useState(false)
  const [calendarId,         setCalendarId]         = useState('gregorian')
  const [filterOpen,         setFilterOpen]         = useState(false)

  const activeFilterCount =
    deckIds.length + spreadIds.length + suits.length + moonPhases.length +
    (reversalCapable !== 'all' ? 1 : 0) +
    (retrograde !== 'all' ? 1 : 0) +
    (signMatchOnly ? 1 : 0)

  const clearAllFilters = () => {
    setDeckIds([]); setSpreadIds([]); setSuits([]); setMoonPhases([])
    setReversalCapable('all'); setRetrograde('all'); setSignMatchOnly(false)
  }

  const deckOptions = useMemo(
    () => Array.from(deckFilters.values()).map(d => ({ id: d.id, label: d.displayName })),
    [deckFilters],
  )
  const spreadOptions = useMemo(
    () => Array.from(spreadsById.values()).map(s => ({ id: s.id, label: s.displayName })),
    [spreadsById],
  )
  const retrogradeOptions = [
    { id: 'any', label: 'Any planet retrograde' },
    ...RETROGRADE_STRIP_PLANETS.map(p => ({ id: p.canonicalName, label: p.name })),
  ]

  // Load readings once
  useEffect(() => {
    getAllReadings()
      .then(r => setAllReadings(r))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Merge built-in + custom decks once (custom decks load async; built-ins are
  // available immediately so the filter UI isn't empty while that resolves)
  useEffect(() => {
    getAllCustomDecks()
      .then(records => {
        const merged = new Map<string, DeckFilter>(BUILT_IN_DECK_FILTERS.map(d => [d.id, d]))
        for (const r of records) merged.set(r.id, deckRecordToFilter(r))
        setDeckFilters(merged)
      })
      .catch(console.error)
  }, [])

  // Batch-load entities for every card appearing in ANY reading (not just the
  // currently-filtered slice) — suit/sign-correspondence filters need entity
  // data to decide what's *in* the filtered slice in the first place, so the
  // old "only fetch what's already filtered" optimisation doesn't work anymore.
  useEffect(() => {
    if (!engine || !allReadings.length) return
    const names = new Set<string>()
    for (const r of allReadings) for (const c of r.cards) names.add(c.cardCanonicalName)

    Promise.all(
      Array.from(names).map(n =>
        engine.adapter.getEntityByCanonicalName(n).then(e => [n, e] as const)
      )
    ).then(pairs => {
      const m = new Map<string, BaseEntity>()
      for (const [n, e] of pairs) if (e) m.set(n, e)
      setEntityMap(m)
    }).catch(console.error)
  }, [engine, allReadings])

  const filterCtx: FilterContext = useMemo(
    () => ({ entityMap, deckFilters, astrologyMode }),
    [entityMap, deckFilters, astrologyMode],
  )

  const statsFilter = useMemo(() => ({
    preset, season, deckIds, spreadIds, suits, reversalCapable, moonPhases, retrograde, signMatchOnly,
  }), [preset, season, deckIds, spreadIds, suits, reversalCapable, moonPhases, retrograde, signMatchOnly])

  // Derive filtered slice
  const filtered = useMemo(
    () => filterReadings(allReadings, statsFilter, filterCtx),
    [allReadings, statsFilter, filterCtx],
  )

  // suit and signMatchOnly are per-*card* filters, not per-reading — filtered
  // only decides which readings are in play at all (a reading counts as "has
  // Swords" if even one card is a Sword). cardsForAggregation additionally
  // narrows each included reading's own cards down to the ones actually
  // matching, so a Swords+Cups+Pentacles spread that passed because of its one
  // Swords card doesn't still contribute its Cups/Pentacles cards to Card
  // Frequency. Everything that counts *cards* (frequency, orientation, arcana
  // split, sign matches, "Cards drawn") reads from this; "Readings" and the
  // time-series chart count *readings* and correctly stay on `filtered`.
  const cardsForAggregation = useMemo(
    () => filterCardsForAggregation(filtered, statsFilter, entityMap, astrologyMode),
    [filtered, statsFilter, entityMap, astrologyMode],
  )

  // Derived stats
  const cardFreq     = useMemo(() => computeCardFrequency(cardsForAggregation, entityMap, groupEquiv, splitByOrientation), [cardsForAggregation, entityMap, groupEquiv, splitByOrientation])
  const orientation  = useMemo(() => computeOrientationTotals(cardsForAggregation), [cardsForAggregation])
  const arcana       = useMemo(() => computeArcanaCounts(cardFreq), [cardFreq])
  const signMatches  = useMemo(() => computeSignMatches(cardsForAggregation, entityMap, astrologyMode), [cardsForAggregation, entityMap, astrologyMode])
  const granularity  = choosePeriodGranularity(preset)
  const activeCalendar = calendarId === 'gregorian' ? null : (CALENDAR_TABS.find(t => t.id === calendarId)?.system ?? null)
  const periods       = useMemo(
    () => computeCalendarPeriodCounts(filtered, statsFilter, activeCalendar),
    [filtered, statsFilter, activeCalendar],
  )

  const signMatchByCanonicalName = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const match of signMatches) {
      const set = m.get(match.cardCanonicalName) ?? new Set<string>()
      for (const p of match.matchedPlanets) set.add(p)
      m.set(match.cardCanonicalName, set)
    }
    return m
  }, [signMatches])

  const totalCards = cardsForAggregation.reduce((s, r) => s + r.cards.length, 0)
  const topCard    = cardFreq[0]

  const displayedCards = showAllCards ? cardFreq : cardFreq.slice(0, 20)
  const maxFreq        = cardFreq[0]?.count ?? 1

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 0' }}>Loading…</div>
  }

  return (
    <div style={{ maxWidth: '780px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link
          to="/journal"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          <ChevronLeft size={14} /> Journal
        </Link>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <h1 style={{ fontSize: '18px', fontWeight: 300, margin: 0 }}>Reading Statistics</h1>
      </div>

      {/* Filter controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: filterOpen ? '14px' : '24px' }}>
        <SegmentedControl options={PRESETS}  value={preset}  onChange={setPreset} />
        <SegmentedControl options={SEASONS}  value={season}  onChange={setSeason} />
        <button
          onClick={() => setFilterOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', borderRadius: '6px',
            background: (filterOpen || activeFilterCount > 0) ? 'rgba(180,156,90,0.1)' : 'var(--color-surface-2)',
            border: `1px solid ${(filterOpen || activeFilterCount > 0) ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
            color: (filterOpen || activeFilterCount > 0) ? 'var(--color-accent)' : 'var(--color-text-subtle)',
          }}
        >
          <SlidersHorizontal size={13} /> More filters
          {activeFilterCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '8px',
              background: 'var(--color-accent)', color: 'var(--color-accent-contrast)', fontSize: '10px', fontWeight: 600,
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {filterOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 18px', marginBottom: '24px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          {deckOptions.length > 0 && (
            <MultiSelectFilterSection label="Deck" options={deckOptions} selected={deckIds} onChange={setDeckIds} />
          )}
          {spreadOptions.length > 0 && (
            <MultiSelectFilterSection label="Spread" options={spreadOptions} selected={spreadIds} onChange={setSpreadIds} />
          )}
          <MultiSelectFilterSection label="Suit" options={SUIT_OPTIONS} selected={suits} onChange={setSuits} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reversibility</div>
            <SegmentedControl options={REVERSAL_OPTIONS} value={reversalCapable} onChange={setReversalCapable} />
          </div>
          <MultiSelectFilterSection label="Moon phase at time of reading" options={MOON_PHASE_OPTIONS} selected={moonPhases} onChange={setMoonPhases} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Retrograde at time of reading</div>
            <select
              value={retrograde}
              onChange={e => setRetrograde(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px',
                background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
                outline: 'none', colorScheme: 'dark',
              }}
            >
              <option value="all">All readings</option>
              {retrogradeOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={signMatchOnly}
              onChange={e => setSignMatchOnly(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            Only readings with a sign-correspondence match
          </label>
        </div>
      )}

      {/* Summary boxes */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatBox label="Readings"    value={filtered.length} />
        <StatBox label="Cards drawn" value={totalCards} />
        <StatBox
          label="Upright / Reversed"
          value={orientation.upright + orientation.reversed > 0
            ? `${Math.round((orientation.upright / (orientation.upright + orientation.reversed)) * 100)}% / ${Math.round((orientation.reversed / (orientation.upright + orientation.reversed)) * 100)}%`
            : '—'}
        />
        <StatBox
          label="Major / Minor"
          value={arcana.major + arcana.minor > 0
            ? `${Math.round((arcana.major / (arcana.major + arcana.minor)) * 100)}% / ${Math.round((arcana.minor / (arcana.major + arcana.minor)) * 100)}%`
            : '—'}
          sub={arcana.major + arcana.minor > 0 ? `${arcana.major} major · ${arcana.minor} minor` : undefined}
        />
        <StatBox
          label="Top card"
          value={topCard?.displayName ?? '—'}
          sub={topCard ? `${topCard.count} draw${topCard.count !== 1 ? 's' : ''}` : undefined}
          linkTo={topCard?.canonicalNames.length === 1 ? topCard.canonicalNames[0] : undefined}
        />
        <StatBox
          label="Sign matches"
          value={signMatches.length}
          sub={totalCards > 0 ? `${Math.round((signMatches.length / totalCards) * 100)}% of draws` : undefined}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '20px 0' }}>
          No readings match the current filter.
        </div>
      ) : (
        <>
          {/* Readings over time */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <SectionHeading>
                Readings over time
                <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '6px', fontSize: '11px' }}>
                  by {granularity}
                </span>
              </SectionHeading>
              {/* Calendar choice only affects month-granularity labels — a day is
                  a day in every calendar, so hide the picker when it'd be a no-op
                  (7d/30d/90d presets, which bucket by day/week). */}
              {granularity === 'month' && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setCalendarId('gregorian')}
                    style={{
                      padding: '3px 9px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
                      border: '1px solid', borderRadius: '4px',
                      borderColor: calendarId === 'gregorian' ? 'var(--color-accent-muted)' : 'var(--color-border)',
                      background: calendarId === 'gregorian' ? 'rgba(180,156,90,0.15)' : 'transparent',
                      color: calendarId === 'gregorian' ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                    }}
                  >
                    Gregorian
                  </button>
                  {CALENDAR_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCalendarId(tab.id)}
                      style={{
                        padding: '3px 9px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
                        border: '1px solid', borderRadius: '4px',
                        borderColor: calendarId === tab.id ? 'var(--color-accent-muted)' : 'var(--color-border)',
                        background: calendarId === tab.id ? 'rgba(180,156,90,0.15)' : 'transparent',
                        color: calendarId === tab.id ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                      }}
                    >
                      {tab.emoji} {tab.tabLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <TimeSeriesChart periods={periods} />
          </section>

          {/* Orientation breakdown */}
          <section style={{ marginBottom: '32px' }}>
            <SectionHeading>Orientation breakdown</SectionHeading>
            <OrientationBar {...orientation} />
            {(arcana.major + arcana.minor) > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Major / Minor arcana</div>
                <ArcanaBar {...arcana} />
              </div>
            )}
          </section>

          {/* Card frequency */}
          <section style={{ marginBottom: '32px' }}>
            <SectionHeading>
              Card frequency
              <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '6px', fontSize: '11px' }}>
                {cardFreq.length} unique {groupEquiv ? 'archetypes' : 'cards'}
              </span>
            </SectionHeading>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={groupEquiv}
                  onChange={e => setGroupEquiv(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                Group equivalent cards
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={splitByOrientation}
                  onChange={e => setSplitByOrientation(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                Split by orientation (compare with/without reversals)
              </label>
            </div>

            {cardFreq.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No cards found.</div>
            ) : (
              <>
                <CardFrequencyList entries={displayedCards} maxCount={maxFreq} signMatchByCanonicalName={signMatchByCanonicalName} />
                {cardFreq.length > 20 && (
                  <button
                    onClick={() => setShowAllCards(s => !s)}
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: 'var(--color-accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showAllCards
                      ? <><ChevronUp size={13} /> Show top 20</>
                      : <><ChevronDown size={13} /> Show all {cardFreq.length} cards</>}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
