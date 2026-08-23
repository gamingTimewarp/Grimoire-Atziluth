import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getNatalChartById } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { getNatalChart, PLANETS, ZODIAC_SIGNS, getSignsForMode } from '@/lib/astro-engine'
import type { NatalChartData } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { zonedTimeToUtc } from '@/lib/timezone'
import { getPlanetInSignMeaning } from '@/lib/planet-in-sign'

export const Route = createFileRoute('/reference/planet-in-sign')({
  validateSearch: (s: Record<string, unknown>) => ({
    chartId: typeof s.chartId === 'string' ? s.chartId : undefined,
  }),
  component: PlanetInSignPage,
})

// The 13 bodies the guide has written entries for: the 10 traditional planets
// plus the North/South Node and Black Moon Lilith. Asteroids aren't covered —
// planet-in-sign isn't an established interpretive tradition for them.
const GUIDE_PLANETS = PLANETS.slice(0, 13)

interface Placement {
  planetCn: string
  planetName: string
  planetSymbol: string
  signCn: string
  signName: string
  signSymbol: string
  retrograde: boolean
  meaning: string | null
}

function PlanetInSignPage() {
  const navigate = useNavigate()
  const { chartId } = Route.useSearch()

  const [record, setRecord] = useState<NatalChartRecord | null>(null)
  const [loading, setLoading] = useState(!!chartId)
  const [selected, setSelected] = useState<{ planetCn: string; signCn: string } | null>(null)

  useEffect(() => {
    if (!chartId) { setRecord(null); setLoading(false); return }
    setLoading(true)
    getNatalChartById(chartId)
      .then(r => { setRecord(r); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [chartId])

  const tradSettings  = loadTraditionSettings()
  const astrologyMode = tradSettings.astrologyMode

  const chart = useMemo((): NatalChartData | null => {
    if (!record) return null
    const birthDate = zonedTimeToUtc(record.birthDate, record.birthTime ?? '12:00', record.birthTimezone)
    const lat = record.birthLat ?? 0
    const lon = record.birthLon ?? 0
    return getNatalChart(birthDate, lat, lon, tradSettings.houseSystem, astrologyMode, {
      showNodes: tradSettings.showNodes,
      showModernPlanets: tradSettings.activeTraditions.includes('tradition.modern-astrology'),
    })
  }, [record])

  const placements = useMemo((): Placement[] => {
    if (!chart) return []
    const signs = getSignsForMode(astrologyMode)
    return chart.planets
      .filter(p => GUIDE_PLANETS.some(gp => gp.canonicalName === p.planet.canonicalName))
      .map(p => {
        const sign = signs[p.signIndex]
        return {
          planetCn: p.planet.canonicalName,
          planetName: p.planet.name,
          planetSymbol: p.planet.symbol,
          signCn: sign?.canonicalName ?? '',
          signName: sign?.name ?? '?',
          signSymbol: sign?.symbol ?? '',
          retrograde: p.retrograde,
          meaning: sign ? getPlanetInSignMeaning(p.planet.canonicalName, sign.canonicalName) : null,
        }
      })
  }, [chart])

  const placementKeys = useMemo(() => new Set(placements.map(p => `${p.planetCn}|${p.signCn}`)), [placements])

  const clearFilter = () => navigate({ to: '/reference/planet-in-sign', search: { chartId: undefined } })
  const goToRef = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  const selectedMeaning = selected ? getPlanetInSignMeaning(selected.planetCn, selected.signCn) : null
  const selectedPlanet  = selected ? GUIDE_PLANETS.find(p => p.canonicalName === selected.planetCn) : null
  const selectedSign    = selected ? ZODIAC_SIGNS.find(s => s.canonicalName === selected.signCn) : null

  const cellSize = 34

  return (
    <div style={{ maxWidth: '900px' }}>
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} style={{ marginBottom: '12px' }}>
        <ArrowLeft size={14} /> Back
      </Button>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Planet in Sign
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Basic meanings for each of the 10 traditional planets, the lunar nodes, and Black Moon Lilith
        placed in each zodiac sign. Click any cell in the grid to read its meaning, or click a planet
        or sign name to open its reference page.
      </p>

      {chartId && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-accent-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {loading ? (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading chart…</span>
          ) : record && chart ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                Filtered to <strong>{record.name}</strong>'s placements
              </span>
              <button
                onClick={() => navigate({ to: '/astrology/$id', params: { id: record.id } })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', fontFamily: 'inherit', padding: 0 }}
              >
                View chart →
              </button>
              <Button variant="ghost" size="sm" onClick={clearFilter} style={{ marginLeft: 'auto' }}>
                <X size={12} /> Clear filter
              </Button>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Chart not found.</span>
          )}
        </div>
      )}

      {placements.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Your Placements
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {placements.map(p => (
              <div key={p.planetCn} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                <span style={{ flexShrink: 0, color: 'var(--color-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  <button onClick={() => goToRef(p.planetCn)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                    {p.planetSymbol} {p.planetName}
                  </button>
                  {p.retrograde && <span title="Retrograde" style={{ color: 'var(--color-text-subtle)' }}> ℞</span>}
                  {' in '}
                  <button onClick={() => goToRef(p.signCn)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                    {p.signSymbol} {p.signName}
                  </button>
                  {':'}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {p.meaning ?? 'No guide entry yet for this sign.'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full grid */}
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        All Combinations
      </div>
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ width: cellSize, height: cellSize }} />
              {ZODIAC_SIGNS.map(sign => (
                <th key={sign.canonicalName}
                  role="button" tabIndex={0}
                  style={{ width: cellSize, height: cellSize, textAlign: 'center', color: 'var(--color-text-subtle)', fontWeight: 400, cursor: 'pointer', border: '1px solid var(--color-border)' }}
                  onClick={() => goToRef(sign.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(sign.canonicalName) } }}
                  title={sign.name}
                >
                  {sign.symbol}
                </th>
              ))}
            </tr>
            {GUIDE_PLANETS.map(planet => (
              <tr key={planet.canonicalName}>
                <th
                  role="button" tabIndex={0}
                  style={{ width: cellSize, height: cellSize, textAlign: 'center', color: 'var(--color-text-subtle)', fontWeight: 400, cursor: 'pointer', border: '1px solid var(--color-border)' }}
                  onClick={() => goToRef(planet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(planet.canonicalName) } }}
                  title={planet.name}
                >
                  {planet.symbol}
                </th>
                {ZODIAC_SIGNS.map(sign => {
                  const key = `${planet.canonicalName}|${sign.canonicalName}`
                  const isChartPlacement = placementKeys.has(key)
                  const isSelected = selected?.planetCn === planet.canonicalName && selected?.signCn === sign.canonicalName
                  return (
                    <td key={sign.canonicalName}
                      role="button" tabIndex={0}
                      onClick={() => setSelected({ planetCn: planet.canonicalName, signCn: sign.canonicalName })}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected({ planetCn: planet.canonicalName, signCn: sign.canonicalName }) } }}
                      style={{
                        width: cellSize, height: cellSize, textAlign: 'center', cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isSelected ? 'rgba(180,156,90,0.25)' : isChartPlacement ? 'rgba(180,156,90,0.12)' : 'transparent',
                      }}
                    >
                      {isChartPlacement && <span style={{ color: 'var(--color-accent)', fontSize: '16px' }}>•</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-accent-muted)', borderRadius: '8px', fontSize: '13px' }}>
          <div style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>
            {selectedPlanet?.symbol} {selectedPlanet?.name} in {selectedSign?.symbol} {selectedSign?.name}
          </div>
          <div style={{ color: 'var(--color-text-muted)' }}>
            {selectedMeaning ?? 'No guide entry yet for this combination.'}
          </div>
        </div>
      )}

      {placements.length > 0 && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '10px' }}>
          Highlighted cells mark {record?.name ?? 'this chart'}'s actual placements.
        </div>
      )}
    </div>
  )
}
