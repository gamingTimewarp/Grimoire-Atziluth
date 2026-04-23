import React, { useState } from 'react'
import { ZoomableSVGContainer } from './ZoomableSVGContainer'

const CX = 150, CY = 150

function radialPos(deg: number, r: number): [number, number] {
  const rad = (deg - 90) * Math.PI / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function pentagramPath(cx: number, cy: number, r: number): string {
  const pts: [number, number][] = [0, 1, 2, 3, 4].map(i => {
    const a = (i * 72 - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
  const order = [0, 2, 4, 1, 3, 0]
  return order.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pts[v][0].toFixed(1)} ${pts[v][1].toFixed(1)}`).join(' ') + ' Z'
}

// Divine names that have entity pages
const DIVINE_NAME_LINKS: Record<string, string> = {
  'TETRAGRAMMATON': 'qabalah.divine-name.tetragrammaton',
  'ADONAI':         'qabalah.divine-name.adonai-ha-aretz',
  'EHEIEH':         'qabalah.divine-name.eheieh',
  'EL':             'qabalah.divine-name.el',
}

const REGION_INFO: Record<string, { title: string; body: string }> = {
  ring:      { title: 'Divine name ring', body: 'The ring between the two circles is inscribed with the divine names: TETRAGRAMMATON, ADONAI, AGLA, ON, EHEIEH, EL, ELOHIM, TZABAOTH. Small pentagrams appear between the names. This ring acts as the primary barrier of divine protection. Names in gold link to their entity pages.' },
  triangle:  { title: 'Triangle of Evocation', body: 'The Triangle of the Art is placed outside the circle to the East. Spirits are conjured to appear within it. The three names inscribed on its sides — ANAPHAXETON, PRIMEUMATON, and TETRAGRAMMATON — compel the spirit to remain within bounds.' },
  circle:    { title: 'Sacred space', body: 'The Magician stands within the inner circle throughout the operation. Leaving the circle while a spirit is present is forbidden in Solomonic practice. The space is consecrated before the rite begins.' },
  'cardinal-N': { title: 'North — Gabriel', body: 'Gabriel governs the North quarter and is associated with water, the Moon, and the element of receptivity and reflection. In some manuscript variants Michael and Gabriel exchange positions.' },
  'cardinal-E': { title: 'East — Raphael', body: 'Raphael governs the East quarter and is associated with air, Mercury, and the power of healing and communication. The Triangle of Evocation is placed to the East.' },
  'cardinal-S': { title: 'South — Michael', body: 'Michael governs the South quarter and is associated with fire, the Sun, and the power of divine protection and victory. He is often depicted with a sword.' },
  'cardinal-W': { title: 'West — Uriel', body: 'Uriel governs the West quarter and is associated with earth, Saturn, and the power of penitence, scholarship, and illumination of the hidden mysteries.' },
}

function SolomonicSVG({ hoveredRegion, onHover, onNavigate }: {
  hoveredRegion: string | null
  onHover: (r: string | null) => void
  onNavigate?: (cn: string) => void
}) {
  const accent = 'var(--color-accent)'
  const text   = 'var(--color-text)'
  const muted  = 'var(--color-text-muted)'
  const border = 'var(--color-border)'

  const outerR  = 130
  const innerR  = 108
  const midR    = 119

  const cardinals = [
    { deg: 0,   label: 'N', angel: 'Gabriel', cn: 'angel.archangel.gabriel' },
    { deg: 90,  label: 'E', angel: 'Raphael', cn: 'angel.archangel.raphael' },
    { deg: 180, label: 'S', angel: 'Michael', cn: 'angel.archangel.michael' },
    { deg: 270, label: 'W', angel: 'Uriel',   cn: 'angel.archangel.uriel'   },
  ]

  const triCX = CX + outerR + 38, triCY = CY
  const triR  = 28
  function triPt(deg: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [triCX + triR * Math.cos(rad), triCY + triR * Math.sin(rad)]
  }
  const [t0x, t0y] = triPt(0)
  const [t1x, t1y] = triPt(120)
  const [t2x, t2y] = triPt(240)

  const ringNames = ['TETRAGRAMMATON', 'ADONAI', 'AGLA', 'ON', 'EHEIEH', 'EL', 'ELOHIM', 'TZABAOTH']
  const pentR = 6

  return (
    <svg viewBox="-30 10 410 280" width="100%"
      style={{ display: 'block', maxWidth: '480px', margin: '0 auto' }}
      aria-label="Solomonic Circle of Art"
    >
      <g
        onMouseEnter={() => onHover('triangle')}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'default' }}
      >
        <polygon
          points={`${t0x},${t0y} ${t1x},${t1y} ${t2x},${t2y}`}
          fill={hoveredRegion === 'triangle' ? 'rgba(180,156,90,0.08)' : 'transparent'}
          stroke={hoveredRegion === 'triangle' ? accent : border}
          strokeWidth="1.2"
        />
        <text x={triCX} y={triCY - 6} textAnchor="middle" dominantBaseline="middle"
          fontSize="5.5" fill={muted} style={{ userSelect: 'none' } as React.CSSProperties}>
          ANAPHAXETON
        </text>
        <text x={triCX} y={triCY + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize="5.5" fill={muted} style={{ userSelect: 'none' } as React.CSSProperties}>
          PRIMEUMATON
        </text>
        <text x={triCX} y={triCY + 8} textAnchor="middle" dominantBaseline="middle"
          fontSize="5.5" fill={muted} style={{ userSelect: 'none' } as React.CSSProperties}>
          TETRAGRAMMATON
        </text>
        <text x={triCX} y={triCY + 20} textAnchor="middle"
          fontSize="7" fill={muted} fontStyle="italic"
          style={{ userSelect: 'none' } as React.CSSProperties}>
          Triangle of Evocation
        </text>
      </g>

      <circle cx={CX} cy={CY} r={outerR} fill="var(--color-surface-2)" stroke="none" />

      <g onMouseEnter={() => onHover('ring')} onMouseLeave={() => onHover(null)} style={{ cursor: 'default' }}>
        <circle cx={CX} cy={CY} r={outerR}
          fill={hoveredRegion === 'ring' ? 'rgba(180,156,90,0.08)' : 'var(--color-surface-2)'}
          stroke={hoveredRegion === 'ring' ? accent : border}
          strokeWidth="1.2"
        />
        <circle cx={CX} cy={CY} r={innerR}
          fill="var(--color-surface-1)"
          stroke={hoveredRegion === 'ring' ? accent : border}
          strokeWidth="1.2"
        />

        {/* Divine names — clickable if they have an entity page */}
        {ringNames.map((name, i) => {
          const deg = i * 45
          const [lx, ly] = radialPos(deg, midR)
          const linkedCn = DIVINE_NAME_LINKS[name]
          const isLinked = !!linkedCn && !!onNavigate
          return (
            <g
              key={name}
              onClick={isLinked ? () => onNavigate!(linkedCn) : undefined}
              style={{ cursor: isLinked ? 'pointer' : 'default' }}
            >
              {/* Larger invisible hit area */}
              {isLinked && (
                <ellipse
                  cx={lx} cy={ly} rx={12} ry={5}
                  fill="transparent"
                  transform={`rotate(${deg}, ${lx}, ${ly})`}
                />
              )}
              <text
                x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="5"
                fill={isLinked ? accent : muted}
                transform={`rotate(${deg}, ${lx}, ${ly})`}
                style={{ userSelect: 'none' } as React.CSSProperties}
              >
                {name}
              </text>
            </g>
          )
        })}

        {/* Pentagrams placed between divine names (22.5° offset) */}
        {[22.5, 112.5, 202.5, 292.5].map(deg => {
          const [px, py] = radialPos(deg, midR)
          return (
            <path key={deg}
              d={pentagramPath(px, py, pentR)}
              fill="none" stroke={muted} strokeWidth="0.7" />
          )
        })}
      </g>

      <g onMouseEnter={() => onHover('circle')} onMouseLeave={() => onHover(null)} style={{ cursor: 'default' }}>
        <circle cx={CX} cy={CY} r={innerR}
          fill={hoveredRegion === 'circle' ? 'rgba(180,156,90,0.04)' : 'transparent'}
          stroke="none"
        />
      </g>

      {cardinals.map(({ deg }) => {
        const [ox, oy] = radialPos(deg, outerR - 2)
        const [ix, iy] = radialPos(deg, innerR + 2)
        return <line key={deg} x1={ix} y1={iy} x2={ox} y2={oy}
          stroke={border} strokeWidth="0.5" opacity="0.5" />
      })}

      {cardinals.map(({ deg, label, angel, cn }) => {
        const [lx, ly] = radialPos(deg, innerR - 16)
        const isHovered = hoveredRegion === `cardinal-${label}`
        return (
          <g
            key={label}
            onMouseEnter={() => onHover(`cardinal-${label}`)}
            onMouseLeave={() => onHover(null)}
            onClick={onNavigate ? () => onNavigate(cn) : undefined}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
          >
            <text x={lx} y={ly - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fontWeight="600"
              fill={isHovered ? accent : text}
              style={{ userSelect: 'none' } as React.CSSProperties}
            >
              {label}
            </text>
            <text x={lx} y={ly + 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="6"
              fill={isHovered ? accent : (onNavigate ? accent : muted)}
              style={{ userSelect: 'none' } as React.CSSProperties}
            >
              {angel}
            </text>
          </g>
        )
      })}

      <line x1={CX - 8} y1={CY} x2={CX + 8} y2={CY} stroke={muted} strokeWidth="0.8" />
      <line x1={CX} y1={CY - 8} x2={CX} y2={CY + 8} stroke={muted} strokeWidth="0.8" />
    </svg>
  )
}

export function SolomonicCircleDiagram({ onNavigate }: { onNavigate?: (cn: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const regionInfo = hovered ? REGION_INFO[hovered] : null

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <ZoomableSVGContainer style={{
        flex: '1 1 300px',
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '8px', padding: '16px',
      }}>
        <SolomonicSVG hoveredRegion={hovered} onHover={setHovered} onNavigate={onNavigate} />
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
