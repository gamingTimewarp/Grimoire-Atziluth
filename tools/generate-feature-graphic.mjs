#!/usr/bin/env node
/**
 * generate-feature-graphic.mjs
 * Generates the 1024x500 Google Play feature graphic SVG.
 * Reproduces geometry, colours, and layout from the app's three main SVG views:
 *   - Wheel Chart (natal astrology wheel)  — WheelChart.tsx
 *   - Tree of Life (Qabalistic diagram)     — TreeOfLife.tsx
 *   - Celtic Cross (Tarot spread layout)    — SpreadGrid.tsx
 *
 * Usage:
 *   node tools/generate-feature-graphic.mjs > feature-graphic.svg
 *
 * Convert to PNG (choose one):
 *   rsvg-convert -w 1024 -h 500 feature-graphic.svg > feature-graphic.png
 *   inkscape --export-type=png --export-width=1024 --export-height=500 \
 *            feature-graphic.svg -o feature-graphic.png
 *   chromium --headless --screenshot=feature-graphic.png --window-size=1024,500 \
 *            "data:text/html,<body style='margin:0;background:%230d0d12'>\
 *            <img src='$(pwd)/feature-graphic.svg' width=1024 height=500></body>"
 */

const f = n => Number(n).toFixed(2)

// ─── Colour palette (mirrors index.css) ──────────────────────────────────────

const C = {
  bg:          '#0d0d12',
  surface1:    '#13131a',
  surface2:    '#1c1c27',
  surface3:    '#252533',
  border:      '#2e2e3f',
  accent:      '#c4922a',
  accentMuted: '#7a5a1a',
  text:        '#e8e4d6',
  textMuted:   '#7a7a8f',
  textSubtle:  '#4a4a60',
  fire:        '#c44a4a',
  earth:       '#6aa86a',
  air:         '#6ab0a8',
  water:       '#6a86a8',
}

// ─── Wheel Chart (viewBox 0 0 500 500) ───────────────────────────────────────
// Matches geometry constants in WheelChart.tsx

const WCX = 250, WCY = 250
const R_OUT = 238   // zodiac outer
const R_ZIN = 196   // zodiac inner / house outer
const R_HIN = 174   // house inner
const R_PLN = 148   // planet glyphs
const R_ASP = 108   // aspect lines

function wAngle(lon) {
  return ((180 - lon) % 360 + 360) % 360
}
function wPolar(deg, r) {
  const rad = deg * Math.PI / 180
  return [WCX + r * Math.cos(rad), WCY + r * Math.sin(rad)]
}
function arcPath(lon1, lon2, r1, r2) {
  const a1 = wAngle(lon1), a2 = wAngle(lon2)
  const [ox1,oy1] = wPolar(a1, r1)
  const [ox2,oy2] = wPolar(a2, r1)
  const [ix2,iy2] = wPolar(a2, r2)
  const [ix1,iy1] = wPolar(a1, r2)
  return `M ${f(ox1)} ${f(oy1)} A ${r1} ${r1} 0 0 0 ${f(ox2)} ${f(oy2)} `
       + `L ${f(ix2)} ${f(iy2)} A ${r2} ${r2} 0 0 1 ${f(ix1)} ${f(iy1)} Z`
}

const SIGNS = [
  { sym: '♈', col: C.fire  }, { sym: '♉', col: C.earth },
  { sym: '♊', col: C.air   }, { sym: '♋', col: C.water },
  { sym: '♌', col: C.fire  }, { sym: '♍', col: C.earth },
  { sym: '♎', col: C.air   }, { sym: '♏', col: C.water },
  { sym: '♐', col: C.fire  }, { sym: '♑', col: C.earth },
  { sym: '♒', col: C.air   }, { sym: '♓', col: C.water },
]

// Decorative planet positions (not a real chart — distributed for visual balance)
const PLANETS = [
  { sym: '☉', lon: 278, col: '#E8C040' },
  { sym: '☽', lon:  98, col: '#C8C8C8' },
  { sym: '☿', lon: 292, col: C.air     },
  { sym: '♀', lon: 245, col: C.earth   },
  { sym: '♂', lon: 158, col: C.fire    },
  { sym: '♃', lon:  58, col: '#E06000' },
  { sym: '♄', lon: 202, col: '#909090' },
  { sym: '♅', lon: 343, col: C.water   },
  { sym: '♆', lon: 316, col: '#4a6aa8' },
]

// Decorative aspect lines [p1, p2, colour, opacity]
const ASPECT_LINES = [
  [0, 1, '#c47a4a', 0.50],
  [0, 5, C.earth,   0.40],
  [1, 4, C.fire,    0.30],
  [2, 6, C.textMuted, 0.28],
  [3, 7, C.air,     0.35],
]

function buildWheel() {
  const p = []

  p.push(`<circle cx="${WCX}" cy="${WCY}" r="${R_OUT}" fill="${C.surface1}" stroke="${C.border}" stroke-width="1"/>`)

  // Zodiac ring — larger symbols for banner legibility
  for (let i = 0; i < 12; i++) {
    const { sym, col } = SIGNS[i]
    const mid = wAngle(i * 30 + 15)
    const [tx, ty] = wPolar(mid, (R_OUT + R_ZIN) / 2)
    p.push(`<path d="${arcPath(i*30,(i+1)*30,R_OUT,R_ZIN)}" fill="${col}28" stroke="${C.border}" stroke-width="0.5"/>`)
    p.push(`<text x="${f(tx)}" y="${f(ty)}" text-anchor="middle" dominant-baseline="middle" font-size="22" fill="${col}" opacity="0.95" font-family="'Noto Sans Symbols 2','Noto Sans Symbols','Segoe UI Symbol',serif">${sym}</text>`)
  }

  // Inner chart area — no house ring, fill straight from zodiac inner edge
  p.push(`<circle cx="${WCX}" cy="${WCY}" r="${R_ZIN}" fill="${C.surface2}" stroke="${C.border}" stroke-width="0.5"/>`)

  // Aspect lines
  for (const [ai, bi, col, op] of ASPECT_LINES) {
    const [x1,y1] = wPolar(wAngle(PLANETS[ai].lon), R_ASP)
    const [x2,y2] = wPolar(wAngle(PLANETS[bi].lon), R_ASP)
    p.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="0.8" opacity="${op}"/>`)
  }

  p.push(`<circle cx="${WCX}" cy="${WCY}" r="${R_ASP}" fill="none" stroke="${C.border}" stroke-width="0.3" stroke-dasharray="2,4"/>`)

  // Planet glyphs — larger for banner legibility
  for (const { sym, lon, col } of PLANETS) {
    const [px, py] = wPolar(wAngle(lon), R_PLN)
    p.push(`<text x="${f(px)}" y="${f(py)}" text-anchor="middle" dominant-baseline="middle" font-size="28" fill="${col}" font-family="'Noto Sans Symbols 2','Noto Sans Symbols','Segoe UI Symbol',serif">${sym}</text>`)
  }

  // Cardinal labels
  p.push(`<text x="${f(WCX - R_OUT + 8)}" y="${f(WCY - 6)}" font-size="9" fill="${C.accent}" opacity="0.8">ASC</text>`)
  p.push(`<text x="${f(WCX + R_OUT - 30)}" y="${f(WCY - 6)}" font-size="9" fill="${C.textSubtle}" opacity="0.6">DSC</text>`)
  p.push(`<text x="${f(WCX - 10)}" y="${f(WCY - R_OUT + 14)}" font-size="9" fill="${C.textSubtle}" opacity="0.6">MC</text>`)
  p.push(`<text x="${f(WCX - 8)}" y="${f(WCY + R_OUT - 7)}" font-size="9" fill="${C.textSubtle}" opacity="0.6">IC</text>`)

  return p.join('\n    ')
}

// ─── Tree of Life (viewBox 0 0 500 760) ──────────────────────────────────────
// Positions match extendedData.treeX / treeY from the seeded entity data.

const TVW = 500, TVH = 760, TR = 30

// GD Queen Scale colours — matches SEPHIRA_COLORS in TreeOfLife.tsx
const SEPH = [
  { x:0.50, y:0.05, num:1,  fill:'#FFFFFF', text:'#333333', stroke:'#cccccc' },
  { x:0.82, y:0.14, num:2,  fill:'#808080', text:'#ffffff', stroke:'#606060' },
  { x:0.18, y:0.14, num:3,  fill:'#1a0828', text:'#e0c8f0', stroke:'#3a1848' },
  { x:0.82, y:0.36, num:4,  fill:'#4169E1', text:'#ffffff', stroke:'#2a49c1' },
  { x:0.18, y:0.36, num:5,  fill:'#C41E1E', text:'#ffffff', stroke:'#a01010' },
  { x:0.50, y:0.50, num:6,  fill:'#E8C040', text:'#333333', stroke:'#c8a020' },
  { x:0.82, y:0.66, num:7,  fill:'#228B22', text:'#ffffff', stroke:'#166b16' },
  { x:0.18, y:0.66, num:8,  fill:'#E06000', text:'#ffffff', stroke:'#c05000' },
  { x:0.50, y:0.79, num:9,  fill:'#7B2FBE', text:'#ffffff', stroke:'#5b1f9e' },
  { x:0.50, y:0.94, num:10, fill:'#C8A850', text:'#333333', stroke:'#a88830' },
]
const DAATH = { x:0.50, y:0.28, fill:'#9B8AB8', stroke:'#7a6899' }

// Standard 22 paths — [from-index, to-index] into SEPH (0-based)
const TREE_PATHS = [
  [0,1],[0,2],[0,5],
  [1,2],[1,3],[1,5],
  [2,4],[2,5],
  [3,4],[3,5],[3,6],
  [4,5],[4,7],
  [5,6],[5,7],[5,8],
  [6,7],[6,8],[6,9],
  [7,8],[7,9],
  [8,9],
]

// World bands — matches WORLD_BANDS in TreeOfLife.tsx
const BANDS = [
  { y1:0.00, y2:0.32, fill:'rgba(180,60,60,0.07)',  lc:'#c44a4a', name:'Atziluth' },
  { y1:0.32, y2:0.60, fill:'rgba(60,100,200,0.07)', lc:'#5080cc', name:'Briah'    },
  { y1:0.60, y2:0.86, fill:'rgba(160,150,40,0.07)', lc:'#aaaa44', name:'Yetzirah' },
  { y1:0.86, y2:1.00, fill:'rgba(80,60,40,0.09)',   lc:'#8a7060', name:'Assiah'   },
]

function buildTree() {
  const p = []

  // No background rect — transparent for the banner

  // Paths — heavier weight for banner legibility
  for (const [ai, bi] of TREE_PATHS) {
    const a = SEPH[ai], b = SEPH[bi]
    p.push(`<line x1="${f(a.x*TVW)}" y1="${f(a.y*TVH)}" x2="${f(b.x*TVW)}" y2="${f(b.y*TVH)}" stroke="${C.textMuted}" stroke-width="3.0" opacity="0.8"/>`)
  }

  // Da'ath (dashed, semi-transparent — no name label)
  const dx = DAATH.x * TVW, dy = DAATH.y * TVH
  p.push(`<circle cx="${f(dx)}" cy="${f(dy)}" r="${TR}" fill="${DAATH.fill}" stroke="${DAATH.stroke}" stroke-width="2" stroke-dasharray="5,4" opacity="0.55"/>`)

  // Sephiroth — number inside circle only
  for (const s of SEPH) {
    const sx = s.x * TVW, sy = s.y * TVH
    p.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${TR}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>`)
    p.push(`<text x="${f(sx)}" y="${f(sy)}" text-anchor="middle" dominant-baseline="middle" font-size="15" fill="${s.text}" font-weight="600">${s.num}</text>`)
  }

  return p.join('\n    ')
}

// ─── Celtic Cross (absolute pixel coords) ────────────────────────────────────
// SpreadGrid.tsx layout with BASE_W=88, BASE_H=140 scaled to 0.62

const CC_W = 54, CC_H = 86, CC_GAP = 6

// col/row are 1-indexed; crossing cards rendered landscape, centred over base cell
const CC_POS = [
  { id:1,  col:2, row:2, label:'Present',    crossing:false },
  { id:2,  col:2, row:2, label:'Cross',      crossing:true  },
  { id:3,  col:2, row:3, label:'Foundation', crossing:false },
  { id:4,  col:1, row:2, label:'Past',       crossing:false },
  { id:5,  col:2, row:1, label:'Crown',      crossing:false },
  { id:6,  col:3, row:2, label:'Future',     crossing:false },
  { id:7,  col:4, row:4, label:'Self',       crossing:false },
  { id:8,  col:4, row:3, label:'House',      crossing:false },
  { id:9,  col:4, row:2, label:'Hopes',      crossing:false },
  { id:10, col:4, row:1, label:'Outcome',    crossing:false },
]

const CC_TOTAL_W = 3 * (CC_W + CC_GAP) + CC_W   // 4 cols
const CC_TOTAL_H = 3 * (CC_H + CC_GAP) + CC_H   // 4 rows

function buildCelticCross() {
  const p = []
  const cx = col => (col - 1) * (CC_W + CC_GAP)
  const cy = row => (row - 1) * (CC_H + CC_GAP)

  for (const pos of CC_POS) {
    const bx = cx(pos.col), by = cy(pos.row)

    if (pos.crossing) {
      // Landscape card centred over the base cell
      const lw = CC_H, lh = CC_W
      const lx = bx + (CC_W - CC_H) / 2
      const ly = by + (CC_H - CC_W) / 2
      p.push(`<rect x="${f(lx)}" y="${f(ly)}" width="${lw}" height="${lh}" rx="4" fill="${C.surface3}" stroke="${C.accent}" stroke-width="1.2"/>`)
      p.push(`<text x="${f(lx+lw/2)}" y="${f(ly+lh/2)}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="${C.accent}">${pos.id}</text>`)
    } else {
      p.push(`<rect x="${f(bx)}" y="${f(by)}" width="${CC_W}" height="${CC_H}" rx="4" fill="${C.surface2}" stroke="${C.border}" stroke-width="1"/>`)
      p.push(`<text x="${f(bx+CC_W/2)}" y="${f(by+CC_H/2-7)}" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="${C.accentMuted}" opacity="0.85">${pos.id}</text>`)
      p.push(`<text x="${f(bx+CC_W/2)}" y="${f(by+CC_H/2+9)}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="${C.textMuted}">${pos.label}</text>`)
    }
  }

  return p.join('\n    ')
}

// ─── Compose ──────────────────────────────────────────────────────────────────

const W = 1024, H = 500

// Balanced layout: equal margins on left and right.
// Three elements: wheel (square) | tree (tall) | celtic cross
// Gap between elements: 18px.  Solve for margin M:
//   2M + wheelW + 18 + treeW + 18 + CC_TOTAL_W = 1024
const WHEEL_W = 320, TREE_W = 300, GAP = 18
const MARGIN = Math.round((W - WHEEL_W - GAP - TREE_W - GAP - CC_TOTAL_W) / 2)
// MARGIN ≈ 67

const WHEEL_X = MARGIN
const TREE_X  = WHEEL_X + WHEEL_W + GAP
const CC_X    = TREE_X  + TREE_W  + GAP
const ccOffY  = Math.round((H - CC_TOTAL_H) / 2)

const DIV1 = TREE_X - Math.round(GAP / 2)
const DIV2 = CC_X   - Math.round(GAP / 2)

// Tiphareth is at x=0.50 in the tree viewBox (500px wide).
// With preserveAspectRatio xMidYMid meet, scale = min(TREE_W/500, (H-10)/760).
// The tree fills the full TREE_W horizontally (scale = TREE_W/500 = 0.60 is the limiting axis),
// so no horizontal centering offset: Tiphareth screen x = TREE_X + 0.50*500*scale.
const TREE_SCALE = TREE_W / 500
const TIPHARETH_X = Math.round(TREE_X + 0.50 * 500 * TREE_SCALE)  // = TREE_X + TREE_W/2

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">

  <defs>
    <style>
      text { font-family: 'Inter', 'Noto Sans', system-ui, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${C.bg}"/>

  <!-- Section dividers -->
  <line x1="${DIV1}" y1="20" x2="${DIV1}" y2="${H-20}" stroke="${C.border}" stroke-width="0.5" stroke-dasharray="4,8" opacity="0.5"/>
  <line x1="${DIV2}" y1="20" x2="${DIV2}" y2="${H-20}" stroke="${C.border}" stroke-width="0.5" stroke-dasharray="4,8" opacity="0.5"/>

  <!-- Wheel Chart -->
  <svg x="${WHEEL_X}" y="10" width="${WHEEL_W}" height="${H-20}" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet">
    ${buildWheel()}
  </svg>

  <!-- Tree of Life -->
  <svg x="${TREE_X}" y="5" width="${TREE_W}" height="${H-10}" viewBox="0 0 500 760" preserveAspectRatio="xMidYMid meet">
    ${buildTree()}
  </svg>

  <!-- Celtic Cross -->
  <svg x="${CC_X}" y="${ccOffY}" width="${CC_TOTAL_W}" height="${CC_TOTAL_H}" viewBox="0 0 ${CC_TOTAL_W} ${CC_TOTAL_H}">
    ${buildCelticCross()}
  </svg>

  <!-- App name — space between words aligned directly below Tiphareth -->
  <text x="${TIPHARETH_X - 3}" y="${H-8}" text-anchor="end" font-family="'Inter', system-ui, sans-serif"
        font-size="12" font-weight="300" fill="${C.text}" letter-spacing="0.18em" opacity="0.35">GRIMOIRE</text>
  <text x="${TIPHARETH_X + 3}" y="${H-8}" text-anchor="start" font-family="'Inter', system-ui, sans-serif"
        font-size="12" font-weight="300" fill="${C.text}" letter-spacing="0.18em" opacity="0.35">ATZILUTH</text>

</svg>`

process.stdout.write(svg)
