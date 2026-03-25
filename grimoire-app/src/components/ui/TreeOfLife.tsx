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

/** "tarot.major.rws.the-high-priestess" → "High Priestess" */
function cardAbbrev(cn: string): string {
  const slug = cn.split('.').pop() ?? ''
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return name.startsWith('The ') ? name.slice(4) : name
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

  useEffect(() => {
    const handler = () => setPrimaryBySystem(loadTraditionSettings().primaryBySystem)
    window.addEventListener('grimoire:traditions-changed', handler)
    return () => window.removeEventListener('grimoire:traditions-changed', handler)
  }, [])

  const [sephiroth, setSephiroth] = useState<BaseEntity[]>([])
  const [qliphoth,  setQliphoth]  = useState<BaseEntity[]>([])
  const [paths,     setPaths]     = useState<BaseEntity[]>([])
  const [tunnels,   setTunnels]   = useState<BaseEntity[]>([])
  const [loading,   setLoading]   = useState(true)
  // sephira canonical name → { name, cn } for the corresponding chakra
  const [chakraMap, setChakraMap] = useState<Map<string, { name: string; cn: string }>>(new Map())

  useEffect(() => {
    if (!engine) return
    const lim = { offset: 0, limit: 50 }
    Promise.all([
      engine.adapter.listEntities({ entityType: 'qabalah.sephira' },       lim),
      engine.adapter.listEntities({ entityType: 'qabalah.qliphoth' },      lim),
      engine.adapter.listEntities({ entityType: 'qabalah.path' },          lim),
      engine.adapter.listEntities({ entityType: 'qabalah.tunnel-of-set' }, lim),
    ]).then(([s, q, p, t]) => {
      setSephiroth(s.items)
      setQliphoth(q.items)
      setPaths(p.items.sort((a, b) =>
        (a.extendedData.pathNumber as number) - (b.extendedData.pathNumber as number)))
      setTunnels(t.items.sort((a, b) =>
        (a.extendedData.pathNumber as number) - (b.extendedData.pathNumber as number)))
      setLoading(false)
    }).catch(console.error)
  }, [engine])

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

  if (loading) {
    return (
      <div style={{ width: size, height: displayHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: '13px' }}>
        Loading tree…
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

  const isSephiroth = mode === 'sephiroth'

  const renderEdges = () => {
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

      const lineColor = isSephiroth ? 'var(--color-text-muted)' : '#8b0000'

      return (
        <g
          key={edge.canonicalName}
          onClick={() => onNavigate(edge.canonicalName)}
          style={{ cursor: 'pointer' }}
        >
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={lineColor}
            strokeWidth={1.2}
            opacity={0.45}
          />
          {/* Wider invisible hit area */}
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="transparent"
            strokeWidth={12}
          />
          {/* Label: letter + path number + card name */}
          <text
            x={label.x} y={label.y - 6}
            textAnchor={label.anchor as 'start' | 'middle' | 'end'}
            fontSize={13}
            fill={isSephiroth ? 'var(--color-text)' : '#cc3333'}
            fontFamily="serif"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >{letter}</text>
          <text
            x={label.x} y={label.y + 7}
            textAnchor={label.anchor as 'start' | 'middle' | 'end'}
            fontSize={7}
            fill="var(--color-text-subtle)"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >{isSephiroth ? `${pathNum} ${card}` : edge.primaryDisplayName}</text>
        </g>
      )
    })
  }

  const renderNodes = () => {
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

      // Hit area height: circle diameter + English label + optional chakra label
      const hitBottom = chakra ? R + 26 : R + 16

      return (
        <g
          key={node.canonicalName}
          onClick={() => onNavigate(node.canonicalName)}
          style={{ cursor: 'pointer' }}
          opacity={isDaath ? 0.55 : 1}
        >
          {/* Invisible hit rect covering circle + labels */}
          <rect
            x={x - 36} y={y - R}
            width={72} height={R + hitBottom}
            fill="transparent"
          />
          <circle
            cx={x} cy={y} r={R}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
            strokeDasharray={isDaath ? '4,3' : undefined}
          />
          {/* Number */}
          {num != null && (
            <text
              x={x} y={y - 7}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={7} fill={colors.text} opacity={0.7}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >{num}</text>
          )}
          {/* Hebrew name (abbreviated glyph from primaryDisplayName) */}
          <text
            x={x} y={y + (num != null ? 5 : 0)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={num != null ? 10 : 11} fill={colors.text}
            fontFamily="serif"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >{hebrew}</text>
          {/* English name below circle */}
          <text
            x={x} y={y + R + 9}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill="var(--color-text-muted)"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >{resolveDisplayName(node, primaryBySystem)}</text>
          {/* Chakra name (when hinduism-chakra tradition active) — clickable, navigates to chakra */}
          {chakra && (
            <g
              onClick={e => { e.stopPropagation(); onNavigate(chakra.cn) }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x - 30} y={y + R + 12}
                width={60} height={12}
                fill="transparent"
              />
              <text
                x={x} y={y + R + 19}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fill="var(--color-accent)" opacity={0.8}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >{chakra.name}</text>
            </g>
          )}
        </g>
      )
    })
  }

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width={size}
      height={displayHeight}
      style={{ display: 'block', flexShrink: 0 }}
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

      {/* ── Path / tunnel lines ── */}
      {renderEdges()}

      {/* ── Nodes ── */}
      {renderNodes()}
    </svg>
  )
}
