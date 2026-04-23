import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'

// ─── Geometry ─────────────────────────────────────────────────────────────────

// Pentagram vertices, clockwise from top (radius 38, centre 50,50)
// 0 = Spirit (top)
// 1 = Fire   (upper-right)
// 2 = Earth  (lower-right)
// 3 = Water  (lower-left)
// 4 = Air    (upper-left)
const R = 38
const VERTICES: [number, number][] = [0, 1, 2, 3, 4].map(i => {
  const angle = (i * 72 - 90) * Math.PI / 180
  return [50 + R * Math.cos(angle), 50 + R * Math.sin(angle)]
})

const VERTEX_LABELS = ['Spirit', 'Fire', 'Earth', 'Water', 'Air']
const VERTEX_COLORS = ['#8833cc', '#d06030', '#608050', '#4070c0', '#c0a030']

const FRAME_MS = 800

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PentagramStep { from: number; to: number }

export interface PentagramVariant {
  label: string
  steps: PentagramStep[]
  color: string
  startLabel: string
}

export interface PentagramDiagramProps {
  invoking: PentagramVariant
  banishing: PentagramVariant
  elementVertex: number
  elementLabel: string
}

// ─── SVG diagram ──────────────────────────────────────────────────────────────

function PentagramSVG({
  steps,
  currentStep,
  color,
  elementVertex,
}: {
  steps: PentagramStep[]
  currentStep: number
  color: string
  elementVertex: number
}) {
  const completed = steps.slice(0, currentStep)
  const active    = currentStep > 0 && currentStep <= steps.length
    ? steps[currentStep - 1]
    : null

  return (
    <svg viewBox="0 0 100 100" width="100%" style={{ display: 'block', maxWidth: '300px', margin: '0 auto' }}>
      <defs>
        <marker id="penta-arrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M 0 0 L 6 2.5 L 0 5 Z" fill={color} />
        </marker>
        <marker id="penta-arrow-muted" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
          <path d="M 0 0 L 6 2.5 L 0 5 Z" fill="var(--color-border)" />
        </marker>
      </defs>

      {/* Ghost outline — all 5 edges of the star dimmed */}
      {[[0,2],[2,4],[4,1],[1,3],[3,0]].map(([a, b], i) => {
        const [x1, y1] = VERTICES[a], [x2, y2] = VERTICES[b]
        const dx = x2 - x1, dy = y2 - y1
        const d = Math.sqrt(dx*dx + dy*dy)
        return (
          <line key={i}
            x1={x1 + dx/d*3} y1={y1 + dy/d*3}
            x2={x2 - dx/d*3} y2={y2 - dy/d*3}
            stroke="var(--color-border)" strokeWidth="0.6" opacity="0.4" />
        )
      })}

      {/* Completed lines */}
      {completed.map((s, i) => {
        const [x1, y1] = VERTICES[s.from], [x2, y2] = VERTICES[s.to]
        const dx = x2 - x1, dy = y2 - y1
        const d = Math.sqrt(dx*dx + dy*dy)
        return (
          <line key={i}
            x1={x1 + dx/d*3} y1={y1 + dy/d*3}
            x2={x2 - dx/d*4} y2={y2 - dy/d*4}
            stroke={color} strokeWidth="1.5" strokeLinecap="round"
            markerEnd="url(#penta-arrow)" />
        )
      })}

      {/* Active (current) line — highlighted */}
      {active && (() => {
        const [x1, y1] = VERTICES[active.from], [x2, y2] = VERTICES[active.to]
        const dx = x2 - x1, dy = y2 - y1
        const d = Math.sqrt(dx*dx + dy*dy)
        return (
          <line
            x1={x1 + dx/d*3} y1={y1 + dy/d*3}
            x2={x2 - dx/d*4} y2={y2 - dy/d*4}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
            opacity="1"
            markerEnd="url(#penta-arrow)" />
        )
      })()}

      {/* Vertex circles */}
      {VERTICES.map(([vx, vy], i) => {
        const isElement = i === elementVertex
        const isStart   = currentStep > 0 && steps[0].from === i
        const isActive  = active && (active.from === i || active.to === i)
        return (
          <g key={i}>
            <circle cx={vx} cy={vy} r={isElement ? 5.5 : 4}
              fill={VERTEX_COLORS[i]}
              stroke={isActive ? 'var(--color-text)' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isActive ? '1.5' : '0.8'}
              opacity={currentStep === 0 ? 0.6 : 1}
            />
            {isElement && (
              <circle cx={vx} cy={vy} r={7.5}
                fill="none" stroke={VERTEX_COLORS[i]}
                strokeWidth="1" opacity="0.5" />
            )}
            {isStart && currentStep === 0 && (
              <circle cx={vx} cy={vy} r={7}
                fill="none" stroke={color}
                strokeWidth="1" opacity="0.7"
                strokeDasharray="2 2" />
            )}
          </g>
        )
      })}

      {/* Vertex labels */}
      {VERTICES.map(([vx, vy], i) => {
        const dx = vx - 50, dy = vy - 50
        const d = Math.sqrt(dx*dx + dy*dy)
        const lx = vx + (dx/d) * 14
        const ly = vy + (dy/d) * 14
        const anchor = vx < 38 ? 'end' : vx > 62 ? 'start' : 'middle'
        return (
          <text key={i} x={lx} y={ly}
            textAnchor={anchor} dominantBaseline="middle"
            fontSize="6" fontWeight={i === elementVertex ? '700' : '400'}
            fill={i === elementVertex ? VERTEX_COLORS[i] : 'var(--color-text-muted)'}
            style={{ userSelect: 'none' } as React.CSSProperties}
          >
            {VERTEX_LABELS[i]}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Playback controls ────────────────────────────────────────────────────────

function StepControls({
  step, maxStep, isPlaying,
  onPlay, onReset, onBack, onForward,
}: {
  step: number; maxStep: number; isPlaying: boolean
  onPlay: () => void; onReset: () => void; onBack: () => void; onForward: () => void
}) {
  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '5px 10px',
    background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
    borderRadius: '4px', color: 'var(--color-text-muted)',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
    gap: '4px',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <button onClick={onReset} style={btnStyle} title="Reset">
        <RotateCcw size={11} />
      </button>
      <button onClick={onBack} style={btnStyle} title="Step back" disabled={step === 0}>
        <SkipBack size={11} />
      </button>
      <button
        onClick={onPlay}
        style={{
          ...btnStyle,
          background: isPlaying ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
          borderColor: isPlaying ? 'var(--color-accent)' : 'var(--color-border)',
          color: isPlaying ? 'var(--color-accent)' : 'var(--color-text-muted)',
          padding: '5px 14px',
        }}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={onForward} style={btnStyle} title="Step forward" disabled={step >= maxStep}>
        <SkipForward size={11} />
      </button>
      <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', minWidth: '60px', textAlign: 'center' }}>
        {step === 0 ? 'Ready' : step === maxStep ? 'Complete' : `Step ${step} / ${maxStep}`}
      </span>
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

export function PentagramDiagram({ invoking, banishing, elementVertex, elementLabel }: PentagramDiagramProps) {
  const [mode, setMode]         = useState<'invoking' | 'banishing'>('invoking')
  const [step, setStep]         = useState(0)
  const [isPlaying, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const variant = mode === 'invoking' ? invoking : banishing
  const maxStep = variant.steps.length

  // Reset step when switching modes
  const switchMode = (m: 'invoking' | 'banishing') => {
    setMode(m); setStep(0); setPlaying(false)
  }

  // Playback loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      setStep(s => {
        if (s >= maxStep) { setPlaying(false); return s }
        return s + 1
      })
    }, FRAME_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, maxStep, mode])

  const reset    = () => { setStep(0); setPlaying(false) }
  const stepBack = () => { setStep(s => Math.max(0, s - 1)); setPlaying(false) }
  const stepFwd  = () => {
    if (step >= maxStep) return
    setStep(s => s + 1)
    setPlaying(false)
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {(['invoking', 'banishing'] as const).map(m => (
          <button key={m}
            onClick={() => switchMode(m)}
            style={{
              padding: '6px 16px',
              background: mode === m ? 'var(--color-accent-muted)' : 'var(--color-surface-2)',
              border: `1px solid ${mode === m ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '4px',
              color: mode === m ? 'var(--color-accent)' : 'var(--color-text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Diagram */}
      <div style={{ marginBottom: '12px' }}>
        <PentagramSVG
          steps={variant.steps}
          currentStep={step}
          color={variant.color}
          elementVertex={elementVertex}
        />
      </div>

      {/* Step description */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', minHeight: '18px', marginBottom: '10px' }}>
        {step === 0
          ? `Start at the ${VERTEX_LABELS[variant.steps[0]?.from ?? 0]} point — ${variant.startLabel}`
          : step === maxStep
          ? `${elementLabel} ${mode} pentagram complete`
          : (() => {
              const s = variant.steps[step - 1]
              return `Step ${step}: ${VERTEX_LABELS[s.from]} → ${VERTEX_LABELS[s.to]}`
            })()
        }
      </div>

      {/* Controls */}
      <StepControls
        step={step} maxStep={maxStep} isPlaying={isPlaying}
        onPlay={() => {
          if (step >= maxStep) { setStep(0) }
          setPlaying(p => !p)
        }}
        onReset={reset}
        onBack={stepBack}
        onForward={stepFwd}
      />
    </div>
  )
}
