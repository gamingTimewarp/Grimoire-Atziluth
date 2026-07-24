import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo } from 'react'
import { getNatalChartById } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { getNatalChart, getPlanetPositions, getTransitAspects, formatLongitude, getSignsForMode, ASPECT_DEFS, isDayChart, getMutualReceptions } from '@/lib/astro-engine'
import type { NatalChartData, AstrologyMode, TransitAspect, MutualReception } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { getHomeLocation } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { WheelChart } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { Button } from '@/components/ui/Button'
import { Edit, List, Circle, Radio } from 'lucide-react'

export const Route = createFileRoute('/astrology/$id')({
  component: ChartDetailPage,
})

const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

function ChartDetailPage() {
  const { id }    = Route.useParams()
  const navigate  = useNavigate()
  const [record,       setRecord]      = useState<NatalChartRecord | null>(null)
  const [view,         setView]        = useState<'wheel' | 'table'>('wheel')
  const [loading,      setLoading]     = useState(true)
  const [showTransits, setShowTransits] = useState(false)
  const tradSettings = loadTraditionSettings()
  const astrologyMode: AstrologyMode = tradSettings.astrologyMode
  const houseSystem = tradSettings.houseSystem
  const showNodes = tradSettings.showNodes
  const showModernPlanets = tradSettings.activeTraditions.includes('tradition.modern-astrology')

  useEffect(() => {
    getNatalChartById(id)
      .then(r => { setRecord(r); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [id])

  const chart = useMemo((): NatalChartData | null => {
    if (!record) return null
    const birthDate = zonedTimeToUtc(record.birthDate, record.birthTime ?? '12:00', record.birthTimezone)
    const lat = record.birthLat ?? 0
    const lon = record.birthLon ?? 0
    return getNatalChart(birthDate, lat, lon, houseSystem, astrologyMode, { showNodes, showModernPlanets })
  }, [record])

  // Compute transit chart (current sky) when transit overlay is enabled
  const transitChart = useMemo((): NatalChartData | null => {
    if (!showTransits || !chart) return null
    const loc = getHomeLocation()
    try {
      return getNatalChart(new Date(), loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets })
    } catch { return null }
  }, [showTransits, chart])

  // Transit-to-natal aspects
  const transitAspects = useMemo((): TransitAspect[] => {
    if (!transitChart || !chart) return []
    return getTransitAspects(transitChart.planets, chart.planets, new Date())
  }, [transitChart, chart])

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading…</div>
  if (!record || !chart) return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Chart not found.</div>

  const dateLabel = [
    record.birthDate,
    record.birthTime ?? '(time unknown)',
    record.birthLocationLabel,
  ].filter(Boolean).join(' · ')

  const hasLocation = record.birthLat !== null && record.birthLon !== null

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>{record.name}</h1>
            {record.isSelf && (
              <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(180,156,90,0.15)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', color: 'var(--color-accent)' }}>
                Self
              </span>
            )}
            {chart.sect && (
              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '3px', background: chart.sect === 'day' ? 'rgba(200,180,80,0.12)' : 'rgba(120,120,180,0.12)', color: chart.sect === 'day' ? 'var(--color-accent)' : 'var(--color-text-muted)', border: `1px solid ${chart.sect === 'day' ? 'var(--color-accent-muted)' : 'var(--color-border)'}` }}>
                {chart.sect === 'day' ? '☉ Day chart' : '☽ Night chart'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{dateLabel}</div>
          {!hasLocation && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
              No birth location — house positions unavailable.{' '}
              <span role="button" tabIndex={0} style={{ cursor: 'pointer', color: 'var(--color-accent)' }} onClick={() => navigate({ to: '/astrology/new', search: { edit: id } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/astrology/new', search: { edit: id } }) } }}>
                Add location →
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/astrology/new', search: { edit: id } })}>
            <Edit size={13} /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTransits(v => !v)}
            style={showTransits ? { borderColor: '#c4a44a80', color: '#c4a44a' } : undefined}
          >
            <Radio size={13} /> {showTransits ? 'Transits On' : 'Transits'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView(v => v === 'wheel' ? 'table' : 'wheel')}>
            {view === 'wheel' ? <><List size={13} /> Table</> : <><Circle size={13} /> Wheel</>}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Wheel */}
        {view === 'wheel' && (
          <ZoomableSVGContainer style={{ width: '100%', maxWidth: 460, borderRadius: '8px' }}>
            <WheelChart chart={chart} size={460} mode={astrologyMode} transitChart={transitChart ?? undefined} onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })} />
          </ZoomableSVGContainer>
        )}

        {/* Positions + aspects table (always visible in table view, sidebar in wheel view) */}
        <div style={{ flex: 1, minWidth: '260px' }}>
          <PositionsTable chart={chart} navigate={navigate} compact={view === 'wheel'} hasBirthTime={!!record.birthTime} />
          <AspectsTable chart={chart} navigate={navigate} compact={view === 'wheel'} />
          <MutualReceptionsSection chart={chart} navigate={navigate} />
        </div>
      </div>

      {/* Transit-to-natal aspects */}
      {showTransits && transitAspects.length > 0 && (
        <TransitAspectsTable aspects={transitAspects} navigate={navigate} />
      )}

      {/* Notes */}
      {record.notes && (
        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          {record.notes}
        </div>
      )}
    </div>
  )
}

// ─── Positions table ──────────────────────────────────────────────────────────

function PositionsTable({ chart, navigate, compact, hasBirthTime }: {
  chart: NatalChartData
  navigate: ReturnType<typeof useNavigate>
  compact: boolean
  hasBirthTime: boolean
}) {
  const tradSettings  = loadTraditionSettings()
  const astrologyMode = tradSettings.astrologyMode
  const signs = getSignsForMode(astrologyMode)
  const showAsteroids = tradSettings.activeTraditions.includes('tradition.modern-astrology')

  const sunPos = chart.planets.find(p => p.planet.name === 'Sol')
  const isDay = sunPos ? isDayChart(sunPos.longitude, chart.houses.ascendant) : null

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Planetary Positions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '4px 10px', alignItems: 'center' }}>
        {chart.planets.map(pos => {
          const sign = signs[pos.signIndex]
          return (
            <React.Fragment key={pos.planet.name}>
              <span
                role="button" tabIndex={0}
                style={{ fontSize: '15px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', cursor: 'pointer' }}
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: pos.planet.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: pos.planet.canonicalName } }) } }}
                title={pos.planet.name}
              >{pos.planet.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: pos.planet.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: pos.planet.canonicalName } }) } }}
              >{pos.planet.name}</span>
              <span
                role="button" tabIndex={0}
                style={{ fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } }) } }}
                title={`View ${sign.name} in Reference`}
              >
                {sign.symbol} {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign.name}
              </span>
              <span title={pos.retrograde ? 'Retrograde' : undefined} style={{ fontSize: '11px', color: 'var(--color-danger)', minWidth: '12px' }}>{pos.retrograde ? '℞' : ''}</span>
            </React.Fragment>
          )
        })}
      </div>

      {/* Hermetic Lots */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Hermetic Lots
          {isDay !== null && (
            <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: isDay ? 'rgba(200,180,80,0.12)' : 'rgba(120,120,180,0.12)', color: isDay ? 'var(--color-accent)' : 'var(--color-text-muted)', border: `1px solid ${isDay ? 'var(--color-accent-muted)' : 'var(--color-border)'}` }}>
              {isDay ? '☉ Day chart' : '☽ Night chart'}
            </span>
          )}
        </div>
        {!hasBirthTime ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
            Birth time required to compute lots.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '4px 10px', alignItems: 'center' }}>
            {chart.lots.map(lp => {
              const sign = signs[lp.signIndex]
              return (
                <React.Fragment key={lp.lot.canonicalName}>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '13px', color: 'var(--color-accent)', fontFamily: 'monospace', cursor: 'pointer', minWidth: '20px', textAlign: 'center' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: lp.lot.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: lp.lot.canonicalName } }) } }}
                    title={lp.lot.name}
                  >{lp.lot.symbol}</span>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: lp.lot.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: lp.lot.canonicalName } }) } }}
                  >{lp.lot.name}</span>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign?.canonicalName ?? '' } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign?.canonicalName ?? '' } }) } }}
                    title={sign ? `View ${sign.name} in Reference` : undefined}
                  >
                    {sign?.symbol} {lp.degree}°{String(lp.minutes).padStart(2, '0')}′ {sign?.name}
                  </span>
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Asteroids (Modern Astrology tradition) */}
      {showAsteroids && (() => {
        const asteroidPositions = chart.planets.filter(p => p.planet.canonicalName.startsWith('astrology.minor-body.'))
        if (asteroidPositions.length === 0) return null
        return (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            Asteroids
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '4px 10px', alignItems: 'center' }}>
            {asteroidPositions.map(ap => {
              const sign = signs[ap.signIndex]
              return (
                <React.Fragment key={ap.planet.canonicalName}>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', cursor: 'pointer', minWidth: '20px', textAlign: 'center' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: ap.planet.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: ap.planet.canonicalName } }) } }}
                    title={ap.planet.name}
                  >{ap.planet.symbol}</span>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: ap.planet.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: ap.planet.canonicalName } }) } }}
                  >{ap.planet.name}</span>
                  <span
                    role={sign ? 'button' : undefined} tabIndex={sign ? 0 : undefined}
                    style={{ fontSize: '12px', color: 'var(--color-text)', cursor: sign ? 'pointer' : undefined }}
                    onClick={() => sign && navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } })} onKeyDown={e => { if (sign && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } }) } }}
                    title={sign ? `View ${sign.name} in Reference` : undefined}
                  >
                    {sign?.symbol} {ap.degree}°{String(ap.minutes).padStart(2, '0')}′ {sign?.name}
                  </span>
                </React.Fragment>
              )
            })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '6px', fontStyle: 'italic' }}>
            Positions computed via Keplerian two-body model (~1–3° accuracy).
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ─── Aspects table ────────────────────────────────────────────────────────────

function AspectsTable({ chart, navigate, compact }: { chart: NatalChartData; navigate: ReturnType<typeof useNavigate>; compact: boolean }) {
  const [expanded, setExpanded] = useState(!compact)

  if (chart.aspects.length === 0) return null

  const goToRef = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div>
      <div
        role="button" tabIndex={0}
        style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(ex => !ex) } }}
        aria-expanded={expanded}
      >
        Aspects ({chart.aspects.length}) {expanded ? '▲' : '▼'}
      </div>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chart.aspects.map((asp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet1.canonicalName) } }} title={asp.planet1.name}
              >{asp.planet1.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '18px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => goToRef('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef('astrology.aspect.' + asp.type) } }} title={asp.type}
              >{asp.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet2.canonicalName) } }} title={asp.planet2.name}
              >{asp.planet2.symbol}</span>
              <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet1.canonicalName) } }}>{asp.planet1.name}</span>
                {' '}
                <span
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)' }}
                  onClick={() => goToRef('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef('astrology.aspect.' + asp.type) } }}
                >{asp.type}</span>
                {' '}
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet2.canonicalName) } }}>{asp.planet2.name}</span>
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>{asp.orb}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Transit aspects table ────────────────────────────────────────────────────

const TRANSIT_ASPECT_COLORS: Record<string, string> = {
  conjunction: '#c4a44a',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

// ─── Mutual reception section ─────────────────────────────────────────────────

function MutualReceptionsSection({ chart, navigate }: { chart: NatalChartData; navigate: ReturnType<typeof useNavigate> }) {
  const receptions = getMutualReceptions(chart.planets)
  if (receptions.length === 0) return null

  const goToRef = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        Mutual Reception ({receptions.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {receptions.map((mr, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span
              role="button" tabIndex={0}
              style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
              onClick={() => goToRef(mr.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(mr.planet1.canonicalName) } }} title={mr.planet1.name}
            >{mr.planet1.symbol}</span>
            <span style={{ color: 'var(--color-text-subtle)' }}>⇄</span>
            <span
              role="button" tabIndex={0}
              style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
              onClick={() => goToRef(mr.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(mr.planet2.canonicalName) } }} title={mr.planet2.name}
            >{mr.planet2.symbol}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(mr.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(mr.planet1.canonicalName) } }}>{mr.planet1.name}</span>
              {' '}mutual reception{' '}
              <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(mr.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(mr.planet2.canonicalName) } }}>{mr.planet2.name}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Transit aspects table ────────────────────────────────────────────────────

function TransitAspectsTable({ aspects, navigate }: { aspects: TransitAspect[]; navigate: ReturnType<typeof useNavigate> }) {
  const [expanded, setExpanded] = useState(true)
  const goToRef = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        role="button" tabIndex={0}
        style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(ex => !ex) } }}
        aria-expanded={expanded}
      >
        <span style={{ color: '#c4a44a' }}>Transit</span> Aspects ({aspects.length}) {expanded ? '▲' : '▼'}
      </div>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {aspects.map((asp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span role="button" tabIndex={0} style={{ color: '#c4a44a', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.transitPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.transitPlanet.canonicalName) } }} title={`Transit ${asp.transitPlanet.name}`}
              >{asp.transitPlanet.symbol}</span>
              <span style={{ color: TRANSIT_ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '18px', textAlign: 'center' }}>{asp.symbol}</span>
              <span role="button" tabIndex={0} style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.natalPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.natalPlanet.canonicalName) } }} title={`Natal ${asp.natalPlanet.name}`}
              >{asp.natalPlanet.symbol}</span>
              <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
                <span style={{ color: '#c4a44a' }}>tr.</span> {asp.transitPlanet.name}{' '}
                <span style={{ color: TRANSIT_ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)' }}>{asp.type}</span>{' '}
                natal {asp.natalPlanet.name}
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontSize: '10px' }}>{asp.applying ? '→' : '←'} {asp.orb}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
