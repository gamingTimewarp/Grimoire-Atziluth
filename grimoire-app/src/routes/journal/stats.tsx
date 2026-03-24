import { createFileRoute, Link } from '@tanstack/react-router'
import React, { useEffect, useMemo, useState } from 'react'
import type { BaseEntity, Reading } from '@grimoire/core'
import { getAllReadings } from '@/lib/reading-db'
import { useEngineStore } from '@/stores/engine'
import {
  filterReadings,
  computeCardFrequency,
  computeOrientationTotals,
  computeArcanaCounts,
  computePeriodCounts,
  choosePeriodGranularity,
} from '@/lib/reading-stats'
import type { TimeRangePreset, SeasonFilter, CardFreqEntry, PeriodCount } from '@/lib/reading-stats'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'

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

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
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
      <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
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

function CardFrequencyList({ entries, maxCount }: { entries: CardFreqEntry[]; maxCount: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {entries.map((e, i) => {
        const barPct      = maxCount > 0 ? (e.count / maxCount) * 100 : 0
        const total       = e.upright + e.reversed
        const uprightPct  = total > 0 ? (e.upright  / total) * 100 : 100
        const reversedPct = total > 0 ? (e.reversed / total) * 100 : 0
        const hasOrient   = (e.upright + e.reversed) > 0

        return (
          <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
            {/* rank */}
            <span style={{ width: '22px', textAlign: 'right', color: 'var(--color-text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}.
            </span>

            {/* name */}
            <span style={{ width: '160px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }} title={e.displayName}>
              {e.displayName}
            </span>

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
                <Pill color="var(--color-text-muted)">{e.astrological}</Pill>
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

  // Raw data
  const [allReadings, setAllReadings] = useState<Reading[]>([])
  const [loading, setLoading]         = useState(true)
  const [entityMap, setEntityMap]     = useState<Map<string, BaseEntity>>(new Map())

  // Filter state
  const [preset,         setPreset]         = useState<TimeRangePreset>('all')
  const [season,         setSeason]         = useState<SeasonFilter>('all')
  const [groupEquiv,     setGroupEquiv]     = useState(false)
  const [showAllCards,   setShowAllCards]   = useState(false)

  // Load readings once
  useEffect(() => {
    getAllReadings()
      .then(r => setAllReadings(r))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Derive filtered slice
  const filtered = useMemo(
    () => filterReadings(allReadings, { preset, season }),
    [allReadings, preset, season],
  )

  // Batch-load entities for all unique canonical names appearing in filtered readings
  useEffect(() => {
    if (!engine || !filtered.length) return
    const names = new Set<string>()
    for (const r of filtered) for (const c of r.cards) names.add(c.cardCanonicalName)

    Promise.all(
      Array.from(names).map(n =>
        engine.adapter.getEntityByCanonicalName(n).then(e => [n, e] as const)
      )
    ).then(pairs => {
      const m = new Map<string, BaseEntity>()
      for (const [n, e] of pairs) if (e) m.set(n, e)
      setEntityMap(m)
    }).catch(console.error)
  }, [engine, filtered])

  // Derived stats
  const cardFreq    = useMemo(() => computeCardFrequency(filtered, entityMap, groupEquiv), [filtered, entityMap, groupEquiv])
  const orientation = useMemo(() => computeOrientationTotals(filtered), [filtered])
  const arcana      = useMemo(() => computeArcanaCounts(cardFreq), [cardFreq])
  const periods     = useMemo(() => computePeriodCounts(filtered, { preset, season }), [filtered, preset, season])
  const granularity = choosePeriodGranularity(preset)

  const totalCards = filtered.reduce((s, r) => s + r.cards.length, 0)
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '24px' }}>
        <SegmentedControl options={PRESETS}  value={preset}  onChange={setPreset} />
        <SegmentedControl options={SEASONS}  value={season}  onChange={setSeason} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={groupEquiv}
            onChange={e => setGroupEquiv(e.target.checked)}
            style={{ accentColor: 'var(--color-accent)' }}
          />
          Group equivalent cards
        </label>
      </div>

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
            <SectionHeading>
              Readings over time
              <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '6px', fontSize: '11px' }}>
                by {granularity}
              </span>
            </SectionHeading>
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

            {cardFreq.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No cards found.</div>
            ) : (
              <>
                <CardFrequencyList entries={displayedCards} maxCount={maxFreq} />
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
