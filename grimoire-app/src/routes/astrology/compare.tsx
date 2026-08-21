/**
 * /astrology/compare
 * Overlay any two charts — saved natal charts or the current sky — on one
 * wheel, generalizing the chart detail page's fixed "current sky vs. this
 * one chart" transit overlay to any pair. Chart B renders in the same
 * contrasting colour scheme already used for transits; each side gets its
 * own independent planet-visibility filter.
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Circle, List } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WheelChart } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { AspectsPanel } from '@/components/ui/AspectsPanel'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { PlanetVisibilityFilter, toggleInSet, toggleGroupInSet } from '@/components/ui/PlanetVisibilityFilter'
import type { PlanetGroup } from '@/components/ui/PlanetVisibilityFilter'
import { getNatalChart, getSignsForMode, getTransitAspects } from '@/lib/astro-engine'
import type { NatalChartData, PlanetPosition } from '@/lib/astro-engine'
import { getMoonPhase } from '@/lib/astro-calc'
import { listNatalCharts } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { getHomeLocation } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { loadTraditionSettings } from '@/lib/tradition-store'

export const Route = createFileRoute('/astrology/compare')({
  component: ComparePage,
})

const NOW_ID = '__now__'
const CHART_B_COLOR = '#c4a44a'

const selectStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: '4px', padding: '8px 10px',
  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
  borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', cursor: 'pointer', colorScheme: 'dark',
}

interface ChartOption {
  chart: NatalChartData
  label: string
  date: Date
}

function buildChartOption(id: string, records: NatalChartRecord[]): ChartOption | null {
  const { astrologyMode, houseSystem, showNodes, activeTraditions } = loadTraditionSettings()
  const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')

  if (id === NOW_ID) {
    const loc = getHomeLocation()
    const date = new Date()
    return {
      chart: getNatalChart(date, loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets }),
      label: 'Current Sky',
      date,
    }
  }
  const record = records.find(r => r.id === id)
  if (!record) return null
  const date = zonedTimeToUtc(record.birthDate, record.birthTime ?? '12:00', record.birthTimezone)
  return {
    chart: getNatalChart(date, record.birthLat ?? 0, record.birthLon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets }),
    label: record.name,
    date,
  }
}

function ComparePage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<NatalChartRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [idA, setIdA] = useState<string>(NOW_ID)
  const [idB, setIdB] = useState<string>(NOW_ID)
  const [showWheel, setShowWheel] = useState(true)
  const [showTable, setShowTable] = useState(true)
  const [hiddenA, setHiddenA] = useState<Set<string>>(() => new Set())
  const [hiddenB, setHiddenB] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    listNatalCharts().then(rs => {
      setRecords(rs)
      const self  = rs.find(r => r.isSelf)
      const other = rs.find(r => r.id !== self?.id)
      setIdA(self?.id ?? rs[0]?.id ?? NOW_ID)
      setIdB(other?.id ?? NOW_ID)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const { astrologyMode } = loadTraditionSettings()

  const a = useMemo(() => buildChartOption(idA, records), [idA, records])
  const b = useMemo(() => buildChartOption(idB, records), [idB, records])

  // "Applying/separating" motion is only meaningful when at least one side is the
  // live sky — two fixed saved charts have no motion relative to each other.
  const crossAspects = useMemo(() => {
    if (!a || !b) return []
    const referenceDate = (idA === NOW_ID || idB === NOW_ID) ? new Date() : undefined
    return getTransitAspects(b.chart.planets, a.chart.planets, referenceDate)
  }, [a, b, idA, idB])

  const togglePlanetA = (cn: string) => setHiddenA(prev => toggleInSet(prev, cn))
  const togglePlanetB = (cn: string) => setHiddenB(prev => toggleInSet(prev, cn))
  const toggleGroupA = (group: PlanetGroup, allVisible: boolean) => setHiddenA(prev => toggleGroupInSet(prev, group, allVisible))
  const toggleGroupB = (group: PlanetGroup, allVisible: boolean) => setHiddenB(prev => toggleGroupInSet(prev, group, allVisible))

  const goToRef = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  const chartOptions = [
    { id: NOW_ID, name: 'Current Sky (now)' },
    ...records.map(r => ({ id: r.id, name: r.isSelf ? `${r.name} (You)` : r.name })),
  ]

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link
          to="/astrology"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          <ChevronLeft size={14} /> Astrology
        </Link>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <h1 style={{ fontSize: '18px', fontWeight: 300, margin: 0 }}>Compare Charts</h1>
      </div>

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      ) : (
        <>
          {/* Chart pickers */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <label style={{ flex: 1, minWidth: '200px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Chart A
              <select
                value={idA}
                onChange={e => setIdA(e.target.value)}
                style={selectStyle}
              >
                {chartOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: '200px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Chart B
              <select
                value={idB}
                onChange={e => setIdB(e.target.value)}
                style={selectStyle}
              >
                {chartOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          </div>

          {!a || !b ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Pick a chart for both A and B to compare.</div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--color-text)', display: 'inline-block' }} />
                  A — {a.label}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: CHART_B_COLOR, display: 'inline-block' }} />
                  B — {b.label}
                </span>
              </div>

              {/* Per-chart visibility */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <CollapsibleSection header={<>Chart A Visibility</>} defaultOpen={false}>
                    <PlanetVisibilityFilter hiddenPlanets={hiddenA} onTogglePlanet={togglePlanetA} onToggleAll={toggleGroupA} />
                  </CollapsibleSection>
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <CollapsibleSection header={<>Chart B Visibility</>} defaultOpen={false}>
                    <PlanetVisibilityFilter hiddenPlanets={hiddenB} onTogglePlanet={togglePlanetB} onToggleAll={toggleGroupB} />
                  </CollapsibleSection>
                </div>
              </div>

              {/* Wheel/Table toggles */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Button variant="ghost" size="sm" onClick={() => setShowWheel(v => !v)}
                  style={showWheel ? { borderColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' } : undefined}
                >
                  <Circle size={13} /> Wheel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowTable(v => !v)}
                  style={showTable ? { borderColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' } : undefined}
                >
                  <List size={13} /> Table
                </Button>
              </div>

              {showWheel && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <ZoomableSVGContainer style={{ width: '100%', maxWidth: 460, borderRadius: '8px' }}>
                    <WheelChart
                      chart={a.chart}
                      transitChart={b.chart}
                      date={a.date}
                      transitDate={b.date}
                      mode={astrologyMode}
                      hiddenPlanets={hiddenA}
                      hiddenTransitPlanets={hiddenB}
                      overlayLabel={b.label}
                      overlayEqualWeight
                      onNavigate={goToRef}
                    />
                  </ZoomableSVGContainer>
                </div>
              )}

              {showTable && (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                      Chart A — {a.label}
                    </div>
                    <PositionsGrid planets={a.chart.planets} date={a.date} hiddenPlanets={hiddenA} astrologyMode={astrologyMode} onNavigate={goToRef} />
                  </div>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ fontSize: '11px', color: CHART_B_COLOR, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                      Chart B — {b.label}
                    </div>
                    <PositionsGrid planets={b.chart.planets} date={b.date} hiddenPlanets={hiddenB} astrologyMode={astrologyMode} onNavigate={goToRef} />
                  </div>
                </div>
              )}

              <AspectsPanel
                variant="transit"
                aspects={crossAspects
                  .filter(asp => !hiddenB.has(asp.transitPlanet.canonicalName) && !hiddenA.has(asp.natalPlanet.canonicalName))
                  .map(asp => ({ planet1: asp.transitPlanet, planet2: asp.natalPlanet, type: asp.type, symbol: asp.symbol, orb: asp.orb, applying: asp.applying }))}
                planets={b.chart.planets.filter(p => !hiddenB.has(p.planet.canonicalName)).map(p => p.planet)}
                colPlanets={a.chart.planets.filter(p => !hiddenA.has(p.planet.canonicalName)).map(p => p.planet)}
                rowLabel={b.label}
                colLabel={a.label}
                onNavigate={goToRef}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Positions grid ─────────────────────────────────────────────────────────

function PositionsGrid({ planets, date, hiddenPlanets, astrologyMode, onNavigate }: {
  planets: PlanetPosition[]
  date: Date
  hiddenPlanets: Set<string>
  astrologyMode: ReturnType<typeof loadTraditionSettings>['astrologyMode']
  onNavigate: (cn: string) => void
}) {
  const signs = getSignsForMode(astrologyMode)
  const visible = planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName))

  if (visible.length === 0) {
    return <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>Every planet is hidden.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '4px 10px', alignItems: 'center' }}>
      {visible.map(pos => {
        const sign = signs[pos.signIndex]
        const moonPhase = pos.planet.name === 'Luna' ? getMoonPhase(date) : null
        return (
          <React.Fragment key={pos.planet.name}>
            <span
              role="button" tabIndex={0}
              style={{ fontSize: '15px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', cursor: 'pointer' }}
              onClick={() => onNavigate(pos.planet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(pos.planet.canonicalName) } }}
              title={pos.planet.name}
            >{pos.planet.symbol}</span>
            <span
              role="button" tabIndex={0}
              style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              onClick={() => onNavigate(pos.planet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(pos.planet.canonicalName) } }}
            >{pos.planet.name}</span>
            <span
              role="button" tabIndex={0}
              style={{ fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}
              onClick={() => onNavigate(sign.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(sign.canonicalName) } }}
              title={`View ${sign.name} in Reference`}
            >
              {sign.symbol} {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign.name}
              {moonPhase && (
                <span
                  role="button" tabIndex={0}
                  style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}
                  onClick={e => { e.stopPropagation(); onNavigate(moonPhase.canonicalName) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onNavigate(moonPhase.canonicalName) } }}
                  title={`View ${moonPhase.name} in Reference`}
                >
                  {moonPhase.emoji} {moonPhase.name} · {moonPhase.illumination}% lit
                </span>
              )}
            </span>
            <span title={pos.retrograde ? 'Retrograde' : undefined} style={{ fontSize: '11px', color: 'var(--color-danger)', minWidth: '12px' }}>{pos.retrograde ? '℞' : ''}</span>
          </React.Fragment>
        )
      })}
    </div>
  )
}
