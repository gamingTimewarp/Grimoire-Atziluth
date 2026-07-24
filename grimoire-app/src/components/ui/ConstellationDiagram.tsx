import React, { useState } from 'react'
import { ZoomableSVGContainer } from './ZoomableSVGContainer'

/** One plotted point in a constellation's schematic star chart. */
export interface ConstellationStarPoint {
  /** Local id, only used to reference this point from `lines`. */
  id: string
  x: number
  y: number
  /** Relative brightness tier for sizing: 1 (brightest) – 5 (faint/filler). */
  mag: number
  /** Present only when this point is a star that has its own fixed-star entity page. */
  canonicalName?: string
  /** Display name — only meaningful (and only shown) when canonicalName is set. */
  label?: string
}

export interface ConstellationDiagramData {
  viewBox: string
  stars: ConstellationStarPoint[]
  /** Traditional asterism connecting lines, by star id. */
  lines: [string, string][]
}

function starRadius(mag: number): number {
  return Math.max(1.8, 6.5 - mag * 1.1)
}

function GuidelinesToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Guidelines</span>
      <span
        style={{
          width: '36px', height: '20px', borderRadius: '10px', padding: 0,
          background: on ? 'var(--color-accent)' : 'var(--color-border)', position: 'relative', flexShrink: 0,
          transition: 'background 0.15s', display: 'inline-block',
        }}
      >
        <span style={{
          width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '3px', left: on ? '19px' : '3px',
          transition: 'left 0.15s', display: 'block',
        }} />
      </span>
    </button>
  )
}

export function ConstellationDiagram({
  data,
  onNavigate,
}: {
  data: ConstellationDiagramData
  onNavigate?: (canonicalName: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [showLines, setShowLines] = useState(true)
  const byId = new Map(data.stars.map(s => [s.id, s]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <GuidelinesToggle on={showLines} onToggle={() => setShowLines(v => !v)} />
      </div>
      <ZoomableSVGContainer style={{
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '8px', padding: '16px',
      }}>
        <svg viewBox={data.viewBox} width="100%"
          style={{ display: 'block', maxWidth: '480px', margin: '0 auto' }}
          aria-label="Constellation star chart"
        >
          {showLines && data.lines.map(([a, b], i) => {
            const sa = byId.get(a)
            const sb = byId.get(b)
            if (!sa || !sb) return null
            return (
              <line key={i} x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                stroke="var(--color-border)" strokeWidth="1" opacity="0.7"
              />
            )
          })}
          {data.stars.map(s => {
            const isNamed = !!s.canonicalName
            const isHovered = hovered === s.id
            const r = starRadius(s.mag)
            return (
              <g
                key={s.id}
                onMouseEnter={() => isNamed && setHovered(s.id)}
                onMouseLeave={() => isNamed && setHovered(null)}
                onClick={isNamed && onNavigate ? () => onNavigate!(s.canonicalName!) : undefined}
                style={{ cursor: isNamed && onNavigate ? 'pointer' : 'default' }}
              >
                {isNamed && <circle cx={s.x} cy={s.y} r={r + 7} fill="transparent" />}
                <circle
                  cx={s.x} cy={s.y} r={r}
                  fill={isNamed ? (isHovered ? 'var(--color-accent)' : 'var(--color-text)') : 'var(--color-text-subtle)'}
                  opacity={isNamed ? 1 : 0.5}
                />
                {isNamed && (
                  <text
                    x={s.x + r + 5} y={s.y + 3}
                    fontSize="9"
                    fill={isHovered ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                    style={{ userSelect: 'none', textDecoration: isHovered ? 'underline' : 'none' } as React.CSSProperties}
                  >
                    {s.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </ZoomableSVGContainer>
    </div>
  )
}
