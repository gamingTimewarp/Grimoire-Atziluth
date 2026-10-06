/**
 * KameaDiagram.tsx
 * The planetary magic square (kamea) grid, with a sigil-overlay toggle —
 * moved out of reference/$canonicalName.tsx's KameaSection (its original,
 * sole owner) so the Practice page's Magic Circle widget can reuse the same
 * diagram instead of duplicating it. $canonicalName.tsx still wraps this in
 * its own <Section title="Magic Square"> heading; this component is just
 * the diagram itself, with no page-level framing, so it can be embedded
 * anywhere.
 */

import { useMemo, useState } from 'react'
import type { BaseEntity } from '@grimoire/core'

type KameaOverlay = 'none' | 'intelligence' | 'spirit' | 'full'

interface KameaSigilDef { name: string; cells: number[] }
interface KameaExtData {
  grid: number[][]
  sigils: { intelligence: KameaSigilDef; spirit: KameaSigilDef }
  order: number
  magicConstant: number
  totalSum: number
  intelligenceName: string
  spiritName: string
}

export function KameaDiagram({ entity }: { entity: BaseEntity }) {
  const d = entity.extendedData as unknown as KameaExtData
  const [overlay, setOverlay] = useState<KameaOverlay>('none')

  const cellPos = useMemo(() => {
    const map = new Map<number, [number, number]>()
    d.grid.forEach((row, r) => row.forEach((val, c) => map.set(val, [r, c])))
    return map
  }, [d.grid])

  const n = d.order
  // Font size scales with grid size so numbers fit comfortably
  const cellFontSize = n <= 4 ? '14px' : n <= 6 ? '12px' : n <= 7 ? '11px' : '9px'
  const sumFontSize  = n <= 4 ? '11px' : '9px'
  // Max container width so large grids don't overflow narrow mobile viewports
  const maxW = Math.min(n * 46 + 36, 420)

  const fullSequence = useMemo(() => Array.from({ length: n * n }, (_, i) => i + 1), [n])

  const overlayColor =
    overlay === 'intelligence' ? '#c8a84b'
    : overlay === 'spirit'     ? '#c84b4b'
    :                            '#4b8bc8'

  const overlayLabel =
    overlay === 'intelligence' ? `${d.sigils.intelligence.name} (Intelligence)`
    : overlay === 'spirit'     ? `${d.sigils.spirit.name} (Spirit)`
    : overlay === 'full'       ? `Full sequence (1–${n * n})`
    : null

  return (
    <div style={{ width: '100%', maxWidth: `${maxW}px`, margin: '0 auto' }}>
      {/* Outer grid: [data+overlay | row-sums] over [col-sums | Σ] */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: '1fr auto', gap: '4px' }}>
        {/* Data cells with SVG sigil overlay */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gap: 0,
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {d.grid.flat().map((val, i) => {
              const r = Math.floor(i / n)
              const c = i % n
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-surface-2)',
                    borderRight: c < n - 1 ? '1px solid var(--color-border)' : undefined,
                    borderBottom: r < n - 1 ? '1px solid var(--color-border)' : undefined,
                    fontSize: cellFontSize,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--color-text)',
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {val}
                </div>
              )
            })}
          </div>
          {overlay !== 'none' && (
            <KameaSigilOverlay
              cells={overlay === 'full' ? fullSequence : d.sigils[overlay].cells}
              cellPos={cellPos}
              n={n}
              color={overlayColor}
            />
          )}
        </div>

        {/* Row sums */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingLeft: '4px' }}>
          {d.grid.map((row, r) => (
            <div key={r} style={{ fontSize: sumFontSize, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {row.reduce((s, v) => s + v, 0)}
            </div>
          ))}
        </div>

        {/* Column sums */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {Array.from({ length: n }, (_, c) => (
            <div key={c} style={{ display: 'flex', justifyContent: 'center', paddingTop: '2px', fontSize: sumFontSize, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {d.grid.reduce((s, row) => s + row[c], 0)}
            </div>
          ))}
        </div>

        {/* Empty bottom-right cell — keeps grid layout intact */}
        <div />
      </div>
      {/* Stats line */}
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '8px 0 0' }}>
        {n}×{n} · magic constant {d.magicConstant} · total {d.totalSum}
      </p>

      {/* Sigil toggle buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(['none', 'intelligence', 'spirit', 'full'] as const).map(opt => {
          const label =
            opt === 'none'         ? 'No Sigil'
            : opt === 'intelligence' ? d.sigils.intelligence.name
            : opt === 'spirit'       ? d.sigils.spirit.name
            :                          `1–${n * n}`
          const active = overlay === opt
          return (
            <button
              key={opt}
              onClick={() => setOverlay(opt)}
              style={{
                padding: '5px 14px',
                background: active ? 'var(--color-accent)' : 'var(--color-surface-2)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: '5px',
                fontSize: '12px',
                color: active ? 'var(--color-accent-contrast)' : 'var(--color-text)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              {opt === 'intelligence' ? '✦ ' : opt === 'spirit' ? '⬡ ' : opt === 'full' ? '◈ ' : ''}{label}
            </button>
          )
        })}
      </div>
      {overlayLabel && (
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textAlign: 'center', margin: '8px 0 0', fontStyle: 'italic' }}>
          {overlayLabel}
        </p>
      )}
    </div>
  )
}

function KameaSigilOverlay({
  cells,
  cellPos,
  n,
  color,
}: {
  cells: number[]
  cellPos: Map<number, [number, number]>
  n: number
  color: string
}) {
  // Map each cell number to SVG coords (0-100 range, zero gaps)
  const toXY = ([r, c]: [number, number]): [number, number] =>
    [(c + 0.5) / n * 100, (r + 0.5) / n * 100]

  const rawPoints = cells
    .map(cell => cellPos.get(cell))
    .filter((pos): pos is [number, number] => pos !== undefined)
    .map(toXY)

  if (rawPoints.length < 2) return null

  // Deduplicate consecutive identical points; track loop positions instead
  const points: [number, number][] = []
  const loops: [number, number][] = []
  rawPoints.forEach((pt, i) => {
    const prev = rawPoints[i - 1]
    if (prev && prev[0] === pt[0] && prev[1] === pt[1]) {
      loops.push(pt)
    } else {
      points.push(pt)
    }
  })

  const first = points[0]
  const last  = points[points.length - 1]

  // Perpendicular end-bar
  const prev2 = points[points.length - 2] ?? first
  const angle = Math.atan2(last[1] - prev2[1], last[0] - prev2[0])
  const perp  = angle + Math.PI / 2
  const barLen = 3.5
  const bar = {
    x1: last[0] + Math.cos(perp) * barLen, y1: last[1] + Math.sin(perp) * barLen,
    x2: last[0] - Math.cos(perp) * barLen, y2: last[1] - Math.sin(perp) * barLen,
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    >
      <g opacity="0.55">
        {/* Drop shadow for readability */}
        <path d={pathD} stroke="rgba(0,0,0,0.5)" strokeWidth="3.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Main sigil path */}
        <path d={pathD} stroke={color} strokeWidth="2" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Loop indicators (repeated cell) */}
        {loops.map(([lx, ly], i) => (
          <circle key={i} cx={lx} cy={ly} r="4" fill="none"
            stroke={color} strokeWidth="1.5" />
        ))}
        {/* Start: filled circle */}
        <circle cx={first[0]} cy={first[1]} r="2.8"
          fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      {/* End: perpendicular bar */}
      <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2}
        stroke={color} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
