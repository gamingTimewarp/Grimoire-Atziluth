import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { listNatalCharts, deleteNatalChart } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { getNatalChart, getSignsForMode, getTransitAspects } from '@/lib/astro-engine'
import type { NatalChartData, AstrologyMode, TransitAspect } from '@/lib/astro-engine'
import { getEffectiveDate, getHomeLocation } from '@/lib/settings-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { WheelChart } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { AspectsPanel } from '@/components/ui/AspectsPanel'
import { Button } from '@/components/ui/Button'
import { Plus, User, Trash2, RefreshCw, List, Circle, Play } from 'lucide-react'

export const Route = createFileRoute('/astrology/')({
  component: AstrologyPage,
})


// ─── Current sky snapshot ─────────────────────────────────────────────────────

const TRANSIT_ASPECT_COLORS: Record<string, string> = {
  conjunction: '#c4a44a',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

function CurrentSkyPanel() {
  const navigate = useNavigate()
  const [chart,          setChart]         = useState<NatalChartData | null>(null)
  const [asOf,           setAsOf]          = useState<Date | null>(null)
  const [spinning,       setSpinning]      = useState(false)
  const [showWheel,      setShowWheel]     = useState(true)
  const [showTable,      setShowTable]     = useState(true)
  const [noLoc,          setNoLoc]         = useState(false)
  const [mode,           setMode]          = useState<AstrologyMode>('tropical')
  const [selfChart,      setSelfChart]     = useState<NatalChartData | null>(null)
  const [transitAspects, setTransitAspects] = useState<TransitAspect[]>([])
  const [showTransits,   setShowTransits]  = useState(false)

  // Load self natal chart once on mount
  useEffect(() => {
    listNatalCharts().then(records => {
      const self = records.find(r => r.isSelf)
      if (!self) return
      const { astrologyMode, houseSystem, showNodes, activeTraditions } = loadTraditionSettings()
      const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')
      const birthDate = zonedTimeToUtc(self.birthDate, self.birthTime ?? '12:00', self.birthTimezone)
      const c = getNatalChart(birthDate, self.birthLat ?? 0, self.birthLon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets })
      setSelfChart(c)
    }).catch(() => {})
  }, [])

  const compute = useCallback(() => {
    setSpinning(true)
    const date = getEffectiveDate()
    const loc  = getHomeLocation()
    const { astrologyMode, houseSystem, showNodes, activeTraditions } = loadTraditionSettings()
    const showModernPlanets = activeTraditions.includes('tradition.modern-astrology')
    setNoLoc(!loc)
    setMode(astrologyMode)
    setTimeout(() => {
      try {
        const c = getNatalChart(date, loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode, { showNodes, showModernPlanets })
        setChart(c)
        setAsOf(date)
        if (selfChart) {
          setTransitAspects(getTransitAspects(c.planets, selfChart.planets, date))
        }
      } catch (e) {
        console.error('CurrentSkyPanel compute error:', e)
      }
      setSpinning(false)
    }, 0)
  }, [selfChart])

  // Initial compute + auto-refresh every 5 minutes
  useEffect(() => {
    compute()
    const id = setInterval(compute, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [compute])

  const refreshLabel = asOf
    ? asOf.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    : '…'

  const goToRef = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ marginBottom: '32px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Current Sky
          </div>
          <button
            onClick={() => setShowWheel(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${showWheel ? 'var(--color-accent-muted)' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: showWheel ? 'var(--color-accent)' : 'var(--color-text-muted)', padding: '2px 8px' }}
          >
            <Circle size={10} /> Wheel
          </button>
          <button
            onClick={() => setShowTable(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${showTable ? 'var(--color-accent-muted)' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: showTable ? 'var(--color-accent)' : 'var(--color-text-muted)', padding: '2px 8px' }}
          >
            <List size={10} /> Table
          </button>
          {selfChart && transitAspects.length > 0 && (
            <button
              onClick={() => setShowTransits(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: `1px solid ${showTransits ? '#c4a44a80' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: showTransits ? '#c4a44a' : 'var(--color-text-muted)', padding: '2px 8px' }}
            >
              ↕ Transits to natal ({transitAspects.length})
            </button>
          )}
          <button
            onClick={() => navigate({ to: '/astrology/animate' })}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-muted)', padding: '2px 8px' }}
          >
            <Play size={9} /> Animate
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {noLoc && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Set home location for accurate houses</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>as of {refreshLabel}</span>
            <button
              onClick={compute}
              disabled={spinning}
              title="Refresh"
              aria-label="Refresh current sky"
              style={{ background: 'none', border: 'none', cursor: spinning ? 'default' : 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex', opacity: spinning ? 0.4 : 0.7 }}
              onMouseEnter={e => { if (!spinning) e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = spinning ? '0.4' : '0.7' }}
            >
              <RefreshCw size={13} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </span>
        </div>
      </div>

      {!chart && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
      )}

      {/* Wheel and table are independently toggleable rather than a single either/or
          view, so both can be seen side by side at once — the default, and most
          useful combination. */}
      {chart && (showWheel || showTable) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: showTable ? 'flex-start' : 'center' }}>
            {showWheel && (
              <ZoomableSVGContainer style={{ width: '100%', maxWidth: 440, borderRadius: '8px' }}>
                <WheelChart chart={chart} size={440} mode={mode} onNavigate={goToRef} />
              </ZoomableSVGContainer>
            )}
            {showTable && (
              <div style={{ flex: 1, minWidth: '220px', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '4px 10px', alignItems: 'center' }}>
                {chart.planets.map(pos => {
                  const sign = getSignsForMode(loadTraditionSettings().astrologyMode)[pos.signIndex]
                  return (
                    <React.Fragment key={pos.planet.name}>
                      <span
                        role="button" tabIndex={0}
                        style={{ fontSize: '15px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', cursor: 'pointer' }}
                        onClick={() => goToRef(pos.planet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(pos.planet.canonicalName) } }}
                        title={pos.planet.name}
                      >{pos.planet.symbol}</span>
                      <span
                        role="button" tabIndex={0}
                        style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                        onClick={() => goToRef(pos.planet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(pos.planet.canonicalName) } }}
                      >{pos.planet.name}</span>
                      <span
                        role="button" tabIndex={0}
                        style={{ fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer' }}
                        onClick={() => goToRef(sign.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(sign.canonicalName) } }}
                        title={`View ${sign.name} in Reference`}
                      >
                        {pos.degree}°{String(pos.minutes).padStart(2, '0')}′ {sign.symbol} {sign.name}
                      </span>
                      <span title={pos.retrograde ? 'Retrograde' : undefined} style={{ fontSize: '11px', color: 'var(--color-danger)', minWidth: '12px' }}>{pos.retrograde ? '℞' : ''}</span>
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>
          <AspectsPanel aspects={chart.aspects} planets={chart.planets.map(p => p.planet)} onNavigate={goToRef} />
        </div>
      )}

      {chart && !showWheel && !showTable && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
          Enable Wheel or Table above to view the sky.
        </div>
      )}

      {/* Transit-to-natal aspects */}
      {chart && showTransits && transitAspects.length > 0 && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            <span style={{ color: '#c4a44a' }}>Transit</span> → Natal
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {transitAspects.map((asp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
                <span
                  role="button" tabIndex={0}
                  style={{ color: '#c4a44a', fontFamily: 'monospace', minWidth: '16px', cursor: 'pointer' }}
                  onClick={() => goToRef(asp.transitPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.transitPlanet.canonicalName) } }} title={`Transit ${asp.transitPlanet.name}`}
                >{asp.transitPlanet.symbol}</span>
                <span style={{ color: TRANSIT_ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '16px', textAlign: 'center' }}>{asp.symbol}</span>
                <span
                  role="button" tabIndex={0}
                  style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '16px', cursor: 'pointer' }}
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
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AstrologyPage() {
  const navigate = useNavigate()
  const [charts, setCharts] = useState<NatalChartRecord[]>([])

  const load = () => listNatalCharts().then(setCharts).catch(console.error)
  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    await deleteNatalChart(id)
    load()
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Astrology</h1>
        <Button size="sm" onClick={() => navigate({ to: '/astrology/new', search: { edit: undefined } })}>
          <Plus size={14} /> New Chart
        </Button>
      </div>

      <CurrentSkyPanel />

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
        Natal Charts
      </div>

      {charts.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <User size={28} style={{ color: 'var(--color-text-subtle)', marginBottom: '10px' }} />
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No natal charts yet. Create one to begin.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {charts.map(chart => (
          <ChartRow key={chart.id} chart={chart} onDelete={handleDelete} onOpen={() => navigate({ to: '/astrology/$id', params: { id: chart.id } })} />
        ))}
        {charts.length > 0 && (
          <Button size="sm" onClick={() => navigate({ to: '/astrology/new', search: { edit: undefined } })} style={{ alignSelf: 'flex-start' }}>
            <Plus size={14} /> New Chart
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Chart row ────────────────────────────────────────────────────────────────

function ChartRow({ chart, onDelete, onOpen }: { chart: NatalChartRecord; onDelete: (id: string) => void; onOpen: () => void }) {
  const [confirm, setConfirm] = useState(false)

  const dateLabel = (() => {
    const parts = [chart.birthDate]
    if (chart.birthTime) parts.push(chart.birthTime)
    if (chart.birthLocationLabel) parts.push(chart.birthLocationLabel)
    return parts.join(' · ')
  })()

  return (
    <div style={{ padding: '14px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div role="button" tabIndex={0} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }} aria-label={`View ${chart.name} natal chart`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)' }}>{chart.name}</span>
          {chart.isSelf && (
            <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(180,156,90,0.15)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', color: 'var(--color-accent)' }}>
              Self
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{dateLabel}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button variant="ghost" size="sm" onClick={onOpen}>View</Button>
        {confirm ? (
          <>
            <button onClick={() => onDelete(chart.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-danger)', padding: '2px 6px' }}>Confirm</button>
            <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', padding: '2px 4px' }}>Cancel</button>
          </>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: '4px', opacity: 0.5 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-danger)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
