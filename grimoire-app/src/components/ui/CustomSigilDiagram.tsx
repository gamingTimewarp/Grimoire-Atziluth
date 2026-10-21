import type { CSSProperties } from 'react'
import { ZoomableSVGContainer } from './ZoomableSVGContainer'
import {
  SIGIL_VIEWBOX_SIZE, DEFAULT_POINT_COLOR, DEFAULT_LINE_COLOR, DEFAULT_CIRCLE_COLOR,
} from '@/lib/sigil-data'
import type { SigilDesign } from '@/lib/sigil-data'

/** How far past a point/circle's own edge it can sit before the view box widens
 *  to fit it — small enough that designs within the default frame render at
 *  exactly the old `0 0 SIGIL_VIEWBOX_SIZE SIGIL_VIEWBOX_SIZE`, since editing
 *  (SigilEditor) no longer clamps authoring to that frame. */
const FIT_PADDING = 12

/** A square view box that's exactly the default frame for a design that stays
 *  within it, and grows (keeping that square, centred on the content) just
 *  enough to fit one that doesn't — so sigils authored out past the default
 *  frame aren't clipped here, without shrinking every other design to match. */
function fitViewBox(design: SigilDesign): { x: number; y: number; size: number } {
  let minX = 0, minY = 0, maxX = SIGIL_VIEWBOX_SIZE, maxY = SIGIL_VIEWBOX_SIZE
  for (const p of design.points) {
    minX = Math.min(minX, p.x - FIT_PADDING); maxX = Math.max(maxX, p.x + FIT_PADDING)
    minY = Math.min(minY, p.y - FIT_PADDING); maxY = Math.max(maxY, p.y + FIT_PADDING)
  }
  for (const c of design.circles) {
    minX = Math.min(minX, c.cx - c.r - FIT_PADDING); maxX = Math.max(maxX, c.cx + c.r + FIT_PADDING)
    minY = Math.min(minY, c.cy - c.r - FIT_PADDING); maxY = Math.max(maxY, c.cy + c.r + FIT_PADDING)
  }
  const size = Math.max(maxX - minX, maxY - minY)
  return { x: (minX + maxX) / 2 - size / 2, y: (minY + maxY) / 2 - size / 2, size }
}

/** Read-only render of a user-drawn custom sigil — used on the Reference
 *  entity page for any 'magic.custom-sigil' entity. The editor at
 *  /custom/sigil renders the same primitives interactively. */
export function CustomSigilDiagram({ design }: { design: SigilDesign }) {
  const pointById = new Map(design.points.map(p => [p.id, p]))
  const box = fitViewBox(design)

  return (
    <ZoomableSVGContainer style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '8px', padding: '16px',
    }}>
      <svg
        viewBox={`${box.x} ${box.y} ${box.size} ${box.size}`} width="100%"
        style={{ display: 'block', maxWidth: '420px', margin: '0 auto' }}
        aria-label="Custom sigil"
      >
        {design.circles.map(c => (
          <circle key={c.id} cx={c.cx} cy={c.cy} r={c.r}
            fill="none" stroke={c.color ?? DEFAULT_CIRCLE_COLOR} strokeWidth="1.2" />
        ))}
        {design.lines.map((l, i) => {
          const a = pointById.get(l.a)
          const b = pointById.get(l.b)
          if (!a || !b) return null
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={l.color ?? DEFAULT_LINE_COLOR} strokeWidth="1.2" opacity="0.85" />
          )
        })}
        {design.points.map(p => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={3} fill={p.color ?? DEFAULT_POINT_COLOR} />
            {p.label && (
              <text x={p.x} y={p.y - 7}
                textAnchor="middle" dominantBaseline="middle" fontSize="7"
                fill="var(--color-text-muted)"
                style={{ userSelect: 'none' } as CSSProperties}
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </ZoomableSVGContainer>
  )
}
