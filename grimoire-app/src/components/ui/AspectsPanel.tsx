/**
 * AspectsPanel.tsx
 * Aspects list for a chart, as its own bordered box — pulled out of the natal
 * chart detail page's cramped sidebar (and Current Sky's matching sidebar
 * column) where a plain always-expanded list got unwieldy once a chart had
 * more than a handful of aspects. Renders inline wherever the caller places
 * it (below the wheel, below the positions table, ...) rather than as an
 * overlay — this is a page section, not a dialog. Adds sort/view modes beyond
 * the engine's default (tightest orb first): grouped by the planets involved,
 * grouped by aspect type, or a classic aspect-grid matrix.
 *
 * Also doubles as the Transit-to-Natal aspects list (variant="transit") — the
 * two share every bit of sort/grid logic and only differ in row coloring and
 * label text, so transit callers pass a `colPlanets` (the natal planets) to
 * turn the "Chart" grid from a symmetric planet x planet triangle into a full
 * transit x natal rectangle instead.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { ASPECT_DEFS } from '@/lib/astro-engine'
import type { AspectType, Planet } from '@/lib/astro-engine'

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}
const TRANSIT_ASPECT_COLORS: Record<AspectType, string> = { ...ASPECT_COLORS, conjunction: '#c4a44a' }
const TRANSIT_COLOR = '#c4a44a'

type AspectSortMode = 'degree' | 'planet' | 'aspect' | 'chart'

const ASPECT_TYPE_ORDER: Record<AspectType, number> = Object.fromEntries(
  ASPECT_DEFS.map((d, i) => [d.type, i]),
) as Record<AspectType, number>

/** Common shape both Aspect and TransitAspect satisfy once the caller maps
 * transitPlanet/natalPlanet to planet1/planet2 — see astrology/index.tsx and
 * astrology/$id.tsx's transit-aspects usage. */
export interface AspectLike {
  planet1: Planet
  planet2: Planet
  type: AspectType
  symbol: string
  orb: number
  /** Transit aspects only — whether the transiting planet is moving toward or
   * away from exact. Natal aspects have no notion of "applying". */
  applying?: boolean
}

function findAspect(aspects: AspectLike[], cn1: string, cn2: string): AspectLike | undefined {
  return aspects.find(a =>
    (a.planet1.canonicalName === cn1 && a.planet2.canonicalName === cn2) ||
    (a.planet1.canonicalName === cn2 && a.planet2.canonicalName === cn1),
  )
}

interface AspectsPanelProps {
  aspects: AspectLike[]
  /** Row-axis planets, in display order — the chart's own planets for natal
   * aspects, or the transit chart's planets for transit-to-natal aspects. Drives
   * the "By Planet" sort key and the grid's row headers. */
  planets: Planet[]
  /** Column-axis planets for the grid view. Omit for natal aspects — the grid
   * then uses `planets` for both axes and only fills the upper triangle, since
   * it's symmetric. Pass the natal chart's planets here for transit-to-natal
   * aspects instead, producing a full rectangular transit x natal grid (every
   * cell is a distinct pair, so nothing gets skipped). */
  colPlanets?: Planet[]
  variant?: 'natal' | 'transit'
  onNavigate: (canonicalName: string) => void
}

export function AspectsPanel({ aspects, planets, colPlanets, variant = 'natal', onNavigate }: AspectsPanelProps) {
  const [sortMode, setSortMode] = useState<AspectSortMode>('degree')
  const [isOpen, setIsOpen] = useState(true)

  if (aspects.length === 0) return null

  const isTransit = variant === 'transit'
  const colors = isTransit ? TRANSIT_ASPECT_COLORS : ASPECT_COLORS
  const cols = colPlanets ?? planets
  const isGrid = colPlanets !== undefined // symmetric triangle vs full rectangle

  const planetIndex = new Map(planets.map((p, i) => [p.canonicalName, i]))
  const idxOf = (cn: string) => planetIndex.get(cn) ?? 999

  const sorted = [...aspects].sort((a, b) => {
    if (sortMode === 'aspect') {
      const at = ASPECT_TYPE_ORDER[a.type] - ASPECT_TYPE_ORDER[b.type]
      if (at !== 0) return at
      return a.orb - b.orb
    }
    if (sortMode === 'planet') {
      const aMin = Math.min(idxOf(a.planet1.canonicalName), idxOf(a.planet2.canonicalName))
      const bMin = Math.min(idxOf(b.planet1.canonicalName), idxOf(b.planet2.canonicalName))
      if (aMin !== bMin) return aMin - bMin
      const aMax = Math.max(idxOf(a.planet1.canonicalName), idxOf(a.planet2.canonicalName))
      const bMax = Math.max(idxOf(b.planet1.canonicalName), idxOf(b.planet2.canonicalName))
      if (aMax !== bMax) return aMax - bMax
      return a.orb - b.orb
    }
    return a.orb - b.orb
  })

  const cellSize = 26

  return (
    <div style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '8px', padding: '14px 16px',
    }}>
      <div
        role="button" tabIndex={0}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: isOpen ? '12px' : 0, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(o => !o) } }}
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {isTransit ? <><span style={{ color: TRANSIT_COLOR }}>Transit</span>{' '}→ Natal ({aspects.length})</> : <>Aspects ({aspects.length})</>}
        </div>
        {isOpen && (
          <div onClick={e => e.stopPropagation()}>
            <SegmentedToggle
              value={sortMode}
              onChange={setSortMode}
              options={[
                { value: 'degree', label: 'Degree', title: 'Sort by tightest orb first' },
                { value: 'planet', label: 'Planet',  title: 'Group by the planets involved' },
                { value: 'aspect', label: 'Aspect',  title: 'Group by aspect type' },
                { value: 'chart',  label: 'Chart',   title: isTransit ? 'Transit x natal aspect grid' : 'Classic planet x planet aspect grid' },
              ]}
            />
          </div>
        )}
      </div>

      {isOpen && (sortMode === 'chart' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ width: cellSize, height: cellSize }} />
                {cols.map(colPlanet => (
                  <th
                    key={colPlanet.canonicalName}
                    role="button" tabIndex={0}
                    style={{ width: cellSize, height: cellSize, textAlign: 'center', color: 'var(--color-text-subtle)', fontWeight: 400, cursor: 'pointer', border: '1px solid var(--color-border)' }}
                    onClick={() => onNavigate(colPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(colPlanet.canonicalName) } }}
                    title={colPlanet.name}
                  >
                    {colPlanet.symbol}
                  </th>
                ))}
              </tr>
              {planets.map((rowPlanet, i) => (
                <tr key={rowPlanet.canonicalName}>
                  <th
                    role="button" tabIndex={0}
                    style={{ width: cellSize, height: cellSize, textAlign: 'center', color: isTransit ? TRANSIT_COLOR : 'var(--color-text-subtle)', fontWeight: 400, cursor: 'pointer', border: '1px solid var(--color-border)' }}
                    onClick={() => onNavigate(rowPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(rowPlanet.canonicalName) } }}
                    title={isTransit ? `Transit ${rowPlanet.name}` : rowPlanet.name}
                  >
                    {rowPlanet.symbol}
                  </th>
                  {cols.map((colPlanet, j) => {
                    if (!isGrid && j <= i) {
                      return <td key={colPlanet.canonicalName} style={{ width: cellSize, height: cellSize, border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }} />
                    }
                    const asp = findAspect(aspects, rowPlanet.canonicalName, colPlanet.canonicalName)
                    return (
                      <td key={colPlanet.canonicalName} style={{ width: cellSize, height: cellSize, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                        {asp && (
                          <span
                            role="button" tabIndex={0}
                            style={{ color: colors[asp.type] ?? 'var(--color-text-muted)', cursor: 'pointer' }}
                            onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }}
                            title={`${isTransit ? 'Transit ' : ''}${rowPlanet.name} ${asp.type} ${isTransit ? 'natal ' : ''}${colPlanet.name} — ${asp.orb}° orb`}
                          >
                            {asp.symbol}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {sorted.map((asp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span
                role="button" tabIndex={0}
                style={{ color: isTransit ? TRANSIT_COLOR : 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => onNavigate(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet1.canonicalName) } }} title={isTransit ? `Transit ${asp.planet1.name}` : asp.planet1.name}
              >{asp.planet1.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: colors[asp.type] ?? 'var(--color-text-muted)', minWidth: '18px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }} title={asp.type}
              >{asp.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => onNavigate(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet2.canonicalName) } }} title={isTransit ? `Natal ${asp.planet2.name}` : asp.planet2.name}
              >{asp.planet2.symbol}</span>
              <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
                {isTransit && <span style={{ color: TRANSIT_COLOR }}>tr. </span>}
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onNavigate(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet1.canonicalName) } }}>{asp.planet1.name}</span>
                {' '}
                <span
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', color: colors[asp.type] ?? 'var(--color-text-muted)' }}
                  onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }}
                >{asp.type}</span>
                {' '}
                {isTransit && 'natal '}
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onNavigate(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet2.canonicalName) } }}>{asp.planet2.name}</span>
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
                {isTransit && (asp.applying ? '→ ' : '← ')}{asp.orb}°
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
