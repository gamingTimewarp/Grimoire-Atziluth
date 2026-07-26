import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { getMoonPhase } from '@/lib/astro-calc'
import { getMoonSnapshot, isSupermoon, formatRelative, formatTime } from '@/lib/astro-engine'
import type { MoonSnapshot, EclipseForecast, Aspect } from '@/lib/astro-engine'
import { getEffectiveDate, getHomeLocation } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'

export const Route = createFileRoute('/calendar/moon')({
  component: MoonPage,
})

// ─── Shared panel/row helpers ──────────────────────────────────────────────────

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, auto) 1fr', gap: '8px 16px', padding: '4px 0', fontSize: '13px' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function EclipseRow({ label, forecast, now }: { label: string; forecast: EclipseForecast | null; now: Date }) {
  if (!forecast) {
    return <Row label={label} value={<span style={{ color: 'var(--color-text-subtle)' }}>—</span>} />
  }
  const kindLabel = forecast.kind.charAt(0).toUpperCase() + forecast.kind.slice(1)
  const location = forecast.peakLatitude !== undefined && forecast.peakLongitude !== undefined
    ? ` · peak at ${Math.abs(forecast.peakLatitude).toFixed(1)}°${forecast.peakLatitude >= 0 ? 'N' : 'S'} ${Math.abs(forecast.peakLongitude).toFixed(1)}°${forecast.peakLongitude >= 0 ? 'E' : 'W'}`
    : ''
  return (
    <Row
      label={label}
      value={
        <>
          {kindLabel} · {formatRelative(forecast.peak, now)} · {forecast.peak.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          {forecast.obscuration !== undefined && ` · ${Math.round(forecast.obscuration * 100)}% obscured`}
          {location && <span style={{ color: 'var(--color-text-subtle)' }}>{location}</span>}
        </>
      }
    />
  )
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

function AspectsList({ aspects, onNav }: { aspects: Aspect[]; onNav: (cn: string) => void }) {
  if (aspects.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>No major aspects at the moment.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {aspects.map((asp, i) => {
        const other = asp.planet1.canonicalName === 'astrology.planet.luna' ? asp.planet2 : asp.planet1
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
            <span
              role="button" tabIndex={0}
              style={{ color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '16px', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => onNav('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav('astrology.aspect.' + asp.type) } }} title={asp.type}
            >{asp.symbol}</span>
            <span
              role="button" tabIndex={0}
              style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '16px', cursor: 'pointer' }}
              onClick={() => onNav(other.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav(other.canonicalName) } }} title={other.name}
            >{other.symbol}</span>
            <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
              Moon{' '}
              <span
                role="button" tabIndex={0}
                style={{ cursor: 'pointer', color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)' }}
                onClick={() => onNav('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav('astrology.aspect.' + asp.type) } }}
              >{asp.type}</span>
              {' '}
              <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onNav(other.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNav(other.canonicalName) } }}>{other.name}</span>
            </span>
            <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>{asp.orb}°</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Full Moon Names table ─────────────────────────────────────────────────────

function FullMoonNamesTable({ currentMonth, onNavigate }: { currentMonth: number; onNavigate: (cn: string) => void }) {
  const { engine } = useEngineStore()
  const [names, setNames] = useState<BaseEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!engine) return
    engine.adapter.listEntities({ entityType: 'astrology.full-moon-name' }, { limit: 20, offset: 0 })
      .then(result => {
        const items = (result.items as BaseEntity[]).slice()
          .sort((a, b) => ((a.extendedData?.orderNumber as number) ?? 0) - ((b.extendedData?.orderNumber as number) ?? 0))
        setNames(items)
      })
      .finally(() => setLoading(false))
  }, [engine])

  if (loading) {
    return <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '4px 12px', fontSize: '12px' }}>
      <div style={{ color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Month</div>
      <div style={{ color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Name</div>
      <div style={{ color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Anglo-Saxon</div>
      <div style={{ color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Celtic</div>
      {names.map(n => {
        const ed = n.extendedData ?? {}
        const month = (ed.month as number | undefined) ?? 0
        const isCurrent = month === currentMonth
        const rowStyle: React.CSSProperties = {
          display: 'contents',
        }
        const cellStyle: React.CSSProperties = {
          padding: '5px 0',
          background: isCurrent ? 'var(--color-surface-3)' : 'transparent',
          borderTop: isCurrent ? '1px solid var(--color-accent-muted)' : '1px solid transparent',
          borderBottom: isCurrent ? '1px solid var(--color-accent-muted)' : '1px solid transparent',
        }
        const monthLabel = new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: 'short' })
        return (
          <div key={n.canonicalName} style={rowStyle}>
            <div style={{ ...cellStyle, color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)', paddingLeft: isCurrent ? '6px' : 0 }}>
              {monthLabel}{ed.anchor === 'nearest-autumn-equinox' ? ' *' : ''}
            </div>
            <div style={cellStyle}>
              <button
                onClick={() => onNavigate(n.canonicalName)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text)', fontSize: '12px', textAlign: 'left', fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--color-border)' }}
              >
                {n.primaryDisplayName}
              </button>
            </div>
            <div style={{ ...cellStyle, color: 'var(--color-text-muted)' }}>{(ed.anglosaxonMonth as string) ?? '—'}</div>
            <div style={{ ...cellStyle, color: 'var(--color-text-muted)', paddingRight: isCurrent ? '6px' : 0 }}>{(ed.celticMoonName as string) ?? '—'}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MoonPage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<MoonSnapshot | null>(null)
  const [noLoc,    setNoLoc]    = useState(false)
  const [asOf,     setAsOf]     = useState<Date | null>(null)
  const [spinning, setSpinning] = useState(false)

  const compute = useCallback(() => {
    setSpinning(true)
    const date = getEffectiveDate()
    const loc  = getHomeLocation()
    const { astrologyMode, houseSystem } = loadTraditionSettings()
    setNoLoc(!loc)
    setTimeout(() => {
      try {
        setSnapshot(getMoonSnapshot(date, loc?.lat ?? 0, loc?.lon ?? 0, astrologyMode, houseSystem))
        setAsOf(date)
      } catch (e) {
        console.error('Moon page compute error:', e)
      }
      setSpinning(false)
    }, 0)
  }, [])

  useEffect(() => { compute() }, [compute])

  const goToRef = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  const now = asOf ?? new Date()
  const phase = getMoonPhase(now)
  const refreshLabel = asOf
    ? asOf.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    : '…'

  const refreshButton = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>as of {refreshLabel}</span>
      <button
        onClick={compute}
        disabled={spinning}
        title="Refresh"
        aria-label="Refresh Moon snapshot"
        style={{ background: 'none', border: 'none', cursor: spinning ? 'default' : 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex', opacity: spinning ? 0.4 : 0.7 }}
      >
        <RefreshCw size={13} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
      </button>
    </span>
  )

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/calendar' })}>
          <ArrowLeft size={13} /> Calendar
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Moon</h1>
      </div>

      {/* Now */}
      <Panel title="Now" right={refreshButton}>
        <div
          onClick={() => goToRef(phase.canonicalName)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
          title="View in Reference"
        >
          <div style={{ fontSize: '40px', lineHeight: 1 }}>{phase.emoji}</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text)' }}>{phase.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {snapshot ? `${Math.round(snapshot.appearance.illuminatedFraction * 100)}% illuminated` : '…'}
              {snapshot && ` · ${snapshot.appearance.waxing ? 'waxing' : 'waning'}`}
            </div>
          </div>
        </div>
      </Panel>

      {/* Phases */}
      <Panel title="Phases">
        {snapshot ? (
          <>
            <Row label="Next phase change" value={`${snapshot.timeline.next.emoji} ${formatRelative(snapshot.timeline.next.time, now)} · ${formatTime(snapshot.timeline.next.time)} ${snapshot.timeline.next.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
            <Row label="Last New Moon" value={`${snapshot.timeline.prevNew.emoji} ${formatRelative(snapshot.timeline.prevNew.time, now)} · ${snapshot.timeline.prevNew.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
            <Row label="Next New Moon" value={`${snapshot.timeline.nextNew.emoji} ${formatRelative(snapshot.timeline.nextNew.time, now)} · ${snapshot.timeline.nextNew.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
            <Row label="Last Full Moon" value={`${snapshot.timeline.prevFull.emoji} ${formatRelative(snapshot.timeline.prevFull.time, now)} · ${snapshot.timeline.prevFull.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
            <Row label="Next Full Moon" value={`${snapshot.timeline.nextFull.emoji} ${formatRelative(snapshot.timeline.nextFull.time, now)} · ${snapshot.timeline.nextFull.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
        )}
      </Panel>

      {/* Size & Brightness */}
      <Panel
        title="Size & Brightness"
        right={
          noLoc
            ? <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Set home location for accurate altitude</span>
            : <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{getHomeLocation()?.label}</span>
        }
      >
        {snapshot ? (
          <>
            <Row label="Distance" value={`${Math.round(snapshot.appearance.observerDistanceKm).toLocaleString()} km`} />
            <Row label="Apparent diameter" value={`${snapshot.appearance.angularDiameterArcmin.toFixed(2)}′`} />
            <Row
              label="Relative size"
              value={
                <>
                  {Math.abs(snapshot.appearance.relativeSize - 1) < 0.005
                    ? 'About average'
                    : `${Math.abs((snapshot.appearance.relativeSize - 1) * 100).toFixed(1)}% ${snapshot.appearance.relativeSize > 1 ? 'larger' : 'smaller'} than average`}
                  {isSupermoon(now) && (
                    <span style={{ marginLeft: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', padding: '1px 5px' }}>
                      Supermoon
                    </span>
                  )}
                </>
              }
            />
            <Row label="Magnitude" value={snapshot.appearance.magnitude.toFixed(2)} />
            <Row label="Illuminated" value={`${Math.round(snapshot.appearance.illuminatedFraction * 100)}%`} />
            <Row
              label="Altitude"
              value={
                snapshot.appearance.altitudeDeg >= 0
                  ? `+${snapshot.appearance.altitudeDeg.toFixed(1)}°`
                  : `${snapshot.appearance.altitudeDeg.toFixed(1)}° (below horizon)`
              }
            />
            <Row
              label="Moonrise"
              value={snapshot.riseSet.nextRise ? `${formatRelative(snapshot.riseSet.nextRise, now)} · ${formatTime(snapshot.riseSet.nextRise)}` : <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
            />
            <Row
              label="Moonset"
              value={snapshot.riseSet.nextSet ? `${formatRelative(snapshot.riseSet.nextSet, now)} · ${formatTime(snapshot.riseSet.nextSet)}` : <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
            />
            <Row
              label="Next perigee"
              value={`${formatRelative(snapshot.apsis.nextPerigee.time, now)} · ${Math.round(snapshot.apsis.nextPerigee.distanceKm).toLocaleString()} km`}
            />
            <Row
              label="Next apogee"
              value={`${formatRelative(snapshot.apsis.nextApogee.time, now)} · ${Math.round(snapshot.apsis.nextApogee.distanceKm).toLocaleString()} km`}
            />
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
        )}
      </Panel>

      {/* Position */}
      <Panel title="Position">
        {snapshot ? (
          <>
            <Row
              label="Constellation"
              value={`${snapshot.constellation.name} (${snapshot.constellation.symbol}) · entered ${formatRelative(snapshot.constellation.enteredAt, now)} · leaves ${formatRelative(snapshot.constellation.exitsAt, now)}`}
            />
            <Row label="House" value={`${snapshot.house}${noLoc ? ' (default location)' : ''}`} />
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
        )}
      </Panel>

      {/* Aspects */}
      <Panel title="Aspects">
        {snapshot ? (
          <AspectsList aspects={snapshot.aspects} onNav={goToRef} />
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
        )}
      </Panel>

      {/* Eclipses */}
      <Panel title="Eclipses">
        {snapshot ? (
          <>
            <EclipseRow label="Next lunar eclipse" forecast={snapshot.nextLunarEclipse} now={now} />
            <EclipseRow label="Next solar eclipse" forecast={snapshot.nextSolarEclipse} now={now} />
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
              Solar eclipse times are global (visible somewhere on Earth), not necessarily from your location.
            </div>
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Computing…</div>
        )}
      </Panel>

      {/* Full Moon Names */}
      <Panel title="Full Moon Names">
        <FullMoonNamesTable currentMonth={now.getMonth() + 1} onNavigate={goToRef} />
      </Panel>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
        Names reflect Northern-hemisphere seasons. Anglo-Saxon names are drawn from Bede's eighth-century
        <em> De Temporum Ratione</em>; the Celtic column is a widely circulated modern (20th-century) neopagan
        set, not a medieval attestation. * The Harvest Moon is defined by the autumn equinox rather than a
        fixed month, and can fall in either September or October.
      </div>
    </div>
  )
}
