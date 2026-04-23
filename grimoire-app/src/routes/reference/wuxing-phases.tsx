import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'

export const Route = createFileRoute('/reference/wuxing-phases')({
  component: WuXingPhasesPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

// Clockwise from top: Wood → Fire → Earth → Metal → Water
// This arrangement makes the generative cycle trace the outer pentagon (clockwise)
// and the controlling cycle trace the inner star (skip-one connections).
const PHASE_ORDER = [
  'wuxing.phase.wood',
  'wuxing.phase.fire',
  'wuxing.phase.earth',
  'wuxing.phase.metal',
  'wuxing.phase.water',
]

const PHASE_COLORS: Record<string, string> = {
  'wuxing.phase.wood':  '#4a8f4a',
  'wuxing.phase.fire':  '#b83838',
  'wuxing.phase.earth': '#9e7a18',
  'wuxing.phase.metal': '#5a7e9a',
  'wuxing.phase.water': '#2a5e96',
}

const GEN_COLOR  = '#6abf6a'   // sheng 生 — generative / nourishing
const CTRL_COLOR = '#c07840'   // ke 克  — controlling / restraining

// Traditional descriptions for each arrow, indexed by PHASE_ORDER position
const GEN_LABELS = [
  'Wood feeds Fire',
  'Fire creates Earth',
  'Earth bears Metal',
  'Metal collects Water',
  'Water nourishes Wood',
]
const CTRL_LABELS = [
  'Wood parts Earth',
  'Fire melts Metal',
  'Earth dams Water',
  'Metal cuts Wood',
  'Water quenches Fire',
]

// ─── SVG geometry ─────────────────────────────────────────────────────────────

const CX = 200, CY = 200, R = 138, NODE_R = 30

const ANGLES = PHASE_ORDER.map((_, i) => (i * 72 - 90) * Math.PI / 180)

function nodePos(i: number): [number, number] {
  return [CX + R * Math.cos(ANGLES[i]), CY + R * Math.sin(ANGLES[i])]
}

const POSITIONS = PHASE_ORDER.map((_, i) => nodePos(i))

/** Compute start/end of a line between two node centres, offset to their edges. */
function arrowLine(
  from: [number, number],
  to: [number, number],
  fromR = NODE_R + 4,
  toR   = NODE_R + 4,
) {
  const dx = to[0] - from[0], dy = to[1] - from[1]
  const d  = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / d, uy = dy / d
  return { x1: from[0] + ux * fromR, y1: from[1] + uy * fromR,
           x2: to[0]   - ux * toR,   y2: to[1]   - uy * toR }
}

/** Label anchor + position placed radially outside the node circle. */
function labelProps(i: number): { x: number; y: number; anchor: 'middle' | 'start' | 'end' } {
  const [nx, ny] = POSITIONS[i]
  const dx = nx - CX, dy = ny - CY
  const d  = Math.sqrt(dx * dx + dy * dy)
  const off = NODE_R + 30
  const lx  = nx + (dx / d) * off
  const ly  = ny + (dy / d) * off
  const anchor: 'middle' | 'start' | 'end' =
    nx < CX - 12 ? 'end' : nx > CX + 12 ? 'start' : 'middle'
  return { x: lx, y: ly, anchor }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ─── Chart component ──────────────────────────────────────────────────────────

type ArrowId = { type: 'gen' | 'ctrl'; index: number }

function WuXingChart({
  phases,
  onNavigate,
}: {
  phases: BaseEntity[]
  onNavigate: (cn: string) => void
}) {
  const [hovered, setHovered]       = useState<string | null>(null)
  const [arrowHover, setArrowHover] = useState<ArrowId | null>(null)
  const [arrowSticky, setArrowSticky] = useState<ArrowId | null>(null)

  // Generative: each phase → next (mod 5)
  const genArrows = phases.map((_, i) =>
    arrowLine(POSITIONS[i], POSITIONS[(i + 1) % 5])
  )
  // Controlling: each phase → skip-two (mod 5)
  const ctrlArrows = phases.map((_, i) =>
    arrowLine(POSITIONS[i], POSITIONS[(i + 2) % 5])
  )

  /** Perpendicular midpoint for a tooltip label, offset outward from centre. */
  function tooltipPos(arrow: { x1: number; y1: number; x2: number; y2: number }) {
    const mx = (arrow.x1 + arrow.x2) / 2
    const my = (arrow.y1 + arrow.y2) / 2
    const dx = arrow.x2 - arrow.x1, dy = arrow.y2 - arrow.y1
    const d  = Math.sqrt(dx * dx + dy * dy)
    const px = -dy / d, py = dx / d   // one perpendicular unit vector
    // Choose the direction that points away from the centre of the chart
    const sign = (mx - CX) * px + (my - CY) * py >= 0 ? 1 : -1
    return { x: mx + sign * px * 14, y: my + sign * py * 14 }
  }

  const activeId = arrowSticky ?? arrowHover
  const activeArrow = activeId
    ? {
        arrow: activeId.type === 'gen' ? genArrows[activeId.index] : ctrlArrows[activeId.index],
        label: activeId.type === 'gen' ? GEN_LABELS[activeId.index] : CTRL_LABELS[activeId.index],
        color: activeId.type === 'gen' ? GEN_COLOR : CTRL_COLOR,
      }
    : null

  return (
    // viewBox extends beyond 0–400 on all sides to accommodate radial labels
    <svg
      viewBox="-40 -30 480 460"
      width="100%"
      style={{ display: 'block', maxWidth: '420px', margin: '0 auto', overflow: 'visible' }}
      aria-label="Wu Xing Five Phases pentagram"
      onClick={() => setArrowSticky(null)}
    >
      {/* Transparent background hit target so tapping empty space dismisses sticky tooltip */}
      <rect x="-40" y="-30" width="480" height="460" fill="transparent" />
      <defs>
        <marker id="wuxing-gen-head" markerWidth="8" markerHeight="6"
          refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill={GEN_COLOR} />
        </marker>
        <marker id="wuxing-ctrl-head" markerWidth="8" markerHeight="6"
          refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill={CTRL_COLOR} />
        </marker>
      </defs>

      {/* Generative cycle — outer pentagon, solid arrows */}
      {genArrows.map(({ x1, y1, x2, y2 }, i) => (
        <g key={`gen-${i}`}
          onMouseEnter={() => setArrowHover({ type: 'gen', index: i })}
          onMouseLeave={() => setArrowHover(null)}
          onClick={(e) => { e.stopPropagation(); setArrowSticky({ type: 'gen', index: i }) }}
          style={{ cursor: 'default' }}
        >
          {/* Wider invisible stroke as hit target */}
          <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="transparent" strokeWidth="12" />
          <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={GEN_COLOR} strokeWidth="2"
            markerEnd="url(#wuxing-gen-head)"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Controlling cycle — inner star, dashed arrows */}
      {ctrlArrows.map(({ x1, y1, x2, y2 }, i) => (
        <g key={`ctrl-${i}`}
          onMouseEnter={() => setArrowHover({ type: 'ctrl', index: i })}
          onMouseLeave={() => setArrowHover(null)}
          onClick={(e) => { e.stopPropagation(); setArrowSticky({ type: 'ctrl', index: i }) }}
          style={{ cursor: 'default' }}
        >
          <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="transparent" strokeWidth="12" />
          <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={CTRL_COLOR} strokeWidth="1.5"
            strokeDasharray="5 3"
            markerEnd="url(#wuxing-ctrl-head)"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
      ))}

      {/* Arrow tooltip — rendered above arrows, below nodes */}
      {activeArrow && (() => {
        const { x, y } = tooltipPos(activeArrow.arrow)
        return (
          <text x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="500"
            fill={activeArrow.color}
            stroke="var(--color-surface-1)"
            strokeWidth="3"
            style={{ paintOrder: 'stroke fill', pointerEvents: 'none', userSelect: 'none' } as React.CSSProperties}
          >
            {activeArrow.label}
          </text>
        )
      })()}

      {/* Phase nodes */}
      {phases.map((phase, i) => {
        const [nx, ny] = POSITIONS[i]
        const { x: lx, y: ly, anchor } = labelProps(i)
        const ext   = phase.extendedData as Record<string, string>
        const char  = ext.chineseCharacter ?? ''
        const season = ext.season ? cap(ext.season) : ''
        const dir    = ext.direction ? cap(ext.direction) : ''
        const color  = PHASE_COLORS[phase.canonicalName] ?? '#666'
        const active = hovered === phase.canonicalName

        return (
          <g
            key={phase.canonicalName}
            role="button"
            aria-label={phase.primaryDisplayName}
            onClick={(e) => { e.stopPropagation(); setArrowSticky(null); onNavigate(phase.canonicalName) }}
            onMouseEnter={() => setHovered(phase.canonicalName)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Hover ring */}
            {active && (
              <circle cx={nx} cy={ny} r={NODE_R + 6}
                fill="none" stroke={color} strokeWidth="1.5" opacity="0.45" />
            )}

            {/* Node circle */}
            <circle cx={nx} cy={ny} r={NODE_R}
              fill={color}
              stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={active ? '2' : '1'}
            />

            {/* Chinese character inside node */}
            <text x={nx} y={ny + 1}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize="18" fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {char}
            </text>

            {/* English name */}
            <text x={lx} y={ly}
              textAnchor={anchor} dominantBaseline="middle"
              fill="var(--color-text)" fontSize="13" fontWeight="500"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {phase.primaryDisplayName}
            </text>

            {/* Season · Direction */}
            <text x={lx} y={ly + 16}
              textAnchor={anchor} dominantBaseline="middle"
              fill="var(--color-text-muted)" fontSize="10"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {season}{dir ? ` · ${dir}` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WuXingPhasesPage() {
  const { engine } = useEngineStore()
  const navigate   = useNavigate()
  const [phases, setPhases] = useState<BaseEntity[]>([])

  useEffect(() => {
    if (!engine) return
    engine.adapter.listEntities({ entityType: 'wuxing.phase' }, { limit: 10, offset: 0 })
      .then(result => {
        const map = new Map<string, BaseEntity>(
          result.items.map((e: BaseEntity) => [e.canonicalName, e])
        )
        const ordered = PHASE_ORDER
          .map(cn => map.get(cn))
          .filter(Boolean) as BaseEntity[]
        setPhases(ordered)
      })
  }, [engine])

  const navToEntity = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: '0 0 8px', color: 'var(--color-text)' }}>
          I Ching Elements
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
          The Five Phases (五行 Wǔxíng) are the five fundamental forces of Chinese cosmology —
          Wood, Fire, Earth, Metal, and Water — each generating the next and controlled by the
          one three steps ahead. Click any phase to open its reference entry.
        </p>
      </div>

      {/* Chart */}
      {phases.length === 5 && (
        <ZoomableSVGContainer style={{
          marginBottom: '24px',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '8px',
        }}>
          <WuXingChart phases={phases} onNavigate={navToEntity} />
        </ZoomableSVGContainer>
      )}

      {/* Legend */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        display: 'flex',
        gap: '28px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <LegendItem color={GEN_COLOR} dashed={false} label="Shēng 生 — generative cycle" />
        <LegendItem color={CTRL_COLOR} dashed label="Kè 克 — controlling cycle" />
      </div>
    </div>
  )
}

function LegendItem({ color, dashed, label }: { color: string; dashed: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width="36" height="12" style={{ flexShrink: 0 }}>
        <line x1="0" y1="6" x2="28" y2="6"
          stroke={color} strokeWidth={dashed ? '1.5' : '2'}
          strokeDasharray={dashed ? '5 3' : undefined}
          strokeLinecap="round"
        />
        <polygon points="28,3 36,6 28,9" fill={color} />
      </svg>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}
