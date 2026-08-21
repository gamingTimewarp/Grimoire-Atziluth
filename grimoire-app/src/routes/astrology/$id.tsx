import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo } from 'react'
import { getNatalChartById } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { getNatalChart, getPlanetPositions, getTransitAspects, formatLongitude, getSignsForMode, isDayChart, getMutualReceptions, formatHouseSystem, HOUSE_NAMES } from '@/lib/astro-engine'
import type { NatalChartData, AstrologyMode, TransitAspect, MutualReception } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { getHomeLocation } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { getMoonPhase } from '@/lib/astro-calc'
import { WheelChart } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { AspectsPanel } from '@/components/ui/AspectsPanel'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { PlanetVisibilityFilter, toggleInSet, toggleGroupInSet } from '@/components/ui/PlanetVisibilityFilter'
import type { PlanetGroup } from '@/components/ui/PlanetVisibilityFilter'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/Button'
import { Edit, List, Circle, Radio, Info, Layers } from 'lucide-react'

export const Route = createFileRoute('/astrology/$id')({
  component: ChartDetailPage,
})

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const SECT_TOOLTIP = "Sect: whether the Sun is above the horizon (day chart) or below it (night chart) at the moment of birth. Hellenistic astrology uses sect to weigh which planets are favoured, how essential dignity is scored, and which formula applies to several Hermetic Lots."

const MUTUAL_RECEPTION_TOOLTIP = "Mutual reception: each planet sits in the sign the other rules (e.g. Mars in Cancer, the Moon in Aries) — the two exchange rulership and each acts as though dignified in its own sign, strengthening one another regardless of their own sign placement."

/** House cusps come back as plain 0–360 ecliptic longitude — split into sign/degree/minutes
 * the same way PlanetPosition already does, so cusps render with the same "12°34′ ♈ Aries"
 * format as everything else in this table. */
function longitudeToSignDegree(lon: number): { signIndex: number; degree: number; minutes: number } {
  const norm = ((lon % 360) + 360) % 360
  let signIndex = Math.floor(norm / 30)
  const inSign = norm - signIndex * 30
  let degree = Math.floor(inSign)
  let minutes = Math.round((inSign - degree) * 60)
  if (minutes === 60) { minutes = 0; degree += 1 }
  if (degree === 30) { degree = 0; signIndex = (signIndex + 1) % 12 }
  return { signIndex, degree, minutes }
}

/** Small (i) link next to a table-section header, to the system.overview entity that
 * the section's own rows are members of (e.g. Hermetic Lots -> system.overview.lots).
 * Always nested inside a CollapsibleSection's clickable header, so its own click must
 * stop propagation or it'd also toggle the section instead of navigating. */
function SectionInfoLink({ canonicalName, label, navigate }: {
  canonicalName: string
  label: string
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <span
      role="button" tabIndex={0}
      title={`View ${label} overview in Reference`}
      style={{ display: 'inline-flex', color: 'var(--color-text-subtle)', cursor: 'pointer' }}
      onClick={e => { e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName } }) }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName } }) } }}
    >
      <Info size={12} />
    </span>
  )
}

function ChartDetailPage() {
  const { id }    = Route.useParams()
  const navigate  = useNavigate()
  const [record,       setRecord]      = useState<NatalChartRecord | null>(null)
  const [showWheel,    setShowWheel]   = useState(true)
  const [showTable,    setShowTable]   = useState(true)
  const [loading,      setLoading]     = useState(true)
  const [showTransits, setShowTransits] = useState(false)
  const [hiddenPlanets, setHiddenPlanets] = useState<Set<string>>(() => new Set())
  const togglePlanet = (cn: string) => setHiddenPlanets(prev => toggleInSet(prev, cn))
  const toggleGroup = (group: PlanetGroup, currentlyAllVisible: boolean) =>
    setHiddenPlanets(prev => toggleGroupInSet(prev, group, currentlyAllVisible))
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

  const birthDate = useMemo((): Date | null => {
    if (!record) return null
    return zonedTimeToUtc(record.birthDate, record.birthTime ?? '12:00', record.birthTimezone)
  }, [record])

  const chart = useMemo((): NatalChartData | null => {
    if (!record || !birthDate) return null
    const lat = record.birthLat ?? 0
    const lon = record.birthLon ?? 0
    return getNatalChart(birthDate, lat, lon, houseSystem, astrologyMode, { showNodes, showModernPlanets })
  }, [record, birthDate])

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
              <InfoTooltip text={SECT_TOOLTIP}>
                <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '3px', background: chart.sect === 'day' ? 'rgba(200,180,80,0.12)' : 'rgba(120,120,180,0.12)', color: chart.sect === 'day' ? 'var(--color-accent)' : 'var(--color-text-muted)', border: `1px solid ${chart.sect === 'day' ? 'var(--color-accent-muted)' : 'var(--color-border)'}`, cursor: 'help' }}>
                  {chart.sect === 'day' ? '☉ Day chart' : '☽ Night chart'}
                </span>
              </InfoTooltip>
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings/traditions' })}>
            <Layers size={13} /> Traditions
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/astrology/new', search: { edit: id } })}>
            <Edit size={13} /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTransits(v => !v)}
            style={showTransits ? { borderColor: '#c4a44a80', color: '#c4a44a' } : undefined}
          >
            <Radio size={13} /> {showTransits ? 'Transits On' : 'Transits'}
          </Button>
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
      </div>

      {/* Planet visibility — hides selected bodies from the wheel and every table
          section below, in both wheel and table modes. Shared with the Animate
          page's own filter (same groups, same chips). */}
      <div style={{ marginBottom: '20px' }}>
        <CollapsibleSection header={<>Visibility</>} defaultOpen={false}>
          <PlanetVisibilityFilter hiddenPlanets={hiddenPlanets} onTogglePlanet={togglePlanet} onToggleAll={toggleGroup} />
        </CollapsibleSection>
      </div>

      {/* Main content — wheel and table are independently toggleable rather than a single
          either/or view, so both can be seen side by side (the default, and most useful
          combination) without the table permanently gluing itself to the wheel regardless
          of what's toggled, which was the original complaint about this layout. */}
      {showWheel || showTable ? (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: showTable ? 'flex-start' : 'center' }}>
          {showWheel && (
            <ZoomableSVGContainer style={{ width: '100%', maxWidth: 460, borderRadius: '8px' }}>
              <WheelChart chart={chart} size={460} mode={astrologyMode} transitChart={transitChart ?? undefined} date={birthDate ?? undefined} hiddenPlanets={hiddenPlanets} onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })} />
            </ZoomableSVGContainer>
          )}
          {showTable && (
            <div style={{ flex: 1, minWidth: '260px' }}>
              <PositionsTable chart={chart} navigate={navigate} hasBirthTime={!!record.birthTime} hasLocation={hasLocation} date={birthDate} hiddenPlanets={hiddenPlanets} />
              <MutualReceptionsSection chart={chart} navigate={navigate} hiddenPlanets={hiddenPlanets} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
          Enable Wheel or Table above to view chart details.
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <AspectsPanel
          aspects={chart.aspects.filter(a => !hiddenPlanets.has(a.planet1.canonicalName) && !hiddenPlanets.has(a.planet2.canonicalName))}
          planets={chart.planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName)).map(p => p.planet)}
          onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
        />
      </div>

      {/* Transit-to-natal aspects */}
      {showTransits && transitChart && transitAspects.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <AspectsPanel
            variant="transit"
            aspects={transitAspects
              .filter(a => !hiddenPlanets.has(a.transitPlanet.canonicalName) && !hiddenPlanets.has(a.natalPlanet.canonicalName))
              .map(a => ({ planet1: a.transitPlanet, planet2: a.natalPlanet, type: a.type, symbol: a.symbol, orb: a.orb, applying: a.applying }))}
            planets={transitChart.planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName)).map(p => p.planet)}
            colPlanets={chart.planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName)).map(p => p.planet)}
            onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
          />
        </div>
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

function PositionsTable({ chart, navigate, hasBirthTime, hasLocation, date, hiddenPlanets }: {
  chart: NatalChartData
  navigate: ReturnType<typeof useNavigate>
  hasBirthTime: boolean
  hasLocation: boolean
  /** Birth moment — used only to compute the Moon's phase for its position row. */
  date: Date | null
  /** Canonical names hidden via the Visibility filter — sect (Day/Night) below is
   * deliberately computed from the full unfiltered chart.planets, since it's a
   * chart-level fact rather than a per-planet row and shouldn't disappear just
   * because the Sun's row is hidden. */
  hiddenPlanets: Set<string>
}) {
  const tradSettings  = loadTraditionSettings()
  const astrologyMode = tradSettings.astrologyMode
  const signs = getSignsForMode(astrologyMode)
  const showAsteroids = tradSettings.activeTraditions.includes('tradition.modern-astrology')

  // House cusps are always computed in plain tropical longitude (getHouses takes no
  // mode parameter) — index them against the 12-sign tropical list regardless of the
  // chart's own display mode, since the 13-sign IAU list has unequal boundaries that
  // don't line up with a flat 30°-per-sign cusp index.
  const tropicalSigns = getSignsForMode('tropical')

  const sunPos = chart.planets.find(p => p.planet.name === 'Sol')
  const isDay = sunPos ? isDayChart(sunPos.longitude, chart.houses.ascendant) : null

  // Asteroids/minor bodies get their own section below — exclude them here so they
  // don't appear twice.
  const majorPositions = chart.planets.filter(p =>
    !p.planet.canonicalName.startsWith('astrology.minor-body.') && !hiddenPlanets.has(p.planet.canonicalName),
  )

  return (
    <div style={{ marginBottom: '20px' }}>
      <CollapsibleSection header={<>Planetary Positions<SectionInfoLink canonicalName="system.overview.planets" label="Planets" navigate={navigate} /></>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '4px 10px', alignItems: 'center' }}>
        {majorPositions.map(pos => {
          const sign = signs[pos.signIndex]
          const moonPhase = pos.planet.name === 'Luna' && date ? getMoonPhase(date) : null
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
                {moonPhase && (
                  <span
                    role="button" tabIndex={0}
                    style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}
                    onClick={e => { e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: moonPhase.canonicalName } }) }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: moonPhase.canonicalName } }) } }}
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
      </CollapsibleSection>

      {/* Hermetic Lots */}
      <div style={{ marginTop: '16px' }}>
        <CollapsibleSection header={
          <>
            Hermetic Lots
            <SectionInfoLink canonicalName="system.overview.lots" label="Hermetic Lots" navigate={navigate} />
            {isDay !== null && (
              <InfoTooltip text={SECT_TOOLTIP}>
                <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: isDay ? 'rgba(200,180,80,0.12)' : 'rgba(120,120,180,0.12)', color: isDay ? 'var(--color-accent)' : 'var(--color-text-muted)', border: `1px solid ${isDay ? 'var(--color-accent-muted)' : 'var(--color-border)'}`, cursor: 'help' }}>
                  {isDay ? '☉ Day chart' : '☽ Night chart'}
                </span>
              </InfoTooltip>
            )}
          </>
        }>
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
        </CollapsibleSection>
      </div>

      {/* Houses */}
      <div style={{ marginTop: '16px' }}>
        <CollapsibleSection header={
          <>
            Houses{chart.houses.system && ` — ${formatHouseSystem(chart.houses.system)}`}
            <SectionInfoLink canonicalName="system.overview.houses" label="Houses" navigate={navigate} />
          </>
        }>
        {!hasBirthTime || !hasLocation ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
            Birth time and location required to compute houses.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '4px 10px', alignItems: 'center' }}>
            {chart.houses.cusps.map((cusp, i) => {
              const { signIndex, degree, minutes } = longitudeToSignDegree(cusp)
              const sign = tropicalSigns[signIndex]
              const houseCN = `astrology.house.${i + 1}`
              const angle = i === 0 ? 'ASC' : i === 9 ? 'MC' : i === 3 ? 'IC' : i === 6 ? 'DSC' : null
              return (
                <React.Fragment key={houseCN}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '24px', textAlign: 'center' }}>
                    {ROMAN_NUMERALS[i]}
                  </span>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: houseCN } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: houseCN } }) } }}
                  >
                    {HOUSE_NAMES[i]}
                    {angle && (
                      <span style={{ fontSize: '9px', color: 'var(--color-accent)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', padding: '0 4px' }}>{angle}</span>
                    )}
                  </span>
                  <span
                    role="button" tabIndex={0}
                    style={{ fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: sign.canonicalName } }) } }}
                    title={`View ${sign.name} in Reference`}
                  >
                    {sign.symbol} {degree}°{String(minutes).padStart(2, '0')}′ {sign.name}
                  </span>
                </React.Fragment>
              )
            })}
          </div>
        )}
        </CollapsibleSection>
      </div>

      {/* Asteroids (Modern Astrology tradition) */}
      {showAsteroids && (() => {
        const asteroidPositions = chart.planets.filter(p =>
          p.planet.canonicalName.startsWith('astrology.minor-body.') && !hiddenPlanets.has(p.planet.canonicalName),
        )
        if (asteroidPositions.length === 0) return null
        return (
        <div style={{ marginTop: '16px' }}>
          <CollapsibleSection header={<>Asteroids<SectionInfoLink canonicalName="system.overview.minor-bodies" label="Asteroids" navigate={navigate} /></>}>
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
          </CollapsibleSection>
        </div>
        )
      })()}
    </div>
  )
}

// ─── Mutual reception section ─────────────────────────────────────────────────

function MutualReceptionsSection({ chart, navigate, hiddenPlanets }: {
  chart: NatalChartData
  navigate: ReturnType<typeof useNavigate>
  hiddenPlanets: Set<string>
}) {
  const receptions = getMutualReceptions(chart.planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName)))
  if (receptions.length === 0) return null

  const goToRef = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ marginTop: '16px' }}>
      <CollapsibleSection header={<InfoTooltip text={MUTUAL_RECEPTION_TOOLTIP}><span style={{ cursor: 'help' }}>Mutual Reception ({receptions.length})</span></InfoTooltip>}>
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
      </CollapsibleSection>
    </div>
  )
}

