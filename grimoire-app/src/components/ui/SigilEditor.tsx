/**
 * SigilEditor.tsx
 * Interactive editor for a SigilDesign: tap to place points, draw lines
 * between them, drop circles, and label points. Deliberately a plain fixed
 * SVG canvas rather than ZoomableSVGContainer — that component claims
 * mouse/touch gestures for panning, which would fight with dragging points
 * around here. Pan/zoom only matters for *viewing* a finished sigil
 * (CustomSigilDiagram), not for authoring one.
 */

import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  SIGIL_VIEWBOX_SIZE, SIGIL_CANVAS_MIN, SIGIL_CANVAS_MAX, SIGIL_PRESETS, emptySigilDesign, newSigilElementId,
  DEFAULT_POINT_COLOR, DEFAULT_LINE_COLOR, DEFAULT_CIRCLE_COLOR,
} from '@/lib/sigil-data'
import type { SigilDesign, SigilPoint } from '@/lib/sigil-data'
import { Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

type Mode = 'select' | 'point' | 'line' | 'circle'

type Selection =
  | { kind: 'point'; id: string }
  | { kind: 'line'; index: number }
  | { kind: 'circle'; id: string }
  | null

type Dragging =
  | { kind: 'point'; id: string }
  | { kind: 'circle'; id: string; startCx: number; startCy: number; startX: number; startY: number }
  | { kind: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number; moved: boolean }
  | null

const GRID_SIZE = 10
const POINT_HIT_RADIUS = 10
const LINE_HIT_WIDTH = 10
// Any line connected to a point necessarily passes exactly through it, so a click
// dead-centre on the point is also, by construction, at distance ~0 from every line
// touching it — comparing raw distances alone there would almost always hand the
// click to one of those lines instead (worse the more lines converge on the point).
// Reserving this inner radius as always-the-point keeps a centred click reliable,
// while clicks in the hit-circle's outer fringe can still resolve to a nearby line
// (see nearestLine) — e.g. two close vertices with little of their connecting line
// clear of either one's hit-circle.
const POINT_PRIORITY_RADIUS = POINT_HIT_RADIUS / 2
// The canvas's placeable area is wider than its default (zoom 1) framing — see
// SIGIL_CANVAS_MIN/MAX — so the minimum zoom is derived from those bounds instead
// of being picked independently, guaranteeing the furthest-out view always shows
// the full placeable square (neither clipping it nor zooming out past it).
const MAX_ZOOM = 4
const MIN_ZOOM = SIGIL_VIEWBOX_SIZE / (SIGIL_CANVAS_MAX - SIGIL_CANVAS_MIN)
const ZOOM_STEP = 1.25
/** Client-pixel movement before a background drag in Select mode commits to
 *  panning rather than being treated as a plain tap-to-deselect. */
const PAN_DRAG_THRESHOLD = 3

// The grid fills the same placeable area as SIGIL_CANVAS_MIN/MAX, so it still
// covers the whole frame at the most-zoomed-out view instead of leaving a blank
// border around a grid that only extended across the smaller default framing.
const GRID_EXTENT_START = SIGIL_CANVAS_MIN
const GRID_EXTENT_END = SIGIL_CANVAS_MAX

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'select', label: 'Select / Move', hint: 'Tap a point, line, or circle to select it — drag points and circles to move them. Drag empty space to pan once zoomed in.' },
  { id: 'point',  label: 'Add Point',     hint: 'Tap anywhere on the canvas to drop a point.' },
  { id: 'line',   label: 'Draw Line',     hint: 'Tap one point, then another, to connect (or disconnect) them — the second point becomes the new start, so a run of taps chains into a path. Tap the first point again to cancel.' },
  { id: 'circle', label: 'Add Circle',    hint: 'Tap to set the centre, then tap again to set the radius.' },
]

function modeButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
    border: `1px solid ${active ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-surface-3)' : 'var(--color-surface-1)',
    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap',
  }
}

function presetButtonStyle(): CSSProperties {
  return {
    padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
    border: '1px solid var(--color-border)', background: 'var(--color-surface-1)',
    color: 'var(--color-text-muted)', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Shortest distance from (px,py) to the segment a→b (not the infinite line). */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return dist(px, py, ax, ay)
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1)
  return dist(px, py, ax + t * dx, ay + t * dy)
}

export function SigilEditor({ design, onChange }: { design: SigilDesign; onChange: (d: SigilDesign) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<Mode>(design.points.length === 0 && design.circles.length === 0 ? 'point' : 'select')
  const [selected, setSelected] = useState<Selection>(null)
  const [linePendingId, setLinePendingId] = useState<string | null>(null)
  const [circlePendingCenter, setCirclePendingCenter] = useState<{ x: number; y: number } | null>(null)
  const [circlePreview, setCirclePreview] = useState<{ x: number; y: number; r: number } | null>(null)
  const [snapGrid, setSnapGrid] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef<Dragging>(null)

  const pointById = new Map(design.points.map(p => [p.id, p]))

  // Zoom is a smaller/larger window (viewBox) onto the design space; pan slides that
  // window around within it. baseOrigin centres the window on SIGIL_VIEWBOX_SIZE's
  // middle (the "home" position a fresh/reset view opens on) — that's also the centre
  // of the wider SIGIL_CANVAS_MIN/MAX square content can actually be placed across,
  // since both are symmetric around the same point, so centring math doesn't need to
  // change. The *pan range*, though, must reach that whole wider square — not just back
  // to the smaller default frame — or panning could never reach content placed outside
  // it, which is exactly the bug this guards against.
  const viewSize = SIGIL_VIEWBOX_SIZE / zoom
  const baseOrigin = (SIGIL_VIEWBOX_SIZE - viewSize) / 2
  const CANVAS_SIZE = SIGIL_CANVAS_MAX - SIGIL_CANVAS_MIN
  // 0 only once viewSize already covers the whole canvas (zoom === MIN_ZOOM) — there's
  // nowhere left to pan to at that point.
  const panBound = Math.max(0, (CANVAS_SIZE - viewSize) / 2)
  const viewOriginX = baseOrigin - clamp(pan.x, -panBound, panBound)
  const viewOriginY = baseOrigin - clamp(pan.y, -panBound, panBound)
  const isDefaultView = zoom === 1 && pan.x === 0 && pan.y === 0

  function zoomIn() { setZoom(z => Math.min(MAX_ZOOM, +(z * ZOOM_STEP).toFixed(3))) }
  function zoomOut() { setZoom(z => Math.max(MIN_ZOOM, +(z / ZOOM_STEP).toFixed(3))) }
  function zoomReset() { setZoom(1); setPan({ x: 0, y: 0 }) }

  function clientToSvg(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = viewOriginX + ((e.clientX - rect.left) / rect.width) * viewSize
    const y = viewOriginY + ((e.clientY - rect.top) / rect.height) * viewSize
    // Clamped to the wider placeable square (SIGIL_CANVAS_MIN/MAX), not the smaller
    // default framing — points and circles can be authored anywhere the editor's own
    // zoomed-out view can reach, not just within the original SIGIL_VIEWBOX_SIZE frame.
    return {
      x: Math.max(SIGIL_CANVAS_MIN, Math.min(SIGIL_CANVAS_MAX, x)),
      y: Math.max(SIGIL_CANVAS_MIN, Math.min(SIGIL_CANVAS_MAX, y)),
    }
  }

  function snapCoord(v: number): number {
    return snapGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v
  }

  function snapPoint(p: { x: number; y: number }): { x: number; y: number } {
    return { x: snapCoord(p.x), y: snapCoord(p.y) }
  }

  function snapRadius(r: number): number {
    return Math.max(snapGrid ? GRID_SIZE : 2, snapCoord(r))
  }

  function applyPreset(presetId: string) {
    const preset = SIGIL_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    const hasContent = design.points.length > 0 || design.lines.length > 0 || design.circles.length > 0
    if (hasContent && !window.confirm('Replace the current sigil with this preset? This cannot be undone.')) return
    onChange(preset.build())
    setSelected(null)
    setLinePendingId(null)
    setCirclePendingCenter(null)
    setMode('select')
  }

  function handleClear() {
    if (design.points.length === 0 && design.lines.length === 0 && design.circles.length === 0) return
    if (!window.confirm('Clear the whole sigil? This cannot be undone.')) return
    onChange(emptySigilDesign())
    setSelected(null)
  }

  // ── Canvas background (empty space) ────────────────────────────────────────

  function handleCanvasPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (mode === 'point') {
      const { x, y } = snapPoint(clientToSvg(e))
      const point: SigilPoint = { id: newSigilElementId(), x, y }
      onChange({ ...design, points: [...design.points, point] })
    } else if (mode === 'circle') {
      if (!circlePendingCenter) {
        const center = snapPoint(clientToSvg(e))
        setCirclePendingCenter(center)
        setCirclePreview({ x: center.x, y: center.y, r: 0 })
      } else {
        const { x, y } = clientToSvg(e)
        const r = snapRadius(dist(circlePendingCenter.x, circlePendingCenter.y, x, y))
        onChange({ ...design, circles: [...design.circles, { id: newSigilElementId(), cx: circlePendingCenter.x, cy: circlePendingCenter.y, r }] })
        setCirclePendingCenter(null)
        setCirclePreview(null)
      }
    } else if (mode === 'line') {
      // Tapping empty canvas must not cancel a pending first vertex — it's too easy
      // to miss the intended second point and land on the background instead.
      // Only re-tapping the same point (see handlePointPointerDown) clears it.
    } else {
      // Select mode: a background press might be a plain tap-to-deselect, or (once
      // zoomed in) the start of a pan — handleCanvasPointerUp decides which once it
      // sees whether the pointer actually moved before release.
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = {
        kind: 'pan', startClientX: e.clientX, startClientY: e.clientY,
        startPanX: pan.x, startPanY: pan.y, moved: false,
      }
    }
  }

  function handleCanvasPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (dragging.current?.kind === 'pan') {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const dxClient = e.clientX - dragging.current.startClientX
      const dyClient = e.clientY - dragging.current.startClientY
      if (!dragging.current.moved && Math.hypot(dxClient, dyClient) > PAN_DRAG_THRESHOLD) dragging.current.moved = true
      const scaleX = viewSize / rect.width
      const scaleY = viewSize / rect.height
      setPan({
        x: clamp(dragging.current.startPanX + dxClient * scaleX, -panBound, panBound),
        y: clamp(dragging.current.startPanY + dyClient * scaleY, -panBound, panBound),
      })
      return
    }
    if (mode === 'circle' && circlePendingCenter) {
      const { x, y } = clientToSvg(e)
      setCirclePreview({ x: circlePendingCenter.x, y: circlePendingCenter.y, r: snapRadius(dist(circlePendingCenter.x, circlePendingCenter.y, x, y)) })
    }
  }

  function handleCanvasPointerUp() {
    if (dragging.current?.kind !== 'pan') return
    const wasTap = !dragging.current.moved
    dragging.current = null
    if (wasTap) setSelected(null)
  }

  // ── Points ───────────────────────────────────────────────────────────────────

  // Overlapping hit-areas mean the DOM only tells us *a* point near the click was
  // hit, not necessarily the intended one — whichever point's circle happens to be
  // painted on top wins the browser's own hit-test regardless of which one is
  // actually closest. Re-deriving the nearest point from the click position
  // itself, instead of trusting that DOM target, makes close-together vertices
  // individually selectable again.
  function nearestPoint(x: number, y: number): SigilPoint | undefined {
    let best: SigilPoint | undefined
    let bestDist = POINT_HIT_RADIUS
    for (const p of design.points) {
      const d = dist(x, y, p.x, p.y)
      if (d < bestDist) { bestDist = d; best = p }
    }
    return best
  }

  // Same overlap problem as nearestPoint, but between a point and a line: two
  // vertices close together leave little or no stretch of the line between them
  // that isn't *also* covered by one of their (larger) hit-circles, so a click
  // meant for the line can land on a point's hit-circle instead purely because
  // it happens to be painted on top. Comparing actual distances — to each
  // point's centre vs. to the nearest line *segment* — and picking whichever is
  // truly closer resolves it the same way nearestPoint does for points alone.
  function nearestLine(x: number, y: number): { index: number; dist: number } | undefined {
    let best: { index: number; dist: number } | undefined
    design.lines.forEach((l, i) => {
      const a = pointById.get(l.a)
      const b = pointById.get(l.b)
      if (!a || !b) return
      const d = distToSegment(x, y, a.x, a.y, b.x, b.y)
      if (d <= LINE_HIT_WIDTH / 2 && (!best || d < best.dist)) best = { index: i, dist: d }
    })
    return best
  }

  function handlePointPointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    e.stopPropagation()
    const { x, y } = clientToSvg(e)
    const point = nearestPoint(x, y)
    if (mode === 'select') {
      const pointDist = point ? dist(x, y, point.x, point.y) : Infinity
      if (!point || pointDist > POINT_PRIORITY_RADIUS) {
        const line = nearestLine(x, y)
        if (line && (!point || line.dist < pointDist)) {
          setSelected({ kind: 'line', index: line.index })
          return
        }
      }
      if (!point) return
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = { kind: 'point', id: point.id }
      setSelected({ kind: 'point', id: point.id })
    } else if (mode === 'line') {
      if (!point) return
      if (linePendingId === null) {
        setLinePendingId(point.id)
      } else if (linePendingId === point.id) {
        setLinePendingId(null)
      } else {
        const a = linePendingId
        const b = point.id
        const existingIndex = design.lines.findIndex(l => (l.a === a && l.b === b) || (l.a === b && l.b === a))
        const lines = existingIndex >= 0
          ? design.lines.filter((_, i) => i !== existingIndex)
          : [...design.lines, { a, b }]
        onChange({ ...design, lines })
        // Chain onward from the vertex just connected, so a run of taps draws a connected path.
        setLinePendingId(b)
      }
    }
  }

  function handlePointPointerMove(e: ReactPointerEvent<SVGCircleElement>) {
    if (dragging.current?.kind !== 'point') return
    const id = dragging.current.id
    const { x, y } = snapPoint(clientToSvg(e))
    onChange({ ...design, points: design.points.map(p => p.id === id ? { ...p, x, y } : p) })
  }

  function handlePointPointerUp() {
    if (dragging.current?.kind === 'point') dragging.current = null
  }

  // ── Circles ──────────────────────────────────────────────────────────────────

  function handleCirclePointerDown(e: ReactPointerEvent<SVGCircleElement>, circle: SigilDesign['circles'][number]) {
    e.stopPropagation()
    if (mode !== 'select') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = clientToSvg(e)
    dragging.current = { kind: 'circle', id: circle.id, startCx: circle.cx, startCy: circle.cy, startX: x, startY: y }
    setSelected({ kind: 'circle', id: circle.id })
  }

  function handleCirclePointerMove(e: ReactPointerEvent<SVGCircleElement>, circle: SigilDesign['circles'][number]) {
    if (dragging.current?.kind !== 'circle' || dragging.current.id !== circle.id) return
    const { x, y } = clientToSvg(e)
    const { startCx, startCy, startX, startY } = dragging.current
    const cx = snapCoord(startCx + (x - startX))
    const cy = snapCoord(startCy + (y - startY))
    onChange({ ...design, circles: design.circles.map(c => c.id === circle.id ? { ...c, cx, cy } : c) })
  }

  function handleCirclePointerUp() {
    if (dragging.current?.kind === 'circle') dragging.current = null
  }

  // ── Lines (selection hit-area only — lines aren't draggable) ────────────────

  function handleLinePointerDown(e: ReactPointerEvent<SVGLineElement>, index: number) {
    e.stopPropagation()
    if (mode === 'select') setSelected({ kind: 'line', index })
  }

  // ── Mutations from the inspector ────────────────────────────────────────────

  function updatePointLabel(id: string, label: string) {
    onChange({ ...design, points: design.points.map(p => p.id === id ? { ...p, label: label || undefined } : p) })
  }

  function updatePointColor(id: string, color: string | undefined) {
    onChange({ ...design, points: design.points.map(p => p.id === id ? { ...p, color } : p) })
  }

  function updateLineColor(index: number, color: string | undefined) {
    onChange({ ...design, lines: design.lines.map((l, i) => i === index ? { ...l, color } : l) })
  }

  function updateCircleRadius(id: string, r: number) {
    if (!Number.isFinite(r) || r <= 0) return
    onChange({ ...design, circles: design.circles.map(c => c.id === id ? { ...c, r } : c) })
  }

  function updateCircleColor(id: string, color: string | undefined) {
    onChange({ ...design, circles: design.circles.map(c => c.id === id ? { ...c, color } : c) })
  }

  function deleteSelected() {
    if (!selected) return
    if (selected.kind === 'point') {
      onChange({
        points: design.points.filter(p => p.id !== selected.id),
        lines: design.lines.filter(l => l.a !== selected.id && l.b !== selected.id),
        circles: design.circles,
      })
    } else if (selected.kind === 'line') {
      onChange({ ...design, lines: design.lines.filter((_, i) => i !== selected.index) })
    } else if (selected.kind === 'circle') {
      onChange({ ...design, circles: design.circles.filter(c => c.id !== selected.id) })
    }
    setSelected(null)
  }

  const activeHint = MODES.find(m => m.id === mode)?.hint ?? ''

  return (
    <div>
      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Start from
        </span>
        {SIGIL_PRESETS.map(p => (
          <button key={p.id} style={presetButtonStyle()} onClick={() => applyPreset(p.id)}>
            {p.label}
          </button>
        ))}
        <button style={presetButtonStyle()} onClick={handleClear}>Clear</button>
        <button
          style={{
            ...presetButtonStyle(),
            ...(snapGrid ? { border: '1px solid var(--color-accent-muted)', color: 'var(--color-text)' } : {}),
          }}
          onClick={() => setSnapGrid(g => !g)}
        >
          {snapGrid ? 'Snap to Grid: On' : 'Snap to Grid: Off'}
        </button>
      </div>

      {/* Mode toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            style={modeButtonStyle(mode === m.id)}
            onClick={() => {
              setMode(m.id)
              setLinePendingId(null)
              setCirclePendingCenter(null)
              setCirclePreview(null)
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '10px', minHeight: '14px' }}>
        {activeHint}
      </div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
        <button
          style={{ ...presetButtonStyle(), opacity: zoom <= MIN_ZOOM ? 0.5 : 1, cursor: zoom <= MIN_ZOOM ? 'default' : 'pointer' }}
          onClick={zoomOut} disabled={zoom <= MIN_ZOOM} title="Zoom out" aria-label="Zoom out"
        >
          <ZoomOut size={13} />
        </button>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', minWidth: '36px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          style={{ ...presetButtonStyle(), opacity: zoom >= MAX_ZOOM ? 0.5 : 1, cursor: zoom >= MAX_ZOOM ? 'default' : 'pointer' }}
          onClick={zoomIn} disabled={zoom >= MAX_ZOOM} title="Zoom in" aria-label="Zoom in"
        >
          <ZoomIn size={13} />
        </button>
        <button
          style={{ ...presetButtonStyle(), opacity: isDefaultView ? 0.5 : 1, cursor: isDefaultView ? 'default' : 'pointer' }}
          onClick={zoomReset} disabled={isDefaultView} title="Reset view" aria-label="Reset view"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Canvas */}
        <svg
          ref={svgRef}
          viewBox={`${viewOriginX} ${viewOriginY} ${viewSize} ${viewSize}`}
          width="100%"
          style={{
            display: 'block', flex: '1 1 260px', maxWidth: '420px', aspectRatio: '1 / 1',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '8px', touchAction: 'none', userSelect: 'none',
            cursor: mode === 'point' || mode === 'circle' ? 'crosshair'
              : mode === 'select' && panBound > 0 ? (dragging.current?.kind === 'pan' && dragging.current.moved ? 'grabbing' : 'grab')
              : 'default',
          }}
          aria-label="Sigil editor canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        >
          {snapGrid && Array.from(
            { length: Math.round((GRID_EXTENT_END - GRID_EXTENT_START) / GRID_SIZE) + 1 },
            (_, i) => GRID_EXTENT_START + i * GRID_SIZE,
          ).map(pos => (
            <g key={`grid-${pos}`} style={{ pointerEvents: 'none' }}>
              <line x1={pos} y1={GRID_EXTENT_START} x2={pos} y2={GRID_EXTENT_END} stroke="var(--color-border)" strokeWidth="0.5" opacity="0.4" />
              <line x1={GRID_EXTENT_START} y1={pos} x2={GRID_EXTENT_END} y2={pos} stroke="var(--color-border)" strokeWidth="0.5" opacity="0.4" />
            </g>
          ))}

          {design.circles.map(c => (
            <circle
              key={c.id}
              cx={c.cx} cy={c.cy} r={c.r}
              fill="none"
              stroke={selected?.kind === 'circle' && selected.id === c.id ? 'var(--color-accent)' : (c.color ?? DEFAULT_CIRCLE_COLOR)}
              strokeWidth={selected?.kind === 'circle' && selected.id === c.id ? 2 : 1.2}
              style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
              onPointerDown={e => handleCirclePointerDown(e, c)}
              onPointerMove={e => handleCirclePointerMove(e, c)}
              onPointerUp={handleCirclePointerUp}
            />
          ))}

          {circlePreview && (
            <circle cx={circlePreview.x} cy={circlePreview.y} r={circlePreview.r}
              fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
          )}

          {design.lines.map((l, i) => {
            const a = pointById.get(l.a)
            const b = pointById.get(l.b)
            if (!a || !b) return null
            const isSelected = selected?.kind === 'line' && selected.index === i
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isSelected ? 'var(--color-accent)' : (l.color ?? DEFAULT_LINE_COLOR)}
                  strokeWidth={isSelected ? 2 : 1.2} opacity={isSelected ? 1 : 0.85} />
                {/* Wide, invisible hit-area so a thin line is still easy to tap/select. */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="transparent" strokeWidth={LINE_HIT_WIDTH}
                  style={{ pointerEvents: mode === 'select' ? 'stroke' : 'none', cursor: 'pointer' }}
                  onPointerDown={e => handleLinePointerDown(e, i)} />
              </g>
            )
          })}

          {linePendingId && pointById.has(linePendingId) && (
            <circle cx={pointById.get(linePendingId)!.x} cy={pointById.get(linePendingId)!.y} r={7}
              fill="none" stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.8" />
          )}

          {design.points.map(p => {
            const isSelected = selected?.kind === 'point' && selected.id === p.id
            return (
              <g key={p.id}>
                {p.label && (
                  <text x={p.x} y={p.y - 9}
                    textAnchor="middle" dominantBaseline="middle" fontSize="7"
                    fill={isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                    style={{ userSelect: 'none', pointerEvents: 'none' } as CSSProperties}
                  >
                    {p.label}
                  </text>
                )}
                <circle
                  cx={p.x} cy={p.y} r={isSelected ? 5 : 3.5}
                  fill={isSelected ? 'var(--color-accent)' : (p.color ?? DEFAULT_POINT_COLOR)}
                  stroke={linePendingId === p.id ? 'var(--color-accent)' : 'none'}
                  strokeWidth="1.5"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Invisible, slightly larger hit-area so points are easy to tap/click precisely. */}
                <circle
                  cx={p.x} cy={p.y} r={POINT_HIT_RADIUS}
                  fill="transparent"
                  style={{ cursor: mode === 'select' ? 'grab' : mode === 'line' ? 'pointer' : 'default', pointerEvents: 'all' }}
                  onPointerDown={handlePointPointerDown}
                  onPointerMove={handlePointPointerMove}
                  onPointerUp={handlePointPointerUp}
                />
              </g>
            )
          })}
        </svg>

        {/* Inspector */}
        <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
          {!selected && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic', padding: '14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              {mode === 'select' ? 'Tap a point, line, or circle to edit it.' : 'Switch to Select / Move to edit an existing element.'}
            </div>
          )}

          {selected?.kind === 'point' && pointById.has(selected.id) && (
            <InspectorPanel title="Point" onDelete={deleteSelected}>
              <label style={inspectorLabelStyle}>Label</label>
              <input
                value={pointById.get(selected.id)!.label ?? ''}
                onChange={e => updatePointLabel(selected.id, e.target.value)}
                placeholder="e.g. Fire"
                style={inspectorInputStyle}
              />
              <label style={{ ...inspectorLabelStyle, marginTop: '12px' }}>Color</label>
              <ColorField
                value={pointById.get(selected.id)!.color}
                defaultValue={DEFAULT_POINT_COLOR}
                onChange={c => updatePointColor(selected.id, c)}
              />
            </InspectorPanel>
          )}

          {selected?.kind === 'line' && design.lines[selected.index] && (
            <InspectorPanel title="Line" onDelete={deleteSelected}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {pointLabel(pointById.get(design.lines[selected.index].a))}
                {' → '}
                {pointLabel(pointById.get(design.lines[selected.index].b))}
              </div>
              <label style={{ ...inspectorLabelStyle, marginTop: '12px' }}>Color</label>
              <ColorField
                value={design.lines[selected.index].color}
                defaultValue={DEFAULT_LINE_COLOR}
                onChange={c => updateLineColor(selected.index, c)}
              />
            </InspectorPanel>
          )}

          {selected?.kind === 'circle' && design.circles.find(c => c.id === selected.id) && (
            <InspectorPanel title="Circle" onDelete={deleteSelected}>
              <label style={inspectorLabelStyle}>Radius</label>
              <input
                type="number" min={2} max={SIGIL_CANVAS_MAX - SIGIL_CANVAS_MIN}
                value={Math.round(design.circles.find(c => c.id === selected.id)!.r)}
                onChange={e => updateCircleRadius(selected.id, Number(e.target.value))}
                style={inspectorInputStyle}
              />
              <label style={{ ...inspectorLabelStyle, marginTop: '12px' }}>Color</label>
              <ColorField
                value={design.circles.find(c => c.id === selected.id)!.color}
                defaultValue={DEFAULT_CIRCLE_COLOR}
                onChange={c => updateCircleColor(selected.id, c)}
              />
            </InspectorPanel>
          )}
        </div>
      </div>
    </div>
  )
}

function pointLabel(p: SigilPoint | undefined): string {
  if (!p) return '?'
  return p.label ?? `(${Math.round(p.x)}, ${Math.round(p.y)})`
}

function InspectorPanel({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
        <button
          onClick={onDelete}
          title={`Delete ${title.toLowerCase()}`}
          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '2px' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  )
}

function ColorField({ value, defaultValue, onChange }: {
  value: string | undefined
  defaultValue: string
  onChange: (color: string | undefined) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="color"
        value={value ?? defaultValue}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '34px', height: '28px', padding: '2px',
          border: '1px solid var(--color-border)', borderRadius: '5px',
          background: 'var(--color-surface-1)', cursor: 'pointer', colorScheme: 'dark',
        }}
      />
      {value && (
        <button
          onClick={() => onChange(undefined)}
          style={{
            fontSize: '11px', color: 'var(--color-text-subtle)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Reset
        </button>
      )}
    </div>
  )
}

const inspectorLabelStyle: CSSProperties = {
  display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '5px',
}

const inspectorInputStyle: CSSProperties = {
  width: '100%', padding: '6px 9px',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
}
