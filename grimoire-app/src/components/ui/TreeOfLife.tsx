/**
 * TreeOfLife.tsx
 * Data-driven SVG Tree of Life / Nightside Tree.
 * Sephira/Qliphah positions come from entity extendedData (treeX, treeY).
 * Paths/Tunnels connect nodes using fromSephira/toSephira or fromQliphoth/toQliphoth.
 */

import React, { useEffect, useState, useMemo } from 'react'
import type { BaseEntity } from '@grimoire/core'
import { useEngineStore } from '@/stores/engine'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'

// ─── Geometry ────────────────────────────────────────────────────────────────

const VW = 500
const VH = 760
const R  = 22   // node radius

function nodeX(e: BaseEntity): number {
  return (e.extendedData.treeX as number ?? 0.5) * VW
}
function nodeY(e: BaseEntity): number {
  return (e.extendedData.treeY as number ?? 0.5) * VH
}

/** Perpendicular offset point alongside a path — placed to the right of the A→B direction */
function pathLabelPos(
  x1: number, y1: number,
  x2: number, y2: number,
  offset = 22,
): { x: number; y: number; anchor: string } {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Normal: rotate direction 90° clockwise → (dy, -dx)
  const nx = dy / len
  const ny = -dx / len
  const x = mx + nx * offset
  const y = my + ny * offset
  // Text anchor: if label is to the left of centre use end, else start
  const anchor = x < mx ? 'end' : 'start'
  return { x, y, anchor }
}

// ─── Color maps ──────────────────────────────────────────────────────────────

/** GD Queen Scale colours for Sephiroth */
const SEPHIRA_COLORS: Record<string, { fill: string; text: string; stroke: string }> = {
  'qabalah.sephira.kether':    { fill: '#FFFFFF', text: '#333333', stroke: '#cccccc' },
  'qabalah.sephira.chokmah':   { fill: '#808080', text: '#FFFFFF', stroke: '#606060' },
  'qabalah.sephira.binah':     { fill: '#1a0828', text: '#e0c8f0', stroke: '#3a1848' },
  'qabalah.sephira.daath':     { fill: '#9B8AB8', text: '#FFFFFF', stroke: '#7a6899' },
  'qabalah.sephira.chesed':    { fill: '#4169E1', text: '#FFFFFF', stroke: '#2a49c1' },
  'qabalah.sephira.geburah':   { fill: '#C41E1E', text: '#FFFFFF', stroke: '#a01010' },
  'qabalah.sephira.tiphareth': { fill: '#E8C040', text: '#333333', stroke: '#c8a020' },
  'qabalah.sephira.netzach':   { fill: '#228B22', text: '#FFFFFF', stroke: '#166b16' },
  'qabalah.sephira.hod':       { fill: '#E06000', text: '#FFFFFF', stroke: '#c05000' },
  'qabalah.sephira.yesod':     { fill: '#7B2FBE', text: '#FFFFFF', stroke: '#5b1f9e' },
  'qabalah.sephira.malkuth':   { fill: '#C8A850', text: '#333333', stroke: '#a88830' },
}

/** Nightside colours for Qliphoth */
const QLIPHOTH_COLORS: Record<string, { fill: string; text: string; stroke: string }> = {
  'qabalah.qliphoth.thaumiel':       { fill: '#1a0505', text: '#dd6666', stroke: '#440a0a' },
  'qabalah.qliphoth.chaigidel':      { fill: '#050518', text: '#6688dd', stroke: '#0a0a44' },
  'qabalah.qliphoth.satariel':       { fill: '#0e0814', text: '#aa88cc', stroke: '#2a1840' },
  'qabalah.qliphoth.gha-agsheblah':  { fill: '#0d0518', text: '#9966cc', stroke: '#281040' },
  'qabalah.qliphoth.golachab':       { fill: '#1a0505', text: '#cc4444', stroke: '#440808' },
  'qabalah.qliphoth.thagirion':      { fill: '#141400', text: '#aaaa33', stroke: '#343400' },
  'qabalah.qliphoth.harab-serapel':  { fill: '#051405', text: '#44aa44', stroke: '#0a280a' },
  'qabalah.qliphoth.samael':         { fill: '#150a00', text: '#cc7722', stroke: '#382000' },
  'qabalah.qliphoth.gamaliel':       { fill: '#12001a', text: '#aa44cc', stroke: '#300040' },
  'qabalah.qliphoth.nahemoth':       { fill: '#0c0c0c', text: '#888888', stroke: '#282828' },
}

// ─── World bands (static — boundaries derived from canonical sephira positions) ─

const WORLD_BANDS = [
  { canonicalName: 'qabalah.world.atziluth', name: 'Atziluth', element: 'Fire',  y1: 0.00, y2: 0.32, color: 'rgba(180,60,60,0.08)',   labelColor: '#c44a4a' },
  { canonicalName: 'qabalah.world.briah',    name: 'Briah',    element: 'Water', y1: 0.32, y2: 0.60, color: 'rgba(60,100,200,0.08)',  labelColor: '#5080cc' },
  { canonicalName: 'qabalah.world.yetzirah', name: 'Yetzirah', element: 'Air',   y1: 0.60, y2: 0.86, color: 'rgba(160,150,40,0.08)',  labelColor: '#aaaa44' },
  { canonicalName: 'qabalah.world.assiah',   name: 'Assiah',   element: 'Earth', y1: 0.86, y2: 1.00, color: 'rgba(80,60,40,0.10)',   labelColor: '#8a7060' },
]

// ─── Pillar definitions (canonical names as updated in entity data) ───────────

const PILLAR_DEFS = [
  { canonicalName: 'qabalah.pillar.severity',   label: 'Severity',    cx: 0.18, sephiraX: 0.18 },
  { canonicalName: 'qabalah.pillar.equilibrium', label: 'Equilibrium', cx: 0.50, sephiraX: 0.50 },
  { canonicalName: 'qabalah.pillar.mercy',       label: 'Mercy',       cx: 0.82, sephiraX: 0.82 },
]

// ─── Planetary symbols for sephiroth ─────────────────────────────────────────

/** Classical 7-planet assignments — Binah through Malkuth, always the same */
const PLANET_SYMBOLS_BASE: Record<string, string> = {
  'qabalah.sephira.binah':     '♄',  // Saturn
  'qabalah.sephira.chesed':    '♃',  // Jupiter
  'qabalah.sephira.geburah':   '♂',  // Mars
  'qabalah.sephira.tiphareth': '☉',  // Sun
  'qabalah.sephira.netzach':   '♀',  // Venus
  'qabalah.sephira.hod':       '☿',  // Mercury
  'qabalah.sephira.yesod':     '☽',  // Moon
  'qabalah.sephira.malkuth':   '♁',  // Earth
}

/** Traditional: Kether = Primum Mobile, Chokmah = Fixed Stars/Zodiac, Da'ath = none */
const PLANET_SYMBOLS_TRADITIONAL: Record<string, string> = {
  ...PLANET_SYMBOLS_BASE,
  'qabalah.sephira.kether':  '✦',  // Primum Mobile
  'qabalah.sephira.chokmah': '✦',  // Fixed Stars / Zodiac
}

/** Modern astrology: outer planets fill the top three spheres */
const PLANET_SYMBOLS_MODERN: Record<string, string> = {
  ...PLANET_SYMBOLS_BASE,
  'qabalah.sephira.kether':  '♆',  // Neptune
  'qabalah.sephira.chokmah': '♅',  // Uranus
  'qabalah.sephira.daath':   '♇',  // Pluto
}

// ─── Hebrew letter glyphs (immutable Unicode) ─────────────────────────────────

const HEBREW_GLYPHS: Record<string, string> = {
  'letter.hebrew.aleph':  'א', 'letter.hebrew.beth':   'ב', 'letter.hebrew.gimel':  'ג',
  'letter.hebrew.daleth': 'ד', 'letter.hebrew.heh':    'ה', 'letter.hebrew.vau':    'ו',
  'letter.hebrew.zayin':  'ז', 'letter.hebrew.cheth':  'ח', 'letter.hebrew.teth':   'ט',
  'letter.hebrew.yod':    'י', 'letter.hebrew.kaph':   'כ', 'letter.hebrew.lamed':  'ל',
  'letter.hebrew.mem':    'מ', 'letter.hebrew.nun':    'נ', 'letter.hebrew.samekh': 'ס',
  'letter.hebrew.ayin':   'ע', 'letter.hebrew.peh':    'פ', 'letter.hebrew.tzaddi': 'צ',
  'letter.hebrew.qoph':   'ק', 'letter.hebrew.resh':   'ר', 'letter.hebrew.shin':   'ש',
  'letter.hebrew.tau':    'ת',
}

/** Per-path label position tweaks keyed by path number.
 *  dx shifts the label left/right; supplying anchor overrides the auto side. */
const PATH_LABEL_OVERRIDES: Record<number, { dx: number; anchor?: 'start' | 'end' }> = {
  21: { dx: -20 },  // Chesed→Netzach: right-pillar vertical, label clips right SVG edge — nudge in
  31: { dx: -40 },  // Hod→Malkuth: label overlaps Yesod — nudge left
}

/** "tarot.major.rws.the-high-priestess" → "High Priestess" */
function cardAbbrev(cn: string): string {
  const slug = cn.split('.').pop() ?? ''
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return name.startsWith('The ') ? name.slice(4) : name
}

/** Returns a halo stroke colour that contrasts with the given text fill.
 *  Dark text (e.g. Binah #1a0828) gets a white halo; light/coloured text
 *  uses the surface colour so it blends on dark themes. */
function haloFor(fill: string): string {
  if (!fill.startsWith('#') || fill.length < 7) return 'var(--color-surface-1)'
  const r = parseInt(fill.slice(1, 3), 16) / 255
  const g = parseInt(fill.slice(3, 5), 16) / 255
  const b = parseInt(fill.slice(5, 7), 16) / 255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum < 0.25 ? '#ffffff' : 'var(--color-surface-1)'
}

// ─── HSV colour helpers ───────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if      (max === r) h = (((g - b) / d) % 6 + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else                h = (r - g) / d + 4
    h *= 60
  }
  return [h, max === 0 ? 0 : d / max, max]
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  const hex2 = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`
}

/** HSV midpoint of two hex colours. Achromatic colours yield to the other's hue. */
function avgHsvHex(hex1: string, hex2: string): string {
  const [h1, s1, v1] = hexToHsv(hex1)
  const [h2, s2, v2] = hexToHsv(hex2)
  const s = (s1 + s2) / 2
  // Clamp V so paths are always readable against the SVG background
  const v = Math.max((v1 + v2) / 2, 0.50)
  // Circular hue mean — skip if both achromatic
  let h = 0
  if (s1 < 0.05 && s2 < 0.05) {
    h = 0
  } else if (s1 < 0.05) {
    h = h2
  } else if (s2 < 0.05) {
    h = h1
  } else {
    let diff = h2 - h1
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    h = (h1 + diff / 2 + 360) % 360
  }
  return hsvToHex(h, s, v)
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type TreeOfLifeProps = {
  mode: 'sephiroth' | 'qliphoth'
  onNavigate: (canonicalName: string) => void
  size?: number   // display width in px; height scales proportionally
  showDaath?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TreeOfLife({ mode, onNavigate, size = 500, showDaath = true }: TreeOfLifeProps) {
  const { engine } = useEngineStore()

  const [primaryBySystem, setPrimaryBySystem] = useState(
    () => loadTraditionSettings().primaryBySystem
  )
  const [activeTraditions, setActiveTraditions] = useState(
    () => loadTraditionSettings().activeTraditions
  )

  useEffect(() => {
    const handler = () => {
      const s = loadTraditionSettings()
      setPrimaryBySystem(s.primaryBySystem)
      setActiveTraditions(s.activeTraditions)
    }
    window.addEventListener('grimoire:traditions-changed', handler)
    return () => window.removeEventListener('grimoire:traditions-changed', handler)
  }, [])

  const [sephiroth, setSephiroth] = useState<BaseEntity[]>([])
  const [qliphoth,  setQliphoth]  = useState<BaseEntity[]>([])
  const [paths,     setPaths]     = useState<BaseEntity[]>([])
  const [tunnels,   setTunnels]   = useState<BaseEntity[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  // sephira canonical name → { name, cn } for the corresponding chakra
  const [chakraMap, setChakraMap] = useState<Map<string, { name: string; cn: string }>>(new Map())

  useEffect(() => {
    if (!engine) return
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    const lim = { offset: 0, limit: 50 }
    Promise.all([
      engine.adapter.listEntities({ entityType: 'qabalah.sephira' },       lim),
      engine.adapter.listEntities({ entityType: 'qabalah.qliphoth' },      lim),
      engine.adapter.listEntities({ entityType: 'qabalah.path' },          lim),
      engine.adapter.listEntities({ entityType: 'qabalah.tunnel-of-set' }, lim),
    ]).then(([s, q, p, t]) => {
      if (cancelled) return
      setSephiroth(s.items)
      setQliphoth(q.items)
      setPaths(p.items.sort((a, b) =>
        (a.extendedData.pathNumber as number) - (b.extendedData.pathNumber as number)))
      setTunnels(t.items.sort((a, b) =>
        (a.extendedData.pathNumber as number) - (b.extendedData.pathNumber as number)))
      setLoading(false)
    }).catch(err => {
      console.error(err)
      if (cancelled) return
      setLoadError(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [engine, retryToken])

  // Load chakra→sephira map when the hinduism-chakra tradition is active
  useEffect(() => {
    if (!engine) return
    const { activeTraditions } = loadTraditionSettings()
    if (!activeTraditions.includes('tradition.hinduism-chakra')) {
      setChakraMap(new Map())
      return
    }
    const lim = { offset: 0, limit: 20 }
    Promise.all([
      engine.adapter.listEntities({ entityType: 'chakra' },          lim),
      engine.adapter.listEntities({ entityType: 'chakra.extended' }, lim),
    ]).then(([classical, extended]) => {
      const map = new Map<string, { name: string; cn: string }>()
      for (const c of [...classical.items, ...extended.items]) {
        const sephiraCN = c.extendedData.sephiraCorrespondence as string | undefined
        if (sephiraCN) map.set(sephiraCN, { name: c.primaryDisplayName, cn: c.canonicalName })
      }
      setChakraMap(map)
    }).catch(console.error)
  }, [engine])

  const sephiraMap = useMemo(() => new Map(sephiroth.map(s => [s.canonicalName, s])), [sephiroth])
  const qliphothMap = useMemo(() => new Map(qliphoth.map(q => [q.canonicalName, q])), [qliphoth])

  // Da'ath is a special pseudo-sephira — separate from the numbered ones
  const daath = useMemo(() => sephiroth.find(s => s.canonicalName === 'qabalah.sephira.daath'), [sephiroth])
  const numberedSephiroth = useMemo(() =>
    sephiroth
      .filter(s => s.canonicalName !== 'qabalah.sephira.daath' && s.extendedData.number != null)
      .sort((a, b) => (a.extendedData.number as number) - (b.extendedData.number as number)),
    [sephiroth])

  const displayHeight = Math.round(size * VH / VW)

  // These must be above the early return to satisfy the Rules of Hooks
  const isSephiroth = mode === 'sephiroth'

  const planetSymbols = activeTraditions.includes('tradition.modern-astrology')
    ? PLANET_SYMBOLS_MODERN
    : PLANET_SYMBOLS_TRADITIONAL

  const nodeData = useMemo(() => {
    const daathNode = showDaath && daath ? [daath] : []
    const nodes = isSephiroth ? [...numberedSephiroth, ...daathNode] : qliphoth
    const colorMap = isSephiroth ? SEPHIRA_COLORS : QLIPHOTH_COLORS
    return nodes.map(node => {
      const x = nodeX(node)
      const y = nodeY(node)
      const colors = colorMap[node.canonicalName] ?? { fill: '#444', text: '#fff', stroke: '#666' }
      const isDaath = node.canonicalName === 'qabalah.sephira.daath'
      const num = node.extendedData.number as number | null
      const hebrew = node.extendedData.hebrewName as string ?? ''
      const chakra = isSephiroth ? chakraMap.get(node.canonicalName) : undefined
      const planet = isSephiroth ? (planetSymbols[node.canonicalName] ?? '') : ''
      const hasNum = num != null
      const hitBottom = chakra ? R + 26 : R + 16
      const nameColor = isSephiroth
        ? (colors.fill === '#FFFFFF' ? 'var(--color-text-muted)' : colors.fill)
        : 'var(--color-text-muted)'
      const nameHalo = haloFor(nameColor)
      return { node, x, y, colors, isDaath, num, hebrew, chakra, planet, hasNum, hitBottom, nameColor, nameHalo }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSephiroth, numberedSephiroth, qliphoth, daath, showDaath, chakraMap, planetSymbols])

  if (loading) {
    return (
      <div style={{ width: size, height: displayHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '13px' }}>
        Loading tree…
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ width: size, height: displayHeight, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '13px' }}>
        <span>Couldn't load the Tree of Life data.</span>
        <button
          onClick={() => setRetryToken(t => t + 1)}
          style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', color: 'var(--color-accent)', fontFamily: 'inherit', fontSize: '12px' }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Build pillar Y-extents from sephira positions ─────────────────────────

  const pillarBoxes = PILLAR_DEFS.map(p => {
    const members = sephiroth.filter(s => {
      const px = (s.extendedData.treeX as number ?? 0.5) * VW
      return Math.abs(px - p.cx * VW) < 5
    })
    if (members.length === 0) return null
    const ys = members.map(s => (s.extendedData.treeY as number ?? 0.5) * VH)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const pad = R + 12
    return {
      ...p,
      x1: p.cx * VW - R - 12,
      x2: p.cx * VW + R + 12,
      y1: minY - pad,
      y2: maxY + pad,
    }
  }).filter(Boolean) as Array<typeof PILLAR_DEFS[0] & { x1: number; x2: number; y1: number; y2: number }>

  // ── Render helpers ────────────────────────────────────────────────────────

  const buildEdgeData = () => {
    const edges = isSephiroth ? paths : tunnels
    return edges.map(edge => {
      const fromCn = isSephiroth
        ? (edge.extendedData.fromSephira as string)
        : (edge.extendedData.fromQliphoth as string)
      const toCn = isSephiroth
        ? (edge.extendedData.toSephira as string)
        : (edge.extendedData.toQliphoth as string)

      const fromNode = isSephiroth ? sephiraMap.get(fromCn) : qliphothMap.get(fromCn)
      const toNode   = isSephiroth ? sephiraMap.get(toCn)   : qliphothMap.get(toCn)
      if (!fromNode || !toNode) return null

      const x1 = nodeX(fromNode), y1 = nodeY(fromNode)
      const x2 = nodeX(toNode),   y2 = nodeY(toNode)
      const label = pathLabelPos(x1, y1, x2, y2, 24)

      const letter  = isSephiroth ? HEBREW_GLYPHS[edge.extendedData.hebrewLetter as string] ?? '' : ''
      const cardCn  = isSephiroth ? (edge.extendedData.gdTarotCard as string ?? '') : ''
      const card    = isSephiroth ? cardAbbrev(cardCn) : ''
      const pathNum = edge.extendedData.pathNumber as number

      const fromFill  = SEPHIRA_COLORS[fromCn]?.fill ?? '#888888'
      const toFill    = SEPHIRA_COLORS[toCn]?.fill   ?? '#888888'
      const lineColor = isSephiroth ? avgHsvHex(fromFill, toFill) : '#8b0000'
      const textColor = isSephiroth ? lineColor : '#cc3333'

      return { edge, x1, y1, x2, y2, label, letter, card, pathNum, lineColor, textColor }
    }).filter(Boolean) as Array<{
      edge: BaseEntity; x1: number; y1: number; x2: number; y2: number
      label: ReturnType<typeof pathLabelPos>
      letter: string; card: string; pathNum: number
      lineColor: string; textColor: string
    }>
  }

  /** Layer 1: path/tunnel lines + hit targets (no text). */
  const renderEdgeLines = () => {
    const edgeData = buildEdgeData()
    return edgeData.map(({ edge, x1, y1, x2, y2, lineColor }) => (
      <g key={`line-${edge.canonicalName}`} onClick={() => onNavigate(edge.canonicalName)} style={{ cursor: 'pointer' }}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lineColor} strokeWidth={1.2} opacity={0.6} />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
      </g>
    ))
  }

  /** Layer 2: node circles + inner content (number, Hebrew, planet). */
  const renderNodeBodies = () => nodeData.map(({ node, x, y, colors, isDaath, num, hebrew, planet, hasNum, hitBottom }) => (
    <g
      key={`body-${node.canonicalName}`}
      onClick={() => onNavigate(node.canonicalName)}
      style={{ cursor: 'pointer' }}
      opacity={isDaath ? 0.55 : 1}
    >
      <rect x={x - 36} y={y - R} width={72} height={R + hitBottom} fill="transparent" />
      <circle cx={x} cy={y} r={R} fill={colors.fill} stroke={colors.stroke} strokeWidth={1.5}
        strokeDasharray={isDaath ? '4,3' : undefined} />
      {hasNum && (
        <text x={x} y={y - 8} textAnchor="middle" dominantBaseline="middle"
          fontSize={7} fill={colors.text} opacity={0.7}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>{num}</text>
      )}
      <text x={x} y={y + (hasNum ? 1 : 0)} textAnchor="middle" dominantBaseline="middle"
        fontSize={hasNum ? 10 : 11} fill={colors.text} fontFamily="serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>{hebrew}</text>
      {planet && (
        <text x={x} y={y + (hasNum ? 12 : 11)} textAnchor="middle" dominantBaseline="middle"
          fontSize={8} fill={colors.text} opacity={0.75}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>{planet}</text>
      )}
    </g>
  ))

  /** Layer 3: path/tunnel labels (Hebrew letter + path number + card). */
  const renderEdgeLabels = () => {
    const edgeData = buildEdgeData()
    return edgeData.map(({ edge, label, letter, card, pathNum, textColor }) => {
      const ov = PATH_LABEL_OVERRIDES[pathNum]
      const lx = label.x + (ov?.dx ?? 0)
      const anchor = (ov?.anchor ?? label.anchor) as 'start' | 'middle' | 'end'
      return (
        <g key={`label-${edge.canonicalName}`} onClick={() => onNavigate(edge.canonicalName)} style={{ cursor: 'pointer' }}>
          <text x={lx} y={label.y - 6} textAnchor={anchor}
            fontSize={13} fill={textColor} fontFamily="serif"
            stroke="var(--color-surface-1)" strokeWidth={3}
            style={{ paintOrder: 'stroke fill', userSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}>{letter}</text>
          <text x={lx} y={label.y + 7} textAnchor={anchor}
            fontSize={7} fill={textColor} opacity={0.8}
            stroke="var(--color-surface-1)" strokeWidth={3}
            style={{ paintOrder: 'stroke fill', userSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}>
            {isSephiroth ? `${pathNum} ${card}` : edge.primaryDisplayName}
          </text>
        </g>
      )
    })
  }

  /** Layer 4: node English name labels + chakra labels. */
  const renderNodeLabels = () => nodeData.map(({ node, x, y, isDaath, chakra, nameColor, nameHalo }) => (
    <g
      key={`name-${node.canonicalName}`}
      onClick={() => onNavigate(node.canonicalName)}
      style={{ cursor: 'pointer' }}
      opacity={isDaath ? 0.55 : 1}
    >
      <text x={x} y={y + R + 9} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fill={nameColor}
        stroke={nameHalo} strokeWidth={1}
        style={{ paintOrder: 'stroke fill', userSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}>
        {resolveDisplayName(node, primaryBySystem)}
      </text>
      {chakra && (
        <g onClick={e => { e.stopPropagation(); onNavigate(chakra.cn) }} style={{ cursor: 'pointer' }}>
          <rect x={x - 30} y={y + R + 12} width={60} height={12} fill="transparent" />
          <text x={x} y={y + R + 19} textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fill="var(--color-accent)" opacity={0.8}
            stroke="var(--color-surface-1)" strokeWidth={3}
            style={{ paintOrder: 'stroke fill', userSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}>{chakra.name}</text>
        </g>
      )}
    </g>
  ))

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width={size}
      height={displayHeight}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {/* Background */}
      <rect width={VW} height={VH} fill="var(--color-surface-1)" rx={6} />

      {/* ── World bands ── */}
      {WORLD_BANDS.map(band => {
        const y1 = band.y1 * VH
        const y2 = band.y2 * VH
        const midY = (y1 + y2) / 2
        return (
          <g key={band.canonicalName}>
            <rect
              x={0} y={y1} width={VW} height={y2 - y1}
              fill={band.color}
            />
            {/* Divider line (except top) */}
            {band.y1 > 0 && (
              <line x1={0} y1={y1} x2={VW} y2={y1} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="4,6" />
            )}
            {/* World label — right side, clickable */}
            <g
              onClick={() => onNavigate(band.canonicalName)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={VW - 62} y={midY - 9}
                width={60} height={18}
                rx={3} fill="var(--color-surface-2)" opacity={0.85}
              />
              <text
                x={VW - 32} y={midY}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fill={band.labelColor}
                fontWeight={500}
                style={{ userSelect: 'none' }}
              >{band.name}</text>
            </g>
          </g>
        )
      })}

      {/* ── Pillar boxes ── */}
      {pillarBoxes.map(box => (
        <g key={box.canonicalName}>
          <rect
            x={box.x1} y={box.y1}
            width={box.x2 - box.x1} height={box.y2 - box.y1}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={0.8}
            strokeDasharray="5,4"
            rx={4}
            opacity={0.5}
          />
          {/* Pillar label at top, clickable */}
          <g
            onClick={() => onNavigate(box.canonicalName)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={box.x1 + 1} y={box.y1 - 1}
              width={box.x2 - box.x1 - 2} height={13}
              fill="var(--color-surface-2)" rx={2}
            />
            <text
              x={(box.x1 + box.x2) / 2} y={box.y1 + 6}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={7} fill="var(--color-accent)"
              style={{ userSelect: 'none' }}
            >{box.label}</text>
          </g>
        </g>
      ))}

      {/* ── Layer 1: path/tunnel lines ── */}
      <g>{renderEdgeLines()}</g>

      {/* ── Layer 2: node circles + inner content ── */}
      <g>{renderNodeBodies()}</g>

      {/* ── Layer 3: path/tunnel labels ── */}
      <g>{renderEdgeLabels()}</g>

      {/* ── Layer 4: sephirah name labels + chakra labels ── */}
      <g>{renderNodeLabels()}</g>
    </svg>
  )
}
