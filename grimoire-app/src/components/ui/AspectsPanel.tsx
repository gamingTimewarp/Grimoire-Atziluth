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
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { ASPECT_DEFS } from '@/lib/astro-engine'
import type { Aspect, AspectType, Planet } from '@/lib/astro-engine'

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

type AspectSortMode = 'degree' | 'planet' | 'aspect' | 'chart'

const ASPECT_TYPE_ORDER: Record<AspectType, number> = Object.fromEntries(
  ASPECT_DEFS.map((d, i) => [d.type, i]),
) as Record<AspectType, number>

function findAspect(aspects: Aspect[], cn1: string, cn2: string): Aspect | undefined {
  return aspects.find(a =>
    (a.planet1.canonicalName === cn1 && a.planet2.canonicalName === cn2) ||
    (a.planet1.canonicalName === cn2 && a.planet2.canonicalName === cn1),
  )
}

interface AspectsPanelProps {
  aspects: Aspect[]
  /** The chart's own planets, in the chart's own display order — used both as the
   * "By Planet" sort key (Sun, Moon, Mercury, ... rather than an arbitrary
   * alphabetical one) and as the row/column headers for the grid view. */
  planets: Planet[]
  onNavigate: (canonicalName: string) => void
}

export function AspectsPanel({ aspects, planets, onNavigate }: AspectsPanelProps) {
  const [sortMode, setSortMode] = useState<AspectSortMode>('degree')
  const [isOpen, setIsOpen] = useState(true)

  if (aspects.length === 0) return null

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
          Aspects ({aspects.length})
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
                { value: 'chart',  label: 'Chart',   title: 'Classic planet x planet aspect grid' },
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
                {planets.map(colPlanet => (
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
                    style={{ width: cellSize, height: cellSize, textAlign: 'center', color: 'var(--color-text-subtle)', fontWeight: 400, cursor: 'pointer', border: '1px solid var(--color-border)' }}
                    onClick={() => onNavigate(rowPlanet.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(rowPlanet.canonicalName) } }}
                    title={rowPlanet.name}
                  >
                    {rowPlanet.symbol}
                  </th>
                  {planets.map((colPlanet, j) => {
                    if (j <= i) {
                      return <td key={colPlanet.canonicalName} style={{ width: cellSize, height: cellSize, border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }} />
                    }
                    const asp = findAspect(aspects, rowPlanet.canonicalName, colPlanet.canonicalName)
                    return (
                      <td key={colPlanet.canonicalName} style={{ width: cellSize, height: cellSize, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                        {asp && (
                          <span
                            role="button" tabIndex={0}
                            style={{ color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', cursor: 'pointer' }}
                            onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }}
                            title={`${rowPlanet.name} ${asp.type} ${colPlanet.name} — ${asp.orb}° orb`}
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
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => onNavigate(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet1.canonicalName) } }} title={asp.planet1.name}
              >{asp.planet1.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '18px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }} title={asp.type}
              >{asp.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => onNavigate(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet2.canonicalName) } }} title={asp.planet2.name}
              >{asp.planet2.symbol}</span>
              <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onNavigate(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet1.canonicalName) } }}>{asp.planet1.name}</span>
                {' '}
                <span
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)' }}
                  onClick={() => onNavigate('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('astrology.aspect.' + asp.type) } }}
                >{asp.type}</span>
                {' '}
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onNavigate(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(asp.planet2.canonicalName) } }}>{asp.planet2.name}</span>
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>{asp.orb}°</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
