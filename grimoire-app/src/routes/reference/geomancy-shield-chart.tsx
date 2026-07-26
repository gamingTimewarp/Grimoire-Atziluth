import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'

export const Route = createFileRoute('/reference/geomancy-shield-chart')({
  component: GeomancyShieldChart,
})

// ─── Geomancy logic ───────────────────────────────────────────────────────────

type DotPattern = [number, number, number, number]  // 1=odd (●), 2=even (●●)

/** Combine two figures row-by-row: same parity → 2 (even), different → 1 (odd) */
function combineFigures(a: DotPattern, b: DotPattern): DotPattern {
  return [
    a[0] === b[0] ? 2 : 1,
    a[1] === b[1] ? 2 : 1,
    a[2] === b[2] ? 2 : 1,
    a[3] === b[3] ? 2 : 1,
  ]
}

/** Transpose mothers to daughters: Di = [M1[i], M2[i], M3[i], M4[i]] */
function mothersToDaughters(mothers: DotPattern[]): DotPattern[] {
  return [0, 1, 2, 3].map(i =>
    [mothers[0][i], mothers[1][i], mothers[2][i], mothers[3][i]] as DotPattern
  )
}

function patternKey(p: DotPattern | number[]): string {
  return p.join(',')
}

// ─── SVG figure renderer ──────────────────────────────────────────────────────

function FigureDots({ pattern, size = 32 }: { pattern: DotPattern; size?: number }) {
  const rowH = size / 4.5
  const cx = size / 2
  const r = rowH * 0.28
  const rowGap = rowH * 0.9

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((dots, row) => {
        const y = rowH * 0.6 + row * rowGap
        if (dots === 1) {
          return <circle key={row} cx={cx} cy={y} r={r} fill="currentColor" />
        } else {
          return (
            <g key={row}>
              <circle cx={cx - r * 1.6} cy={y} r={r} fill="currentColor" />
              <circle cx={cx + r * 1.6} cy={y} r={r} fill="currentColor" />
            </g>
          )
        }
      })}
    </svg>
  )
}

// ─── Static figure name map ───────────────────────────────────────────────────

const FIGURE_NAMES: Record<string, string> = {
  '1,2,1,2': 'Puer',
  '2,2,2,1': 'Amissio',
  '2,2,1,2': 'Albus',
  '2,2,2,2': 'Populus',
  '1,1,2,2': 'Fortuna Major',
  '2,1,1,2': 'Conjunctio',
  '2,1,2,2': 'Puella',
  '2,1,2,1': 'Rubeus',
  '1,2,2,2': 'Acquisitio',
  '1,2,2,1': 'Carcer',
  '2,1,1,1': 'Tristitia',
  '1,1,1,2': 'Laetitia',
  '1,2,1,1': 'Cauda Draconis',
  '1,1,2,1': 'Caput Draconis',
  '2,2,1,1': 'Fortuna Minor',
  '1,1,1,1': 'Via',
}

const ALL_PATTERNS: DotPattern[] = Object.keys(FIGURE_NAMES).map(k => k.split(',').map(Number) as DotPattern)

// ─── Figure selector (custom dropdown — avoids native select colour issues) ───

function FigureSelector({
  value,
  onChange,
  label,
}: {
  value: DotPattern | null
  onChange: (p: DotPattern) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedName = value ? (FIGURE_NAMES[patternKey(value)] ?? '?') : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>

      {/* Trigger button */}
      <div ref={ref} style={{ position: 'relative', width: '130px' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'var(--color-surface-2)',
            border: `1px solid ${value ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
            borderRadius: open ? '6px 6px 0 0' : '6px',
            color: value ? 'var(--color-text)' : 'var(--color-text-subtle)',
            fontSize: '12px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedName ?? '— select —'}
          </span>
          <span style={{ fontSize: '9px', flexShrink: 0, opacity: 0.6 }}>▾</span>
        </button>

        {/* Dropdown list */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-accent-muted)',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            zIndex: 100,
            maxHeight: '220px',
            overflowY: 'auto',
          }}>
            {ALL_PATTERNS.map(p => {
              const key = patternKey(p)
              const name = FIGURE_NAMES[key]
              const isSelected = value && patternKey(value) === key
              return (
                <button
                  key={key}
                  onClick={() => { onChange(p); setOpen(false) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 8px',
                    background: isSelected ? 'rgba(180,156,90,0.15)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(180,156,90,0.08)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {value && (
        <div style={{ color: 'var(--color-accent)' }}>
          <FigureDots pattern={value} size={36} />
        </div>
      )}
    </div>
  )
}

// ─── Chart cell ───────────────────────────────────────────────────────────────

function ChartCell({
  label,
  pattern,
  entityMap,
  onNavigate,
  highlight = false,
}: {
  label: string
  pattern: DotPattern | null
  entityMap: Map<string, BaseEntity>
  onNavigate: (cn: string) => void
  highlight?: boolean
}) {
  const name = pattern ? (FIGURE_NAMES[patternKey(pattern)] ?? '?') : null
  const entity = pattern ? entityMap.get(patternKey(pattern)) : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      padding: '10px 8px',
      background: highlight ? 'rgba(180,156,90,0.12)' : 'var(--color-surface-2)',
      border: `1px solid ${highlight ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
      borderRadius: '6px',
      minWidth: '90px',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      {pattern ? (
        <>
          <div style={{ color: 'var(--color-text)' }}>
            <FigureDots pattern={pattern} size={36} />
          </div>
          <div
            onClick={() => entity && onNavigate(entity.canonicalName)}
            style={{
              fontSize: '11px', fontWeight: 500, color: 'var(--color-text)',
              textAlign: 'center', cursor: entity ? 'pointer' : 'default',
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--color-border)', padding: '8px 0' }}>—</div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function GeomancyShieldChart() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [figureEntities, setFigureEntities] = useState<Map<string, BaseEntity>>(new Map())
  const [loading, setLoading] = useState(true)

  const [mothers, setMothers] = useState<(DotPattern | null)[]>([null, null, null, null])

  useEffect(() => {
    if (!engine) return
    ;(async () => {
      setLoading(true)
      const result = await engine.adapter.listEntities({ entityType: 'geomancy.figure' }, { limit: 20, offset: 0 })
      const map = new Map<string, BaseEntity>()
      for (const entity of result.items as BaseEntity[]) {
        const dp = entity.extendedData?.dotPattern as number[] | undefined
        if (dp && dp.length === 4) {
          map.set(patternKey(dp), entity)
        }
      }
      setFigureEntities(map)
      setLoading(false)
    })()
  }, [engine])

  const setMother = (i: number, p: DotPattern) => {
    setMothers(prev => prev.map((m, idx) => idx === i ? p : m))
  }

  const derived = useMemo(() => {
    if (mothers.some(m => m === null)) return null
    const ms = mothers as DotPattern[]

    const daughters = mothersToDaughters(ms)
    const nieces = [
      combineFigures(ms[0], ms[1]),
      combineFigures(ms[2], ms[3]),
      combineFigures(daughters[0], daughters[1]),
      combineFigures(daughters[2], daughters[3]),
    ]
    const rWitness = combineFigures(nieces[0], nieces[1])
    const lWitness = combineFigures(nieces[2], nieces[3])
    const judge = combineFigures(rWitness, lWitness)
    const reconciler = combineFigures(judge, ms[0])

    return { daughters, nieces, rWitness, lWitness, judge, reconciler }
  }, [mothers])

  const onNavigate = (cn: string) => {
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} style={{ marginBottom: '12px' }}>
        <ArrowLeft size={14} /> Back
      </Button>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference › Guides
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Geomancy Shield Chart
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Select the four Mother figures to generate the complete 16-figure shield chart.
        Daughters are transposed from the Mothers; Nieces, Witnesses, Judge, and Reconciler are
        derived by parity combination. Click any result figure to open its reference page.
      </p>

      {/* Mother inputs */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
          Mothers
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map(i => (
            <FigureSelector
              key={i}
              label={`Mother ${i + 1}`}
              value={mothers[i]}
              onChange={p => setMother(i, p)}
            />
          ))}
        </div>
      </div>

      {derived ? (
        <>
          {/* Daughters */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Daughters (transposed rows)
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {derived.daughters.map((d, i) => (
                <ChartCell key={i} label={`Daughter ${i + 1}`} pattern={d} entityMap={figureEntities} onNavigate={onNavigate} />
              ))}
            </div>
          </div>

          {/* Nieces */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Nieces
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {derived.nieces.map((n, i) => (
                <ChartCell key={i} label={`Niece ${i + 1}`} pattern={n} entityMap={figureEntities} onNavigate={onNavigate} />
              ))}
            </div>
          </div>

          {/* Witnesses & Judge */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Witnesses &amp; Judge
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <ChartCell label="Right Witness" pattern={derived.rWitness} entityMap={figureEntities} onNavigate={onNavigate} />
              <ChartCell label="Left Witness" pattern={derived.lWitness} entityMap={figureEntities} onNavigate={onNavigate} />
              <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', color: 'var(--color-text-subtle)', fontSize: '20px', paddingTop: '20px' }}>
                →
              </div>
              <ChartCell label="Judge" pattern={derived.judge} entityMap={figureEntities} onNavigate={onNavigate} highlight />
            </div>
          </div>

          {/* Reconciler */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Reconciler (Judge + First Mother)
            </div>
            <ChartCell label="Reconciler" pattern={derived.reconciler} entityMap={figureEntities} onNavigate={onNavigate} highlight />
          </div>

          {/* Reset */}
          <button
            onClick={() => setMothers([null, null, null, null])}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: '6px', padding: '6px 14px',
              color: 'var(--color-text-muted)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            Reset
          </button>
        </>
      ) : (
        <div style={{
          padding: '24px', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)', borderRadius: '8px',
          fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center',
        }}>
          Select all four Mother figures above to generate the chart.
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        <strong style={{ color: 'var(--color-text-muted)' }}>Combination rule:</strong> Two rows combine
        to a single dot (●) if they differ in parity; to a double dot (●●) if they are the same.
        Daughters are formed by reading the same row across all four Mothers in sequence.
        Nieces 1–2 combine Mother pairs; Nieces 3–4 combine Daughter pairs.
      </div>
    </div>
  )
}
