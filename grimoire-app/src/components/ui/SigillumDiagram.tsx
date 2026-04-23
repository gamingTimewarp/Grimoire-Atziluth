import React, { useState } from 'react'
import { ZoomableSVGContainer } from './ZoomableSVGContainer'

const CX = 150, CY = 150, OUTER_R = 135

function heptPt(index: number, r: number, offset = 0): [number, number] {
  const angle = (index * (360 / 7) - 90 + offset) * Math.PI / 180
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function heptagramEdges(r: number): [number, number, number, number][] {
  return [0, 1, 2, 3, 4, 5, 6].map(i => {
    const [x1, y1] = heptPt(i, r)
    const [x2, y2] = heptPt((i + 2) % 7, r)
    return [x1, y1, x2, y2] as [number, number, number, number]
  })
}

function innerHeptPt(index: number): [number, number] {
  return heptPt(index, OUTER_R * 0.45, 360 / 14)
}

const KING_NAMES = ['Bobogel', 'Bnaspol', 'Bnapsen', 'Blisdon', 'Bynepor', 'Bmamgal', 'Baligon']
const ANGEL_NAMES = ['Ix', 'Pal', 'Med', 'Na', 'Graph', 'Vaa', 'Ceph']

const REGION_INFO: Record<string, { title: string; body: string }> = {
  'outer-ring': {
    title: 'Outer ring — Heptarchic Kings',
    body: 'The seven Heptarchic kings are inscribed in the outer ring near the points of the heptagram: Bobogel (Sol), Bnaspol (Luna), Bnapsen (Mars), Blisdon (Mercury), Bynepor (Jupiter), Bmamgal (Venus), Baligon (Saturn). Each king governs a planetary sphere and commands a corresponding prince.',
  },
  heptagram: {
    title: 'Heptagram — seven-pointed star',
    body: 'The heptagram ({7/2} star polygon) is the primary geometric form of the Sigillum. It represents the seven classical planets and seven Heptarchic angels. In Dee\'s instructions, the star and its intersecting lines generate the positions for all the inscribed names.',
  },
  'inner-heptagon': {
    title: 'Inner heptagon — angel names',
    body: 'The heptagon formed at the intersections of the heptagram encloses the names of the seven ensigns: Ix, Pal, Med, Na, Graph, Vaa, Ceph. Within this heptagon sits a smaller heptagram with additional angelic names. The inner regions encode the most sacred aspects of the angelic hierarchy.',
  },
  center: {
    title: 'AEMETH — Truth',
    body: 'At the centre of the Sigillum is the word AEMETH (אמת), Hebrew for "truth". This is the principal divine name and the key to the seal\'s power. The entire sigillum is the Seal of the Truth of God.',
  },
}

function SigillumSVG({ hoveredRegion, onHover }: {
  hoveredRegion: string | null
  onHover: (r: string | null) => void
}) {
  const border = 'var(--color-border)'
  const accent = 'var(--color-accent)'
  const muted  = 'var(--color-text-muted)'
  const subtle = 'var(--color-text-subtle)'

  const starR      = OUTER_R * 0.80
  const innerHepR  = OUTER_R * 0.47
  const outerTextR = OUTER_R * 0.91
  const innerTextR = innerHepR * 0.85
  const edges      = heptagramEdges(starR)

  return (
    <svg viewBox="5 5 290 290" width="100%"
      style={{ display: 'block', maxWidth: '420px', margin: '0 auto' }}
      aria-label="Sigillum Dei Aemeth"
    >
      <circle cx={CX} cy={CY} r={OUTER_R}
        fill="var(--color-surface-2)"
        stroke={border} strokeWidth="1.5" />

      <circle cx={CX} cy={CY} r={OUTER_R}
        fill="transparent"
        stroke={hoveredRegion === 'outer-ring' ? accent : 'transparent'}
        strokeWidth="12" opacity="0.12"
        onMouseEnter={() => onHover('outer-ring')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      />

      <g
        onMouseEnter={() => onHover('heptagram')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      >
        {edges.map(([x1, y1, x2, y2], i) => (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={hoveredRegion === 'heptagram' ? accent : muted}
            strokeWidth={hoveredRegion === 'heptagram' ? '1.5' : '1'}
            opacity={hoveredRegion === 'heptagram' ? 1 : 0.6}
          />
        ))}
      </g>

      <polygon
        points={[0,1,2,3,4,5,6].map(i => innerHeptPt(i).join(',')).join(' ')}
        fill="var(--color-surface-1)"
        stroke={hoveredRegion === 'inner-heptagon' ? accent : border}
        strokeWidth="1"
        onMouseEnter={() => onHover('inner-heptagon')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      />

      <g
        onMouseEnter={() => onHover('inner-heptagon')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      >
        {heptagramEdges(innerHepR * 0.6).map(([x1, y1, x2, y2], i) => (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={hoveredRegion === 'inner-heptagon' ? accent : muted}
            strokeWidth="0.7" opacity="0.5"
          />
        ))}
      </g>

      {KING_NAMES.map((name, i) => {
        const [vx, vy] = heptPt(i, outerTextR)
        const angleDeg = i * (360 / 7) - 90
        return (
          <text key={name}
            x={vx} y={vy}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="6.5" fontWeight="500"
            fill={hoveredRegion === 'outer-ring' ? accent : muted}
            transform={`rotate(${angleDeg + 90}, ${vx}, ${vy})`}
            style={{ userSelect: 'none' } as React.CSSProperties}
          >
            {name}
          </text>
        )
      })}

      {ANGEL_NAMES.map((name, i) => {
        const [vx, vy] = heptPt(i, innerTextR, 360 / 14)
        return (
          <text key={name} x={vx} y={vy}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="6" fill={hoveredRegion === 'inner-heptagon' ? accent : subtle}
            style={{ userSelect: 'none' } as React.CSSProperties}
          >
            {name}
          </text>
        )
      })}

      {[0,1,2,3,4,5,6].map(i => {
        const [vx, vy] = heptPt(i, starR)
        return (
          <circle key={i} cx={vx} cy={vy} r={3.5}
            fill="var(--color-surface-2)"
            stroke={muted} strokeWidth="0.8"
          />
        )
      })}

      <g
        onMouseEnter={() => onHover('center')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      >
        <circle cx={CX} cy={CY} r={18}
          fill={hoveredRegion === 'center' ? 'rgba(180,156,90,0.12)' : 'transparent'}
          stroke={hoveredRegion === 'center' ? accent : 'transparent'}
          strokeWidth="1"
        />
        <text x={CX} y={CY - 4}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="700" letterSpacing="2"
          fill={hoveredRegion === 'center' ? accent : 'var(--color-text)'}
          style={{ userSelect: 'none' } as React.CSSProperties}
        >
          AEMETH
        </text>
        <text x={CX} y={CY + 9}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fill={muted}
          style={{ userSelect: 'none' } as React.CSSProperties}
        >
          אמת
        </text>
      </g>
    </svg>
  )
}

export function SigillumDiagram() {
  const [hovered, setHovered] = useState<string | null>(null)
  const regionInfo = hovered ? REGION_INFO[hovered] : null

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <ZoomableSVGContainer style={{
        flex: '1 1 260px',
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '8px', padding: '16px',
      }}>
        <SigillumSVG hoveredRegion={hovered} onHover={setHovered} />
      </ZoomableSVGContainer>
      <div style={{ flex: '1 1 180px', minHeight: '100px' }}>
        {regionInfo ? (
          <div style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '8px', padding: '14px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px' }}>
              {regionInfo.title}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
              {regionInfo.body}
            </p>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic', padding: '14px' }}>
            Hover over any region of the diagram to see details.
          </div>
        )}
      </div>
    </div>
  )
}
