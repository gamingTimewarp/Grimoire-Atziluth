import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Colour math ──────────────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d   = max - min
  const v   = max
  const s   = max === 0 ? 0 : d / max
  let h = 0
  if (d !== 0) {
    if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else                h = ((r - g) / d + 4) * 60
  }
  return [h, s, v]
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  const byte = (n: number) => Math.max(0, Math.min(255, Math.round((n + m) * 255)))
  return `#${byte(r).toString(16).padStart(2, '0')}${byte(g).toString(16).padStart(2, '0')}${byte(b).toString(16).padStart(2, '0')}`
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

// ─── HSV picker (the inline widget) ──────────────────────────────────────────

export function HsvColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const [h, setH] = useState(0)
  const [s, setS] = useState(0)
  const [v, setV] = useState(1)
  const [hexInput, setHexInput] = useState(value)

  // Sync in when value changes externally (e.g. preset switch)
  useEffect(() => {
    if (isValidHex(value)) {
      const [nh, ns, nv] = hexToHsv(value)
      setH(nh); setS(ns); setV(nv)
      setHexInput(value)
    }
  }, [value])

  // Refs so drag handlers always see current values without re-subscribing
  const hRef = useRef(h); hRef.current = h
  const sRef = useRef(s); sRef.current = s
  const vRef = useRef(v); vRef.current = v
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange

  const svRef  = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const drag   = useRef<'sv' | 'hue' | null>(null)

  const commit = useCallback((nh: number, ns: number, nv: number) => {
    setH(nh); setS(ns); setV(nv)
    const hex = hsvToHex(nh, ns, nv)
    setHexInput(hex)
    onChangeRef.current(hex)
  }, [])

  const getSV = useCallback((e: MouseEvent): [number, number] => {
    const r = svRef.current!.getBoundingClientRect()
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left)  / r.width)),
      Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)),
    ]
  }, [])

  const getH = useCallback((e: MouseEvent): number => {
    const r = hueRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(360, ((e.clientX - r.left) / r.width) * 360))
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current === 'sv') {
        const [ns, nv] = getSV(e)
        commit(hRef.current, ns, nv)
      } else if (drag.current === 'hue') {
        commit(getH(e), sRef.current, vRef.current)
      }
    }
    const onUp = () => { drag.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [commit, getSV, getH])

  const hueColor = hsvToHex(h, 1, 1)

  return (
    <div style={{ width: '220px' }}>

      {/* ── SV square ── */}
      <div
        ref={svRef}
        onMouseDown={e => {
          drag.current = 'sv'
          const [ns, nv] = getSV(e.nativeEvent)
          commit(hRef.current, ns, nv)
          e.preventDefault()
        }}
        style={{
          position: 'relative',
          width: '220px',
          height: '160px',
          borderRadius: '5px',
          marginBottom: '8px',
          cursor: 'crosshair',
          background: hueColor,
          flexShrink: 0,
        }}
      >
        {/* saturation: white → transparent (left → right) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '5px', background: 'linear-gradient(to right, #fff, transparent)' }} />
        {/* value: transparent → black (top → bottom) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '5px', background: 'linear-gradient(to bottom, transparent, #000)' }} />
        {/* cursor */}
        <div style={{
          position: 'absolute',
          left:  `${s * 100}%`,
          top:   `${(1 - v) * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: '12px', height: '12px',
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Hue strip ── */}
      <div
        ref={hueRef}
        onMouseDown={e => {
          drag.current = 'hue'
          commit(getH(e.nativeEvent), sRef.current, vRef.current)
          e.preventDefault()
        }}
        style={{
          position: 'relative',
          width: '220px',
          height: '14px',
          borderRadius: '7px',
          marginBottom: '10px',
          cursor: 'pointer',
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          flexShrink: 0,
        }}
      >
        {/* cursor */}
        <div style={{
          position: 'absolute',
          left:  `${(h / 360) * 100}%`,
          top:   '50%',
          transform: 'translate(-50%, -50%)',
          width: '16px', height: '16px',
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
          background: hueColor,
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Hex input + preview ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '4px', flexShrink: 0,
          background: value,
          border: '1px solid var(--color-border)',
        }} />
        <input
          type="text"
          value={hexInput}
          onChange={e => {
            const raw = e.target.value
            const val = raw.startsWith('#') ? raw : `#${raw}`
            setHexInput(raw)
            if (isValidHex(val)) {
              const [nh, ns, nv] = hexToHsv(val)
              setH(nh); setS(ns); setV(nv)
              onChangeRef.current(val)
            }
          }}
          maxLength={7}
          spellCheck={false}
          style={{
            flex: 1, padding: '5px 8px',
            background: 'var(--color-surface-3)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            color: 'var(--color-text)', fontSize: '12px',
            fontFamily: 'monospace', outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

// ─── Swatch + popup (used by ColorRow) ────────────────────────────────────────

/**
 * A coloured swatch that opens an HsvColorPicker popup when clicked.
 * Clicking outside the popup closes it.
 */
export function ColorSwatch({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Pick colour"
        style={{
          width: '32px', height: '32px',
          padding: '3px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          borderRadius: '2px',
          background: value,
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 2000,
          padding: '12px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <HsvColorPicker value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
