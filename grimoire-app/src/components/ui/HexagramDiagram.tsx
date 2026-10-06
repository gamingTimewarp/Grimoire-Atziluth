/**
 * HexagramDiagram.tsx
 * Animated hexagram-construction diagram — moved out of
 * reference/$canonicalName.tsx's HexagramSection (its original, sole
 * owner) so the Practice page's Magic Circle widget can reuse the same
 * diagram instead of duplicating it. $canonicalName.tsx still wraps this in
 * its own <Section title="Construction"> heading; this component is just
 * the diagram itself, with no page-level framing, so it can be embedded
 * anywhere.
 */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import type { BaseEntity } from '@grimoire/core'
import { ZoomableSVGContainer } from './ZoomableSVGContainer'

const HEX_VERTEX_LABELS  = ['Saturn', 'Jupiter', 'Mars', 'Sol', 'Venus', 'Mercury']
const HEX_VERTEX_SYMBOLS = ['♄', '♃', '♂', '☉', '♀', '☿']
const HEX_ALL_EDGES: [number, number][] = [[0,2],[2,4],[4,0],[3,5],[5,1],[1,3]]
const HEX_VERTS = [0,1,2,3,4,5].map(i => {
  const a = (i * 60 - 90) * Math.PI / 180
  return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)] as [number, number]
})

function animCtrlBtn(primary = false): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px',
    background: primary ? 'var(--color-accent)' : 'var(--color-surface-2)',
    border: `1px solid ${primary ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: '5px', cursor: 'pointer',
    color: primary ? 'var(--color-accent-contrast)' : 'var(--color-text-muted)',
    padding: 0,
  }
}

export function HexagramDiagram({ entity }: { entity: BaseEntity }) {
  const d = entity.extendedData as Record<string, unknown>
  const steps = (d.constructionSteps as [number, number][]) ?? []
  const planetVertex = (d.planetVertex as number) ?? 0
  const planetColor = (d.planetColor as string) || 'var(--color-accent)'
  const secondColor = '#888899'

  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSteps = steps.length

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalSteps - 1) { setPlaying(false); return prev }
        return prev + 1
      })
    }, 700)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [playing, totalSteps])

  const handleReset     = () => { setPlaying(false); setStep(-1) }
  const handleBack      = () => { setPlaying(false); setStep(s => Math.max(-1, s - 1)) }
  const handleFwd       = () => { setPlaying(false); setStep(s => Math.min(totalSteps - 1, s + 1)) }
  const handleTogglePlay = () => {
    if (step >= totalSteps - 1) { setStep(-1); setPlaying(true) }
    else setPlaying(p => !p)
  }

  const completedEdges = step >= 0 ? steps.slice(0, step + 1) : steps
  const activeEdge = (step >= 0 && step < totalSteps) ? steps[step] : null
  const isComplete = step < 0

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <ZoomableSVGContainer style={{ flex: '1 1 200px', maxWidth: '240px', borderRadius: '6px' }}>
        <svg viewBox="-30 -5 160 110" width="100%" style={{ display: 'block' }}
          aria-label="Hexagram construction diagram">
          {HEX_ALL_EDGES.map(([a, b], i) => (
            <line key={i}
              x1={HEX_VERTS[a][0]} y1={HEX_VERTS[a][1]}
              x2={HEX_VERTS[b][0]} y2={HEX_VERTS[b][1]}
              stroke="var(--color-border)" strokeWidth="0.8" opacity="0.4" />
          ))}
          {completedEdges.map(([a, b], i) => {
            const isActive = !isComplete && activeEdge && activeEdge[0] === a && activeEdge[1] === b
            const color = i < 3 ? planetColor : secondColor
            return (
              <line key={i}
                x1={HEX_VERTS[a][0]} y1={HEX_VERTS[a][1]}
                x2={HEX_VERTS[b][0]} y2={HEX_VERTS[b][1]}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 1 : 0.75}
              />
            )
          })}
          {HEX_VERTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y}
              r={i === planetVertex ? 3.5 : 2.5}
              fill={i === planetVertex ? planetColor : 'var(--color-surface-2)'}
              stroke={i === planetVertex ? planetColor : 'var(--color-border)'}
              strokeWidth="1"
            />
          ))}
          {HEX_VERTS.map(([x, y], i) => {
            const lx = x + (x < 45 ? -7 : x > 55 ? 7 : 0)
            const ly = y + (y < 45 ? -5 : y > 55 ? 5 : 0)
            return (
              <text key={i} x={lx} y={ly}
                textAnchor={x < 45 ? 'end' : x > 55 ? 'start' : 'middle'}
                dominantBaseline="middle" fontSize="5"
                fill={i === planetVertex ? planetColor : 'var(--color-text-muted)'}
                style={{ userSelect: 'none' } as CSSProperties}
              >
                {HEX_VERTEX_SYMBOLS[i]} {HEX_VERTEX_LABELS[i]}
              </text>
            )
          })}
        </svg>
      </ZoomableSVGContainer>

      <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={handleReset} title="Reset" style={animCtrlBtn()}>
            <RotateCcw size={13} />
          </button>
          <button onClick={handleBack} title="Step back" style={animCtrlBtn()}>
            <SkipBack size={13} />
          </button>
          <button onClick={handleTogglePlay} title={playing ? 'Pause' : 'Play'} style={animCtrlBtn(true)}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={handleFwd} title="Step forward" style={animCtrlBtn()}>
            <SkipForward size={13} />
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', minHeight: '32px', lineHeight: '1.5' }}>
          {step < 0 ? (
            <span style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>
              Complete — press ▶ to animate
            </span>
          ) : (
            <>
              <span style={{ color: 'var(--color-text-subtle)' }}>Step {step + 1} of {totalSteps}</span>
              <br />
              <span style={{ color: 'var(--color-text)' }}>
                {HEX_VERTEX_SYMBOLS[steps[step][0]]} {HEX_VERTEX_LABELS[steps[step][0]]} → {HEX_VERTEX_SYMBOLS[steps[step][1]]} {HEX_VERTEX_LABELS[steps[step][1]]}
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          Godname: <span style={{ color: 'var(--color-text)' }}>ARARITA</span>
        </div>
      </div>
    </div>
  )
}
