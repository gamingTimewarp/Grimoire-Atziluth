/**
 * generate-thoth.mjs
 * Generates SVG art assets for the Thoth Tarot minor arcana (56 cards).
 *
 * Run from the repo root:
 *   node scripts/generate-thoth.mjs
 *
 * Generates:
 *  grimoire-app/public/art/tarot/tarot-minor-thoth-*.svg
 *
 * Design: dark elemental backgrounds, Golden Dawn colour scales (King Scale),
 * decanate attributions (planet + sign symbols), numbered pip arrangements,
 * Thoth-specific card titles (Dominion, Love, Sorrow etc.).
 * Court cards: dual elemental gradients, alchemical triangle rank symbols.
 *
 * All output is original work (programmatically generated).
 * Golden Dawn attributions are factual/traditional — not subject to copyright.
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART_ROOT  = path.join(__dirname, '../grimoire-app/public/art/tarot')

function write(dest, content) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (fs.existsSync(dest)) return false
  fs.writeFileSync(dest, content, 'utf8')
  return true
}

// ─── Colour Palettes (Golden Dawn King Scale) ─────────────────────────────────

const SUIT_THEME = {
  wands: {
    bg1: '#0d0100', bg2: '#280500', border: '#7a1200', accent: '#bb1e00',
    pip: '#ee4400', text: '#ffcc44', dim: '#994422',
    element: 'Fire',
  },
  cups: {
    bg1: '#000410', bg2: '#000f28', border: '#003377', accent: '#0044aa',
    pip: '#1166dd', text: '#77bbff', dim: '#224466',
    element: 'Water',
  },
  swords: {
    bg1: '#090900', bg2: '#161600', border: '#776600', accent: '#999900',
    pip: '#ccbb00', text: '#ffee88', dim: '#776633',
    element: 'Air',
  },
  disks: {
    bg1: '#020600', bg2: '#081208', border: '#245518', accent: '#336622',
    pip: '#448833', text: '#99cc77', dim: '#336622',
    element: 'Earth',
  },
}

// ─── Thoth Card Titles ────────────────────────────────────────────────────────

const TITLES = {
  wands:  { 2:'Dominion', 3:'Virtue', 4:'Completion', 5:'Strife', 6:'Victory',
            7:'Valour', 8:'Swiftness', 9:'Strength', 10:'Oppression' },
  cups:   { 2:'Love', 3:'Abundance', 4:'Luxury', 5:'Disappointment', 6:'Pleasure',
            7:'Debauch', 8:'Indolence', 9:'Happiness', 10:'Satiety' },
  swords: { 2:'Peace', 3:'Sorrow', 4:'Truce', 5:'Defeat', 6:'Science',
            7:'Futility', 8:'Interference', 9:'Cruelty', 10:'Ruin' },
  disks:  { 2:'Change', 3:'Works', 4:'Power', 5:'Worry', 6:'Success',
            7:'Failure', 8:'Prudence', 9:'Gain', 10:'Wealth' },
}

// ─── Decanate Attributions (Golden Dawn / Thoth) ──────────────────────────────

const DECAN = {
  wands: {
    2:  { planet: '♂', sign: '♈', desc: 'Mars in Aries'        },
    3:  { planet: '☉', sign: '♈', desc: 'Sun in Aries'         },
    4:  { planet: '♀', sign: '♈', desc: 'Venus in Aries'       },
    5:  { planet: '♄', sign: '♌', desc: 'Saturn in Leo'        },
    6:  { planet: '♃', sign: '♌', desc: 'Jupiter in Leo'       },
    7:  { planet: '♂', sign: '♌', desc: 'Mars in Leo'          },
    8:  { planet: '☿', sign: '♐', desc: 'Mercury in Sagittarius' },
    9:  { planet: '☽', sign: '♐', desc: 'Moon in Sagittarius'  },
    10: { planet: '♄', sign: '♐', desc: 'Saturn in Sagittarius' },
  },
  cups: {
    2:  { planet: '♀', sign: '♋', desc: 'Venus in Cancer'      },
    3:  { planet: '☿', sign: '♋', desc: 'Mercury in Cancer'    },
    4:  { planet: '☽', sign: '♋', desc: 'Moon in Cancer'       },
    5:  { planet: '♂', sign: '♏', desc: 'Mars in Scorpio'      },
    6:  { planet: '☉', sign: '♏', desc: 'Sun in Scorpio'       },
    7:  { planet: '♀', sign: '♏', desc: 'Venus in Scorpio'     },
    8:  { planet: '♄', sign: '♓', desc: 'Saturn in Pisces'     },
    9:  { planet: '♃', sign: '♓', desc: 'Jupiter in Pisces'    },
    10: { planet: '♂', sign: '♓', desc: 'Mars in Pisces'       },
  },
  swords: {
    2:  { planet: '☽', sign: '♎', desc: 'Moon in Libra'        },
    3:  { planet: '♄', sign: '♎', desc: 'Saturn in Libra'      },
    4:  { planet: '♃', sign: '♎', desc: 'Jupiter in Libra'     },
    5:  { planet: '♀', sign: '♒', desc: 'Venus in Aquarius'    },
    6:  { planet: '☿', sign: '♒', desc: 'Mercury in Aquarius'  },
    7:  { planet: '☽', sign: '♒', desc: 'Moon in Aquarius'     },
    8:  { planet: '♃', sign: '♊', desc: 'Jupiter in Gemini'    },
    9:  { planet: '♂', sign: '♊', desc: 'Mars in Gemini'       },
    10: { planet: '☉', sign: '♊', desc: 'Sun in Gemini'        },
  },
  disks: {
    2:  { planet: '♃', sign: '♑', desc: 'Jupiter in Capricorn' },
    3:  { planet: '♂', sign: '♑', desc: 'Mars in Capricorn'    },
    4:  { planet: '☉', sign: '♑', desc: 'Sun in Capricorn'     },
    5:  { planet: '☿', sign: '♉', desc: 'Mercury in Taurus'    },
    6:  { planet: '☽', sign: '♉', desc: 'Moon in Taurus'       },
    7:  { planet: '♄', sign: '♉', desc: 'Saturn in Taurus'     },
    8:  { planet: '☉', sign: '♍', desc: 'Sun in Virgo'         },
    9:  { planet: '♀', sign: '♍', desc: 'Venus in Virgo'       },
    10: { planet: '☿', sign: '♍', desc: 'Mercury in Virgo'     },
  },
}

// ─── Court Card Definitions ───────────────────────────────────────────────────
// Knight=Fire of, Queen=Water of, Prince=Air of, Princess=Earth of (suit element)

const COURT_DEFS = {
  knight:   { label: 'Knight',   subelement: 'Fire'  },
  queen:    { label: 'Queen',    subelement: 'Water' },
  prince:   { label: 'Prince',   subelement: 'Air'   },
  princess: { label: 'Princess', subelement: 'Earth' },
}

// Colour for each element (used in court dual-gradient)
const ELEM_COLOR = {
  Fire:  '#dd3300',
  Water: '#1155cc',
  Air:   '#bbaa00',
  Earth: '#337722',
}

// ─── Suit Pip Symbol SVG ──────────────────────────────────────────────────────
// Returns SVG element string for one pip, centered at (cx, cy), height h.

function suitPip(suit, cx, cy, h, color, opacity = 1) {
  const op = opacity < 1 ? ` opacity="${opacity}"` : ''
  const w = h * 0.62

  switch (suit) {
    case 'wands': {
      // Torch: staff + flame-shaped head
      const sw = Math.max(2, h * 0.11)
      const hr = h * 0.17
      return `<g${op}>
  <line x1="${f(cx)}" y1="${f(cy + h*0.44)}" x2="${f(cx)}" y2="${f(cy - h*0.28)}"
        stroke="${color}" stroke-width="${f(sw)}" stroke-linecap="round"/>
  <ellipse cx="${f(cx)}" cy="${f(cy - h*0.36)}" rx="${f(hr*0.7)}" ry="${f(hr)}" fill="${color}"/>
  <circle cx="${f(cx)}" cy="${f(cy + h*0.44)}" r="${f(h*0.08)}" fill="${color}"/>
</g>`
    }
    case 'cups': {
      // Chalice: open bowl + stem + base
      return `<g${op}>
  <path d="M${f(cx - w*0.48)},${f(cy - h*0.42)}
           Q${f(cx - w*0.52)},${f(cy - h*0.05)} ${f(cx - w*0.16)},${f(cy + h*0.1)}
           L${f(cx - w*0.07)},${f(cy + h*0.28)} L${f(cx + w*0.07)},${f(cy + h*0.28)}
           Q${f(cx + w*0.16)},${f(cy + h*0.1)} ${f(cx + w*0.52)},${f(cy - h*0.05)}
           Q${f(cx + w*0.48)},${f(cy - h*0.42)} ${f(cx)},${f(cy - h*0.4)} Z"
        fill="${color}"/>
  <rect x="${f(cx - w*0.07)}" y="${f(cy + h*0.27)}" width="${f(w*0.14)}" height="${f(h*0.14)}"
        fill="${color}"/>
  <rect x="${f(cx - w*0.3)}" y="${f(cy + h*0.39)}" width="${f(w*0.6)}" height="${f(h*0.08)}"
        rx="${f(h*0.04)}" fill="${color}"/>
</g>`
    }
    case 'swords': {
      // Sword: tapered blade + crossguard + grip
      const bw = h * 0.09
      const cw = w * 0.75
      return `<g${op}>
  <polygon points="${f(cx)},${f(cy - h*0.46)} ${f(cx + bw*0.5)},${f(cy - h*0.08)} ${f(cx)},${f(cy - h*0.04)} ${f(cx - bw*0.5)},${f(cy - h*0.08)}"
           fill="${color}"/>
  <rect x="${f(cx - bw*0.28)}" y="${f(cy - h*0.05)}" width="${f(bw*0.56)}" height="${f(h*0.32)}"
        fill="${color}" opacity="0.85"/>
  <rect x="${f(cx - cw*0.5)}" y="${f(cy - h*0.09)}" width="${f(cw)}" height="${f(h*0.07)}"
        rx="${f(h*0.03)}" fill="${color}"/>
  <rect x="${f(cx - bw*0.4)}" y="${f(cy + h*0.25)}" width="${f(bw*0.8)}" height="${f(h*0.13)}"
        rx="${f(h*0.06)}" fill="${color}" opacity="0.6"/>
</g>`
    }
    case 'disks': {
      // Disk: circle + inscribed pentagram
      const r = h * 0.43
      const pr = r * 0.82
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return [cx + pr * Math.cos(a), cy + pr * Math.sin(a)]
      })
      // Pentagram: connect skipping one (0→2→4→1→3→0)
      const star = [0,2,4,1,3].map(i => `${f(pts[i][0])},${f(pts[i][1])}`).join(' ')
      const sw = Math.max(1.5, h * 0.045)
      return `<g${op}>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${color}" stroke-width="${f(sw)}"/>
  <polygon points="${star}" fill="none" stroke="${color}" stroke-width="${f(sw)}" stroke-linejoin="round"/>
</g>`
    }
    default: return ''
  }
}

// Alchemical triangle for element
// Fire/Knight = upward △; Water/Queen = downward ▽
// Air/Prince = upward △ with horizontal bar; Earth/Princess = downward ▽ with bar
function elemTriangle(element, cx, cy, size, color) {
  const h = size, r = size * 0.5
  const sw = Math.max(2, size * 0.06)

  if (element === 'Fire') {
    // Upward triangle (unfilled, stroked)
    const pts = `${f(cx)},${f(cy - h*0.55)} ${f(cx - r)},${f(cy + h*0.3)} ${f(cx + r)},${f(cy + h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Water') {
    // Downward triangle
    const pts = `${f(cx)},${f(cy + h*0.55)} ${f(cx - r)},${f(cy - h*0.3)} ${f(cx + r)},${f(cy - h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Air') {
    // Upward triangle with horizontal bar
    const pts = `${f(cx)},${f(cy - h*0.55)} ${f(cx - r)},${f(cy + h*0.3)} ${f(cx + r)},${f(cy + h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>
<line x1="${f(cx - r*0.6)}" y1="${f(cy + h*0.02)}" x2="${f(cx + r*0.6)}" y2="${f(cy + h*0.02)}"
      stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Earth') {
    // Downward triangle with horizontal bar
    const pts = `${f(cx)},${f(cy + h*0.55)} ${f(cx - r)},${f(cy - h*0.3)} ${f(cx + r)},${f(cy - h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>
<line x1="${f(cx - r*0.6)}" y1="${f(cy - h*0.02)}" x2="${f(cx + r*0.6)}" y2="${f(cy - h*0.02)}"
      stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  return ''
}

// ─── Pip Arrangement Positions ────────────────────────────────────────────────
// Returns array of [cx, cy] for pip placement.
// Pip area: x 38–262 (centre 150), y 85–345 (centre 215). w=224, h=260.

function pipPositions(num) {
  const xL = 68, xR = 232, xC = 150
  const yT = (n) => 85  + 260 * n
  const yB = (n) => 345 - 260 * n

  switch (num) {
    case 1: return [[xC, 215]]
    case 2: return [[xC, yT(0.12)], [xC, yB(0.12)]]
    case 3: return [[xC, yT(0.08)], [xL, yB(0.1)], [xR, yB(0.1)]]
    case 4: return [[xL, yT(0.1)], [xR, yT(0.1)], [xL, yB(0.1)], [xR, yB(0.1)]]
    case 5: return [[xL, yT(0.1)], [xR, yT(0.1)], [xC, 215],
                    [xL, yB(0.1)], [xR, yB(0.1)]]
    case 6: return [[xL, yT(0.08)], [xR, yT(0.08)],
                    [xL, 215],      [xR, 215],
                    [xL, yB(0.08)], [xR, yB(0.08)]]
    case 7: return [[xL, yT(0.06)], [xR, yT(0.06)],
                    [xL, yT(0.33)], [xR, yT(0.33)],
                    [xC, 215],
                    [xL, yB(0.06)], [xR, yB(0.06)]]
    case 8: return [[xL, yT(0.05)], [xR, yT(0.05)],
                    [xL, yT(0.28)], [xR, yT(0.28)],
                    [xL, yB(0.28)], [xR, yB(0.28)],
                    [xL, yB(0.05)], [xR, yB(0.05)]]
    case 9: return [[xL, yT(0.05)],  [xC, yT(0.05)],  [xR, yT(0.05)],
                    [xL, 215],       [xC, 215],        [xR, 215],
                    [xL, yB(0.05)],  [xC, yB(0.05)],  [xR, yB(0.05)]]
    case 10: return [[xL, yT(0.05)], [xC, yT(0.05)], [xR, yT(0.05)],
                     [xL, yT(0.3)],                   [xR, yT(0.3)],
                     [xL, yB(0.3)],                   [xR, yB(0.3)],
                     [xL, yB(0.05)], [xC, yB(0.05)], [xR, yB(0.05)]]
    default: return [[xC, 215]]
  }
}

// Pip size (px height) for n pips
function pipSize(n) {
  return [0, 130, 96, 86, 78, 72, 66, 60, 56, 52, 46][n] ?? 46
}

// ─── Common card frame ────────────────────────────────────────────────────────

function cardFrame(theme, title, subtitle, headerContent, bodyContent) {
  const { bg1, bg2, border, accent } = theme
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="420" rx="10" fill="url(#bg)"/>
  <!-- Border -->
  <rect x="5" y="5" width="290" height="410" rx="8"
        fill="none" stroke="${border}" stroke-width="1.5"/>
  <!-- Inner decorative border -->
  <rect x="11" y="11" width="278" height="398" rx="5"
        fill="none" stroke="${accent}" stroke-width="0.5" opacity="0.4"/>

  <!-- Separator lines -->
  <line x1="18" y1="76" x2="282" y2="76" stroke="${border}" stroke-width="0.8" opacity="0.6"/>
  <line x1="18" y1="352" x2="282" y2="352" stroke="${border}" stroke-width="0.8" opacity="0.6"/>

${headerContent}
${bodyContent}

  <!-- Footer: card title -->
  <text x="150" y="374"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="16" fill="${theme.text}" letter-spacing="2"
        filter="url(#glow)">${title}</text>
  <text x="150" y="396"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="9" fill="${theme.dim}" letter-spacing="3"
        opacity="0.8">${subtitle}</text>
</svg>`
}

// ─── Ace ──────────────────────────────────────────────────────────────────────

function generateAce(suit) {
  const theme  = SUIT_THEME[suit]
  const label  = suit[0].toUpperCase() + suit.slice(1)
  const subtitle = `Root of the Powers of ${theme.element}`

  const headerContent = `
  <!-- ACE header -->
  <text x="150" y="46"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="13" fill="${theme.dim}" letter-spacing="4" opacity="0.8">ACE · ${label.toUpperCase()}</text>`

  // Large central pip + elemental triangle
  const pipSvg  = suitPip(suit, 150, 200, 155, theme.pip)
  const triSvg  = elemTriangle(theme.element, 150, 200, 115, theme.accent)
  const bodyContent = `
  <!-- Large central pip -->
  ${triSvg}
  <g filter="url(#glow)">${pipSvg}</g>`

  return cardFrame(theme, 'Ace of ' + label, subtitle, headerContent, bodyContent)
}

// ─── Pip Cards (2–10) ─────────────────────────────────────────────────────────

function generatePip(suit, num) {
  const theme  = SUIT_THEME[suit]
  const decan  = DECAN[suit][num]
  const title  = TITLES[suit][num]
  const label  = suit[0].toUpperCase() + suit.slice(1)
  const roman  = ['','I','II','III','IV','V','VI','VII','VIII','IX','X'][num]

  const headerContent = `
  <!-- Pip header: number + decanate -->
  <text x="24" y="45"
        text-anchor="start" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="26" font-weight="300" fill="${theme.text}">${roman}</text>
  <!-- Planet symbol -->
  <text x="150" y="38"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols','DejaVu Sans',sans-serif"
        font-size="20" fill="${theme.pip}" opacity="0.9">${decan.planet}</text>
  <!-- Sign symbol -->
  <text x="150" y="60"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols','DejaVu Sans',sans-serif"
        font-size="18" fill="${theme.accent}" opacity="0.75">${decan.sign}</text>
  <!-- Decan description (tiny) -->
  <text x="276" y="45"
        text-anchor="end" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,serif"
        font-size="8.5" fill="${theme.dim}" letter-spacing="0.5">${decan.desc}</text>`

  const positions = pipPositions(num)
  const size      = pipSize(num)
  const pips      = positions.map(([cx, cy]) => suitPip(suit, cx, cy, size, theme.pip)).join('\n  ')

  const bodyContent = `
  <!-- Pip arrangement: ${num} pips -->
  <g filter="url(#glow)">${pips}</g>`

  return cardFrame(theme, title, `${roman} of ${label}`, headerContent, bodyContent)
}

// ─── Court Cards ──────────────────────────────────────────────────────────────

function generateCourt(suit, rank) {
  const theme    = SUIT_THEME[suit]
  const courtDef = COURT_DEFS[rank]
  const suitElem = theme.element
  const rankElem = courtDef.subelement
  const rankColor = ELEM_COLOR[rankElem]
  const suitColor = ELEM_COLOR[suitElem]
  const label     = suit[0].toUpperCase() + suit.slice(1)
  const attribution = `${rankElem} of ${suitElem}`

  const headerContent = `
  <!-- Court header -->
  <text x="150" y="46"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="11" fill="${theme.dim}" letter-spacing="4"
        opacity="0.9">${courtDef.label.toUpperCase()} OF ${label.toUpperCase()}</text>`

  // Dual-element gradient
  const bodyContent = `
  <!-- Dual elemental gradient strip -->
  <defs>
    <linearGradient id="dualgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${rankColor}" stop-opacity="0.2"/>
      <stop offset="50%"  stop-color="${rankColor}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${suitColor}"  stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect x="12" y="77" width="276" height="274" fill="url(#dualgrad)" rx="4"/>

  <!-- Large rank element triangle -->
  ${elemTriangle(rankElem, 150, 195, 130, rankColor)}

  <!-- Large suit pip centered -->
  <g filter="url(#glow)">${suitPip(suit, 150, 195, 100, suitColor, 0.85)}</g>

  <!-- Elemental attribution -->
  <text x="150" y="313"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="12" fill="${theme.text}" letter-spacing="2" opacity="0.8">${attribution}</text>

  <!-- Small corner element triangles -->
  ${elemTriangle(rankElem, 32,  98,  28, rankColor)}
  ${elemTriangle(suitElem, 268, 98,  28, suitColor)}
  ${elemTriangle(rankElem, 32,  332, 28, rankColor)}
  ${elemTriangle(suitElem, 268, 332, 28, suitColor)}`

  return cardFrame(theme, courtDef.label + ' of ' + label, attribution, headerContent, bodyContent)
}

// ─── Number formatter ─────────────────────────────────────────────────────────

function f(n) { return Math.round(n * 100) / 100 }

// ─── Main ─────────────────────────────────────────────────────────────────────

const SUITS = ['wands', 'cups', 'swords', 'disks']

console.log('Grimoire Atziluth — Thoth Minor Arcana Generator')
console.log(`Output: ${ART_ROOT}\n`)

let written = 0, skipped = 0

for (const suit of SUITS) {
  console.log(`── ${suit.charAt(0).toUpperCase() + suit.slice(1)} ──`)

  // Ace
  const aceCn   = `tarot.minor.thoth.${suit}.ace`
  const aceDest = path.join(ART_ROOT, `${aceCn.replace(/\./g, '-')}.svg`)
  const aceOk   = write(aceDest, generateAce(suit))
  console.log(`  ace … ${aceOk ? 'ok' : 'already exists'}`)
  aceOk ? written++ : skipped++

  // Pip cards 2–10
  for (let n = 2; n <= 10; n++) {
    const cn   = `tarot.minor.thoth.${suit}.${n}`
    const dest = path.join(ART_ROOT, `${cn.replace(/\./g, '-')}.svg`)
    const ok   = write(dest, generatePip(suit, n))
    console.log(`  ${n} (${TITLES[suit][n]}) … ${ok ? 'ok' : 'already exists'}`)
    ok ? written++ : skipped++
  }

  // Court cards
  for (const rank of ['princess', 'prince', 'queen', 'knight']) {
    const cn   = `tarot.minor.thoth.${suit}.${rank}`
    const dest = path.join(ART_ROOT, `${cn.replace(/\./g, '-')}.svg`)
    const ok   = write(dest, generateCourt(suit, rank))
    console.log(`  ${rank} … ${ok ? 'ok' : 'already exists'}`)
    ok ? written++ : skipped++
  }

  console.log()
}

console.log(`Written: ${written}  |  Already existed: ${skipped}  |  Total: ${written + skipped}`)
console.log('Done.')
