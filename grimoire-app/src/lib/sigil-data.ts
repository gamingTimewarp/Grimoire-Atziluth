/**
 * sigil-data.ts
 * Shared data model for user-drawn custom sigils/magic circles: a flat set
 * of points (optionally labelled), lines connecting two points by id, and
 * free-standing circles. Deliberately the same "points + connecting lines"
 * vocabulary as ConstellationDiagram, extended with circles — simple,
 * serializable as plain SVG primitives (no raw user-supplied markup to
 * sandbox), and expressive enough for most hand-drawn magical diagrams.
 *
 * Stored on a custom entity (entityType 'magic.custom-sigil') directly as
 * extendedData.points / .lines / .circles.
 */

export interface SigilPoint {
  id: string
  x: number
  y: number
  /** Shown centred above the point when set. */
  label?: string
  /** CSS color. Falls back to the theme's default point color when unset. */
  color?: string
}

export interface SigilLine {
  /** Point id. */
  a: string
  /** Point id. */
  b: string
  /** CSS color. Falls back to the theme's default line color when unset. */
  color?: string
}

export interface SigilCircle {
  id: string
  cx: number
  cy: number
  r: number
  /** CSS color. Falls back to the theme's default circle color when unset. */
  color?: string
}

export interface SigilDesign {
  points: SigilPoint[]
  lines: SigilLine[]
  circles: SigilCircle[]
}

/** Square viewBox side length of the sigil editor's default (zoom 1) framing —
 *  presets are centred and sized against this, and it's what a brand-new,
 *  empty design opens showing. Not a hard bound: see SIGIL_CANVAS_MIN/MAX. */
export const SIGIL_VIEWBOX_SIZE = 200

/**
 * Points and circles aren't clamped to the SIGIL_VIEWBOX_SIZE frame — authors can
 * place them anywhere the editor's own zoomed-out view can reach, so a design can
 * sprawl beyond the default framing. These bounds mark that wider square (matching
 * the editor's maximum zoom-out level) and exist here, not just in the editor, so
 * the read-only viewer (CustomSigilDiagram) uses the same viewBox and doesn't clip
 * content placed outside the original frame.
 */
export const SIGIL_CANVAS_MIN = -(SIGIL_VIEWBOX_SIZE / 2)
export const SIGIL_CANVAS_MAX = SIGIL_VIEWBOX_SIZE + SIGIL_VIEWBOX_SIZE / 2

// Literal hex fallbacks (not CSS vars) for use as <input type="color"> values and
// as the default render color, matching this app's dark theme --color-text/--color-border.
export const DEFAULT_POINT_COLOR = '#e8e4d6'
export const DEFAULT_LINE_COLOR = '#e8e4d6'
export const DEFAULT_CIRCLE_COLOR = '#2e2e3f'

/**
 * extendedData key other custom entities use to reference a 'magic.custom-sigil'
 * entity by canonical name, so a sigil authored independently can be attached to
 * (e.g.) a custom deity or ritual and shown in its own section on that entity's
 * Reference page.
 */
export const ATTACHED_SIGIL_KEY = 'attachedSigilCn'

const CENTER = SIGIL_VIEWBOX_SIZE / 2
const BASE_R = 80

export function newSigilElementId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function emptySigilDesign(): SigilDesign {
  return { points: [], lines: [], circles: [] }
}

/** Reads a design back out of an entity's extendedData, tolerating missing/malformed fields. */
export function sigilDesignFromExtendedData(data: Record<string, unknown>): SigilDesign {
  return {
    points: Array.isArray(data.points) ? data.points as SigilPoint[] : [],
    lines: Array.isArray(data.lines) ? data.lines as SigilLine[] : [],
    circles: Array.isArray(data.circles) ? data.circles as SigilCircle[] : [],
  }
}

export function sigilDesignToExtendedData(design: SigilDesign): Record<string, unknown> {
  return { points: design.points, lines: design.lines, circles: design.circles }
}

function regularPolygonVertices(n: number, r: number): { x: number; y: number }[] {
  // -90° so the first vertex points straight up, matching every other
  // regular-polygon diagram in this app (pentagram, hexagram, ...).
  return Array.from({ length: n }, (_, i) => {
    const angle = (-90 + i * (360 / n)) * Math.PI / 180
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
  })
}

function starPolygonLines(points: SigilPoint[], step: number): SigilLine[] {
  const n = points.length
  return points.map((p, i) => ({ a: p.id, b: points[(i + step) % n].id }))
}

export interface SigilPreset {
  id: string
  label: string
  build: () => SigilDesign
}

export const SIGIL_PRESETS: SigilPreset[] = [
  {
    id: 'circle',
    label: 'Circle',
    build: () => ({
      points: [],
      lines: [],
      circles: [{ id: newSigilElementId(), cx: CENTER, cy: CENTER, r: BASE_R }],
    }),
  },
  {
    id: 'circle-pentagram',
    label: 'Circle + Pentagram',
    build: () => {
      const points: SigilPoint[] = regularPolygonVertices(5, BASE_R)
        .map(v => ({ id: newSigilElementId(), ...v }))
      return {
        points,
        // {5/2} star polygon: every vertex connects to the one two steps away.
        lines: starPolygonLines(points, 2),
        circles: [{ id: newSigilElementId(), cx: CENTER, cy: CENTER, r: BASE_R }],
      }
    },
  },
  {
    id: 'circle-hexagram',
    label: 'Circle + Hexagram',
    build: () => {
      const points: SigilPoint[] = regularPolygonVertices(6, BASE_R)
        .map(v => ({ id: newSigilElementId(), ...v }))
      // Two overlapping triangles (Star of David): even vertices, then odd vertices.
      const evens = [points[0], points[2], points[4]]
      const odds  = [points[1], points[3], points[5]]
      return {
        points,
        lines: [...starPolygonLines(evens, 1), ...starPolygonLines(odds, 1)],
        circles: [{ id: newSigilElementId(), cx: CENTER, cy: CENTER, r: BASE_R }],
      }
    },
  },
]
