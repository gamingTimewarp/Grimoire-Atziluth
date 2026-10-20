import { useState, useRef, type ReactNode, type CSSProperties } from 'react'

interface Props {
  children: ReactNode
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  style?: CSSProperties
  /**
   * 'free' (default) pans in both directions and claims every single-finger
   * touch gesture that starts inside the component, exactly as before.
   *
   * 'horizontal' is for content that's only ever wider than its own box, never
   * taller (e.g. the Practice page's ritual space) — a single-finger drag's
   * axis is decided from its first few pixels of movement: a mostly-vertical
   * drag is released back to the browser (so it scrolls the page, which this
   * component would otherwise swallow entirely), while a mostly-horizontal
   * drag pans as usual.
   */
  panMode?: 'free' | 'horizontal'
}

/** Touch-move distance, in px, before a 'horizontal' panMode gesture commits
 *  to either panning (ours) or scrolling (the page's) — small enough to feel
 *  immediate, large enough that a near-vertical drag doesn't misfire as a pan. */
const DIRECTION_DEADZONE = 8

const BTN: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '26px', height: '26px',
  background: 'var(--color-surface-3)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  fontSize: '16px', fontWeight: 500,
  color: 'var(--color-text)',
  lineHeight: 1,
  padding: 0,
  fontFamily: 'inherit',
}

function pinchDist(t: React.TouchList): number {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function pinchMid(t: React.TouchList): { x: number; y: number } {
  return {
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  }
}

export function ZoomableSVGContainer({
  children,
  minZoom = 0.25,
  maxZoom = 4,
  zoomStep = 0.25,
  style,
  panMode = 'free',
}: Props) {
  const [zoom, setZoom]             = useState(1)
  const [pan, setPan]               = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Mouse drag state
  const dragging   = useRef(false)
  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })

  // Touch state — kept in refs so handlers always see latest values without stale closures
  const touchState = useRef<{
    type: 'pan' | 'pinch'
    startDist: number
    startZoom: number
    startPan: { x: number; y: number }
    startMid: { x: number; y: number }
    startTouchPan: { x: number; y: number }
    // panMode 'horizontal' only: null until the gesture's axis is decided
    // (see DIRECTION_DEADZONE) — 'pan' claims it for us, 'scroll' releases it
    // back to the browser for the rest of this gesture. Always 'pan' outside
    // 'horizontal' mode, decided immediately.
    committed: 'pan' | 'scroll' | null
  } | null>(null)

  // Shared zoom/pan updaters
  const zoomRef = useRef(zoom)
  const panRef  = useRef(pan)
  zoomRef.current = zoom
  panRef.current  = pan

  const canZoomIn  = zoom < maxZoom
  const canZoomOut = zoom > minZoom
  const isDefault  = zoom === 1 && pan.x === 0 && pan.y === 0

  const handleZoomIn = () =>
    setZoom(z => Math.min(maxZoom, parseFloat((z + zoomStep).toFixed(2))))

  const handleZoomOut = () => {
    const next = Math.max(minZoom, parseFloat((zoom - zoomStep).toFixed(2)))
    setZoom(next)
  }

  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // ── Mouse handlers ───────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    setIsDragging(true)
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    setPan({
      x: dragOrigin.current.panX + (e.clientX - dragOrigin.current.mouseX),
      y: dragOrigin.current.panY + (e.clientY - dragOrigin.current.mouseY),
    })
  }

  const handleMouseUp = () => { dragging.current = false; setIsDragging(false) }

  // ── Touch handlers ───────────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // In 'horizontal' mode at the default 1x zoom, don't claim the gesture
      // yet — wait for handleTouchMove to decide its axis — so a vertical
      // drag can still reach the browser's native scroll. Once zoomed in,
      // content can overflow vertically too, so claim the gesture outright
      // (like panning a zoomed image) rather than ever releasing it to the
      // page; the matching touchAction switch keeps the browser from racing
      // us to it.
      const undecided = panMode === 'horizontal' && zoomRef.current <= 1
      if (!undecided) e.preventDefault()
      touchState.current = {
        type: 'pan',
        startDist: 0,
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        startMid: { x: 0, y: 0 },
        startTouchPan: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        committed: undecided ? null : 'pan',
      }
    } else if (e.touches.length === 2) {
      // Two-finger pinch always claims the gesture, even in 'horizontal' mode
      e.preventDefault()
      touchState.current = {
        type: 'pinch',
        startDist: pinchDist(e.touches),
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        startMid: pinchMid(e.touches),
        startTouchPan: { x: 0, y: 0 },
        committed: 'pan',
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const ts = touchState.current
    if (!ts) return

    if (ts.type === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - ts.startTouchPan.x
      const dy = e.touches[0].clientY - ts.startTouchPan.y

      if (ts.committed === 'scroll') return
      if (ts.committed === null) {
        if (Math.abs(dx) < DIRECTION_DEADZONE && Math.abs(dy) < DIRECTION_DEADZONE) return
        ts.committed = Math.abs(dx) > Math.abs(dy) ? 'pan' : 'scroll'
        if (ts.committed === 'scroll') return
      }

      e.preventDefault()
      setPan({ x: ts.startPan.x + dx, y: ts.startPan.y + dy })
    } else if (ts.type === 'pinch' && e.touches.length === 2) {
      e.preventDefault()
      const ratio   = pinchDist(e.touches) / ts.startDist
      const newZoom = Math.min(maxZoom, Math.max(minZoom, ts.startZoom * ratio))

      // Keep the pinch midpoint stationary: adjust pan so the mid stays fixed
      const mid    = pinchMid(e.touches)
      const scaleChange = newZoom / ts.startZoom
      setZoom(parseFloat(newZoom.toFixed(2)))
      setPan({
        x: mid.x - scaleChange * (ts.startMid.x - ts.startPan.x),
        y: mid.y - scaleChange * (ts.startMid.y - ts.startPan.y),
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      touchState.current = null
      // Clamp to minZoom if pinched below it
      if (zoomRef.current < minZoom) {
        setZoom(minZoom)
      }
    } else if (e.touches.length === 1 && touchState.current?.type === 'pinch') {
      // Lifted one finger — switch back to pan mode
      touchState.current = {
        type: 'pan',
        startDist: 0,
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        startMid: { x: 0, y: 0 },
        startTouchPan: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        committed: 'pan',
      }
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: panMode === 'horizontal' && zoom <= 1 ? 'pan-y' : 'none',
        ...style,
      }}
    >
      {/* Zoomable / pannable content */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          cursor: isDragging ? 'grabbing' : 'grab',
          willChange: 'transform',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute', bottom: '8px', right: '8px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}
      >
        <button
          onClick={handleReset}
          title="Reset view"
          style={{ ...BTN, cursor: 'pointer', visibility: isDefault ? 'hidden' : 'visible' }}
        >
          ↺
        </button>
        <button
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          title="Zoom in"
          style={{ ...BTN, opacity: canZoomIn ? 1 : 0.35, cursor: canZoomIn ? 'pointer' : 'default' }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          title="Zoom out"
          style={{ ...BTN, opacity: canZoomOut ? 1 : 0.35, cursor: canZoomOut ? 'pointer' : 'default' }}
        >
          −
        </button>
      </div>

      {/* Zoom level badge */}
      {zoom !== 1 && (
        <div
          style={{
            position: 'absolute', bottom: '8px', left: '8px',
            fontSize: '10px', color: 'var(--color-text-subtle)',
            background: 'rgba(0,0,0,0.45)',
            borderRadius: '3px', padding: '2px 5px',
            pointerEvents: 'none', lineHeight: 1.4,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  )
}
