/**
 * generate-thoth-major.mjs
 * Generates SVG art assets for the Thoth Tarot major arcana (22 cards).
 *
 * Run from the repo root:
 *   node scripts/generate-thoth-major.mjs        (generates all)
 *   node scripts/generate-thoth-major.mjs 0       (generates only card 0)
 *   node scripts/generate-thoth-major.mjs 0 1 2   (generates cards 0, 1, 2)
 *
 * Generates:
 *  grimoire-app/public/art/tarot/tarot-major-thoth-*.svg
 *
 * Each card's composition is unique, drawn from Golden Dawn colour scales,
 * Hebrew letter attributions, astrological correspondences, and key symbolic
 * motifs described in Crowley's 'The Book of Thoth'.
 * Original work — the Harris paintings are not reproduced.
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { f, suitPip, elemTriangle, caduceus, petasos, talaria, solarDisk, solarRayEndpoints } from './thoth-shared.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART_ROOT  = path.join(__dirname, '../grimoire-app/public/art/tarot')

function write(dest, content) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (fs.existsSync(dest)) return false
  fs.writeFileSync(dest, content, 'utf8')
  return true
}

// ─── Common card chrome ───────────────────────────────────────────────────────

function majorCard({
  title, number, hebrew, hebrewLetter, attribution,
  bg1, bg2, border, accent, text, dim,
  bodyContent,
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="420" rx="10" fill="url(#bg)"/>
  <!-- Outer border -->
  <rect x="5" y="5" width="290" height="410" rx="8"
        fill="none" stroke="${border}" stroke-width="1.5"/>
  <!-- Inner accent border -->
  <rect x="11" y="11" width="278" height="398" rx="5"
        fill="none" stroke="${accent}" stroke-width="0.5" opacity="0.5"/>

  <!-- Header separator -->
  <line x1="18" y1="76" x2="282" y2="76" stroke="${border}" stroke-width="0.8" opacity="0.5"/>
  <!-- Footer separator -->
  <line x1="18" y1="352" x2="282" y2="352" stroke="${border}" stroke-width="0.8" opacity="0.5"/>

  <!-- Card number (top-left) -->
  <text x="24" y="48"
        text-anchor="start" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="22" font-weight="300" fill="${text}" opacity="0.9">${number}</text>

  <!-- Hebrew letter (top-centre) -->
  <text x="150" y="40"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="26" fill="${accent}" opacity="0.85" filter="url(#glow)">${hebrewLetter}</text>

  <!-- Attribution (top-right, small) -->
  <text x="276" y="48"
        text-anchor="end" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols','DejaVu Sans',sans-serif"
        font-size="11" fill="${dim}" opacity="0.8">${attribution}</text>

${bodyContent}

  <!-- Card title -->
  <text x="150" y="374"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="17" fill="${text}" letter-spacing="2.5"
        filter="url(#glow)">${title}</text>

  <!-- Hebrew name / path -->
  <text x="150" y="396"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="9" fill="${dim}" letter-spacing="3" opacity="0.75">${hebrew}</text>
</svg>`
}

// ─── Card 0 — The Fool ────────────────────────────────────────────────────────
// Element: Air  |  Aleph (א)  |  Path 11: Kether → Chokmah
// King Scale: Bright Pale Yellow
// Motifs: solar disk, spiral vortex (air), Green Man leaping, white crocodile

function card0() {
  const body = `
  <!-- Ghost Aleph — large translucent background letterform -->
  <text x="152" y="230"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="260" fill="#d4b800" opacity="0.07">א</text>

  <!-- Solar disk — solarDisk(150, 128, 24): same call as the Hermit's lantern interior -->
  ${solarDisk(150, 128, 24)}

  <!-- Air spiral vortex -->
  <path d="M150,215 C188,183 208,162 193,142 C178,122 154,128 150,148
           C146,168 161,182 176,188 C191,194 202,183 200,173"
        fill="none" stroke="#c8b800" stroke-width="1.2" opacity="0.3"/>
  <path d="M150,215 C112,183 92,162 107,142 C122,122 146,128 150,148"
        fill="none" stroke="#c8b800" stroke-width="1.2" opacity="0.3"/>

  <!-- Green Man — leaping figure (abstract silhouette) -->
  <!-- Head -->
  <circle cx="150" cy="176" r="14" fill="#3a7a1a" opacity="0.82"/>
  <!-- Torso -->
  <ellipse cx="150" cy="208" rx="11" ry="16" fill="#3a7a1a" opacity="0.82"/>
  <!-- Arms outstretched in ecstatic leap -->
  <line x1="139" y1="204" x2="108" y2="191"
        stroke="#3a7a1a" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <line x1="161" y1="204" x2="192" y2="193"
        stroke="#3a7a1a" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <!-- Legs — one extended, one bent (mid-leap) -->
  <line x1="146" y1="224" x2="133" y2="253"
        stroke="#3a7a1a" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <line x1="154" y1="224" x2="172" y2="246"
        stroke="#3a7a1a" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <line x1="172" y1="246" x2="162" y2="267"
        stroke="#3a7a1a" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
  <!-- Vine/grapes cluster in right hand -->
  <circle cx="196" cy="189" r="5"   fill="#2a6a10" opacity="0.75"/>
  <circle cx="204" cy="187" r="4.5" fill="#2a6a10" opacity="0.68"/>
  <circle cx="200" cy="181" r="4"   fill="#2a6a10" opacity="0.62"/>
  <circle cx="207" cy="181" r="3.5" fill="#2a6a10" opacity="0.55"/>

  <!-- White crocodile (Sebek — matter he transcends) — low, pale, ghostly -->
  <!-- Body -->
  <path d="M80,308 Q100,298 150,301 Q200,298 220,308 Q200,318 150,316 Q100,318 80,308 Z"
        fill="#a8a080" opacity="0.2"/>
  <!-- Head with snout -->
  <path d="M80,308 L60,303 L56,312 L76,314 Z" fill="#a8a080" opacity="0.18"/>
  <!-- Jaws (upper) -->
  <path d="M56,305 L80,305" stroke="#a8a080" stroke-width="1.5" opacity="0.25"/>
  <!-- Tail -->
  <path d="M220,308 L240,303 L242,314 L222,314 Z" fill="#a8a080" opacity="0.18"/>
  <!-- Eye -->
  <circle cx="64" cy="307" r="2.2" fill="#887a60" opacity="0.4"/>
  <circle cx="64" cy="307" r="1"   fill="#221a00" opacity="0.5"/>`

  return majorCard({
    title: 'The Fool', number: '0',
    hebrew: 'Aleph · Air · Path 11',
    hebrewLetter: 'א', attribution: '♅  Air',
    bg1: '#1a1600', bg2: '#2a2400',
    border: '#665c00', accent: '#ccb000',
    text: '#ffee88', dim: '#887a30',
    bodyContent: body,
  })
}

// ─── Card 1 — The Magus ───────────────────────────────────────────────────────
// Planet: Mercury ☿  |  Beth (ב)  |  Path 12: Kether → Binah
// King Scale: Yellow
// Motifs: Hermes figure (petasos + caduceus + talaria), four weapons in orbit,
//         lemniscate, ape of Thoth below

function card1() {
  // Figure centre
  const fx = 150, fy = 205

  // Four weapons in orbital ellipse around the figure
  // Orbit: rx=90, ry=70, centre at (fx, fy)
  // Wand (top), Cup (left), Sword (bottom), Disk (right) — traditional GD elemental compass
  const orbitRx = 90, orbitRy = 72
  const weaponPositions = [
    { suit: 'wands',  a: -90, color: '#ee4400' },  // top (fire/spirit)
    { suit: 'cups',   a: 180, color: '#1166dd' },  // left (water)
    { suit: 'swords', a:  90, color: '#ccbb00' },  // bottom (air)
    { suit: 'disks',  a:   0, color: '#448833' },  // right (earth)
  ]

  const weaponSize = 42
  const weapons = weaponPositions.map(({ suit, a, color }) => {
    const rad = a * Math.PI / 180
    const wx  = f(fx + orbitRx * Math.cos(rad))
    const wy  = f(fy + orbitRy * Math.sin(rad))
    return `<g filter="url(#glow)">${suitPip(suit, parseFloat(wx), parseFloat(wy), weaponSize, color, 0.92)}</g>`
  }).join('\n  ')

  // Orbit ellipse (suggested, not fully drawn — lemniscate hint)
  const orbitPath = `<ellipse cx="${fx}" cy="${fy}" rx="${orbitRx}" ry="${orbitRy}"
    fill="none" stroke="#998800" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.35"/>`

  // Lemniscate (∞) — drawn as two tangent circles, subtle overlay
  const lemPath = `<path d="M${fx},${fy}
    C${f(fx+30)},${f(fy-28)} ${f(fx+70)},${f(fy-28)} ${f(fx+70)},${fy}
    C${f(fx+70)},${f(fy+28)} ${f(fx+30)},${f(fy+28)} ${fx},${fy}
    C${f(fx-30)},${f(fy-28)} ${f(fx-70)},${f(fy-28)} ${f(fx-70)},${fy}
    C${f(fx-70)},${f(fy+28)} ${f(fx-30)},${f(fy+28)} ${fx},${fy} Z"
    fill="none" stroke="#ccaa00" stroke-width="1" opacity="0.2"/>`

  // ── Hermes figure ──
  // The three unmistakable attributes: petasos (winged hat), caduceus, talaria (winged sandals)

  // Caduceus: held vertically, slightly right of centre
  const cadX = 164, cadY = 195, cadH = 110
  const cadSvg = caduceus(cadX, cadY, cadH, '#ddcc44')

  // Body (abstract, slim — Hermes as pure motion/messenger)
  const figure = `
  <!-- Body: slim upright form -->
  <ellipse cx="${fx}" cy="${f(fy+8)}" rx="9" ry="22" fill="#bb9900" opacity="0.78"/>
  <!-- Head -->
  <circle cx="${fx}" cy="${f(fy-28)}" r="12" fill="#bb9900" opacity="0.82"/>
  <!-- Arms: one raised (holding caduceus), one outstretched -->
  <line x1="${f(fx+9)}" y1="${f(fy-8)}" x2="${f(cadX-4)}" y2="${f(cadY-cadH*0.3)}"
        stroke="#bb9900" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <line x1="${f(fx-9)}" y1="${f(fy-8)}" x2="${f(fx-44)}" y2="${f(fy-18)}"
        stroke="#bb9900" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Legs -->
  <line x1="${f(fx-4)}" y1="${f(fy+30)}" x2="${f(fx-8)}"  y2="${f(fy+60)}"
        stroke="#bb9900" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <line x1="${f(fx+4)}" y1="${f(fy+30)}" x2="${f(fx+10)}" y2="${f(fy+60)}"
        stroke="#bb9900" stroke-width="7" stroke-linecap="round" opacity="0.78"/>`

  // Petasos (winged hat) — centred on head
  const hatSvg = petasos(fx, fy - 40, 36, '#ddcc44')

  // Talaria (winged sandals) — one each side of feet
  const lTalaria = talaria(fx - 8,  fy + 60, 22, '#ddcc44', false)
  const rTalaria = talaria(fx + 10, fy + 60, 22, '#ddcc44', true)

  // Ape of Thoth — crouching below, small
  const apeY = 320
  const ape = `
  <!-- Ape of Thoth (Cynocephalus) — crouching scribe below -->
  <!-- Body -->
  <ellipse cx="150" cy="${apeY+10}" rx="22" ry="18" fill="#665520" opacity="0.45"/>
  <!-- Head with snout -->
  <circle cx="150" cy="${apeY-8}" r="14" fill="#665520" opacity="0.45"/>
  <ellipse cx="150" cy="${apeY-2}" rx="8" ry="5" fill="#554418" opacity="0.4"/>
  <!-- Ears -->
  <circle cx="137" cy="${apeY-16}" r="5" fill="#665520" opacity="0.4"/>
  <circle cx="163" cy="${apeY-16}" r="5" fill="#665520" opacity="0.4"/>
  <!-- Arms resting (scribe posture) -->
  <line x1="128" y1="${apeY+5}"  x2="112" y2="${apeY+20}"
        stroke="#665520" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <line x1="172" y1="${apeY+5}"  x2="188" y2="${apeY+20}"
        stroke="#665520" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
  <!-- Pen/stylus in right hand (ape as scribe of Thoth) -->
  <line x1="188" y1="${apeY+20}" x2="198" y2="${apeY+10}"
        stroke="#aa8800" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <!-- Eye glint -->
  <circle cx="144" cy="${apeY-10}" r="2.5" fill="#221a00" opacity="0.55"/>
  <circle cx="156" cy="${apeY-10}" r="2.5" fill="#221a00" opacity="0.55"/>`

  // Ghost Beth
  const bethBg = `
  <text x="148" y="225"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="240" fill="#ccaa00" opacity="0.06">ב</text>`

  const body = `
  ${bethBg}
  ${orbitPath}
  ${lemPath}
  ${weapons}
  ${figure}
  ${cadSvg}
  ${hatSvg}
  ${lTalaria}
  ${rTalaria}
  ${ape}`

  return majorCard({
    title: 'The Magus', number: 'I',
    hebrew: 'Beth · Mercury · Path 12',
    hebrewLetter: 'ב', attribution: '☿',
    bg1: '#120f00', bg2: '#201a00',
    border: '#665500', accent: '#ccaa00',
    text: '#ffee88', dim: '#887730',
    bodyContent: body,
  })
}

// ─── Card 2 — The Priestess ───────────────────────────────────────────────────
// Planet: Moon ☽  |  Gimel (ג)  |  Path 13: Kether → Tiphareth
// King Scale: Blue
// Motifs: triple moon arc (☽○☾), full moon corona, two pillars (Jachin/Boaz),
//         draped figure + veil, camel silhouette on moonlit ridge, reflective pool

function card2() {
  // ── Sky: clean dark blue, no stars — moon stands alone ──
  // Triple moon arc: waxing crescent (left), full moon (centre), waning crescent (right)
  // All centred at y=130, spaced evenly

  const moonY  = 128
  const moonR  = 30   // full moon radius
  const cresR  = 20   // crescent moon radius
  const cresGap = 82  // distance left/right from centre

  // Full moon — central, luminous
  const fullMoon = `
  <!-- Full moon corona layers -->
  <circle cx="150" cy="${moonY}" r="${moonR + 24}" fill="#b0ccee" opacity="0.06" filter="url(#softglow)"/>
  <circle cx="150" cy="${moonY}" r="${moonR + 14}" fill="#c8ddf5" opacity="0.12" filter="url(#softglow)"/>
  <circle cx="150" cy="${moonY}" r="${moonR + 6}"  fill="#ddeeff" opacity="0.22"/>
  <!-- Full moon disc -->
  <circle cx="150" cy="${moonY}" r="${moonR}" fill="#eef5ff" opacity="0.92"/>
  <!-- Subtle surface texture — maria shadows -->
  <ellipse cx="140" cy="${moonY - 8}"  rx="8"  ry="6"  fill="#c8d8ee" opacity="0.35"/>
  <ellipse cx="158" cy="${moonY + 5}"  rx="6"  ry="4.5" fill="#c8d8ee" opacity="0.28"/>
  <ellipse cx="144" cy="${moonY + 10}" rx="5"  ry="3.5" fill="#c8d8ee" opacity="0.22"/>`

  // Waxing crescent (left) — crescent formed by two overlapping circles
  const lx = 150 - cresGap
  const lCres = `
  <!-- Waxing crescent -->
  <circle cx="${lx}" cy="${moonY}" r="${cresR}" fill="#d0e4f8" opacity="0.82"/>
  <circle cx="${lx + cresR*0.55}" cy="${moonY}" r="${cresR * 0.88}" fill="#001830" opacity="0.92"/>`

  // Waning crescent (right) — mirrored
  const rx2 = 150 + cresGap
  const rCres = `
  <!-- Waning crescent -->
  <circle cx="${rx2}" cy="${moonY}" r="${cresR}" fill="#d0e4f8" opacity="0.82"/>
  <circle cx="${rx2 - cresR*0.55}" cy="${moonY}" r="${cresR * 0.88}" fill="#001830" opacity="0.92"/>`

  // Subtle connecting arc beneath the three moons — ties them as a set
  const moonArc = `
  <path d="M${lx},${moonY + cresR + 4} Q150,${moonY + cresGap * 0.55} ${rx2},${moonY + cresR + 4}"
        fill="none" stroke="#3366aa" stroke-width="0.8" opacity="0.3"/>`

  // ── Pillars — Jachin (white/right) and Boaz (black/left) ──
  const pillarTop = 88, pillarBot = 295
  const pillarW   = 28, pillarH = pillarBot - pillarTop

  const pillars = `
  <!-- Boaz — black pillar (left) -->
  <rect x="22" y="${pillarTop}" width="${pillarW}" height="${pillarH}" rx="3"
        fill="#0a0a14" stroke="#223355" stroke-width="1" opacity="0.9"/>
  <!-- Boaz capital -->
  <rect x="18" y="${pillarTop - 8}" width="${pillarW + 8}" height="10" rx="2"
        fill="#0a0a14" stroke="#223355" stroke-width="1" opacity="0.9"/>
  <!-- Boaz base -->
  <rect x="18" y="${pillarBot}" width="${pillarW + 8}" height="8" rx="2"
        fill="#0a0a14" stroke="#223355" stroke-width="1" opacity="0.9"/>

  <!-- Jachin — white pillar (right) -->
  <rect x="250" y="${pillarTop}" width="${pillarW}" height="${pillarH}" rx="3"
        fill="#e8eef8" stroke="#99aabb" stroke-width="1" opacity="0.78"/>
  <!-- Jachin capital -->
  <rect x="246" y="${pillarTop - 8}" width="${pillarW + 8}" height="10" rx="2"
        fill="#e8eef8" stroke="#99aabb" stroke-width="1" opacity="0.78"/>
  <!-- Jachin base -->
  <rect x="246" y="${pillarBot}" width="${pillarW + 8}" height="8" rx="2"
        fill="#e8eef8" stroke="#99aabb" stroke-width="1" opacity="0.78"/>`

  // ── Veil — thin translucent band between pillars ──
  const veil = `
  <rect x="50" y="${pillarTop}" width="200" height="${pillarH}"
        fill="#1a3a66" opacity="0.12"/>
  <!-- Veil folds — subtle vertical lines -->
  ${[80,105,130,155,180,205,230].map(x =>
    `<line x1="${x}" y1="${pillarTop}" x2="${x + 4}" y2="${pillarBot}"
           stroke="#4466aa" stroke-width="0.6" opacity="0.18"/>`
  ).join('\n  ')}`

  // ── Priestess figure — seated, draped, silver-blue ──
  const figY = 210
  const figure = `
  <!-- Draped robe — lower body pool -->
  <ellipse cx="150" cy="${figY + 55}" rx="38" ry="18" fill="#7090b8" opacity="0.55"/>
  <!-- Robe torso -->
  <path d="M116,${figY + 40} Q114,${figY - 10} 150,${figY - 15}
           Q186,${figY - 10} 184,${figY + 40} Q150,${figY + 60} 116,${figY + 40} Z"
        fill="#8aaace" opacity="0.62"/>
  <!-- Head -->
  <circle cx="150" cy="${figY - 32}" r="16" fill="#a8c0d8" opacity="0.82"/>
  <!-- Silver crescent crown on brow -->
  <path d="M138,${figY - 42} Q150,${figY - 52} 162,${figY - 42}"
        fill="none" stroke="#d8eeff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <!-- Hands folded in lap — subtle -->
  <ellipse cx="140" cy="${figY + 32}" rx="8" ry="5" fill="#9ab8d0" opacity="0.5"/>
  <ellipse cx="160" cy="${figY + 32}" rx="8" ry="5" fill="#9ab8d0" opacity="0.5"/>
  <!-- Bow across lap (secondary attribute — one subtle arc) -->
  <path d="M122,${figY + 38} Q150,${figY + 20} 178,${figY + 38}"
        fill="none" stroke="#7aaace" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
  <line x1="122" y1="${figY + 38}" x2="178" y2="${figY + 38}"
        stroke="#7aaace" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.3"/>`

  // ── Desert ridge with camel silhouette — Gimel ──
  const ridgeY = 302
  const camel = `
  <!-- Desert ridge / horizon line -->
  <path d="M18,${ridgeY + 10} Q80,${ridgeY - 6} 150,${ridgeY} Q220,${ridgeY + 4} 282,${ridgeY - 2}"
        fill="none" stroke="#1a3355" stroke-width="1.2" opacity="0.5"/>
  <!-- Sand dune fill -->
  <path d="M18,${ridgeY + 10} Q80,${ridgeY - 6} 150,${ridgeY}
           Q220,${ridgeY + 4} 282,${ridgeY - 2} L282,355 L18,355 Z"
        fill="#0d1e35" opacity="0.5"/>

  <!-- Camel silhouette (walking right) — Gimel -->
  <!-- Body -->
  <ellipse cx="100" cy="${ridgeY - 16}" rx="30" ry="13" fill="#0a1628" opacity="0.85"/>
  <!-- Hump -->
  <path d="M88,${ridgeY - 28} Q100,${ridgeY - 42} 112,${ridgeY - 28}"
        fill="#0a1628" stroke="#0a1628" stroke-width="1" opacity="0.85"/>
  <!-- Neck -->
  <path d="M124,${ridgeY - 22} Q130,${ridgeY - 38} 125,${ridgeY - 46}"
        fill="none" stroke="#0a1628" stroke-width="10" stroke-linecap="round" opacity="0.85"/>
  <!-- Head -->
  <ellipse cx="124" cy="${ridgeY - 50}" rx="9" ry="7" fill="#0a1628" opacity="0.85"/>
  <!-- Snout -->
  <rect x="128" y="${ridgeY - 54}" width="10" height="5" rx="2" fill="#0a1628" opacity="0.85"/>
  <!-- Legs (4, walking) -->
  <line x1="78"  y1="${ridgeY - 4}" x2="74"  y2="${ridgeY + 8}"
        stroke="#0a1628" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
  <line x1="90"  y1="${ridgeY - 4}" x2="92"  y2="${ridgeY + 8}"
        stroke="#0a1628" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
  <line x1="110" y1="${ridgeY - 4}" x2="108" y2="${ridgeY + 8}"
        stroke="#0a1628" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
  <line x1="122" y1="${ridgeY - 4}" x2="126" y2="${ridgeY + 8}"
        stroke="#0a1628" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
  <!-- Tail -->
  <path d="M70,${ridgeY - 18} Q62,${ridgeY - 14} 64,${ridgeY - 8}"
        fill="none" stroke="#0a1628" stroke-width="4" stroke-linecap="round" opacity="0.85"/>`

  // ── Reflective pool — moon reflected in water ──
  // A still pool in the lower-centre, between camel and card edge
  const poolY = 326
  const pool  = `
  <!-- Pool surface -->
  <ellipse cx="200" cy="${poolY + 10}" rx="52" ry="12" fill="#0d2244" opacity="0.7"/>
  <!-- Reflected moon in pool — smaller, inverted, ghostly -->
  <circle cx="200" cy="${poolY + 8}"  r="10" fill="#c8ddf5" opacity="0.38" filter="url(#softglow)"/>
  <circle cx="200" cy="${poolY + 8}"  r="7"  fill="#ddeeff" opacity="0.45"/>
  <!-- Ripple rings -->
  <ellipse cx="200" cy="${poolY + 10}" rx="22" ry="5"  fill="none"
           stroke="#2255aa" stroke-width="0.6" opacity="0.35"/>
  <ellipse cx="200" cy="${poolY + 10}" rx="38" ry="8.5" fill="none"
           stroke="#2255aa" stroke-width="0.5" opacity="0.22"/>`

  // Ghost Gimel watermark
  const gimelBg = `
  <text x="150" y="225"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="250" fill="#1155aa" opacity="0.055">ג</text>`

  const body = `
  ${gimelBg}
  ${fullMoon}
  ${lCres}
  ${rCres}
  ${moonArc}
  ${veil}
  ${pillars}
  ${figure}
  ${camel}
  ${pool}`

  return majorCard({
    title: 'The Priestess', number: 'II',
    hebrew: 'Gimel · Moon · Path 13',
    hebrewLetter: 'ג', attribution: '☽',
    bg1: '#000810', bg2: '#001530',
    border: '#002255', accent: '#0044aa',
    text: '#88ccff', dim: '#335577',
    bodyContent: body,
  })
}

// ─── Card 3 — The Empress ────────────────────────────────────────────────────
// Planet: Venus ♀  |  Daleth (ד)  |  Path 14: Chokmah → Binah
// King Scale: Emerald Green
// Motifs: large Venus symbol, lotus crown + wand, shield with pelican vulning,
//         wheat stalks, river, roses at bank

function card3() {
  // ── Venus symbol — large geometric, upper centre ──
  const vsX = 150, vsY = 108, vsR = 25
  const venusSym = `
  <!-- Venus symbol ♀ — geometrically drawn, dominant upper anchor -->
  <circle cx="${vsX}" cy="${vsY}" r="${vsR + 14}" fill="#226622" opacity="0.15" filter="url(#softglow)"/>
  <circle cx="${vsX}" cy="${vsY}" r="${vsR}" fill="none" stroke="#ddaa22" stroke-width="2.5" opacity="0.9" filter="url(#glow)"/>
  <circle cx="${vsX}" cy="${vsY}" r="${vsR * 0.3}" fill="#ddaa22" opacity="0.22"/>
  <!-- Cross below -->
  <line x1="${vsX}"      y1="${vsY + vsR}"      x2="${vsX}"      y2="${vsY + vsR + 26}"
        stroke="#ddaa22" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <line x1="${vsX - 14}" y1="${vsY + vsR + 14}" x2="${vsX + 14}" y2="${vsY + vsR + 14}"
        stroke="#ddaa22" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`

  // ── Lotus flower helper ──
  function lotusFlower(cx, cy, size, color) {
    const pr = size * 0.5
    return `<g>
    <ellipse cx="${f(cx)}"             cy="${f(cy - pr*0.65)}" rx="${f(size*0.22)}" ry="${f(pr*0.8)}"
             fill="${color}" opacity="0.88"/>
    <ellipse cx="${f(cx - size*0.28)}" cy="${f(cy - pr*0.42)}" rx="${f(size*0.17)}" ry="${f(pr*0.6)}"
             fill="${color}" opacity="0.72" transform="rotate(-22,${f(cx-size*0.28)},${f(cy-pr*0.42)})"/>
    <ellipse cx="${f(cx + size*0.28)}" cy="${f(cy - pr*0.42)}" rx="${f(size*0.17)}" ry="${f(pr*0.6)}"
             fill="${color}" opacity="0.72" transform="rotate(22,${f(cx+size*0.28)},${f(cy-pr*0.42)})"/>
    <ellipse cx="${f(cx - size*0.5)}"  cy="${f(cy - pr*0.18)}" rx="${f(size*0.13)}" ry="${f(pr*0.45)}"
             fill="${color}" opacity="0.52" transform="rotate(-42,${f(cx-size*0.5)},${f(cy-pr*0.18)})"/>
    <ellipse cx="${f(cx + size*0.5)}"  cy="${f(cy - pr*0.18)}" rx="${f(size*0.13)}" ry="${f(pr*0.45)}"
             fill="${color}" opacity="0.52" transform="rotate(42,${f(cx+size*0.5)},${f(cy-pr*0.18)})"/>
  </g>`
  }

  // ── Lotus wand (held angled upward in right hand) ──
  const wTopX = 200, wTopY = 152
  const wBotX = 182, wBotY = 210
  const wandSvg = `
  <!-- Wand staff -->
  <line x1="${wBotX}" y1="${wBotY}" x2="${wTopX}" y2="${wTopY}"
        stroke="#aa8800" stroke-width="3" stroke-linecap="round" opacity="0.82"/>
  <!-- Lotus blossom at tip -->
  ${lotusFlower(wTopX, wTopY, 22, '#ddaa44')}`

  // ── Shield with pelican vulning (Thoth-specific) ──
  const shX = 98, shY = 224, shR = 25
  const shield = `
  <!-- Shield disc (ivory) -->
  <circle cx="${shX}" cy="${shY}" r="${shR}" fill="#f0ecd8" stroke="#bb7722" stroke-width="1.8" opacity="0.92"/>
  <!-- Pelican body — oval torso -->
  <ellipse cx="${shX + 1}" cy="${shY + 5}" rx="9" ry="7" fill="#bb4422" opacity="0.78"/>
  <!-- Neck curving down to pierce breast -->
  <path d="M${shX + 6},${shY - 2} Q${shX + 12},${shY + 5} ${shX + 7},${shY + 12}"
        fill="none" stroke="#bb4422" stroke-width="5" stroke-linecap="round" opacity="0.78"/>
  <!-- Head -->
  <circle cx="${shX + 6}" cy="${shY + 14}" r="5.5" fill="#bb4422" opacity="0.78"/>
  <!-- Long beak pointing down at breast -->
  <path d="M${shX + 5},${shY + 18} L${shX + 3},${shY + 8}"
        stroke="#cc9922" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
  <!-- Blood drops -->
  <circle cx="${shX - 3}" cy="${shY + 12}" r="1.8" fill="#cc1111" opacity="0.75"/>
  <circle cx="${shX - 6}" cy="${shY + 15}" r="1.4" fill="#cc1111" opacity="0.65"/>
  <circle cx="${shX - 2}" cy="${shY + 17}" r="1.2" fill="#cc1111" opacity="0.55"/>
  <!-- Two chicks below with open beaks -->
  <circle cx="${shX - 8}" cy="${shY + 22}" r="4"   fill="#994411" opacity="0.65"/>
  <circle cx="${shX + 4}" cy="${shY + 22}" r="4"   fill="#994411" opacity="0.65"/>
  <line x1="${shX - 11}" y1="${shY + 20}" x2="${shX - 5}"  y2="${shY + 19}"
        stroke="#cc9922" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
  <line x1="${shX + 1}"  y1="${shY + 20}" x2="${shX + 7}"  y2="${shY + 19}"
        stroke="#cc9922" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>`

  // ── Empress figure ──
  const figY = 200
  const figure = `
  <!-- Robe — lower pool of fabric -->
  <ellipse cx="150" cy="${figY + 65}" rx="52" ry="22" fill="#1a6020" opacity="0.65"/>
  <!-- Torso/robe body -->
  <path d="M112,${figY + 48} Q110,${figY + 8} 150,${figY + 2}
           Q190,${figY + 8} 188,${figY + 48} Q150,${figY + 72} 112,${figY + 48} Z"
        fill="#226622" opacity="0.78"/>
  <!-- Head -->
  <circle cx="150" cy="${figY - 18}" r="16" fill="#c8a060" opacity="0.88"/>
  <!-- Lotus crown — petals rising above head -->
  ${[-36,-18,0,18,36].map(dx => {
      const px = 150 + dx, ph = Math.abs(dx) < 5 ? 14 : Math.abs(dx) < 22 ? 11 : 9
      return `<ellipse cx="${px}" cy="${figY - 34 - ph*0.3}" rx="5" ry="${ph}"
                fill="#ddaa44" opacity="${Math.abs(dx) < 5 ? 0.88 : 0.7}"/>`
    }).join('\n  ')}
  <!-- Crown band -->
  <rect x="128" y="${figY - 40}" width="44" height="6" rx="3" fill="#bb8822" opacity="0.78"/>
  <!-- Right arm — raised to hold wand -->
  <line x1="170" y1="${figY + 18}" x2="${wBotX}" y2="${wBotY}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Left arm — extended with shield -->
  <line x1="130" y1="${figY + 18}" x2="${shX + shR - 4}" y2="${shY - 2}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>`

  // ── Wheat stalks ──
  function wheatStalk(x, baseY, lean) {
    const h = 58, tipX = x + lean * 12, tipY = baseY - h
    const barbs = Array.from({length: 5}, (_, i) => {
      const t = i / 4
      const mx = f(x + lean * 12 * t), my = f(baseY - h * t)
      const sx = f(parseFloat(mx) + (i % 2 === 0 ? 9 : -9)), sy = f(parseFloat(my) - 7)
      return `<line x1="${mx}" y1="${my}" x2="${sx}" y2="${sy}"
               stroke="#bbaa22" stroke-width="1.2" opacity="0.65"/>`
    }).join('\n    ')
    return `<g>
    <line x1="${x}" y1="${baseY}" x2="${f(tipX)}" y2="${f(tipY)}"
          stroke="#998811" stroke-width="2" stroke-linecap="round" opacity="0.78"/>
    <ellipse cx="${f(tipX)}" cy="${f(tipY - 7)}" rx="3" ry="8" fill="#ccaa22" opacity="0.75"/>
    ${barbs}
  </g>`
  }
  const wheatSvg = `
  ${[-20,-10,0,10,20].map(dx => wheatStalk(52 + dx,  296, -0.15)).join('\n  ')}
  ${[-20,-10,0,10,20].map(dx => wheatStalk(248 + dx, 296,  0.15)).join('\n  ')}`

  // ── River ──
  const rvY = 302
  const river = `
  <!-- River -->
  <path d="M18,${rvY} Q80,${rvY-5} 150,${rvY+2} Q220,${rvY+7} 282,${rvY}
           L282,${rvY+20} Q220,${rvY+25} 150,${rvY+20} Q80,${rvY+13} 18,${rvY+20} Z"
        fill="#0d4433" opacity="0.65"/>
  <!-- Ripples -->
  ${[62,118,172,228].map(rx =>
      `<path d="M${rx},${rvY+10} Q${rx+9},${rvY+8} ${rx+18},${rvY+10}"
             fill="none" stroke="#226644" stroke-width="0.8" opacity="0.55"/>`
    ).join('\n  ')}`

  // ── Roses at riverbank ──
  function rose(cx, cy, r) {
    return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#bb2244" opacity="0.7"/>
    <circle cx="${f(cx-r*0.3)}" cy="${f(cy-r*0.3)}" r="${f(r*0.55)}" fill="#cc3355" opacity="0.6"/>
    <circle cx="${f(cx+r*0.35)}" cy="${f(cy-r*0.2)}" r="${f(r*0.45)}" fill="#cc3355" opacity="0.55"/>
    <circle cx="${cx}" cy="${cy}" r="${f(r*0.3)}" fill="#ff8899" opacity="0.45"/>
  </g>`
  }
  const rosesSvg = `
  ${rose(40,  298, 6)} ${rose(55,  295, 5)} ${rose(67, 297, 4.5)}
  ${rose(245, 298, 6)} ${rose(258, 295, 5)} ${rose(270, 297, 4.5)}`

  // Ghost Daleth
  const dalethBg = `
  <text x="153" y="228"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="248" fill="#116611" opacity="0.055">ד</text>`

  const body = `
  ${dalethBg}
  ${venusSym}
  ${figure}
  ${wandSvg}
  ${shield}
  <g filter="url(#glow)">${wheatSvg}</g>
  ${river}
  ${rosesSvg}`

  return majorCard({
    title: 'The Empress', number: 'III',
    hebrew: 'Daleth · Venus · Path 14',
    hebrewLetter: 'ד', attribution: '♀',
    bg1: '#011200', bg2: '#022a00',
    border: '#1a5a1a', accent: '#229922',
    text: '#88ee88', dim: '#336633',
    bodyContent: body,
  })
}

// ─── Card 4 — The Emperor ────────────────────────────────────────────────────
// Sign: Aries ♈  |  Tzaddi (צ)  |  Path 15: Chokmah → Tiphareth
// King Scale: Scarlet
// Motifs: rising sun behind mountain silhouette (Harris), mountain landscape,
//         Emperor enthroned in armour, crown with ram-horn curls, ankh sceptre,
//         kite shield with phoenix emblem, bare red rock lower zone,
//         phoenix rising flanked by two rams

function card4() {
  // ── Rising sun + mountain silhouette ──
  const sunX = 150, sunY = 116, sunR = 27

  const sunSvg = `
  <!-- Sun corona -->
  <circle cx="${sunX}" cy="${sunY}" r="${sunR + 30}" fill="#ff5500" opacity="0.07" filter="url(#softglow)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${sunR + 16}" fill="#ff7700" opacity="0.12" filter="url(#softglow)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${sunR + 6}"  fill="#ffaa00" opacity="0.22"/>
  <!-- Sun disc (full circle — mountains drawn on top for natural occlusion) -->
  <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="#ffdd44" opacity="0.92"/>
  <!-- Rays (upper arc only) -->
  ${Array.from({length: 9}, (_, i) => {
    const deg = -80 + i * 20
    const a   = (deg - 90) * Math.PI / 180
    const r1  = sunR + 5, r2 = sunR + (i % 2 === 0 ? 32 : 22)
    return `<line x1="${f(sunX + r1*Math.cos(a))}" y1="${f(sunY + r1*Math.sin(a))}"
               x2="${f(sunX + r2*Math.cos(a))}" y2="${f(sunY + r2*Math.sin(a))}"
               stroke="#ffcc44" stroke-width="${i%2===0?1.8:1}" opacity="0.68"/>`
  }).join('\n  ')}`

  // Mountain silhouette — drawn OVER sun for occlusion
  const mountains = `
  <!-- Mountain silhouette (occludes lower sun) -->
  <path d="M18,148 L40,112 L58,130 L78,100 L102,122 L126,106 L150,118 L174,106 L198,122 L222,100 L242,130 L260,112 L282,148 L282,156 L18,156 Z"
        fill="#1e0000" opacity="0.88"/>
  <!-- Horizon glow just above mountain tops -->
  <rect x="18" y="142" width="264" height="10" rx="1" fill="#ff6600" opacity="0.12"/>
  <rect x="18" y="148" width="264" height="8"  rx="1" fill="#cc3300" opacity="0.18"/>`

  // ── Ankh sceptre ──
  const aX = 194, aY = 218, aH = 82, aLR = 13, aCW = 20
  const ankh = `
  <!-- Ankh sceptre -->
  <circle cx="${aX}" cy="${f(aY - aH*0.4 - aLR)}" r="${aLR}"
          fill="none" stroke="#ddcc44" stroke-width="3" opacity="0.9" filter="url(#glow)"/>
  <line x1="${aX}" y1="${f(aY - aH*0.4)}" x2="${aX}" y2="${f(aY + aH*0.48)}"
        stroke="#ddcc44" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  <line x1="${f(aX - aCW/2)}" y1="${f(aY - aH*0.14)}" x2="${f(aX + aCW/2)}" y2="${f(aY - aH*0.14)}"
        stroke="#ddcc44" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`

  // ── Kite shield with phoenix emblem ──
  const shX = 106, shY = 226, shW = 40, shH = 50
  const shield = `
  <!-- Kite shield -->
  <path d="M${shX},${f(shY - shH*0.52)} L${f(shX + shW*0.5)},${shY}
           L${shX},${f(shY + shH*0.5)}  L${f(shX - shW*0.5)},${shY} Z"
        fill="#770000" stroke="#bb3300" stroke-width="1.5" opacity="0.92"/>
  <!-- Heraldic phoenix (rising, wings spread) -->
  <!-- Flame base on shield -->
  <path d="M${f(shX-10)},${f(shY+16)} L${f(shX-4)},${f(shY+5)} L${shX},${f(shY+13)}
           L${f(shX+4)},${f(shY+5)} L${f(shX+10)},${f(shY+16)} Z"
        fill="#ff5500" opacity="0.75"/>
  <!-- Phoenix body -->
  <ellipse cx="${shX}" cy="${f(shY+2)}" rx="9" ry="8" fill="#ff6600" opacity="0.82"/>
  <!-- Wings -->
  <path d="M${shX},${shY} C${f(shX-10)},${f(shY-10)} ${f(shX-19)},${f(shY-3)} ${f(shX-15)},${f(shY+7)}"
        fill="#ff8800" opacity="0.72"/>
  <path d="M${shX},${shY} C${f(shX+10)},${f(shY-10)} ${f(shX+19)},${f(shY-3)} ${f(shX+15)},${f(shY+7)}"
        fill="#ff8800" opacity="0.72"/>
  <!-- Neck + head -->
  <path d="M${shX},${f(shY-6)} Q${f(shX+4)},${f(shY-15)} ${f(shX+2)},${f(shY-21)}"
        fill="none" stroke="#ffaa22" stroke-width="4" stroke-linecap="round" opacity="0.82"/>
  <circle cx="${f(shX+2)}" cy="${f(shY-23)}" r="4.5" fill="#ffcc44" opacity="0.85"/>
  <!-- Beak -->
  <line x1="${f(shX+5)}" y1="${f(shY-24)}" x2="${f(shX+11)}" y2="${f(shY-27)}"
        stroke="#ddaa22" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`

  // ── Emperor figure ──
  const figY = 216

  const figure = `
  <!-- Cubic throne -->
  <!-- Throne top face (perspective) -->
  <path d="M108,${figY+55} L118,${figY+46} L192,${figY+46} L202,${figY+55} Z"
        fill="#1a0000" stroke="#440000" stroke-width="1" opacity="0.88"/>
  <!-- Throne front face -->
  <rect x="108" y="${figY+55}" width="94" height="32" rx="2"
        fill="#220000" stroke="#550000" stroke-width="1" opacity="0.9"/>
  <!-- Throne arm rests -->
  <rect x="102" y="${figY+22}" width="13" height="34" rx="2"
        fill="#1a0000" stroke="#440000" stroke-width="1" opacity="0.85"/>
  <rect x="195" y="${figY+22}" width="13" height="34" rx="2"
        fill="#1a0000" stroke="#440000" stroke-width="1" opacity="0.85"/>

  <!-- Armoured torso/robe -->
  <path d="M116,${figY+48} Q114,${figY+8} 150,${figY+2}
           Q186,${figY+8} 184,${figY+48} Q150,${figY+64} 116,${figY+48} Z"
        fill="#880000" opacity="0.82"/>
  <!-- Chest armour plate -->
  <rect x="132" y="${figY+6}" width="36" height="28" rx="3"
        fill="#661100" stroke="#994422" stroke-width="1" opacity="0.85"/>

  <!-- Head -->
  <circle cx="150" cy="${figY-17}" r="16" fill="#c8a060" opacity="0.88"/>

  <!-- Crown band + points -->
  <rect x="130" y="${figY-38}" width="40" height="8" rx="2"
        fill="#cc3300" stroke="#ff5500" stroke-width="1" opacity="0.88"/>
  <polygon points="137,${figY-47} 141,${figY-38} 133,${figY-38}"
           fill="#cc3300" opacity="0.85"/>
  <polygon points="150,${figY-52} 155,${figY-38} 145,${figY-38}"
           fill="#cc3300" opacity="0.92"/>
  <polygon points="163,${figY-47} 167,${figY-38} 159,${figY-38}"
           fill="#cc3300" opacity="0.85"/>
  <!-- Ram-horn curls at crown sides -->
  <path d="M130,${figY-36} C122,${figY-40} 116,${figY-30} 120,${figY-22} C124,${figY-15} 130,${figY-20} 129,${figY-28}"
        fill="none" stroke="#cc6622" stroke-width="3.5" stroke-linecap="round" opacity="0.78"/>
  <path d="M170,${figY-36} C178,${figY-40} 184,${figY-30} 180,${figY-22} C176,${figY-15} 170,${figY-20} 171,${figY-28}"
        fill="none" stroke="#cc6622" stroke-width="3.5" stroke-linecap="round" opacity="0.78"/>

  <!-- Right arm raised to hold ankh -->
  <line x1="170" y1="${figY+14}" x2="${aX}" y2="${f(aY+aH*0.48)}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Left arm with shield -->
  <line x1="130" y1="${figY+14}" x2="${f(shX+shW*0.5-4)}" y2="${shY}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Legs (seated, rigid) -->
  <line x1="140" y1="${figY+60}" x2="138" y2="${figY+68}"
        stroke="#880000" stroke-width="11" stroke-linecap="round" opacity="0.75"/>
  <line x1="160" y1="${figY+60}" x2="162" y2="${figY+68}"
        stroke="#880000" stroke-width="11" stroke-linecap="round" opacity="0.75"/>`

  // ── Lower zone: bare red rock ──
  const rkY = 300
  const rocks = `
  <!-- Bare red rock ground -->
  <path d="M18,${rkY} Q44,${rkY-9} 70,${rkY+2} Q100,${rkY+8} 130,${rkY-3}
           Q150,${rkY+5} 170,${rkY-3} Q200,${rkY+8} 230,${rkY+2}
           Q256,${rkY-9} 282,${rkY} L282,352 L18,352 Z"
        fill="#180400" opacity="0.8"/>
  <!-- Rock texture cracks -->
  <line x1="52"  y1="${rkY}"   x2="46"  y2="${rkY+15}" stroke="#0e0200" stroke-width="1" opacity="0.55"/>
  <line x1="135" y1="${rkY+2}" x2="130" y2="${rkY+18}" stroke="#0e0200" stroke-width="1" opacity="0.55"/>
  <line x1="210" y1="${rkY}"   x2="216" y2="${rkY+16}" stroke="#0e0200" stroke-width="1" opacity="0.55"/>`

  // ── Phoenix rising (centre of lower zone) ──
  const phX = 150, phY = 320
  const phoenix = `
  <!-- Flame base -->
  <path d="M${f(phX-14)},${f(phY+20)} L${f(phX-5)},${f(phY+3)} L${phX},${f(phY+14)}
           L${f(phX+5)},${f(phY+3)} L${f(phX+14)},${f(phY+20)} Z"
        fill="#ff3300" opacity="0.72"/>
  <path d="M${f(phX-8)},${f(phY+18)} L${f(phX-2)},${f(phY+8)} L${f(phX+3)},${f(phY+15)}
           L${f(phX+8)},${f(phY+6)} L${f(phX+12)},${f(phY+18)} Z"
        fill="#ff6600" opacity="0.62"/>
  <!-- Body -->
  <ellipse cx="${phX}" cy="${f(phY-7)}" rx="10" ry="9" fill="#ff5500" opacity="0.85"/>
  <!-- Wings spread -->
  <path d="M${phX},${f(phY-9)} C${f(phX-16)},${f(phY-22)} ${f(phX-33)},${f(phY-12)} ${f(phX-29)},${f(phY-1)}"
        fill="#ff7700" opacity="0.75"/>
  <path d="M${phX},${f(phY-9)} C${f(phX+16)},${f(phY-22)} ${f(phX+33)},${f(phY-12)} ${f(phX+29)},${f(phY-1)}"
        fill="#ff7700" opacity="0.75"/>
  <!-- Wing tip feather curves -->
  <path d="M${f(phX-29)},${f(phY-1)} C${f(phX-36)},${f(phY-7)} ${f(phX-37)},${f(phY-16)} ${f(phX-31)},${f(phY-19)}"
        fill="none" stroke="#ffaa22" stroke-width="1.5" opacity="0.62"/>
  <path d="M${f(phX+29)},${f(phY-1)} C${f(phX+36)},${f(phY-7)} ${f(phX+37)},${f(phY-16)} ${f(phX+31)},${f(phY-19)}"
        fill="none" stroke="#ffaa22" stroke-width="1.5" opacity="0.62"/>
  <!-- Neck + head -->
  <path d="M${phX},${f(phY-16)} Q${f(phX+5)},${f(phY-26)} ${f(phX+3)},${f(phY-33)}"
        fill="none" stroke="#ffbb33" stroke-width="5" stroke-linecap="round" opacity="0.88"/>
  <circle cx="${f(phX+3)}" cy="${f(phY-37)}" r="5.5" fill="#ffcc44" opacity="0.9"/>
  <!-- Beak -->
  <line x1="${f(phX+7)}" y1="${f(phY-37)}" x2="${f(phX+14)}" y2="${f(phY-40)}"
        stroke="#ddaa22" stroke-width="2" stroke-linecap="round" opacity="0.82"/>
  <!-- Eye -->
  <circle cx="${f(phX+4)}" cy="${f(phY-40)}" r="1.5" fill="#ff1100" opacity="0.92"/>
  <!-- Tail feathers -->
  <path d="M${phX},${f(phY-1)} Q${f(phX-8)},${f(phY+10)} ${f(phX-11)},${f(phY+18)}"
        fill="none" stroke="#ff5500" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
  <path d="M${phX},${f(phY-1)} Q${f(phX)},${f(phY+11)} ${f(phX-3)},${f(phY+19)}"
        fill="none" stroke="#ff7700" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <path d="M${phX},${f(phY-1)} Q${f(phX+8)},${f(phY+10)} ${f(phX+11)},${f(phY+18)}"
        fill="none" stroke="#ff5500" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>`

  // ── Rams flanking the phoenix ──
  function ram(cx, cy, facingRight) {
    const dir = facingRight ? 1 : -1
    return `<g>
    <!-- Body -->
    <ellipse cx="${cx}" cy="${cy}" rx="26" ry="13" fill="#661100" opacity="0.82"/>
    <!-- Head -->
    <circle cx="${f(cx + dir*21)}" cy="${f(cy-6)}" r="11" fill="#661100" opacity="0.82"/>
    <!-- Snout -->
    <ellipse cx="${f(cx + dir*30)}" cy="${f(cy-3)}" rx="7" ry="4.5" fill="#550e00" opacity="0.78"/>
    <!-- Curved horn (spiralling back) -->
    <path d="M${f(cx + dir*15)},${f(cy-16)}
             C${f(cx + dir*6)},${f(cy-32)} ${f(cx - dir*6)},${f(cy-30)} ${f(cx - dir*4)},${f(cy-18)}"
          fill="none" stroke="#994422" stroke-width="5" stroke-linecap="round" opacity="0.82"/>
    <!-- Eye -->
    <circle cx="${f(cx + dir*19)}" cy="${f(cy-9)}" r="2" fill="#1a0000" opacity="0.75"/>
    <!-- Legs (4) -->
    ${[-12,-4,4,12].map(dx =>
      `<line x1="${f(cx+dx)}" y1="${f(cy+11)}" x2="${f(cx+dx)}" y2="${f(cy+22)}"
             stroke="#661100" stroke-width="5" stroke-linecap="round" opacity="0.78"/>`
    ).join('\n    ')}
  </g>`
  }

  // Ghost Tzaddi
  const tzaddiBg = `
  <text x="152" y="230"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="248" fill="#3a0000" opacity="0.07">צ</text>`

  const body = `
  ${tzaddiBg}
  ${sunSvg}
  ${mountains}
  ${figure}
  ${ankh}
  ${shield}
  ${rocks}
  <g filter="url(#glow)">${phoenix}</g>
  ${ram(72,  320, true)}
  ${ram(228, 320, false)}`

  return majorCard({
    title: 'The Emperor', number: 'IV',
    hebrew: 'Tzaddi · Aries · Path 15',
    hebrewLetter: 'צ', attribution: '♈',
    bg1: '#150000', bg2: '#280000',
    border: '#550000', accent: '#aa1100',
    text: '#ffcc88', dim: '#774422',
    bodyContent: body,
  })
}

// ─── Card 5 — The Hierophant ──────────────────────────────────────────────────
// Sign: Taurus ♉  |  Vav (ו)  |  Path 16: Chokmah → Chesed
// King Scale: Red-Orange
// Motifs: pentagram (5 elements he mediates), triple tiara, sign of esotericism,
//         crook + flail (Osirian), bull-horn throne armrests, altar with offering
//         flame (mediation/sacrifice), Vav axis connecting flame to pentagram,
//         two kneeling initiates

function card5() {
  // ── Pentagram (point up) — five elements / the Hierophant's primary symbol ──
  const pCx = 150, pCy = 111, pR = 28
  const pPts = Array.from({length: 5}, (_, i) => {
    const a = (i * 72 - 90) * Math.PI / 180
    return [f(pCx + pR * Math.cos(a)), f(pCy + pR * Math.sin(a))]
  })
  const starPath = [0,2,4,1,3].map(i => `${pPts[i][0]},${pPts[i][1]}`).join(' ')

  const pentagram = `
  <!-- Pentagram soft outer glow -->
  <polygon points="${starPath}" fill="none" stroke="#bb3300" stroke-width="3" opacity="0.18" filter="url(#softglow)"/>
  <!-- Pentagram -->
  <polygon points="${starPath}" fill="rgba(160,60,0,0.1)" stroke="#cc5500"
           stroke-width="2" stroke-linejoin="round" opacity="0.88" filter="url(#glow)"/>`

  // ── Vav axis — the Nail, vertical connector from earth to heaven ──
  // Runs from altar flame (~y=252) through the Hierophant's raised hand (~y=194)
  // to the pentagram base (~y=139) — the symbolic axis made visible
  const vavAxis = `
  <line x1="150" y1="252" x2="150" y2="139"
        stroke="#ffaa55" stroke-width="1.2" stroke-dasharray="3 5"
        opacity="0.32" filter="url(#glow)"/>`

  // ── Hierophant figure ──
  const figY = 215

  // Tiara (triple papal crown) — rings stacked, clear of pentagram
  const tiara = `
  <!-- Tiara bottom ring (widest) -->
  <ellipse cx="150" cy="${figY-60}" rx="21" ry="7"
           fill="#992200" stroke="#cc4400" stroke-width="1" opacity="0.9"/>
  <!-- Tiara middle ring -->
  <ellipse cx="150" cy="${figY-70}" rx="16" ry="6"
           fill="#aa2200" stroke="#cc4400" stroke-width="1" opacity="0.9"/>
  <!-- Tiara top ring -->
  <ellipse cx="150" cy="${figY-79}" rx="11" ry="5"
           fill="#bb2200" stroke="#dd4400" stroke-width="1" opacity="0.9"/>
  <!-- Finial orb + cross -->
  <circle cx="150" cy="${figY-87}" r="4" fill="#dd3300" opacity="0.9"/>
  <line x1="150" y1="${figY-93}" x2="150" y2="${figY-83}"
        stroke="#ffaa44" stroke-width="1.5" opacity="0.82"/>
  <line x1="146" y1="${figY-89}" x2="154" y2="${figY-89}"
        stroke="#ffaa44" stroke-width="1.5" opacity="0.82"/>`

  // Bull-horn throne armrests (Taurus)
  const throne = `
  <!-- Throne back -->
  <rect x="106" y="${figY-48}" width="88" height="${90}" rx="3"
        fill="#1e0800" stroke="#441800" stroke-width="1" opacity="0.85"/>
  <!-- Throne seat -->
  <rect x="106" y="${figY+42}" width="88" height="14" rx="2"
        fill="#160600" stroke="#441800" stroke-width="1" opacity="0.9"/>
  <!-- Bull-horn armrests (left) — two curved horn shapes -->
  <path d="M106,${figY+28} C96,${figY+22} 90,${figY+10} 98,${figY+4} C106,${figY} 110,${figY+8} 108,${figY+18}"
        fill="none" stroke="#664422" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
  <!-- Bull-horn armrests (right) — mirrored -->
  <path d="M194,${figY+28} C204,${figY+22} 210,${figY+10} 202,${figY+4} C194,${figY} 190,${figY+8} 192,${figY+18}"
        fill="none" stroke="#664422" stroke-width="4" stroke-linecap="round" opacity="0.75"/>`

  const figure = `
  <!-- Vestments — robe -->
  <path d="M116,${figY+44} Q114,${figY+8} 150,${figY+2}
           Q186,${figY+8} 184,${figY+44} Q150,${figY+58} 116,${figY+44} Z"
        fill="#882200" opacity="0.85"/>
  <!-- Chest stole (vertical decorative band) -->
  <rect x="143" y="${figY+4}" width="14" height="38" rx="2"
        fill="#993300" stroke="#bb5522" stroke-width="0.8" opacity="0.78"/>
  <!-- Head -->
  <circle cx="150" cy="${figY-22}" r="15" fill="#c8a060" opacity="0.88"/>

  <!-- Right arm raised — sign of esotericism -->
  <line x1="166" y1="${figY+8}" x2="182" y2="${figY-16}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
  <!-- Palm/wrist -->
  <ellipse cx="183" cy="${figY-19}" rx="5" ry="6" fill="#c8a060" opacity="0.78"/>
  <!-- Two fingers pointing UP (index + middle) -->
  <line x1="180" y1="${figY-24}" x2="177" y2="${figY-36}"
        stroke="#c8a060" stroke-width="2.5" stroke-linecap="round" opacity="0.72"/>
  <line x1="184" y1="${figY-25}" x2="183" y2="${figY-37}"
        stroke="#c8a060" stroke-width="2.5" stroke-linecap="round" opacity="0.72"/>
  <!-- Two fingers pointing DOWN (ring + pinky) -->
  <line x1="183" y1="${figY-14}" x2="186" y2="${figY-4}"
        stroke="#c8a060" stroke-width="2.5" stroke-linecap="round" opacity="0.72"/>
  <line x1="187" y1="${figY-15}" x2="191" y2="${figY-6}"
        stroke="#c8a060" stroke-width="2.5" stroke-linecap="round" opacity="0.72"/>

  <!-- Left arm — crook and flail crossed at chest (Osirian) -->
  <line x1="134" y1="${figY+8}" x2="120" y2="${figY-6}"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Crook: J-shaped pastoral staff -->
  <path d="M118,${figY-4} Q108,${figY-20} 116,${figY-30} Q124,${figY-36} 130,${figY-28}"
        fill="none" stroke="#ddcc44" stroke-width="2.5" stroke-linecap="round" opacity="0.84"/>
  <line x1="118" y1="${figY-4}" x2="138" y2="${figY+18}"
        stroke="#ddcc44" stroke-width="2.5" stroke-linecap="round" opacity="0.76"/>
  <!-- Flail: handle + three beaded chains -->
  <line x1="140" y1="${figY-8}" x2="150" y2="${figY+12}"
        stroke="#ddcc44" stroke-width="2.5" stroke-linecap="round" opacity="0.76"/>
  <line x1="146" y1="${figY-1}" x2="140" y2="${figY+10}"
        stroke="#ddcc44" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
  <line x1="148" y1="${figY-1}" x2="144" y2="${figY+11}"
        stroke="#ddcc44" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
  <line x1="150" y1="${figY-1}" x2="150" y2="${figY+12}"
        stroke="#ddcc44" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
  <circle cx="140" cy="${figY+10}" r="2.5" fill="#ddcc44" opacity="0.72"/>
  <circle cx="144" cy="${figY+11}" r="2.5" fill="#ddcc44" opacity="0.72"/>
  <circle cx="150" cy="${figY+12}" r="2.5" fill="#ddcc44" opacity="0.72"/>`

  // ── Altar with offering flame and bull-horn motif ──
  const altY = 272
  const altar = `
  <!-- Altar stone block -->
  <rect x="120" y="${altY}" width="60" height="20" rx="2"
        fill="#281000" stroke="#553322" stroke-width="1.2" opacity="0.92"/>
  <!-- Altar top slab (slightly proud) -->
  <rect x="117" y="${altY - 4}" width="66" height="6" rx="1.5"
        fill="#321400" stroke="#664433" stroke-width="1" opacity="0.88"/>
  <!-- Bull-horn motif carved into altar face (left) — echoes throne armrests -->
  <path d="M130,${altY+8} C124,${altY+4} 122,${altY+12} 128,${altY+16}"
        fill="none" stroke="#775533" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
  <!-- Bull-horn motif (right, mirrored) -->
  <path d="M170,${altY+8} C176,${altY+4} 178,${altY+12} 172,${altY+16}"
        fill="none" stroke="#775533" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
  <!-- Offering flame -->
  <!-- Flame corona -->
  <path d="M143,${altY} L150,${altY-28} L157,${altY} Z"
        fill="#ff4400" opacity="0.1" filter="url(#softglow)"/>
  <!-- Flame outer -->
  <path d="M145,${altY} L148,${altY-18} L150,${altY-8} L152,${altY-22} L155,${altY} Z"
        fill="#ff5500" opacity="0.75"/>
  <!-- Flame inner -->
  <path d="M147,${altY} L150,${altY-24} L153,${altY} Z"
        fill="#ff3300" opacity="0.55"/>
  <!-- Flame highlight -->
  <path d="M149.5,${altY-2} L150,${altY-18} L150.5,${altY-2} Z"
        fill="#ffee88" opacity="0.65"/>`

  // ── Kneeling initiates flanking the altar ──
  function initiate(cx, cy, facingRight) {
    const dir = facingRight ? 1 : -1
    return `<g opacity="0.72">
    <!-- Head bowed -->
    <circle cx="${cx}" cy="${f(cy-20)}" r="9" fill="#661a00"/>
    <!-- Body bent forward toward altar -->
    <path d="M${f(cx-7)},${f(cy-12)} Q${f(cx + dir*8)},${f(cy+2)} ${f(cx + dir*18)},${f(cy)}"
          fill="none" stroke="#661a00" stroke-width="10" stroke-linecap="round"/>
    <!-- Outstretched arms toward altar/flame -->
    <line x1="${f(cx + dir*8)}" y1="${f(cy-5)}" x2="${f(cx + dir*22)}" y2="${f(cy+1)}"
          stroke="#661a00" stroke-width="5" stroke-linecap="round"/>
    <!-- Robe pooled at base -->
    <ellipse cx="${cx}" cy="${f(cy+9)}" rx="13" ry="5" fill="#551600" opacity="0.55"/>
  </g>`
  }

  // Ghost Vav
  const vavBg = `
  <text x="152" y="228"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#771100" opacity="0.065">ו</text>`

  const body = `
  ${vavBg}
  ${pentagram}
  ${vavAxis}
  ${throne}
  ${tiara}
  ${figure}
  ${altar}
  ${initiate(84,  304, true)}
  ${initiate(216, 304, false)}`

  return majorCard({
    title: 'The Hierophant', number: 'V',
    hebrew: 'Vav · Taurus · Path 16',
    hebrewLetter: 'ו', attribution: '♉',
    bg1: '#150800', bg2: '#2a1200',
    border: '#662200', accent: '#cc4400',
    text: '#ffcc88', dim: '#885533',
    bodyContent: body,
  })
}

// ─── Card 6 — The Lovers ─────────────────────────────────────────────────────
// Sign: Gemini ♊  |  Zain (ז)  |  Path 17: Binah → Tiphareth
// King Scale: Orange
// Motifs: Eros/Cupid (blindfolded, bow aimed at Rebis), background colour split
//         (solar left / lunar right converging to gold at centre axis),
//         King (solar crown + sun disk) and Queen (lunar veil + crescent) with
//         hands joined, Rebis emerging from their union (half gold/half silver,
//         dual crown of sun and moon — the alchemical product, the new matter),
//         Zain axis as a faint vertical line through the Rebis,
//         marriage altar with caduceus serpents

function card6() {
  // ── Background colour split: warm solar left, cool lunar right ──
  const bgSplit = `
  <defs>
    <linearGradient id="kingSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#cc4400" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#cc4400" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="queenSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#334499" stop-opacity="0"/>
      <stop offset="100%" stop-color="#334499" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="rebisGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#ddaa00"/>
      <stop offset="50%"  stop-color="#ddcc99"/>
      <stop offset="100%" stop-color="#7799cc"/>
    </linearGradient>
  </defs>
  <rect x="13" y="13" width="274" height="394" rx="6" fill="url(#kingSide)"/>
  <rect x="13" y="13" width="274" height="394" rx="6" fill="url(#queenSide)"/>`

  // ── Eros — upper centre, blindfolded, bow aimed at the Rebis below ──
  const eX = 150, eY = 108
  const eros = `
  <!-- Light source above Eros -->
  <circle cx="${eX}" cy="${f(eY-20)}" r="24" fill="#ffdd88" opacity="0.12" filter="url(#softglow)"/>
  <circle cx="${eX}" cy="${f(eY-20)}" r="14" fill="#ffee99" opacity="0.18"/>
  <!-- Wings (left) -->
  <path d="M${f(eX-6)},${eY} C${f(eX-24)},${f(eY-14)} ${f(eX-40)},${f(eY-8)} ${f(eX-32)},${f(eY+10)}"
        fill="#eecc66" opacity="0.62"/>
  <!-- Wings (right) -->
  <path d="M${f(eX+6)},${eY} C${f(eX+24)},${f(eY-14)} ${f(eX+40)},${f(eY-8)} ${f(eX+32)},${f(eY+10)}"
        fill="#eecc66" opacity="0.62"/>
  <!-- Body + head -->
  <ellipse cx="${eX}" cy="${f(eY+10)}" rx="9" ry="11" fill="#c8a060" opacity="0.85"/>
  <circle  cx="${eX}" cy="${f(eY-4)}"  r="11" fill="#c8a060" opacity="0.88"/>
  <!-- Blindfold -->
  <rect x="${f(eX-13)}" y="${f(eY-8)}" width="26" height="6" rx="3"
        fill="#773311" opacity="0.78"/>
  <!-- Left arm holding bow -->
  <line x1="${f(eX-8)}" y1="${f(eY+4)}" x2="${f(eX-22)}" y2="${f(eY-4)}"
        stroke="#c8a060" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
  <!-- Right arm drawing string -->
  <line x1="${f(eX+8)}" y1="${f(eY+4)}" x2="${f(eX+20)}" y2="${f(eY+8)}"
        stroke="#c8a060" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
  <!-- Bow (C-shape, vertical, held left) -->
  <path d="M${f(eX-22)},${f(eY-16)} C${f(eX-35)},${f(eY-6)} ${f(eX-35)},${f(eY+10)} ${f(eX-22)},${f(eY+20)}"
        fill="none" stroke="#bb9933" stroke-width="2.5" stroke-linecap="round" opacity="0.88"/>
  <!-- Bowstring (drawn back to right hand) -->
  <path d="M${f(eX-22)},${f(eY-16)} L${f(eX+20)},${f(eY+8)} L${f(eX-22)},${f(eY+20)}"
        fill="none" stroke="#ddcc66" stroke-width="1" opacity="0.68"/>
  <!-- Arrow shaft pointing toward Rebis -->
  <line x1="${f(eX-22)}" y1="${f(eY+2)}" x2="${f(eX+2)}" y2="${f(eY+116)}"
        stroke="#ddcc44" stroke-width="1.5" opacity="0.62"/>
  <!-- Arrowhead -->
  <polygon points="${f(eX+2)},${f(eY+116)} ${f(eX-3)},${f(eY+108)} ${f(eX+7)},${f(eY+108)}"
           fill="#ddcc44" opacity="0.65"/>`

  // ── King (solar, left) ──
  const kX = 78, kY = 196
  const king = `
  <!-- King robe (warm orange-gold) -->
  <path d="M${f(kX-28)},${f(kY+56)} Q${f(kX-30)},${f(kY+10)} ${kX},${f(kY+4)}
           Q${f(kX+28)},${f(kY+10)} ${f(kX+28)},${f(kY+50)} Q${kX},${f(kY+70)} ${f(kX-28)},${f(kY+56)} Z"
        fill="#bb5500" opacity="0.82"/>
  <!-- Chest armour -->
  <rect x="${f(kX-12)}" y="${f(kY+6)}" width="24" height="20" rx="3"
        fill="#994400" stroke="#cc6622" stroke-width="1" opacity="0.8"/>
  <!-- Head -->
  <circle cx="${kX}" cy="${f(kY-14)}" r="14" fill="#c8a060" opacity="0.88"/>
  <!-- Crown band + points -->
  <rect x="${f(kX-14)}" y="${f(kY-34)}" width="28" height="8" rx="2"
        fill="#cc7700" stroke="#ffaa22" stroke-width="1" opacity="0.88"/>
  <polygon points="${f(kX-10)},${f(kY-43)} ${f(kX-7)},${f(kY-34)} ${f(kX-13)},${f(kY-34)}"
           fill="#cc7700" opacity="0.85"/>
  <polygon points="${kX},${f(kY-47)} ${f(kX+4)},${f(kY-34)} ${f(kX-4)},${f(kY-34)}"
           fill="#dd8800" opacity="0.9"/>
  <polygon points="${f(kX+10)},${f(kY-43)} ${f(kX+13)},${f(kY-34)} ${f(kX+7)},${f(kY-34)}"
           fill="#cc7700" opacity="0.85"/>
  <!-- Solar disk atop crown -->
  <circle cx="${kX}" cy="${f(kY-52)}" r="7" fill="#ffcc22" opacity="0.9" filter="url(#glow)"/>
  <!-- Right arm reaching toward centre -->
  <line x1="${f(kX+14)}" y1="${f(kY+8)}" x2="142" y2="240"
        stroke="#c8a060" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <circle cx="142" cy="240" r="5" fill="#c8a060" opacity="0.72"/>`

  // ── Queen (lunar, right) ──
  const qX = 222, qY = 196
  const queen = `
  <!-- Queen robe (cool silver-blue, veiled) -->
  <path d="M${f(qX-28)},${f(qY+56)} Q${f(qX-28)},${f(qY+10)} ${qX},${f(qY+4)}
           Q${f(qX+30)},${f(qY+10)} ${f(qX+28)},${f(qY+50)} Q${qX},${f(qY+70)} ${f(qX-28)},${f(qY+56)} Z"
        fill="#446688" opacity="0.72"/>
  <!-- Veil drape -->
  <path d="M${f(qX-22)},${f(qY-14)} Q${f(qX-30)},${f(qY+20)} ${f(qX-28)},${f(qY+56)}"
        fill="none" stroke="#8899cc" stroke-width="14" stroke-linecap="round" opacity="0.25"/>
  <!-- Head -->
  <circle cx="${qX}" cy="${f(qY-14)}" r="14" fill="#c0b8d0" opacity="0.88"/>
  <!-- Crescent crown (two circles for crescent cutout) -->
  <circle cx="${qX}" cy="${f(qY-36)}" r="10" fill="#8899bb" opacity="0.85"/>
  <circle cx="${f(qX+4.5)}" cy="${f(qY-36)}" r="8.5" fill="#1a1000" opacity="0.88"/>
  <!-- Crown band -->
  <rect x="${f(qX-14)}" y="${f(qY-28)}" width="28" height="7" rx="2"
        fill="#446688" stroke="#8899cc" stroke-width="1" opacity="0.85"/>
  <!-- Left arm reaching toward centre -->
  <line x1="${f(qX-14)}" y1="${f(qY+8)}" x2="158" y2="240"
        stroke="#c0b8d0" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <circle cx="158" cy="240" r="5" fill="#c0b8d0" opacity="0.72"/>`

  // ── Rebis — the alchemical product, rising from the coniunctio ──
  // Half solar (gold-orange, left), half lunar (silver-blue, right)
  // Crowned with both sun disk and crescent moon simultaneously
  const rbX = 150, rbY = 214
  const rebis = `
  <!-- Emergence glow from the union point -->
  <circle cx="${rbX}" cy="${f(rbY+20)}" r="26" fill="#ffee88" opacity="0.1" filter="url(#softglow)"/>
  <!-- Joined hands (where King's and Queen's hands meet) -->
  <ellipse cx="147" cy="240" rx="7" ry="5" fill="#c8a060" opacity="0.7"/>
  <ellipse cx="153" cy="240" rx="7" ry="5" fill="#c0b8d0" opacity="0.7"/>
  <!-- Rebis body — dual-toned horizontal gradient -->
  <ellipse cx="${rbX}" cy="${f(rbY+14)}" rx="11" ry="13" fill="url(#rebisGrad)" opacity="0.9"/>
  <!-- Rebis head -->
  <circle cx="${rbX}" cy="${f(rbY+1)}" r="9" fill="#ddcc99" opacity="0.9"/>
  <!-- Dual crown: solar disk (left) -->
  <circle cx="${f(rbX-8)}" cy="${f(rbY-10)}" r="6" fill="#ffcc22" opacity="0.9" filter="url(#glow)"/>
  <!-- Dual crown: crescent (right) -->
  <circle cx="${f(rbX+8)}"   cy="${f(rbY-10)}" r="6"   fill="#8899bb" opacity="0.85"/>
  <circle cx="${f(rbX+11)}"  cy="${f(rbY-10)}" r="5.2" fill="#1a1000" opacity="0.88"/>
  <!-- Crown band joining both -->
  <rect x="${f(rbX-14)}" y="${f(rbY-5)}" width="28" height="5" rx="2"
        fill="#aa8844" opacity="0.78"/>
  <!-- Arms spread (left gold, right silver — the two natures in one) -->
  <line x1="${f(rbX-11)}" y1="${f(rbY+10)}" x2="${f(rbX-24)}" y2="${f(rbY+4)}"
        stroke="#ddaa22" stroke-width="4" stroke-linecap="round" opacity="0.72"/>
  <line x1="${f(rbX+11)}" y1="${f(rbY+10)}" x2="${f(rbX+24)}" y2="${f(rbY+4)}"
        stroke="#8899bb" stroke-width="4" stroke-linecap="round" opacity="0.72"/>
  <!-- Zain — the sword as the vertical axis through the Rebis, dividing and uniting -->
  <line x1="${rbX}" y1="${f(rbY-18)}" x2="${rbX}" y2="${f(rbY+30)}"
        stroke="#ffffff" stroke-width="0.8" stroke-dasharray="2 4" opacity="0.32"/>`

  // ── Marriage altar with caduceus motif (union of opposites) ──
  const aY = 292
  const altar = `
  <!-- Altar plinth -->
  <rect x="123" y="${aY}" width="54" height="18" rx="2"
        fill="#1c0e00" stroke="#443322" stroke-width="1" opacity="0.92"/>
  <rect x="119" y="${aY-4}" width="62" height="6" rx="1.5"
        fill="#241200" stroke="#554433" stroke-width="1" opacity="0.88"/>
  <!-- Caduceus on altar face (intertwined serpents = union of opposites) -->
  <line x1="150" y1="${aY}" x2="150" y2="${aY+16}"
        stroke="#aa8833" stroke-width="1.5" opacity="0.65"/>
  <path d="M150,${aY+2} C143,${aY+7} 143,${aY+12} 150,${aY+15}"
        fill="none" stroke="#aa8833" stroke-width="1.3" opacity="0.6"/>
  <path d="M150,${aY+2} C157,${aY+7} 157,${aY+12} 150,${aY+15}"
        fill="none" stroke="#aa8833" stroke-width="1.3" opacity="0.6"/>`

  // ── Floor / lower zone ──
  const lower = `
  <path d="M18,318 Q80,312 150,316 Q220,312 282,318 L282,352 L18,352 Z"
        fill="#0d0800" opacity="0.65"/>
  <!-- Gemini glyphs in floor, one each side — the duality at rest -->
  <text x="68"  y="336" text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols',sans-serif"
        font-size="15" fill="#cc5500" opacity="0.38">♊</text>
  <text x="232" y="336" text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols',sans-serif"
        font-size="15" fill="#446688" opacity="0.38">♊</text>`

  // Ghost Zain
  const zainBg = `
  <text x="152" y="228"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="250" fill="#884400" opacity="0.06">ז</text>`

  const body = `
  ${bgSplit}
  ${zainBg}
  ${eros}
  ${king}
  ${queen}
  ${rebis}
  ${altar}
  ${lower}`

  return majorCard({
    title: 'The Lovers', number: 'VI',
    hebrew: 'Zain · Gemini · Path 17',
    hebrewLetter: 'ז', attribution: '♊',
    bg1: '#140800', bg2: '#251200',
    border: '#664400', accent: '#cc7700',
    text: '#ffdd88', dim: '#886633',
    bodyContent: body,
  })
}

// ─── Card 7 — The Chariot ────────────────────────────────────────────────────
// Sign: Cancer ♋  |  Cheth (ח)  |  Path 18: Geburah → Binah
// King Scale: Amber
// Motifs: ♋ Cancer-glyph wheels (circles + S-curve tails = ♋ as functional wheels),
//         Cheth-fence front face, four elemental pillars, star-cloth canopy,
//         winged solar disk (Egyptian divine vehicle), Graal Knight in crab-plate
//         armour with crescent-moon helm crest holding Holy Grail aloft (no reins),
//         two sphinxes (white/solar + black/lunar) drawing the chariot,
//         water ripples below (Cancer = water in motion)

function card7() {
  // ── Ghost Cheth watermark ──
  const chethBg = `
  <text x="152" y="228"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#664400" opacity="0.065">ח</text>`

  // ── Winged solar disk — Egyptian symbol for the divine vehicle ──
  const solarDisk = `
  <!-- Outer glow -->
  <ellipse cx="150" cy="93" rx="22" ry="10" fill="#cc8800" opacity="0.12" filter="url(#softglow)"/>
  <!-- Disk -->
  <ellipse cx="150" cy="93" rx="18" ry="8" fill="#cc8800" opacity="0.82"/>
  <circle cx="150" cy="93" r="8" fill="#ffcc22" opacity="0.92" filter="url(#glow)"/>
  <!-- Left wing -->
  <path d="M132,93 C116,80 92,84 82,93 C96,91 116,93 132,97"
        fill="#bb7700" opacity="0.7"/>
  <!-- Right wing -->
  <path d="M168,93 C184,80 208,84 218,93 C204,91 184,93 168,97"
        fill="#bb7700" opacity="0.7"/>
  <!-- Uraei serpents flanking disk -->
  <path d="M130,89 C126,84 123,90 127,93" fill="none" stroke="#ffdd44" stroke-width="1.5" opacity="0.6"/>
  <path d="M170,89 C174,84 177,90 173,93" fill="none" stroke="#ffdd44" stroke-width="1.5" opacity="0.6"/>`

  // ── Four elemental pillars ──
  const pillars = `
  <!-- Front-left: Fire / Wands — red -->
  <rect x="72" y="104" width="11" height="174" rx="2" fill="#881100" opacity="0.88"/>
  <!-- Front-right: Water / Cups — blue -->
  <rect x="217" y="104" width="11" height="174" rx="2" fill="#112266" opacity="0.88"/>
  <!-- Inner-left: Air / Swords — amber-yellow (slightly recessed) -->
  <rect x="94" y="108" width="7" height="162" rx="2" fill="#887700" opacity="0.6"/>
  <!-- Inner-right: Earth / Disks — green (slightly recessed) -->
  <rect x="199" y="108" width="7" height="162" rx="2" fill="#115500" opacity="0.6"/>`

  // ── Canopy (star-cloth top band) ──
  const canopy = `
  <!-- Canopy top rail -->
  <rect x="72" y="102" width="156" height="12" rx="2" fill="#554400" opacity="0.88"/>
  <!-- Star-cloth interior (deep blue) -->
  <rect x="83" y="104" width="134" height="50" rx="0" fill="#080c1a" opacity="0.88"/>
  <!-- Gold star field on canopy cloth -->
  ${[
    [100,116],[116,111],[134,118],[150,113],[166,118],[184,112],[200,117],
    [108,128],[126,124],[148,130],[168,125],[190,129],
    [118,139],[140,136],[162,140],[183,137],
  ].map(([sx,sy]) => `<circle cx="${sx}" cy="${sy}" r="1.4" fill="#ffcc44" opacity="0.72"/>`).join('\n  ')}
  <!-- Canopy bottom rail -->
  <rect x="72" y="152" width="156" height="8" rx="1" fill="#554400" opacity="0.82"/>`

  // ── Chariot body — front face with Cheth fence (enclosure = the letter Cheth) ──
  const chariotBody = `
  <!-- Chariot side panels / body -->
  <rect x="72" y="160" width="156" height="118" rx="0"
        fill="#130d00" stroke="#554400" stroke-width="1.2" opacity="0.9"/>
  <!-- Cheth fence — vertical bars (Cheth = fence / enclosure) -->
  ${Array.from({length: 9}, (_, i) => {
    const bx = 84 + i * 15
    return `<line x1="${bx}" y1="164" x2="${bx}" y2="275"
               stroke="#665533" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`
  }).join('\n  ')}
  <!-- Fence rails (horizontal) -->
  <line x1="76" y1="164" x2="224" y2="164" stroke="#665533" stroke-width="1.5" opacity="0.4"/>
  <line x1="76" y1="275" x2="224" y2="275" stroke="#665533" stroke-width="1.5" opacity="0.4"/>`

  // ── Graal Knight — armoured, crab-plate carapace, crescent helm, no reins ──
  const kY = 228  // torso centre
  const knight = `
  <!-- Both arms raised to hold Grail aloft -->
  <line x1="${f(150-18)}" y1="${f(kY-18)}" x2="${f(150-32)}" y2="${f(kY-68)}"
        stroke="#446688" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <line x1="${f(150+18)}" y1="${f(kY-18)}" x2="${f(150+32)}" y2="${f(kY-68)}"
        stroke="#446688" stroke-width="9" stroke-linecap="round" opacity="0.82"/>
  <!-- Gauntlets -->
  <circle cx="${f(150-32)}" cy="${f(kY-68)}" r="5.5" fill="#446688" opacity="0.78"/>
  <circle cx="${f(150+32)}" cy="${f(kY-68)}" r="5.5" fill="#446688" opacity="0.78"/>
  <!-- Pauldrons (shoulder plates — crab-carapace curves) -->
  <ellipse cx="${f(150-22)}" cy="${f(kY-38)}" rx="14" ry="7"
           fill="#446688" stroke="#6688aa" stroke-width="1" opacity="0.84"/>
  <ellipse cx="${f(150+22)}" cy="${f(kY-38)}" rx="14" ry="7"
           fill="#446688" stroke="#6688aa" stroke-width="1" opacity="0.84"/>
  <!-- Breastplate (overlapping crab-carapace segments) -->
  <ellipse cx="150" cy="${f(kY-24)}" rx="18" ry="16" fill="#557799" opacity="0.86"/>
  <path d="M132,${f(kY-24)} Q150,${f(kY-14)} 168,${f(kY-24)}"
        fill="none" stroke="#7799bb" stroke-width="1.5" opacity="0.55"/>
  <path d="M133,${f(kY-34)} Q150,${f(kY-24)} 167,${f(kY-34)}"
        fill="none" stroke="#7799bb" stroke-width="1.2" opacity="0.45"/>
  <!-- Crab emblem on breastplate -->
  <ellipse cx="150" cy="${f(kY-24)}" rx="6" ry="4" fill="#335577" opacity="0.78"/>
  <path d="M144,${f(kY-24)} C140,${f(kY-30)} 136,${f(kY-28)} 136,${f(kY-24)}"
        fill="none" stroke="#5577aa" stroke-width="1.5" opacity="0.65"/>
  <path d="M156,${f(kY-24)} C160,${f(kY-30)} 164,${f(kY-28)} 164,${f(kY-24)}"
        fill="none" stroke="#5577aa" stroke-width="1.5" opacity="0.65"/>
  <!-- Torso lower -->
  <rect x="132" y="${f(kY-8)}" width="36" height="36" rx="3"
        fill="#446688" opacity="0.82"/>
  <!-- Lower carapace segments -->
  <path d="M132,${f(kY+4)} Q150,${f(kY+12)} 168,${f(kY+4)}"
        fill="none" stroke="#6688aa" stroke-width="1.2" opacity="0.48"/>
  <path d="M132,${f(kY+18)} Q150,${f(kY+26)} 168,${f(kY+18)}"
        fill="none" stroke="#6688aa" stroke-width="1.2" opacity="0.48"/>
  <!-- Neck gorget -->
  <rect x="143" y="${f(kY-52)}" width="14" height="12" rx="2"
        fill="#557799" opacity="0.82"/>
  <!-- Head (helm dome) -->
  <ellipse cx="150" cy="${f(kY-70)}" rx="17" ry="12" fill="#446688" opacity="0.88"/>
  <path d="M133,${f(kY-70)} Q150,${f(kY-94)} 167,${f(kY-70)}"
        fill="#335577" stroke="#6688aa" stroke-width="1" opacity="0.88"/>
  <!-- Visor slot -->
  <line x1="136" y1="${f(kY-70)}" x2="164" y2="${f(kY-70)}"
        stroke="#223355" stroke-width="3" opacity="0.65"/>
  <!-- Crescent moon crest on helm -->
  <circle cx="150" cy="${f(kY-96)}" r="9" fill="#7799bb" opacity="0.84"/>
  <circle cx="${f(150+5)}" cy="${f(kY-96)}" r="7.5" fill="#0a0d1a" opacity="0.9"/>`

  // ── Holy Grail — held aloft above the chariot (no reins; will guided by spirit) ──
  const grailSvg = suitPip('cups', 150, kY - 96, 46, '#ffcc44', 1.0)

  // ── ♋ Cancer-glyph wheels ──
  // Two spoked circles with their tails forming the S-curve of the Cancer glyph:
  //   left wheel + upper-right tail + lower-left tail + right wheel = ♋
  const lWX = 86, wY = 293, rWX = 214, wR = 28
  const axMid = (lWX + rWX) / 2  // = 150
  const spokeC = '#cc8800'
  const wheels = `
  <!-- Left wheel rim (left circle of ♋) -->
  <circle cx="${lWX}" cy="${wY}" r="${wR}"
          fill="none" stroke="${spokeC}" stroke-width="3.5" opacity="0.88"/>
  <!-- Left wheel hub -->
  <circle cx="${lWX}" cy="${wY}" r="5" fill="${spokeC}" opacity="0.88"/>
  <!-- Left wheel spokes -->
  ${Array.from({length: 8}, (_, i) => {
    const a = i * 45 * Math.PI / 180
    return `<line x1="${f(lWX + 5*Math.cos(a))}" y1="${f(wY + 5*Math.sin(a))}"
               x2="${f(lWX + wR*Math.cos(a))}" y2="${f(wY + wR*Math.sin(a))}"
               stroke="${spokeC}" stroke-width="1.8" opacity="0.6"/>`
  }).join('\n  ')}
  <!-- Right wheel rim (right circle of ♋) -->
  <circle cx="${rWX}" cy="${wY}" r="${wR}"
          fill="none" stroke="${spokeC}" stroke-width="3.5" opacity="0.88"/>
  <!-- Right wheel hub -->
  <circle cx="${rWX}" cy="${wY}" r="5" fill="${spokeC}" opacity="0.88"/>
  <!-- Right wheel spokes -->
  ${Array.from({length: 8}, (_, i) => {
    const a = i * 45 * Math.PI / 180
    return `<line x1="${f(rWX + 5*Math.cos(a))}" y1="${f(wY + 5*Math.sin(a))}"
               x2="${f(rWX + wR*Math.cos(a))}" y2="${f(wY + wR*Math.sin(a))}"
               stroke="${spokeC}" stroke-width="1.8" opacity="0.6"/>`
  }).join('\n  ')}
  <!-- ♋ S-curve connector — upper tail (from left wheel rightward, curving up to midpoint) -->
  <path d="M${f(lWX + wR)},${wY} C${f(lWX + wR + 18)},${f(wY - 15)} ${f(axMid - 10)},${f(wY - 18)} ${axMid},${f(wY - 13)}"
        fill="none" stroke="${spokeC}" stroke-width="3.2" stroke-linecap="round" opacity="0.84"/>
  <!-- ♋ S-curve connector — lower tail (from right wheel leftward, curving down to midpoint) -->
  <path d="M${f(rWX - wR)},${wY} C${f(rWX - wR - 18)},${f(wY + 15)} ${f(axMid + 10)},${f(wY + 18)} ${axMid},${f(wY + 13)}"
        fill="none" stroke="${spokeC}" stroke-width="3.2" stroke-linecap="round" opacity="0.84"/>
  <!-- Axle bar (structural, behind the S-curve) -->
  <line x1="${f(lWX + wR)}" y1="${wY}" x2="${f(rWX - wR)}" y2="${wY}"
        stroke="${spokeC}" stroke-width="2.5" opacity="0.5"/>`

  // ── Sphinxes — white (solar, left) + black (lunar, right), drawing the chariot ──
  function sphinx(cx, cy, isBlack) {
    const bodyC  = isBlack ? '#111111' : '#ccccaa'
    const strokeC = isBlack ? '#333333' : '#aaaaaa'
    const headC  = isBlack ? '#1e1e1e' : '#ddddcc'
    const eyeC   = isBlack ? '#ffcc00' : '#334400'
    return `<g>
    <!-- Lion body -->
    <ellipse cx="${cx}" cy="${f(cy+6)}" rx="23" ry="12" fill="${bodyC}" opacity="0.84"/>
    <!-- Forepaws -->
    <ellipse cx="${f(cx-11)}" cy="${f(cy+18)}" rx="8" ry="4" fill="${bodyC}" opacity="0.75"/>
    <ellipse cx="${f(cx+11)}" cy="${f(cy+18)}" rx="8" ry="4" fill="${bodyC}" opacity="0.75"/>
    <!-- Nemes headdress sides -->
    <path d="M${f(cx-9)},${f(cy-8)} Q${f(cx-16)},${f(cy+6)} ${f(cx-14)},${f(cy+18)}"
          fill="none" stroke="${strokeC}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M${f(cx+9)},${f(cy-8)} Q${f(cx+16)},${f(cy+6)} ${f(cx+14)},${f(cy+18)}"
          fill="none" stroke="${strokeC}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
    <!-- Nemes top band -->
    <path d="M${f(cx-10)},${f(cy-20)} Q${cx},${f(cy-27)} ${f(cx+10)},${f(cy-20)}"
          fill="${strokeC}" opacity="0.58"/>
    <!-- Human head -->
    <circle cx="${cx}" cy="${f(cy-12)}" r="12" fill="${headC}" opacity="0.86"/>
    <!-- Eye -->
    <circle cx="${f(cx-3)}" cy="${f(cy-13)}" r="2" fill="${eyeC}" opacity="0.82"/>
  </g>`
  }

  // ── Water ripples (Cancer = water; chariot skims over the unconscious) ──
  const water = `
  <!-- Water surface -->
  <path d="M18,328 Q80,322 150,326 Q220,322 282,328 L282,352 L18,352 Z"
        fill="#08090f" opacity="0.72"/>
  <!-- Ripples -->
  <path d="M42,332 Q72,329 102,332" fill="none" stroke="#334466" stroke-width="1" opacity="0.42"/>
  <path d="M136,330 Q166,327 196,330" fill="none" stroke="#334466" stroke-width="1" opacity="0.42"/>
  <path d="M216,333 Q244,330 268,333" fill="none" stroke="#334466" stroke-width="1" opacity="0.35"/>
  <!-- Faint wheel reflections in water -->
  <ellipse cx="${lWX}" cy="340" rx="${f(wR*0.75)}" ry="3.5"
           fill="none" stroke="${spokeC}" stroke-width="0.8" opacity="0.18"/>
  <ellipse cx="${rWX}" cy="340" rx="${f(wR*0.75)}" ry="3.5"
           fill="none" stroke="${spokeC}" stroke-width="0.8" opacity="0.18"/>`

  const body = `
  ${chethBg}
  ${pillars}
  ${canopy}
  ${chariotBody}
  ${knight}
  <g filter="url(#glow)">${grailSvg}</g>
  ${solarDisk}
  ${wheels}
  ${sphinx(38,  312, false)}
  ${sphinx(262, 312, true)}
  ${water}`

  return majorCard({
    title: 'The Chariot', number: 'VII',
    hebrew: 'Cheth · Cancer · Path 18',
    hebrewLetter: 'ח', attribution: '♋',
    bg1: '#0d0900', bg2: '#1e1400',
    border: '#664400', accent: '#cc8800',
    text: '#ffdd88', dim: '#886633',
    bodyContent: body,
  })
}

// ─── Card 8 — Adjustment ─────────────────────────────────────────────────────
// Sign: Libra ♎  |  Lamed (ל)  |  Path 22: Geburah → Tiphareth
// King Scale: Emerald green
// Design principle: mathematically perfect bilateral symmetry about cx=150.
//   Every coordinate is defined as an offset from cx; every element is either
//   centred on cx or exists as an exact mirrored pair.
// Motifs: dancer balanced on sword-point, diamond body = karma/geometric precision,
//         Ma'at feather crown (centred, inherently symmetric), blindfolded head,
//         twin scale pans (feather left / heart right — content differs, positions mirror),
//         Α centred above, ♎ rendered geometrically below (arch = Ω, bar = balance beam,
//         sword tip pierces arch apex — one mark serves as Ω + ♎ + fulcrum simultaneously),
//         Lamed ghost watermark, compass-rose grid at sword tip

function card8() {
  const cx = 150  // vertical axis of perfect symmetry — all x-coords are offsets from this

  // ── Ghost Lamed (ל) ──
  const lamedBg = `
  <text x="${cx}" y="226"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#004422" opacity="0.065">ל</text>`

  // ── Sword — vertical, blade pointing downward; the figure stands on the tip ──
  const swFeet = 266   // y: where figure's feet rest (crossguard / blade root)
  const swTip  = 326   // y: blade tip — also the apex of the ♎ arch below it
  const barY   = swTip + 20  // y: ♎ horizontal bar (= Ω baseline = scales fulcrum)
  const sword = `
  <!-- Blade soft glow -->
  <line x1="${cx}" y1="${swFeet}" x2="${cx}" y2="${swTip}"
        stroke="#44ff88" stroke-width="8" opacity="0.07" filter="url(#softglow)"/>
  <!-- Blade body (tapered polygon, symmetric about cx) -->
  <polygon points="${cx-4},${swFeet} ${cx+4},${swFeet} ${cx+0.5},${swTip} ${cx-0.5},${swTip}"
           fill="#aaddcc" opacity="0.78"/>
  <!-- Fuller (centre line of blade, on cx) -->
  <line x1="${cx}" y1="${swFeet}" x2="${cx}" y2="${swTip}"
        stroke="#ddfff0" stroke-width="0.7" opacity="0.45"/>
  <!-- Crossguard (symmetric rectangle centred on cx) -->
  <rect x="${cx-22}" y="${swFeet-4}" width="44" height="7" rx="3"
        fill="#88aaaa" opacity="0.84"/>
  <!-- Grip (centred on cx, mostly inside diamond) -->
  <line x1="${cx}" y1="${swFeet-4}" x2="${cx}" y2="${swFeet-16}"
        stroke="#bb9944" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
  <!-- Pommel (symmetric ellipse on cx) -->
  <ellipse cx="${cx}" cy="${swFeet-18}" rx="5.5" ry="4" fill="#bbaa44" opacity="0.8"/>`

  // ── Diamond body — the figure IS the diamond; geometry = karma's precision ──
  const dTop = 186   // top vertex y
  const dMid = 226   // y of widest left/right vertices
  const dBot = swFeet  // bottom vertex = feet on sword tip
  const dW   = 40    // half-width
  const diamond = `
  <!-- Diamond body outer glow -->
  <polygon points="${cx},${dTop} ${cx-dW},${dMid} ${cx},${dBot} ${cx+dW},${dMid}"
           fill="#002211" opacity="0.14" filter="url(#softglow)"/>
  <!-- Diamond body fill -->
  <polygon points="${cx},${dTop} ${cx-dW},${dMid} ${cx},${dBot} ${cx+dW},${dMid}"
           fill="#003d1a" stroke="#33bb66" stroke-width="1.5" opacity="0.82"/>
  <!-- Internal diagonals (axes of perfect balance — lie exactly on cx and dMid) -->
  <line x1="${cx}" y1="${dTop}" x2="${cx}" y2="${dBot}"
        stroke="#44cc66" stroke-width="0.8" opacity="0.22"/>
  <line x1="${cx-dW}" y1="${dMid}" x2="${cx+dW}" y2="${dMid}"
        stroke="#44cc66" stroke-width="0.8" opacity="0.22"/>
  <!-- Edge highlights (4 edges as exact mirrored pairs) -->
  <line x1="${cx}" y1="${dTop}" x2="${cx-dW}" y2="${dMid}"
        stroke="#55dd77" stroke-width="0.8" opacity="0.5"/>
  <line x1="${cx}" y1="${dTop}" x2="${cx+dW}" y2="${dMid}"
        stroke="#55dd77" stroke-width="0.8" opacity="0.5"/>
  <line x1="${cx-dW}" y1="${dMid}" x2="${cx}" y2="${dBot}"
        stroke="#44bb55" stroke-width="0.8" opacity="0.4"/>
  <line x1="${cx+dW}" y1="${dMid}" x2="${cx}" y2="${dBot}"
        stroke="#44bb55" stroke-width="0.8" opacity="0.4"/>`

  // ── Arms — exact mirrored pair from diamond's left/right vertices ──
  const armExtX = dW + 34  // x-offset of arm tip from cx
  const armTipY = 204      // arm tip y
  const arms = `
  <!-- Left arm (diamond left vertex → left scale attachment) -->
  <line x1="${cx-dW}" y1="${dMid}" x2="${cx-armExtX}" y2="${armTipY}"
        stroke="#33bb55" stroke-width="8" stroke-linecap="round" opacity="0.84"/>
  <!-- Right arm (exact mirror) -->
  <line x1="${cx+dW}" y1="${dMid}" x2="${cx+armExtX}" y2="${armTipY}"
        stroke="#33bb55" stroke-width="8" stroke-linecap="round" opacity="0.84"/>`

  // ── Balance scales — mirrored pair at ±scX from cx ──
  const scX    = armExtX  // x-offset from cx to pan centre
  const chainY = armTipY  // chain top = arm tip
  const panY   = 274      // pan level
  const panHW  = 26       // pan half-width
  const scales = `
  <!-- Scale beam (horizontal, centred on cx) -->
  <line x1="${cx-scX}" y1="${armTipY}" x2="${cx+scX}" y2="${armTipY}"
        stroke="#55cc77" stroke-width="1.2" opacity="0.35"/>
  <!-- Left chain -->
  <line x1="${cx-scX}" y1="${chainY}" x2="${cx-scX}" y2="${panY}"
        stroke="#44aa66" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.62"/>
  <!-- Right chain (mirror) -->
  <line x1="${cx+scX}" y1="${chainY}" x2="${cx+scX}" y2="${panY}"
        stroke="#44aa66" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.62"/>
  <!-- Left pan bowl (symmetric about cx−scX) -->
  <path d="M${cx-scX-panHW},${panY} Q${cx-scX},${panY+9} ${cx-scX+panHW},${panY}"
        fill="none" stroke="#55cc77" stroke-width="2" opacity="0.84"/>
  <!-- Right pan bowl (mirror about cx+scX) -->
  <path d="M${cx+scX-panHW},${panY} Q${cx+scX},${panY+9} ${cx+scX+panHW},${panY}"
        fill="none" stroke="#55cc77" stroke-width="2" opacity="0.84"/>
  <!-- Left pan cords (symmetric pair within left pan) -->
  <line x1="${cx-scX-panHW}" y1="${panY}" x2="${cx-scX}" y2="${panY-9}"
        stroke="#44aa66" stroke-width="0.8" opacity="0.58"/>
  <line x1="${cx-scX+panHW}" y1="${panY}" x2="${cx-scX}" y2="${panY-9}"
        stroke="#44aa66" stroke-width="0.8" opacity="0.58"/>
  <!-- Right pan cords (mirror) -->
  <line x1="${cx+scX-panHW}" y1="${panY}" x2="${cx+scX}" y2="${panY-9}"
        stroke="#44aa66" stroke-width="0.8" opacity="0.58"/>
  <line x1="${cx+scX+panHW}" y1="${panY}" x2="${cx+scX}" y2="${panY-9}"
        stroke="#44aa66" stroke-width="0.8" opacity="0.58"/>
  <!-- Left pan: Ma'at's feather (quill on cx-scX; vanes symmetric about it) -->
  <line x1="${cx-scX}" y1="${panY}" x2="${cx-scX}" y2="${panY-20}"
        stroke="#88ddbb" stroke-width="1.5" opacity="0.78"/>
  <path d="M${cx-scX},${panY-20} C${cx-scX-7},${panY-14} ${cx-scX-8},${panY-7} ${cx-scX},${panY}"
        fill="#44cc88" opacity="0.52"/>
  <path d="M${cx-scX},${panY-20} C${cx-scX+7},${panY-14} ${cx-scX+8},${panY-7} ${cx-scX},${panY}"
        fill="#44cc88" opacity="0.52"/>
  <!-- Right pan: Heart — symmetric about cx+scX (heart is left-right symmetric) -->
  <path d="M${cx+scX},${panY-6}
           C${cx+scX-5},${panY-17} ${cx+scX-12},${panY-14} ${cx+scX-9},${panY-6}
           Q${cx+scX},${panY+1}    ${cx+scX+9},${panY-6}
           C${cx+scX+12},${panY-14} ${cx+scX+5},${panY-17} ${cx+scX},${panY-6} Z"
        fill="#cc3344" opacity="0.72"/>`

  // ── Head and Ma'at feather crown — all centred on cx ──
  const headY = 172
  const head = `
  <!-- Head (centred on cx) -->
  <circle cx="${cx}" cy="${headY}" r="14" fill="#33bb66" opacity="0.86"/>
  <!-- Blindfold (symmetric rect centred on cx) -->
  <rect x="${cx-16}" y="${headY-3}" width="32" height="6" rx="3"
        fill="#005522" opacity="0.84"/>
  <!-- Crown band (centred on cx) -->
  <rect x="${cx-14}" y="${headY-20}" width="28" height="6" rx="2"
        fill="#2d9944" stroke="#55dd77" stroke-width="0.8" opacity="0.86"/>
  <!-- Ma'at feather — single tall feather centred on cx (symmetric by construction) -->
  <line x1="${cx}" y1="${headY-26}" x2="${cx}" y2="${headY-78}"
        stroke="#88ddbb" stroke-width="2" opacity="0.84"/>
  <!-- Left vane -->
  <path d="M${cx},${headY-78} C${cx-11},${headY-64} ${cx-14},${headY-46} ${cx-12},${headY-32}
           Q${cx-5},${headY-27} ${cx},${headY-26}"
        fill="#44cc77" opacity="0.62"/>
  <!-- Right vane (exact mirror of left) -->
  <path d="M${cx},${headY-78} C${cx+11},${headY-64} ${cx+14},${headY-46} ${cx+12},${headY-32}
           Q${cx+5},${headY-27} ${cx},${headY-26}"
        fill="#44cc77" opacity="0.62"/>
  <!-- Feather tip (centred on cx) -->
  <circle cx="${cx}" cy="${headY-80}" r="2" fill="#88eebb" opacity="0.72"/>`

  // ── Α above / ♎ below — the vertical axis endpoints ──
  // Α (beginning) is a text glyph; it is individually left-right symmetric, centred on cx.
  // Ω (end) is NOT a text glyph here — it is rendered geometrically as ♎ (Libra):
  //   the arch of ♎ IS the Ω, and its horizontal bar IS the balance baseline.
  //   The sword tip pierces the arch apex, making one mark serve as Ω + ♎ + fulcrum.
  const archR = 20   // radius of the ♎ arch (semicircle, symmetric about cx)
  const alphaOmega = `
  <!-- Α — beginning — centred on vertical axis, above the feather -->
  <text x="${cx}" y="90"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols','DejaVu Sans',sans-serif"
        font-size="15" fill="#55ee99" opacity="0.65" filter="url(#glow)">Α</text>
  <!-- ♎ = Ω + bar — rendered geometrically, centred on cx -->
  <!-- Arch glow (softglow traces the Ω semicircle) -->
  <path d="M${cx-archR},${barY} A${archR},${archR} 0 0,0 ${cx+archR},${barY}"
        fill="none" stroke="#44ff88" stroke-width="6" opacity="0.09" filter="url(#softglow)"/>
  <!-- Arch (the Ω — semicircle from left to right, apex at sword tip) -->
  <path d="M${cx-archR},${barY} A${archR},${archR} 0 0,0 ${cx+archR},${barY}"
        fill="none" stroke="#55ee99" stroke-width="2.5" stroke-linecap="round"
        opacity="0.86" filter="url(#glow)"/>
  <!-- Bar (the ♎ baseline — balance beam, Libra fulcrum, Ω foot) -->
  <line x1="${cx-archR-7}" y1="${barY}" x2="${cx+archR+7}" y2="${barY}"
        stroke="#55ee99" stroke-width="2" stroke-linecap="round" opacity="0.84"/>`

  // ── Compass-rose grid at sword tip + ground ──
  const grid = `
  <!-- Ground fill (starts at barY, below the ♎ symbol) -->
  <path d="M18,${barY+3} Q${cx},${barY} 282,${barY+3} L282,352 L18,352 Z"
        fill="#040e06" opacity="0.78"/>
  <!-- Compass-rose centred on sword tip / ♎ arch apex (4 cardinal + 4 diagonal, mirrored) -->
  <line x1="${cx}" y1="${swTip-10}" x2="${cx}" y2="${swTip+10}"
        stroke="#33aa55" stroke-width="0.9" opacity="0.35"/>
  <line x1="${cx-10}" y1="${swTip}" x2="${cx+10}" y2="${swTip}"
        stroke="#33aa55" stroke-width="0.9" opacity="0.35"/>
  <line x1="${cx-7}" y1="${swTip-7}" x2="${cx+7}" y2="${swTip+7}"
        stroke="#33aa55" stroke-width="0.6" opacity="0.22"/>
  <line x1="${cx+7}" y1="${swTip-7}" x2="${cx-7}" y2="${swTip+7}"
        stroke="#33aa55" stroke-width="0.6" opacity="0.22"/>
  <!-- Ground cross-hatch (symmetric pairs about cx) -->
  ${Array.from({length: 5}, (_, i) => {
    const d = (i + 1) * 22
    return `<line x1="${cx-d+14}" y1="${barY+3}" x2="${cx-d-8}" y2="352"
               stroke="#1a3322" stroke-width="0.8" opacity="0.18"/>
<line x1="${cx+d-14}" y1="${barY+3}" x2="${cx+d+8}" y2="352"
               stroke="#1a3322" stroke-width="0.8" opacity="0.18"/>`
  }).join('\n  ')}`

  const body = `
  ${lamedBg}
  ${grid}
  ${sword}
  ${diamond}
  ${arms}
  ${scales}
  ${head}
  ${alphaOmega}`

  return majorCard({
    title: 'Adjustment', number: 'VIII',
    hebrew: 'Lamed · Libra · Path 22',
    hebrewLetter: 'ל', attribution: '♎',
    bg1: '#060e06', bg2: '#0c1a0c',
    border: '#226633', accent: '#44cc66',
    text: '#99ffcc', dim: '#336644',
    bodyContent: body,
  })
}

// ─── Card 9 — The Hermit ─────────────────────────────────────────────────────
// Sign: Virgo ♍  |  Yod (י)  |  Path 20: Chesed → Tiphareth
// King Scale: Yellowish-green / olive
//
// The Hermit is the mirror of The Fool. Every major visual element has a direct
// counterpart in card0, with the same SVG code where possible:
//
//   FOOL                          HERMIT
//   Solar disk (free, radiating)  solarDisk() enclosed in lantern cage
//   16 solar rays outward         16 Yod glyphs at solarRayEndpoints() — same math
//   Figure LEFT, walking right    Figure RIGHT, walking left  (compositional mirror)
//   Open void ahead               Mountain peak; path behind descends to card base
//   Aleph (א) — infinite/open     Yod (י) — first point, seed of all letters
//   0 = cosmic circle             Orphic Egg = same ovular form, now containing life
//   One small animal below        Cerberus (same zone, three heads = animal matured)
//   Bag on wand: empty, waiting   Lantern on staff: full, giving

function card9() {
  // ── Ghost Yod (י) — the tiniest letter at watermark scale ──
  // Aleph sprawls; Yod is a single droplet. Both fill the card but are opposites in form.
  const yodBg = `
  <text x="152" y="228"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#2e4a10" opacity="0.065">י</text>`

  // ── Orphic Egg — upper LEFT, answering the solar disk's position in The Fool ──
  // Same compositional zone (upper body), same glow palette, same ovular form as 0.
  // The Fool's free circle of nothing has become a seed containing everything.
  const eCx = 94, eCy = 120, eRx = 36, eRy = 48
  const orphicEgg = `
  <!-- Egg outer glow — same palette as solarDisk's outer glow ring -->
  <ellipse cx="${eCx}" cy="${eCy}" rx="${f(eRx*2.1)}" ry="${f(eRy*1.6)}"
           fill="#fffde0" opacity="0.05" filter="url(#softglow)"/>
  <ellipse cx="${eCx}" cy="${eCy}" rx="${f(eRx*1.5)}" ry="${f(eRy*1.2)}"
           fill="#fffbe8" opacity="0.09" filter="url(#softglow)"/>
  <!-- Egg body -->
  <ellipse cx="${eCx}" cy="${eCy}" rx="${eRx}" ry="${eRy}"
           fill="#e8dca8" opacity="0.22" stroke="#b8a860" stroke-width="1.2"/>
  <!-- Ophion's upper coil: sweeps left-side up, over the crown, down right-side -->
  <path d="M${f(eCx-eRx)},${f(eCy-6)}
           C${f(eCx-eRx-8)},${f(eCy-28)} ${f(eCx)},${f(eCy-eRy-10)} ${f(eCx+eRx)},${f(eCy-6)}
           C${f(eCx+eRx+8)},${f(eCy+16)} ${f(eCx+eRx+6)},${f(eCy+28)} ${f(eCx+eRx)},${f(eCy+34)}"
        fill="none" stroke="#6a8a38" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
  <!-- Ophion's lower coil: continues under the base, back up the left -->
  <path d="M${f(eCx+eRx)},${f(eCy+34)}
           C${f(eCx+eRx-4)},${f(eCy+eRy+10)} ${f(eCx)},${f(eCy+eRy+8)} ${f(eCx-eRx)},${f(eCy+34)}
           C${f(eCx-eRx-8)},${f(eCy+14)} ${f(eCx-eRx-8)},${f(eCy+2)} ${f(eCx-eRx)},${f(eCy-6)}"
        fill="none" stroke="#6a8a38" stroke-width="2.5" stroke-linecap="round" opacity="0.42"/>
  <!-- Serpent head at egg crown -->
  <ellipse cx="${f(eCx+2)}" cy="${f(eCy-eRy-8)}" rx="4" ry="3"
           fill="#6a8a38" opacity="0.62"/>
  <!-- Tongue -->
  <line x1="${f(eCx+2)}" y1="${f(eCy-eRy-5)}" x2="${f(eCx+2)}" y2="${f(eCy-eRy-2)}"
        stroke="#6a8a38" stroke-width="1" opacity="0.55"/>`

  // ── Mountain — Hermit stands at the summit; slopes fall away below ──
  const peakX = 182, peakY = 268
  const mountains = `
  <!-- Mountain body (fills lower half of card) -->
  <path d="M18,352 L18,318 Q48,288 78,304 Q112,320 144,286
           Q162,275 ${peakX},${peakY}
           Q202,278 224,284 Q254,296 282,312 L282,352 Z"
        fill="#090e04" opacity="0.96"/>
  <!-- Peak crest highlight (faint) -->
  <path d="M${f(peakX-20)},${f(peakY+3)} L${peakX},${peakY} L${f(peakX+20)},${f(peakY+5)}"
        fill="none" stroke="#3a5820" stroke-width="1" opacity="0.38"/>`

  // ── Ascending path — the journey from the Fool's cliff to the Hermit's peak ──
  // The Fool had no path — he stood at the beginning with void ahead.
  // The Hermit's path descends from his feet to the lower-left: the completed journey.
  const pathSvg = `
  <!-- The path — every step the Fool will take, already walked by the Hermit -->
  <path d="M40,350 Q62,338 80,322 Q102,306 124,296 Q148,284 164,277 Q174,273 ${peakX},${f(peakY+2)}"
        fill="none" stroke="#7aaa44" stroke-width="3" stroke-linecap="round"
        opacity="0.18" filter="url(#softglow)"/>
  <path d="M40,350 Q62,338 80,322 Q102,306 124,296 Q148,284 164,277 Q174,273 ${peakX},${f(peakY+2)}"
        fill="none" stroke="#5a7a30" stroke-width="1.4" stroke-linecap="round" opacity="0.28"/>`

  // ── Lantern — the enclosed Sun ──
  // solarDisk() called with the same parameters as card0 (scaled to lantern size).
  // The hexagonal cage is drawn OVER the disk — the same light, now enclosed in matter.
  const lCx = 132, lCy = 210, lR = 18, diskR = 11
  const hexPts = Array.from({length: 6}, (_, i) => {
    const a = (i * 60 - 30) * Math.PI / 180
    return [f(lCx + lR * Math.cos(a)), f(lCy + lR * Math.sin(a))]
  })
  const hexPath = hexPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z'
  const lantern = `
  <!-- Light cone (forward glow, aimed leftward — into the darkness ahead) -->
  <path d="M${lCx},${lCy} L${f(lCx-72)},${f(lCy-24)} L${f(lCx-72)},${f(lCy+24)} Z"
        fill="#fff5b0" opacity="0.055" filter="url(#softglow)"/>
  <!-- solarDisk() — the Fool's sun, enclosed: identical function call, identical colours -->
  ${solarDisk(lCx, lCy, diskR)}
  <!-- Hexagonal cage (drawn over the disk — the enclosing form, Virgo hiding the harvest) -->
  <path d="${hexPath}" fill="none" stroke="#bb9933" stroke-width="2.2" opacity="0.9"/>
  <!-- Cage cross-bars -->
  <line x1="${hexPts[0][0]}" y1="${hexPts[0][1]}" x2="${hexPts[3][0]}" y2="${hexPts[3][1]}"
        stroke="#bb9933" stroke-width="0.9" opacity="0.5"/>
  <line x1="${hexPts[1][0]}" y1="${hexPts[1][1]}" x2="${hexPts[4][0]}" y2="${hexPts[4][1]}"
        stroke="#bb9933" stroke-width="0.9" opacity="0.5"/>
  <line x1="${hexPts[2][0]}" y1="${hexPts[2][1]}" x2="${hexPts[5][0]}" y2="${hexPts[5][1]}"
        stroke="#bb9933" stroke-width="0.9" opacity="0.5"/>
  <!-- Handle -->
  <line x1="${lCx}" y1="${f(lCy-lR)}" x2="${lCx}" y2="${f(lCy-lR-7)}"
        stroke="#bb9933" stroke-width="1.5" opacity="0.75"/>
  <path d="M${f(lCx-5)},${f(lCy-lR-7)} Q${lCx},${f(lCy-lR-13)} ${f(lCx+5)},${f(lCy-lR-7)}"
        fill="none" stroke="#bb9933" stroke-width="1.5" opacity="0.7"/>`

  // ── Yod sparks — solarRayEndpoints() gives the exact same positions as card0's rays ──
  // The Fool's 16 outward rays become 16 falling Yod (י) seed-glyphs.
  // Same angular formula, same radii, same origin — different element, different direction.
  const yodSparks = solarRayEndpoints(lCx, lCy, diskR).map(({ x, y, major }) =>
    `<text x="${x}" y="${y}"
           text-anchor="middle" dominant-baseline="middle"
           font-family="'Times New Roman','FreeSerif',serif"
           font-size="${major ? 9 : 6.5}" fill="#ffee66"
           opacity="${major ? 0.62 : 0.38}">י</text>`
  ).join('\n  ')

  // ── Hermit figure — RIGHT side of card, facing LEFT ──
  // Mirror of The Fool: Fool is left-of-centre facing right; Hermit is right-of-centre facing left.
  const figX = 186, figY = 226
  const figure = `
  <!-- Long robes (olive-green, draping to ground) -->
  <path d="M${f(figX-16)},${f(figY+8)}
           Q${f(figX-20)},${f(figY+42)} ${f(figX-13)},${f(peakY)}
           Q${figX},${f(peakY+5)} ${f(figX+13)},${f(peakY)}
           Q${f(figX+18)},${f(figY+42)} ${f(figX+14)},${f(figY+8)}
           Q${figX},${f(figY+18)} ${f(figX-16)},${f(figY+8)} Z"
        fill="#293d12" opacity="0.9"/>
  <!-- Torso/chest -->
  <ellipse cx="${figX}" cy="${f(figY-4)}" rx="12" ry="15" fill="#2e4418" opacity="0.88"/>
  <!-- Cowl hood (drawn over head — the hidden Sun, Virgo concealing the harvest) -->
  <path d="M${f(figX-14)},${f(figY-18)}
           Q${f(figX-20)},${f(figY-50)} ${f(figX-5)},${f(figY-64)}
           Q${f(figX+8)},${f(figY-70)} ${f(figX+11)},${f(figY-52)}
           Q${f(figX+15)},${f(figY-28)} ${f(figX+12)},${f(figY-18)} Z"
        fill="#1d2d0c" opacity="0.92"/>
  <!-- Head (partially visible inside cowl) -->
  <circle cx="${f(figX-2)}" cy="${f(figY-46)}" r="11" fill="#a88050" opacity="0.6"/>
  <!-- Forward arm (figure's right, reaching leftward toward the lantern) -->
  <line x1="${f(figX-12)}" y1="${f(figY-6)}" x2="${f(lCx+lR+1)}" y2="${f(lCy+5)}"
        stroke="#2a3d12" stroke-width="8" stroke-linecap="round" opacity="0.88"/>
  <!-- Back arm (figure's left, reaching rightward-downward to grip the staff) -->
  <line x1="${f(figX+12)}" y1="${f(figY-2)}" x2="${f(figX+30)}" y2="${f(figY+40)}"
        stroke="#2a3d12" stroke-width="8" stroke-linecap="round" opacity="0.82"/>`

  // ── Staff ──
  const stX = figX + 32
  const staff = `
  <!-- Walking staff — tall, held behind (The Fool's wand grown into a pillar of experience) -->
  <line x1="${stX}" y1="${f(figY-50)}" x2="${stX}" y2="${f(peakY+4)}"
        stroke="#5a4420" stroke-width="4" stroke-linecap="round" opacity="0.84"/>
  <!-- Knob at top -->
  <circle cx="${stX}" cy="${f(figY-52)}" r="4" fill="#6a5222" opacity="0.78"/>
  <!-- Ferrule at base -->
  <ellipse cx="${stX}" cy="${f(peakY+4)}" rx="3" ry="2" fill="#8a6633" opacity="0.72"/>`

  // ── Cerberus — three-headed guardian at the Hermit's feet ──
  // Same lower-zone position as the small dog/crocodile in The Fool.
  // The instinct that followed the Fool naively now guards the threshold with three-fold wisdom.
  const cbX = figX + 30, cbY = peakY + 14
  const cerberus = `
  <!-- Body -->
  <ellipse cx="${cbX}" cy="${f(cbY+5)}" rx="18" ry="10" fill="#182808" opacity="0.84"/>
  <!-- Legs -->
  ${[-8, -2, 4, 10].map(dx =>
    `<line x1="${cbX+dx}" y1="${f(cbY+14)}" x2="${cbX+dx}" y2="${f(cbY+22)}"
           stroke="#182808" stroke-width="3.5" stroke-linecap="round" opacity="0.78"/>`
  ).join('\n  ')}
  <!-- Three necks -->
  <line x1="${f(cbX-6)}" y1="${f(cbY-4)}" x2="${f(cbX-14)}" y2="${f(cbY-16)}"
        stroke="#182808" stroke-width="5" stroke-linecap="round" opacity="0.84"/>
  <line x1="${cbX}" y1="${f(cbY-4)}" x2="${cbX}" y2="${f(cbY-18)}"
        stroke="#182808" stroke-width="5" stroke-linecap="round" opacity="0.84"/>
  <line x1="${f(cbX+6)}" y1="${f(cbY-4)}" x2="${f(cbX+14)}" y2="${f(cbY-16)}"
        stroke="#182808" stroke-width="5" stroke-linecap="round" opacity="0.84"/>
  <!-- Three heads -->
  <circle cx="${f(cbX-14)}" cy="${f(cbY-20)}" r="7" fill="#182808" opacity="0.84"/>
  <circle cx="${cbX}" cy="${f(cbY-22)}" r="7" fill="#182808" opacity="0.84"/>
  <circle cx="${f(cbX+14)}" cy="${f(cbY-20)}" r="7" fill="#182808" opacity="0.84"/>
  <!-- Six eyes — orange-gold (the thrice-watchful guardian) -->
  <circle cx="${f(cbX-16)}" cy="${f(cbY-21)}" r="1.5" fill="#cc6600" opacity="0.72"/>
  <circle cx="${f(cbX-12)}" cy="${f(cbY-21)}" r="1.5" fill="#cc6600" opacity="0.72"/>
  <circle cx="${f(cbX-2)}"  cy="${f(cbY-23)}" r="1.5" fill="#cc6600" opacity="0.72"/>
  <circle cx="${f(cbX+2)}"  cy="${f(cbY-23)}" r="1.5" fill="#cc6600" opacity="0.72"/>
  <circle cx="${f(cbX+12)}" cy="${f(cbY-21)}" r="1.5" fill="#cc6600" opacity="0.72"/>
  <circle cx="${f(cbX+16)}" cy="${f(cbY-21)}" r="1.5" fill="#cc6600" opacity="0.72"/>`

  // ── Wheat — Virgo, the harvest; the seed Yod descended into earth ──
  const wheat = `
  ${[252, 261, 269, 276].map((wx, i) => {
    const wTop = 304 + i * 4
    return `<line x1="${wx}" y1="${wTop}" x2="${wx}" y2="350"
               stroke="#8a7a22" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
<ellipse cx="${wx}" cy="${wTop}" rx="3" ry="7" fill="#a89430" opacity="0.52"/>`
  }).join('\n  ')}`

  const body = `
  ${yodBg}
  ${orphicEgg}
  ${mountains}
  ${pathSvg}
  ${lantern}
  <g>${yodSparks}</g>
  ${staff}
  ${figure}
  ${cerberus}
  ${wheat}`

  return majorCard({
    title: 'The Hermit', number: 'IX',
    hebrew: 'Yod · Virgo · Path 20',
    hebrewLetter: 'י', attribution: '♍',
    bg1: '#060a03', bg2: '#0d1606',
    border: '#334d1a', accent: '#66aa33',
    text: '#ccee88', dim: '#4a6a22',
    bodyContent: body,
  })
}

// ─── Card 10 — Fortune ───────────────────────────────────────────────────────
// Planet: Jupiter ♃  |  Kaph (כ)  |  Path 21: Chesed → Netzach
// King Scale: Violet
//
// The Wheel IS a loom: the spinning wheel of Fortune is simultaneously the frame
// on which the Moirae weave the fabric of fate. Kaph (palm of the hand) is every
// hand-action of the three Fates — Clotho's distaff, Lachesis's rod, Atropos's shears.
//
// Moirae ↔ Wheel figures (structural, not merely analogical):
//   Clotho  (Spinner / begins the thread)  = Hermanubis  (ascending right)
//   Lachesis (Measurer / holds the thread) = Sphinx       (stable at top)
//   Atropos  (Cutter  / ends the thread)   = Typhon/Set   (descending left)
//
// Visual programme:
//   • Warp threads clipped to wheel circle — loom fabric stretched across the frame
//   • Sparse weft cross-threads — the weave in progress
//   • Spindle at hub (the distaff of the Fates, unmoved while the wheel turns)
//   • Three figures as woven tapestry silhouettes (flat cross-hatch fill)
//   • YHVH (violet) + TORA (gold) letters on rim with thread-tail stitching marks
//   • One uncut thread trailing from Typhon/Atropos off the wheel toward lower-left
//   • Four Kerubic creatures in corners (Aquarius/Eagle/Taurus/Lion — the fixed frame)

function card10() {
  const wCx = 150, wCy = 208   // wheel centre
  const wOuter = 92             // outer rim radius
  const wInner = 76             // inner ring (letter track)
  const wFig   = 56             // figure track radius
  const wHub   = 13             // hub radius
  const ltrR   = 84             // letter radius (between wInner and wOuter)

  // Figure angular positions (SVG y-down: positive angle → clockwise)
  const spA = -Math.PI / 2          // Sphinx:     top         (−90°)
  const hA  = -Math.PI / 4          // Hermanubis: upper-right (−45°)
  const tA  =  Math.PI * 3 / 4      // Typhon:     lower-left  (135°)

  // Raw (unformatted) figure centre coordinates
  const spXr = wCx + wFig * Math.cos(spA)   // 150
  const spYr = wCy + wFig * Math.sin(spA)   // 152
  const hXr  = wCx + wFig * Math.cos(hA)    // ~190
  const hYr  = wCy + wFig * Math.sin(hA)    // ~168
  const tXr  = wCx + wFig * Math.cos(tA)    // ~110
  const tYr  = wCy + wFig * Math.sin(tA)    // ~248

  // ── Ghost Kaph (כ) ──
  const kaphBg = `
  <text x="152" y="226"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#330066" opacity="0.065">כ</text>`

  // ── Extra defs: clip path for warp threads ──
  const extraDefs = `
  <defs>
    <clipPath id="wheelClip">
      <circle cx="${wCx}" cy="${wCy}" r="${wOuter - 3}"/>
    </clipPath>
  </defs>`

  // ── Warp threads — loom fabric stretched across the wheel frame ──
  const warpThreads = `
  <!-- Warp threads (vertical, clipped to wheel): the loom fabric of fate in progress -->
  <g clip-path="url(#wheelClip)">
    ${Array.from({length: 17}, (_, i) => {
      const x = wCx - 96 + i * 12
      return `<line x1="${x}" y1="${f(wCy - wOuter)}" x2="${x}" y2="${f(wCy + wOuter)}"
               stroke="#7744aa" stroke-width="0.7" opacity="0.14"/>`
    }).join('\n    ')}
    <!-- Weft cross-threads (horizontal, sparse) — the weave binding the warp -->
    ${Array.from({length: 8}, (_, i) => {
      const y = wCy - 84 + i * 24
      return `<line x1="${f(wCx - wOuter)}" y1="${y}" x2="${f(wCx + wOuter)}" y2="${y}"
               stroke="#9966cc" stroke-width="0.5" stroke-dasharray="5 7" opacity="0.09"/>`
    }).join('\n    ')}
  </g>`

  // ── Wheel rim (loom frame) ──
  const rim = `
  <!-- Outer rim glow -->
  <circle cx="${wCx}" cy="${wCy}" r="${f(wOuter + 4)}"
          fill="none" stroke="#7744aa" stroke-width="4" opacity="0.09" filter="url(#softglow)"/>
  <!-- Outer rim — heavier stroke suggests loom frame rather than just a circle -->
  <circle cx="${wCx}" cy="${wCy}" r="${wOuter}"
          fill="none" stroke="#8855bb" stroke-width="5" opacity="0.88"/>
  <circle cx="${wCx}" cy="${wCy}" r="${f(wOuter - 5.5)}"
          fill="none" stroke="#6633aa" stroke-width="0.8" opacity="0.4"/>
  <!-- Inner rings -->
  <circle cx="${wCx}" cy="${wCy}" r="${wInner}"
          fill="none" stroke="#553388" stroke-width="0.8" opacity="0.32"/>
  <circle cx="${wCx}" cy="${wCy}" r="${wFig}"
          fill="none" stroke="#442277" stroke-width="0.7" opacity="0.25"/>`

  // ── 8 spokes ──
  const spokes = Array.from({length: 8}, (_, i) => {
    const a = (i * 45) * Math.PI / 180
    return `<line x1="${f(wCx + wHub * Math.cos(a))}" y1="${f(wCy + wHub * Math.sin(a))}"
               x2="${f(wCx + wOuter * Math.cos(a))}" y2="${f(wCy + wOuter * Math.sin(a))}"
               stroke="#7744aa" stroke-width="2" opacity="0.62"/>`
  }).join('\n  ')

  // ── Spindle at hub — the distaff of the Fates, the unmoved centre ──
  const spindle = `
  <!-- Hub -->
  <circle cx="${wCx}" cy="${wCy}" r="${wHub}"
          fill="#0e0420" stroke="#9966cc" stroke-width="1.8" opacity="0.92"/>
  <!-- Spindle lozenge (the distaff; the still point from which all threads radiate) -->
  <polygon points="${wCx},${f(wCy - wHub + 2)} ${f(wCx + 5)},${wCy} ${wCx},${f(wCy + wHub - 2)} ${f(wCx - 5)},${wCy}"
           fill="#cc99ff" opacity="0.75"/>
  <!-- Hub centre glow -->
  <circle cx="${wCx}" cy="${wCy}" r="${f(wHub * 0.45)}"
          fill="#cc99ff" opacity="0.25" filter="url(#softglow)"/>`

  // ── Thread lines from spindle to each figure ──
  // Atropos/Typhon's thread extends off the wheel — the soul currently in descent
  const threads = `
  <!-- Thread: spindle → Sphinx/Lachesis (the measuring thread, taut and held) -->
  <line x1="${wCx}" y1="${f(wCy - wHub)}"
        x2="${f(spXr)}" y2="${f(spYr + 9)}"
        stroke="#cc99ff" stroke-width="1" stroke-dasharray="3 4" opacity="0.42"/>
  <!-- Thread: spindle → Hermanubis/Clotho (the new thread being spun, rising) -->
  <line x1="${f(wCx + wHub * Math.cos(hA))}" y1="${f(wCy + wHub * Math.sin(hA))}"
        x2="${f(hXr)}" y2="${f(hYr + 12)}"
        stroke="#cc99ff" stroke-width="1" stroke-dasharray="3 4" opacity="0.42"/>
  <!-- Thread: spindle → Typhon/Atropos (the ending thread, descending) -->
  <line x1="${f(wCx + wHub * Math.cos(tA))}" y1="${f(wCy + wHub * Math.sin(tA))}"
        x2="${f(tXr)}" y2="${f(tYr - 12)}"
        stroke="#cc99ff" stroke-width="1" stroke-dasharray="3 4" opacity="0.42"/>
  <!-- Atropos's uncut thread — trailing off the wheel toward the lower-left -->
  <!-- The soul currently in descent; not yet severed -->
  <path d="M${f(tXr)},${f(tYr + 16)}
           Q${f(tXr - 14)},${f(tYr + 38)} ${f(tXr - 4)},${f(tYr + 60)}
           Q${f(tXr - 18)},${f(tYr + 80)} ${f(tXr - 8)},${f(tYr + 96)}"
        fill="none" stroke="#cc99ff" stroke-width="1.5" opacity="0.46"/>`

  // ── YHVH (violet) + TORA (gold) letters on rim with thread-tail stitching marks ──
  // YHVH at cardinal points; TORA at diagonals — 8 letters alternating
  function rimLetter(ch, angle, fill, tailC) {
    const lx = f(wCx + ltrR * Math.cos(angle))
    const ly = f(wCy + ltrR * Math.sin(angle))
    const t1x = f(wCx + ltrR * Math.cos(angle) + 7 * Math.cos(angle))
    const t1y = f(wCy + ltrR * Math.sin(angle) + 7 * Math.sin(angle))
    const t2x = f(wCx + ltrR * Math.cos(angle) + 6 * Math.cos(angle + Math.PI / 3))
    const t2y = f(wCy + ltrR * Math.sin(angle) + 6 * Math.sin(angle + Math.PI / 3))
    return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="13" fill="${fill}" opacity="0.92" filter="url(#glow)">${ch}</text>
  <line x1="${lx}" y1="${ly}" x2="${t1x}" y2="${t1y}"
        stroke="${tailC}" stroke-width="0.9" opacity="0.52"/>
  <line x1="${lx}" y1="${ly}" x2="${t2x}" y2="${t2y}"
        stroke="${tailC}" stroke-width="0.9" opacity="0.44"/>`
  }

  // YHVH at 0°/90°/180°/270° (top=−90°, right=0°, bottom=90°, left=180°)
  const yhvhSvg = ['י','ה','ו','ה'].map((ch, i) =>
    rimLetter(ch, (i * 90 - 90) * Math.PI / 180, '#ddaaff', '#bb88ff')
  ).join('\n  ')

  // TORA at −45°/45°/135°/225° (upper-right, lower-right, lower-left, upper-left)
  const toraSvg = ['ת','ו','ר','א'].map((ch, i) =>
    rimLetter(ch, (i * 90 - 45) * Math.PI / 180, '#ffddaa', '#ddbb88')
  ).join('\n  ')

  // ── Three woven figures ──
  // Each is a flat tapestry silhouette: outline + diagonal cross-hatch fill
  // suggesting woven fabric rather than modelled form.

  // Sphinx (spXr=150, spYr=152) — Lachesis, the Measurer
  // Recumbent lion body, human head with nemes, crowned — the stable pivot
  const sphinxFig = `
  <!-- Sphinx — Lachesis (Measurer) — the still point of wisdom; taut, unwavering -->
  <!-- Body (recumbent) -->
  <ellipse cx="${f(spXr + 6)}" cy="${f(spYr + 7)}" rx="16" ry="8"
           fill="#1a0838" stroke="#9966cc" stroke-width="1.2" opacity="0.9"/>
  <!-- Woven cross-hatch on body -->
  <line x1="${f(spXr - 8)}" y1="${f(spYr + 2)}" x2="${f(spXr + 8)}" y2="${f(spYr + 12)}"
        stroke="#9966cc" stroke-width="0.6" opacity="0.38"/>
  <line x1="${f(spXr - 3)}" y1="${f(spYr)}" x2="${f(spXr + 13)}" y2="${f(spYr + 10)}"
        stroke="#9966cc" stroke-width="0.6" opacity="0.32"/>
  <line x1="${f(spXr + 2)}" y1="${f(spYr - 2)}" x2="${f(spXr + 18)}" y2="${f(spYr + 8)}"
        stroke="#9966cc" stroke-width="0.6" opacity="0.28"/>
  <!-- Human head -->
  <circle cx="${f(spXr + 18)}" cy="${f(spYr - 2)}" r="8"
          fill="#1a0838" stroke="#9966cc" stroke-width="1.2" opacity="0.9"/>
  <!-- Nemes headdress sides -->
  <path d="M${f(spXr + 13)},${f(spYr + 4)} Q${f(spXr + 8)},${f(spYr + 12)} ${f(spXr + 11)},${f(spYr + 17)}"
        fill="none" stroke="#8855bb" stroke-width="1.5" opacity="0.6"/>
  <path d="M${f(spXr + 23)},${f(spYr + 4)} Q${f(spXr + 28)},${f(spYr + 10)} ${f(spXr + 26)},${f(spYr + 16)}"
        fill="none" stroke="#8855bb" stroke-width="1.5" opacity="0.6"/>`

  // Hermanubis (hXr≈190, hYr≈168) — Clotho, the Spinner
  // Jackal-headed, ascending, holds caduceus aloft — beginning of the thread
  const hermaFig = `
  <!-- Hermanubis — Clotho (Spinner) — ascending, the thread of new life in hand -->
  <!-- Body (ascending upward-right) -->
  <ellipse cx="${f(hXr)}" cy="${f(hYr)}" rx="8" ry="14"
           fill="#1a0838" stroke="#8855bb" stroke-width="1.2" opacity="0.9"/>
  <!-- Woven texture -->
  <line x1="${f(hXr - 6)}" y1="${f(hYr - 10)}" x2="${f(hXr + 6)}" y2="${f(hYr + 4)}"
        stroke="#8855bb" stroke-width="0.6" opacity="0.4"/>
  <line x1="${f(hXr - 6)}" y1="${f(hYr - 4)}" x2="${f(hXr + 6)}" y2="${f(hYr + 10)}"
        stroke="#8855bb" stroke-width="0.6" opacity="0.35"/>
  <!-- Jackal head -->
  <ellipse cx="${f(hXr)}" cy="${f(hYr - 20)}" rx="7" ry="8"
           fill="#1a0838" stroke="#8855bb" stroke-width="1.2" opacity="0.9"/>
  <!-- Pointed ears -->
  <path d="M${f(hXr - 4)},${f(hYr - 26)} L${f(hXr - 7)},${f(hYr - 35)} L${f(hXr)},${f(hYr - 27)}"
        fill="#553388" opacity="0.78"/>
  <path d="M${f(hXr + 4)},${f(hYr - 26)} L${f(hXr + 7)},${f(hYr - 35)} L${f(hXr)},${f(hYr - 27)}"
        fill="#553388" opacity="0.78"/>
  <!-- Arm raised (ascending gesture — Clotho lifting the new thread) -->
  <line x1="${f(hXr - 7)}" y1="${f(hYr - 6)}" x2="${f(hXr - 20)}" y2="${f(hYr - 22)}"
        stroke="#8855bb" stroke-width="5" stroke-linecap="round" opacity="0.82"/>
  <!-- Caduceus/rod aloft (Hermes as divine initiator) -->
  <line x1="${f(hXr - 20)}" y1="${f(hYr - 22)}" x2="${f(hXr - 20)}" y2="${f(hYr - 38)}"
        stroke="#aa77dd" stroke-width="1.8" stroke-linecap="round" opacity="0.72"/>
  <line x1="${f(hXr - 26)}" y1="${f(hYr - 30)}" x2="${f(hXr - 14)}" y2="${f(hYr - 30)}"
        stroke="#aa77dd" stroke-width="1.5" opacity="0.65"/>`

  // Typhon/Set (tXr≈110, tYr≈248) — Atropos, the Cutter
  // Serpentine, descending, chthonic — Atropos does not turn aside
  const typhonFig = `
  <!-- Typhon/Set — Atropos (Cutter) — descending; the ending that cannot be refused -->
  <!-- Serpentine body (S-curve) — woven pattern as scales -->
  <path d="M${f(tXr)},${f(tYr - 20)} C${f(tXr - 14)},${f(tYr - 8)} ${f(tXr + 12)},${f(tYr + 6)} ${f(tXr)},${f(tYr + 20)}"
        fill="none" stroke="#5511aa" stroke-width="12" stroke-linecap="round" opacity="0.84"/>
  <!-- Scale/weave texture overlay on body -->
  <path d="M${f(tXr)},${f(tYr - 20)} C${f(tXr - 14)},${f(tYr - 8)} ${f(tXr + 12)},${f(tYr + 6)} ${f(tXr)},${f(tYr + 20)}"
        fill="none" stroke="#9944cc" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.52"/>
  <!-- Monster head -->
  <ellipse cx="${f(tXr)}" cy="${f(tYr - 25)}" rx="8" ry="6.5"
           fill="#220044" stroke="#7722bb" stroke-width="1.2" opacity="0.92"/>
  <!-- Horns -->
  <path d="M${f(tXr - 6)},${f(tYr - 29)} L${f(tXr - 11)},${f(tYr - 37)} L${f(tXr - 3)},${f(tYr - 29)}"
        fill="#550088" opacity="0.78"/>
  <path d="M${f(tXr + 6)},${f(tYr - 29)} L${f(tXr + 11)},${f(tYr - 37)} L${f(tXr + 3)},${f(tYr - 29)}"
        fill="#550088" opacity="0.78"/>
  <!-- Set's distinctive eye (the eye that sees what ends) -->
  <ellipse cx="${f(tXr - 2)}" cy="${f(tYr - 26)}" rx="3" ry="2" fill="#ff0077" opacity="0.68"/>
  <!-- Claws extending outward (grasping, but also releasing) -->
  <line x1="${f(tXr + 5)}" y1="${f(tYr - 6)}" x2="${f(tXr + 20)}" y2="${f(tYr - 16)}"
        stroke="#5511aa" stroke-width="3.5" stroke-linecap="round" opacity="0.75"/>
  <line x1="${f(tXr - 5)}" y1="${f(tYr + 6)}" x2="${f(tXr - 20)}" y2="${f(tYr - 2)}"
        stroke="#5511aa" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>`

  // ── Four Kerubic creatures — the fixed corners that frame the turning wheel ──
  function kerub(cx, cy, type) {
    if (type === 'man') return `<g opacity="0.72">
    <circle cx="${cx}" cy="${f(cy-10)}" r="7" fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <rect x="${f(cx-6)}" y="${f(cy-3)}" width="12" height="14" rx="2"
          fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <path d="M${f(cx-6)},${f(cy-1)} C${f(cx-17)},${f(cy-11)} ${f(cx-19)},${f(cy+3)} ${f(cx-11)},${f(cy+8)}"
          fill="#2a0848" opacity="0.72"/>
    <path d="M${f(cx+6)},${f(cy-1)} C${f(cx+17)},${f(cy-11)} ${f(cx+19)},${f(cy+3)} ${f(cx+11)},${f(cy+8)}"
          fill="#2a0848" opacity="0.72"/>
    <rect x="${f(cx-5)}" y="${f(cy+10)}" width="10" height="7" rx="1" fill="#553388" opacity="0.8"/>
  </g>`
    if (type === 'eagle') return `<g opacity="0.72">
    <circle cx="${cx}" cy="${f(cy-11)}" r="7" fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <path d="M${f(cx+4)},${f(cy-13)} L${f(cx+13)},${f(cy-9)} L${f(cx+5)},${f(cy-8)}"
          fill="#7744aa" opacity="0.82"/>
    <ellipse cx="${cx}" cy="${f(cy+4)}" rx="9" ry="11" fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <path d="M${f(cx-9)},${f(cy+2)} C${f(cx-23)},${f(cy-9)} ${f(cx-24)},${f(cy+6)} ${f(cx-13)},${f(cy+12)}"
          fill="#1e0640" stroke="#7744aa" stroke-width="0.8"/>
    <path d="M${f(cx+9)},${f(cy+2)} C${f(cx+23)},${f(cy-9)} ${f(cx+24)},${f(cy+6)} ${f(cx+13)},${f(cy+12)}"
          fill="#1e0640" stroke="#7744aa" stroke-width="0.8"/>
  </g>`
    if (type === 'bull') return `<g opacity="0.72">
    <circle cx="${cx}" cy="${f(cy-8)}" r="9" fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <path d="M${f(cx-7)},${f(cy-15)} C${f(cx-13)},${f(cy-26)} ${f(cx-5)},${f(cy-29)} ${f(cx-3)},${f(cy-19)}"
          fill="none" stroke="#9966cc" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M${f(cx+7)},${f(cy-15)} C${f(cx+13)},${f(cy-26)} ${f(cx+5)},${f(cy-29)} ${f(cx+3)},${f(cy-19)}"
          fill="none" stroke="#9966cc" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${f(cy+6)}" rx="10" ry="11" fill="#180430" stroke="#7744aa" stroke-width="1"/>
  </g>`
    // lion
    return `<g opacity="0.72">
    <circle cx="${cx}" cy="${f(cy-8)}" r="11" fill="#1e0640" stroke="#7744aa" stroke-width="0.8" opacity="0.7"/>
    <circle cx="${cx}" cy="${f(cy-8)}" r="7" fill="#180430" stroke="#9966cc" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${f(cy+8)}" rx="9" ry="11" fill="#180430" stroke="#7744aa" stroke-width="1"/>
    <path d="M${f(cx+9)},${f(cy+10)} Q${f(cx+18)},${f(cy+4)} ${f(cx+15)},${f(cy-2)}"
          fill="none" stroke="#7744aa" stroke-width="2" stroke-linecap="round"/>
  </g>`
  }

  const body = `
  ${extraDefs}
  ${kaphBg}
  ${warpThreads}
  ${rim}
  ${spokes}
  ${yhvhSvg}
  ${toraSvg}
  ${threads}
  ${sphinxFig}
  ${hermaFig}
  ${typhonFig}
  ${spindle}
  <!-- Kerubic creatures — the four fixed signs anchoring the turning wheel -->
  ${kerub(38,  104, 'man')}
  ${kerub(262, 104, 'eagle')}
  ${kerub(38,  328, 'bull')}
  ${kerub(262, 328, 'lion')}`

  return majorCard({
    title: 'Fortune', number: 'X',
    hebrew: 'Kaph · Jupiter · Path 21',
    hebrewLetter: 'כ', attribution: '♃',
    bg1: '#08040e', bg2: '#120818',
    border: '#553388', accent: '#9966cc',
    text: '#ddaaff', dim: '#664488',
    bodyContent: body,
  })
}

// ─── Card 11 — LUST ───────────────────────────────────────────────────────────
// Sign: Leo ♌  |  Teth (ט) "serpent"  |  Path 19: Chesed → Geburah
// King Scale: Yellow-greenish, flecked gold  →  scarlet/night palette (solar fire interiorised)
//
// Crowley renamed Strength → Lust: not gentle mastery but ecstatic union of opposites.
// The Johannine Beast (Rev 13, 17): seven crowned heads, ten horns, scarlet draconic body,
// composite of the Daniellic four beasts (Dan 7) collapsed into one.
// Babalon rides the Beast — the Angel who shuts the lions' mouths (Dan 6) and the Scarlet Woman
// who inherits Babylon (Dan's own city) are the same figure at different scales.
// נרון קסר (Neron Qesar) = 666 — the most famous Gematria cipher in history proves that
// Babalon does not represent Nebuchadnezzar or Rome alone, but the tyrant archetype itself.
// The Hand writing on the Wall (Dan 5: מנא תקל) connects Daniellic numerology to Lust's
// eschatological register and threads the card to Adjustment's scales (the weighing).

function card11() {
  // ── Colour palette ──
  const bFill  = '#8b1a1a'   // Beast/Babalon scarlet — they share one nature, one fire
  const bDark  = '#5a0f0f'   // scale shadow
  const bGlow  = '#cc3333'   // Beast highlight
  const cGold  = '#cc9922'   // crown diadems
  const nGold  = '#ffcc44'   // nimbus / Grail gold — same palette as solarDisk
  const fireOr = '#ff8822'   // fire-letter orange (Hand on Wall)

  // ── Ghost Teth (ט) — the serpent within the composite creature ──
  const tethBg = `
  <text x="152" y="230"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="${bDark}" opacity="0.065">ט</text>`

  // ── Crown — small 3-point diadem (one per head; Revelation 17:3) ──
  function crown(cx, cy, w) {
    const h = w * 0.52, pt = w * 0.52
    return `<g>
    <rect x="${f(cx - w/2)}" y="${f(cy - h)}" width="${f(w)}" height="${f(h)}" rx="1"
          fill="${cGold}" opacity="0.78"/>
    <line x1="${f(cx - w/2 + 1)}" y1="${f(cy - h)}" x2="${f(cx - w/2 + 1)}" y2="${f(cy - h - pt*0.6)}"
          stroke="${cGold}" stroke-width="1.8" stroke-linecap="round" opacity="0.78"/>
    <line x1="${f(cx)}"           y1="${f(cy - h)}" x2="${f(cx)}"           y2="${f(cy - h - pt)}"
          stroke="${cGold}" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
    <line x1="${f(cx + w/2 - 1)}" y1="${f(cy - h)}" x2="${f(cx + w/2 - 1)}" y2="${f(cy - h - pt*0.6)}"
          stroke="${cGold}" stroke-width="1.8" stroke-linecap="round" opacity="0.78"/>
  </g>`
  }

  // ── Seven heads — fanned across upper card zone ──
  // Central (lion, Leo/Babylon):  cx=150, cy=116, r=16  ← primary attribution
  // Inner pair  (bear / leopard): cx=116/184, cy=110, r=12  ← Persia / Greece
  // Mid pair  (winged / serpent): cx=82/218,  cy=106, r=10  ← composite beasts (Dan 7)
  // Outer pair  (draconic):       cx=50/250,  cy=100, r=8   ← the terrible fourth beast
  //
  // Horn total: 2 on central + 1 on each of six flanking + 2 shoulder horns = 10 (Rev 13:1)
  // Each head bears a crown diadem (Rev 17:3 — diadems on the horns; artistically on heads)
  //
  // Necks connect each head base to the Beast body (bodyY=256), pulled 32% toward centre.

  const bodyY = 256

  function beastHead(hx, hy, hr, type) {
    // Neck — filled shape from head-base to body
    const bx  = hx + (150 - hx) * 0.32
    const nw  = hr * 0.55
    const neckSvg = `
    <path d="M${f(hx - nw)},${f(hy + hr*0.75)}
             Q${f((hx + bx)*0.5)},${f((hy + bodyY)*0.5)}
             ${f(bx - nw*0.6)},${bodyY}
             L${f(bx + nw*0.6)},${bodyY}
             Q${f((hx + bx)*0.5 + nw)},${f((hy + bodyY)*0.5)}
             ${f(hx + nw)},${f(hy + hr*0.75)} Z"
          fill="${bFill}" opacity="0.72"/>`

    // Horn(s) — 2 on central (lion), 1 outward on each flanking head
    const dir = hx <= 150 ? -1 : 1
    const hornSvg = type === 'lion'
      ? `
    <path d="M${f(hx - hr*0.45)},${f(hy - hr*0.65)}
             C${f(hx - hr*0.85)},${f(hy - hr*1.55)} ${f(hx - hr*0.55)},${f(hy - hr*2.1)} ${f(hx - hr*0.2)},${f(hy - hr*1.7)}"
          fill="${bFill}" stroke="${bGlow}" stroke-width="1.2" opacity="0.82"/>
    <path d="M${f(hx + hr*0.45)},${f(hy - hr*0.65)}
             C${f(hx + hr*0.85)},${f(hy - hr*1.55)} ${f(hx + hr*0.55)},${f(hy - hr*2.1)} ${f(hx + hr*0.2)},${f(hy - hr*1.7)}"
          fill="${bFill}" stroke="${bGlow}" stroke-width="1.2" opacity="0.82"/>`
      : `
    <path d="M${f(hx + dir*hr*0.35)},${f(hy - hr*0.65)}
             C${f(hx + dir*hr*1.1)},${f(hy - hr*1.4)} ${f(hx + dir*hr*0.85)},${f(hy - hr*2.0)} ${f(hx + dir*hr*0.4)},${f(hy - hr*1.7)}"
          fill="${bFill}" stroke="${bGlow}" stroke-width="1" opacity="0.75"/>`

    // Head base ellipse
    let headSvg = `
    <ellipse cx="${hx}" cy="${hy}" rx="${hr}" ry="${f(hr*0.88)}"
             fill="${bFill}" stroke="${bDark}" stroke-width="1.2" opacity="0.92"/>`

    if (type === 'lion') {
      headSvg += `
    <!-- Mane rings -->
    <circle cx="${hx}" cy="${hy}" r="${f(hr + 6)}" fill="none" stroke="${bGlow}" stroke-width="4" opacity="0.20"/>
    <circle cx="${hx}" cy="${hy}" r="${f(hr + 8)}" fill="none" stroke="${bGlow}" stroke-width="2" opacity="0.11"/>
    <!-- Snout -->
    <ellipse cx="${hx}" cy="${f(hy + 5)}" rx="${f(hr*0.42)}" ry="${f(hr*0.27)}" fill="${bDark}" opacity="0.58"/>
    <circle cx="${f(hx - 3)}" cy="${f(hy + 6)}" r="1.5" fill="#1a0000" opacity="0.7"/>
    <circle cx="${f(hx + 3)}" cy="${f(hy + 6)}" r="1.5" fill="#1a0000" opacity="0.7"/>
    <!-- Eyes (fierce) -->
    <ellipse cx="${f(hx - 6)}" cy="${f(hy - 2)}" rx="3.5" ry="2.5" fill="#1a0000" opacity="0.82"/>
    <ellipse cx="${f(hx + 6)}" cy="${f(hy - 2)}" rx="3.5" ry="2.5" fill="#1a0000" opacity="0.82"/>
    <circle cx="${f(hx - 6)}" cy="${f(hy - 2)}" r="1.5" fill="#ff8800" opacity="0.78"/>
    <circle cx="${f(hx + 6)}" cy="${f(hy - 2)}" r="1.5" fill="#ff8800" opacity="0.78"/>
    <!-- נרון קסר — blasphemous name (Rev 13:1) = Gematria 666: the cipher is on the Beast -->
    <text x="${hx}" y="${f(hy - 9)}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="'Times New Roman','FreeSerif',serif"
          font-size="4" fill="${nGold}" opacity="0.72">נרון קסר</text>`
    } else if (type === 'bear') {
      headSvg += `
    <rect x="${f(hx - hr)}" y="${f(hy - 3)}" width="${f(hr*2)}" height="3" rx="1" fill="${bDark}" opacity="0.4"/>
    <ellipse cx="${hx}" cy="${f(hy + 4)}" rx="${f(hr*0.48)}" ry="${f(hr*0.27)}" fill="${bDark}" opacity="0.5"/>
    <circle cx="${f(hx - 4)}" cy="${f(hy - 2)}" r="1.5" fill="#ff5500" opacity="0.65"/>
    <circle cx="${f(hx + 4)}" cy="${f(hy - 2)}" r="1.5" fill="#ff5500" opacity="0.65"/>`
    } else if (type === 'leopard') {
      headSvg += `
    <circle cx="${f(hx - 4)}" cy="${f(hy + 2)}" r="2"   fill="${bDark}" opacity="0.5"/>
    <circle cx="${f(hx + 4)}" cy="${f(hy + 2)}" r="2"   fill="${bDark}" opacity="0.5"/>
    <circle cx="${f(hx - 1)}" cy="${f(hy - 4)}" r="1.5" fill="${bDark}" opacity="0.4"/>
    <circle cx="${f(hx - 5)}" cy="${f(hy - 1)}" r="1.2" fill="#ff6600" opacity="0.6"/>
    <circle cx="${f(hx + 5)}" cy="${f(hy - 1)}" r="1.2" fill="#ff6600" opacity="0.6"/>`
    } else if (type === 'winged') {
      // Wing-stub hint on outward side
      headSvg += `
    <path d="M${f(hx - hr)},${hy} C${f(hx - hr - 9)},${f(hy - 9)} ${f(hx - hr - 6)},${f(hy + 4)} ${f(hx - hr + 2)},${f(hy + 4)}"
          fill="${bFill}" stroke="${bGlow}" stroke-width="0.8" opacity="0.52"/>
    <circle cx="${f(hx - 4)}" cy="${f(hy - 1)}" r="1.2" fill="${nGold}" opacity="0.62"/>
    <circle cx="${f(hx + 4)}" cy="${f(hy - 1)}" r="1.2" fill="${nGold}" opacity="0.62"/>`
    } else if (type === 'serpent') {
      // Slit pupils + forked tongue
      headSvg += `
    <ellipse cx="${f(hx - 4)}" cy="${f(hy - 1)}" rx="2.2" ry="3" fill="#110000" opacity="0.75"/>
    <ellipse cx="${f(hx + 4)}" cy="${f(hy - 1)}" rx="2.2" ry="3" fill="#110000" opacity="0.75"/>
    <rect x="${f(hx - 4.5)}" y="${f(hy - 3)}" width="1" height="4" rx="0.5" fill="#ff2200" opacity="0.55"/>
    <rect x="${f(hx + 3.5)}" y="${f(hy - 3)}" width="1" height="4" rx="0.5" fill="#ff2200" opacity="0.55"/>
    <path d="M${f(hx-1)},${f(hy+hr*0.62)} L${f(hx)},${f(hy+hr*0.9)} L${f(hx-3)},${f(hy+hr*1.12)}"
          fill="none" stroke="#ff2200" stroke-width="1" stroke-linecap="round" opacity="0.65"/>
    <path d="M${f(hx+1)},${f(hy+hr*0.62)} L${f(hx)},${f(hy+hr*0.9)} L${f(hx+3)},${f(hy+hr*1.12)}"
          fill="none" stroke="#ff2200" stroke-width="1" stroke-linecap="round" opacity="0.65"/>`
    } else { // dragon (outer pair — the terrible fourth beast of Daniel 7)
      headSvg += `
    <path d="M${f(hx - hr*0.6)},${f(hy + 3)} L${f(hx + hr*0.9)},${f(hy + 1)} L${f(hx + hr*0.6)},${f(hy + 5)} Z"
          fill="${bDark}" opacity="0.5"/>
    <circle cx="${f(hx - 3)}" cy="${f(hy - 2)}" r="1.2" fill="#ff4400" opacity="0.65"/>
    <circle cx="${f(hx + 2)}" cy="${f(hy - 2)}" r="1.2" fill="#ff4400" opacity="0.65"/>`
    }

    const crownY = hy - hr - (type === 'lion' ? 14 : 10)
    const crownW = hr * 1.3

    return `${neckSvg}
  ${hornSvg}
  ${headSvg}
  ${crown(hx, crownY, crownW)}`
  }

  // Draw outer heads first (back), central head last (front)
  const allHeads = `
  ${beastHead(50,  100, 8,  'dragon')}
  ${beastHead(250, 100, 8,  'dragon')}
  ${beastHead(82,  106, 10, 'winged')}
  ${beastHead(218, 106, 10, 'serpent')}
  ${beastHead(116, 110, 12, 'bear')}
  ${beastHead(184, 110, 12, 'leopard')}
  ${beastHead(150, 116, 16, 'lion')}`

  // ── Beast body — serpentine, scarlet, scaled (Rev 13:2: leopard body + bear feet + lion mouth) ──
  const beastBody = `
  <path d="M40,${bodyY} Q78,${f(bodyY-16)} 150,${f(bodyY-10)} Q222,${f(bodyY-16)} 260,${bodyY}
           Q282,${f(bodyY+30)} 272,302 Q252,334 218,342 Q188,348 150,346
           Q112,348 82,342 Q48,334 28,302 Q18,${f(bodyY+30)} 40,${bodyY} Z"
        fill="${bFill}" stroke="${bDark}" stroke-width="1.5" opacity="0.88"/>
  <!-- Scale texture — horizontal wave-courses -->
  ${Array.from({length: 7}, (_, i) => {
    const sy = bodyY + 8 + i * 14
    return `<path d="M48,${sy} Q100,${f(sy-5)} 150,${sy} Q200,${f(sy+5)} 252,${sy}"
          fill="none" stroke="${bDark}" stroke-width="0.7" opacity="0.45"/>`
  }).join('\n  ')}
  <!-- Scale texture — vertical striations -->
  ${Array.from({length: 8}, (_, i) => {
    const sx = 58 + i * 27
    return `<line x1="${sx}" y1="${bodyY}" x2="${f(sx - 6)}" y2="344"
          stroke="${bDark}" stroke-width="0.5" opacity="0.28"/>`
  }).join('\n  ')}
  <!-- Wing-stubs at shoulders (draconic — Rev 12:3: the great red dragon) -->
  <path d="M60,${f(bodyY+8)} C34,${f(bodyY-20)} 22,${f(bodyY+6)} 38,${f(bodyY+24)}"
        fill="${bFill}" stroke="${bGlow}" stroke-width="1.2" opacity="0.62"/>
  <path d="M240,${f(bodyY+8)} C266,${f(bodyY-20)} 278,${f(bodyY+6)} 262,${f(bodyY+24)}"
        fill="${bFill}" stroke="${bGlow}" stroke-width="1.2" opacity="0.62"/>
  <!-- Shoulder horns (9th and 10th of the ten horns — Rev 13:1) -->
  <path d="M58,${f(bodyY+4)} C42,${f(bodyY-18)} 48,${f(bodyY-30)} 62,${f(bodyY-18)}"
        fill="${bFill}" stroke="${bGlow}" stroke-width="1.5" opacity="0.78"/>
  <path d="M242,${f(bodyY+4)} C258,${f(bodyY-18)} 252,${f(bodyY-30)} 238,${f(bodyY-18)}"
        fill="${bFill}" stroke="${bGlow}" stroke-width="1.5" opacity="0.78"/>
  <!-- Coiling tail — exits lower-right (Rev 12:4: tail swept a third of the stars) -->
  <path d="M216,344 Q258,346 272,332 Q288,316 272,306 Q260,300 250,312"
        fill="none" stroke="${bFill}" stroke-width="13" stroke-linecap="round" opacity="0.80"/>
  <path d="M216,344 Q258,346 272,332 Q288,316 272,306 Q260,300 250,312"
        fill="none" stroke="${bDark}" stroke-width="1" opacity="0.5"/>
  <!-- מנא מנא תקל branded on the Beast's flank — the judgment written on the one judged (Dan 5) -->
  <!-- The curse becomes the Beast's credential: it has been weighed and found worthy of Babalon -->
  <text x="208" y="308"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="4.5" fill="${nGold}" opacity="0.52" transform="rotate(-7,208,308)">מנא מנא תקל</text>`

  // ── Babalon — astride the Beast's back, upper centre ──
  const babX = 150, babY2 = 214
  const babHY  = babY2 - 32   // head centre y = 182
  const grailX = babX + 24, grailY = babY2 - 26

  // Angelic nimbus — same solar palette as The Fool (free sky) and The Hermit (lantern).
  // She is the Angel who shuts lions' mouths (Dan 6) as much as she is the Scarlet Woman (Rev 17).
  const nimbus = `
  <!-- Babalon's angelic nimbus — same palette as solarDisk (The Fool / The Hermit) -->
  <circle cx="${babX}" cy="${babHY}" r="28" fill="#fffde0" opacity="0.07" filter="url(#softglow)"/>
  <circle cx="${babX}" cy="${babHY}" r="20" fill="#fffbe8" opacity="0.15" filter="url(#softglow)"/>
  <!-- Egyptian solar-disc ring — not a Christian halo; the same disc-fire that moves through all three -->
  <circle cx="${babX}" cy="${babHY}" r="17" fill="none" stroke="${nGold}" stroke-width="1.5" opacity="0.55"/>
  <circle cx="${babX}" cy="${babHY}" r="19" fill="none" stroke="#ffee88" stroke-width="0.6" opacity="0.30"/>`

  // Babalon's figure — scarlet = same fill as the Beast (one nature, one fire)
  const babalonFig = `
  <!-- Babalon — same scarlet as the Beast; Crowley: 'She and the Beast are one' -->
  <circle cx="${babX}" cy="${babHY}" r="10" fill="${bFill}" opacity="0.92"/>
  <ellipse cx="${babX}" cy="${babY2}" rx="11" ry="15" fill="${bFill}" opacity="0.88"/>
  <!-- Robe flowing (scarlet tide — same colour, confirming the unity of natures) -->
  <path d="M${f(babX-9)},${f(babY2-4)} C${f(babX-28)},${f(babY2+8)} ${f(babX-34)},${f(babY2+24)} ${f(babX-20)},${f(babY2+32)}"
        fill="#6e1414" opacity="0.70"/>
  <path d="M${f(babX+9)},${f(babY2-4)} C${f(babX+28)},${f(babY2+8)} ${f(babX+34)},${f(babY2+24)} ${f(babX+20)},${f(babY2+32)}"
        fill="#6e1414" opacity="0.70"/>
  <!-- Left arm — reins held with a light touch (not domination but joy — Crowley) -->
  <line x1="${f(babX-8)}" y1="${f(babY2-4)}" x2="${f(babX-26)}" y2="${f(babY2+10)}"
        stroke="${bFill}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
  <!-- Right arm — raised, bearing the Holy Grail aloft (same vessel as The Chariot's knight) -->
  <line x1="${f(babX+8)}" y1="${f(babY2-5)}" x2="${grailX}" y2="${f(grailY+10)}"
        stroke="${bFill}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`

  // Grail — same suitPip('cups') call as card7 (The Chariot).
  // The Chariot's knight carried it in quest; Babalon holds it in triumph.
  const grailGlow = `
  <!-- Grail: radiant within — the quintessence fills it (blood of saints = their distilled fire) -->
  <circle cx="${grailX}" cy="${f(grailY-10)}" r="16" fill="${nGold}" opacity="0.10" filter="url(#softglow)"/>
  <circle cx="${grailX}" cy="${f(grailY-10)}" r="9"  fill="${nGold}" opacity="0.22" filter="url(#softglow)"/>`
  const grailSvg = suitPip('cups', grailX, grailY, 20, nGold, 1.0)
  const drop = `
  <!-- A single drop falls from the Grail — grace descending; Daniel's gift reversed -->
  <path d="M${f(grailX-4)},${f(grailY-2)} Q${f(grailX-12)},${f(grailY+22)} ${f(grailX-20)},${f(grailY+44)}"
        fill="none" stroke="${nGold}" stroke-width="1.2" stroke-linecap="round" opacity="0.40"/>`

  // Reins — pale-fire threads from Babalon's left hand to each of the seven necks
  const reinX = babX - 26, reinY = babY2 + 10
  const reins = [
    { hx:50,  hy:100 }, { hx:250, hy:100 },
    { hx:82,  hy:106 }, { hx:218, hy:106 },
    { hx:116, hy:110 }, { hx:184, hy:110 },
    { hx:150, hy:116 },
  ].map(({ hx, hy }) =>
    `<path d="M${reinX},${reinY} Q${f((reinX+hx)*0.5)},${f((reinY+hy)*0.5 - 14)} ${hx},${f(hy+8)}"
          fill="none" stroke="#ffcc88" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.28"/>`
  ).join('\n  ')

  // ── Hand on the Wall — upper-left, Daniel 5 (Belshazzar's feast / the night Babylon fell) ──
  const wx = 18, wy = 78
  const handOnWall = `
  <!-- Stone wall — Belshazzar's feast; the handwriting that proved divine judgment is numerological -->
  <rect x="${wx}" y="${wy}" width="80" height="60" rx="2"
        fill="#0c0616" stroke="#221030" stroke-width="0.8" opacity="0.85"/>
  <!-- Stone block courses -->
  <line x1="${wx}"      y1="${f(wy+20)}" x2="${f(wx+80)}" y2="${f(wy+20)}" stroke="#180a28" stroke-width="0.8" opacity="0.55"/>
  <line x1="${wx}"      y1="${f(wy+40)}" x2="${f(wx+80)}" y2="${f(wy+40)}" stroke="#180a28" stroke-width="0.8" opacity="0.55"/>
  <line x1="${f(wx+42)}" y1="${wy}"       x2="${f(wx+42)}" y2="${f(wy+20)}" stroke="#180a28" stroke-width="0.8" opacity="0.45"/>
  <line x1="${f(wx+22)}" y1="${f(wy+20)}" x2="${f(wx+22)}" y2="${f(wy+40)}" stroke="#180a28" stroke-width="0.8" opacity="0.45"/>
  <line x1="${f(wx+60)}" y1="${f(wy+20)}" x2="${f(wx+60)}" y2="${f(wy+40)}" stroke="#180a28" stroke-width="0.8" opacity="0.45"/>
  <line x1="${f(wx+32)}" y1="${f(wy+40)}" x2="${f(wx+32)}" y2="${f(wy+60)}" stroke="#180a28" stroke-width="0.8" opacity="0.45"/>
  <!-- Disembodied hand — the Angel's instrument; pale amber, writing in fire -->
  <path d="M${f(wx+50)},${f(wy+36)}
           Q${f(wx+58)},${f(wy+28)} ${f(wx+60)},${f(wy+19)}
           Q${f(wx+58)},${f(wy+11)} ${f(wx+50)},${f(wy+12)}
           Q${f(wx+42)},${f(wy+11)} ${f(wx+40)},${f(wy+19)}
           Q${f(wx+40)},${f(wy+30)} ${f(wx+50)},${f(wy+36)} Z"
        fill="none" stroke="#cc9944" stroke-width="0.9" opacity="0.52"/>
  <line x1="${f(wx+46)}" y1="${f(wy+36)}" x2="${f(wx+46)}" y2="${f(wy+50)}"
        stroke="#cc9944" stroke-width="3" stroke-linecap="round" opacity="0.38"/>
  <!-- Fingers pointing toward the letters -->
  <path d="M${f(wx+40)},${f(wy+15)} L${f(wx+32)},${f(wy+9)}"  stroke="#cc9944" stroke-width="0.8" stroke-linecap="round" opacity="0.48"/>
  <path d="M${f(wx+43)},${f(wy+13)} L${f(wx+38)},${f(wy+6)}"  stroke="#cc9944" stroke-width="0.8" stroke-linecap="round" opacity="0.48"/>
  <path d="M${f(wx+47)},${f(wy+12)} L${f(wx+44)},${f(wy+5)}"  stroke="#cc9944" stroke-width="0.8" stroke-linecap="round" opacity="0.42"/>
  <!-- מנא תקל in fire — Mene Tekel (Dan 5:25): the weighing; threads to Adjustment's scales -->
  <text x="${f(wx+16)}" y="${f(wy+54)}"
        text-anchor="start" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="9" fill="${fireOr}" opacity="0.84" filter="url(#glow)">מנא תקל</text>`

  // ── Leo ♌ and 666 — lower centre, between the Beast's forepaws ──
  const leoAnd666 = `
  <!-- Leo ♌ — the solar sign; Leo is Babylon, Daniel reads its handwriting -->
  <text x="150" y="330"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols','DejaVu Sans',sans-serif"
        font-size="14" fill="${cGold}" opacity="0.84" filter="url(#glow)">♌</text>
  <!-- תרסו (666) — Gematria of נרון קסר (Neron Qesar = Nero Caesar)
       The tyrant archetype made a number: Nebuchadnezzar, Nero, any Caesar.
       The card's hidden signature; Daniel's cipher tradition made explicit. -->
  <text x="150" y="343"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="7.5" fill="${cGold}" opacity="0.65" letter-spacing="1">תרסו</text>`

  // ── Kerubic creatures in corners ──
  // Ezekielian living creatures / Daniellic four beasts of empire /
  // the four who frame every theophany and watch over the wheel of history
  function kerub(cx, cy, type) {
    const sc = '#772233', bg = '#120206', acc = '#aa3344'
    if (type === 'man') return `<g opacity="0.60">
    <circle cx="${cx}" cy="${f(cy-10)}" r="6" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <rect x="${f(cx-5)}" y="${f(cy-4)}" width="10" height="12" rx="2" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <path d="M${f(cx-5)},${f(cy-2)} C${f(cx-14)},${f(cy-10)} ${f(cx-16)},${f(cy+2)} ${f(cx-9)},${f(cy+7)}" fill="#1e0408" opacity="0.7"/>
    <path d="M${f(cx+5)},${f(cy-2)} C${f(cx+14)},${f(cy-10)} ${f(cx+16)},${f(cy+2)} ${f(cx+9)},${f(cy+7)}" fill="#1e0408" opacity="0.7"/>
  </g>`
    if (type === 'eagle') return `<g opacity="0.60">
    <circle cx="${cx}" cy="${f(cy-10)}" r="6" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <path d="M${f(cx+3)},${f(cy-12)} L${f(cx+11)},${f(cy-8)} L${f(cx+4)},${f(cy-7)}" fill="${sc}" opacity="0.8"/>
    <ellipse cx="${cx}" cy="${f(cy+4)}" rx="8" ry="10" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <path d="M${f(cx-8)},${f(cy+2)} C${f(cx-20)},${f(cy-7)} ${f(cx-21)},${f(cy+5)} ${f(cx-12)},${f(cy+11)}" fill="#1a0408" stroke="${sc}" stroke-width="0.7"/>
    <path d="M${f(cx+8)},${f(cy+2)} C${f(cx+20)},${f(cy-7)} ${f(cx+21)},${f(cy+5)} ${f(cx+12)},${f(cy+11)}" fill="#1a0408" stroke="${sc}" stroke-width="0.7"/>
  </g>`
    if (type === 'bull') return `<g opacity="0.60">
    <circle cx="${cx}" cy="${f(cy-7)}" r="8" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <path d="M${f(cx-6)},${f(cy-13)} C${f(cx-12)},${f(cy-24)} ${f(cx-4)},${f(cy-27)} ${f(cx-2)},${f(cy-17)}" fill="none" stroke="${acc}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M${f(cx+6)},${f(cy-13)} C${f(cx+12)},${f(cy-24)} ${f(cx+4)},${f(cy-27)} ${f(cx+2)},${f(cy-17)}" fill="none" stroke="${acc}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${f(cy+6)}" rx="9" ry="10" fill="${bg}" stroke="${sc}" stroke-width="1"/>
  </g>`
    return `<g opacity="0.60"> <!-- lion -->
    <circle cx="${cx}" cy="${f(cy-7)}" r="10" fill="#1e0408" stroke="${sc}" stroke-width="0.8" opacity="0.7"/>
    <circle cx="${cx}" cy="${f(cy-7)}" r="6"  fill="${bg}" stroke="${acc}" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${f(cy+7)}" rx="8" ry="10" fill="${bg}" stroke="${sc}" stroke-width="1"/>
    <path d="M${f(cx+8)},${f(cy+9)} Q${f(cx+16)},${f(cy+3)} ${f(cx+13)},${f(cy-2)}"
          fill="none" stroke="${sc}" stroke-width="2" stroke-linecap="round"/>
  </g>`
  }

  const bodyContent = `
  ${tethBg}
  ${handOnWall}
  ${beastBody}
  ${allHeads}
  ${nimbus}
  ${babalonFig}
  ${grailGlow}
  ${grailSvg}
  ${drop}
  ${reins}
  ${leoAnd666}
  <!-- Kerubic creatures — Ezekielian living creatures; the four Daniellic beasts of empire -->
  ${kerub(26,  102, 'man')}
  ${kerub(274, 102, 'eagle')}
  ${kerub(34,  330, 'bull')}
  ${kerub(266, 330, 'lion')}`

  return majorCard({
    title: 'LUST', number: 'XI',
    hebrew: 'Teth · Leo · Path 19',
    hebrewLetter: 'ט', attribution: '♌',
    bg1: '#04020e', bg2: '#0a0618',
    border: '#661111', accent: '#cc3333',
    text: '#ffcc88', dim: '#774422',
    bodyContent,
  })
}

// ─── Card 12 — THE HANGED MAN ─────────────────────────────────────────────────
// Element: Water  |  Mem (מ) "water"  |  Path 23: Geburah → Hod
// King Scale: Deep Blue
//
// Harris's painting is possibly the most explicitly Christian card in tarot history.
// The figure hangs INVERTED from an Ankh (☥ = crux ansata — adopted by Coptic Christianity
// as the cross that pre-figured the Cross). THREE NAILS: two through hands at the crossbar,
// one through both feet at the stem — the Western Catholic three-nail Passion form.
// The NEHUSHTAN (Brass Serpent, Num 21:8-9) is raised on the stem below the figure.
// John 3:14 makes the typological chain explicit: "As Moses lifted up the snake, so the
// Son of Man must be lifted up." The wound raised as medicine; looking upon it heals.
//
// The WILLING nature is encoded in three ways:
//  1. Open palms (orans gesture through the nails — Byzantine Crucifixion iconography)
//  2. Halo rays directed downward (kenosis — Phil 2:7; the deliberate self-emptying)
//  3. Grain of wheat at the threshold (John 12:24 — "unless a kernel dies...")
//
// The BORROWED TOMB at the card's base encodes the willing facing of Death that opens
// into card XIII. It is open, luminous inside (the empty tomb glows with the same light
// the figure carries — the light does not die). The grain lies at its threshold.
// After this card, no human protagonist appears in the remaining major arcana.
// What enters the tomb as an individual emerges as something else.
//
// Compositional cascade (top → bottom = the argument):
//   Ankh loop (life chosen as instrument)
//   → Figure suspended (willing act)
//   → Open palms (kenosis — the gift of self)
//   → Nehushtan (wound raised as medicine; Teth-serpent of Lust, elevated)
//   → Downward halo rays (light poured into the Abyss)
//   → Grain at the stem base (sown into death; John 12:24)
//   → Rock-cut tomb, ajar, luminous (the borrowed chrysalis; last door)
//   → Water of the Abyss (Mem; baptism — "buried with him" Rom 6:4)

function card12() {
  // ── Colour palette ──
  const ankh   = '#c8a830'   // Ankh gold — life/eternity/crux ansata
  const fig    = '#1a2a5a'   // Figure: deep indigo-blue (Water element, the Abyss)
  const figMid = '#2a3a7a'   // Figure mid-tone (palms, face)
  const nail   = '#7a6030'   // Nail: iron/brass — the chosen wound
  const bronze = '#a87830'   // Nehushtan: brass serpent
  const stone  = '#141420'   // Tomb rock
  const stoneL = '#0a0a14'   // Rock shadow/crack lines
  const waveC  = '#0a1428'   // Deep Mem-water

  // Key vertical coordinates — documented so the cascade can be read in the data
  const loopCY     = 96      // Ankh loop centre y
  const loopRX     = 24      // Ankh loop rx
  const loopRY     = 17      // Ankh loop ry → bottom at y=113
  const crossY     = 190     // Ankh crossbar y = figure shoulder y = hand nails y
  const stemBottom = 322     // Stem ends here — rooted through rock into tomb
  const footNailY  = loopCY + loopRY   // = 113: foot nail at loop-bottom / stem-top
  const hipY       = 162     // Figure hip y
  const headCY     = 213     // Figure head centre y (inverted — crown points downward)
  const haloCY     = headCY + 14       // = 227: halo centre (below inverted head)
  const haloDiskR  = 12      // Halo inner disk radius (same proportions as prior cards)
  const nehustanY  = Math.round(haloCY + haloDiskR * 2.17 + 4)  // = 257: Nehushtan top
  const grainY     = 296     // Grain of wheat y (just above rock)
  const rockY      = 302     // Rock surface y
  const archCY     = 322     // Tomb arch centre y (apex = archCY - archRY = rockY ✓)
  const archRX     = 22      // Tomb arch half-width
  const archRY     = 20      // Tomb arch height (apex at rockY)
  const tombBottom = 345     // Tomb base y

  // ── Ghost Mem (מ) — the water that is this path ──
  const memBg = `
  <text x="152" y="224"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#020c20" opacity="0.12">מ</text>`

  // ── Ankh — gold crux ansata; the instrument chosen, simultaneously life and cross ──
  const ankhSvg = `
  <!-- Ankh (☥) — crux ansata; the cross that pre-figures the Cross (Coptic adoption) -->
  <!-- Glow halos -->
  <line x1="150" y1="${loopCY - loopRY}" x2="150" y2="${stemBottom}"
        stroke="${ankh}" stroke-width="14" opacity="0.06" filter="url(#softglow)"/>
  <line x1="104" y1="${crossY}" x2="196" y2="${crossY}"
        stroke="${ankh}" stroke-width="12" opacity="0.06" filter="url(#softglow)"/>
  <!-- Stem — rooted through the rock into the tomb; the life-symbol planted in death -->
  <line x1="150" y1="${loopCY}" x2="150" y2="${stemBottom}"
        stroke="${ankh}" stroke-width="3.5" stroke-linecap="round" opacity="0.88"/>
  <!-- Crossbar — the crucifix arm; hand nails here -->
  <line x1="104" y1="${crossY}" x2="196" y2="${crossY}"
        stroke="${ankh}" stroke-width="3.5" stroke-linecap="round" opacity="0.88"/>
  <!-- Loop (oval) — the handle of the crux ansata; also the O of eternity -->
  <ellipse cx="150" cy="${loopCY}" rx="${loopRX}" ry="${loopRY}"
           fill="none" stroke="${ankh}" stroke-width="3.5" opacity="0.90"/>
  <ellipse cx="150" cy="${loopCY}" rx="${f(loopRX + 4)}" ry="${f(loopRY + 4)}"
           fill="none" stroke="${ankh}" stroke-width="1.2" opacity="0.20" filter="url(#glow)"/>`

  // ── Three Nails — iron/brass; the Catholic three-nail Passion form ──
  // Two in hands (at crossbar ends), one through both feet (at stem below loop).
  // Harris chose this over the earlier four-nail tradition: more theologically loaded.
  const nailsSvg = `
  <!-- Nail through foot — at stem just below loop (foot nail = one of three) -->
  <circle cx="150" cy="${footNailY}" r="4.5" fill="${nail}" opacity="0.90"/>
  <circle cx="150" cy="${footNailY}" r="2"   fill="#3a2a10" opacity="0.75"/>
  <!-- Nail through left hand — at left end of crossbar -->
  <circle cx="104" cy="${crossY}" r="4" fill="${nail}" opacity="0.88"/>
  <circle cx="104" cy="${crossY}" r="1.8" fill="#3a2a10" opacity="0.70"/>
  <!-- Nail through right hand — at right end of crossbar (mirror, deliberate symmetry) -->
  <circle cx="196" cy="${crossY}" r="4" fill="${nail}" opacity="0.88"/>
  <circle cx="196" cy="${crossY}" r="1.8" fill="#3a2a10" opacity="0.70"/>`

  // ── Figure — inverted, deep indigo; the last human protagonist in the Tarot ──
  // Feet at top (y=113, nailed), body descending to inverted head at y=213.
  // Arms extended along crossbar (y=190). One leg straight, one bent (classic Hanged Man).
  // OPEN PALMS facing outward: the orans gesture through the nails.
  //   Forced crucifixion → clenched hands. Chosen sacrifice → open offering.
  //   Byzantine/Orthodox iconography uses this to mark the theological Passion.
  const figureSvg = `
  <!-- Figure — Water-element deep indigo; last human figure in the major arcana journey -->
  <!-- Right leg straight (nailed foot) -->
  <line x1="150" y1="${footNailY}" x2="148" y2="${f(hipY - 18)}"
        stroke="${fig}" stroke-width="9" stroke-linecap="round" opacity="0.88"/>
  <!-- Left leg bent at knee (Hanged Man posture — free leg crosses behind) -->
  <line x1="150" y1="${footNailY}" x2="162" y2="${f(footNailY + 20)}"
        stroke="${fig}" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  <line x1="162" y1="${f(footNailY + 20)}" x2="170" y2="${f(hipY - 8)}"
        stroke="${fig}" stroke-width="8" stroke-linecap="round" opacity="0.82"/>
  <!-- Hip -->
  <ellipse cx="150" cy="${hipY}" rx="10" ry="7" fill="${fig}" opacity="0.86"/>
  <!-- Torso -->
  <ellipse cx="150" cy="${f((hipY + crossY) / 2)}" rx="11" ry="${f((crossY - hipY) / 2 + 1)}"
           fill="${fig}" opacity="0.88"/>
  <!-- Left arm along crossbar — open palm at end (orans through the nail) -->
  <line x1="139" y1="${crossY}" x2="106" y2="${crossY}"
        stroke="${fig}" stroke-width="9" stroke-linecap="round" opacity="0.88"/>
  <!-- Right arm — mirror -->
  <line x1="161" y1="${crossY}" x2="194" y2="${crossY}"
        stroke="${fig}" stroke-width="9" stroke-linecap="round" opacity="0.88"/>
  <!-- Left open palm — ellipse oriented outward: not clenched, offered -->
  <ellipse cx="104" cy="${crossY}" rx="5.5" ry="3.5" fill="${figMid}" opacity="0.80"/>
  <!-- Right open palm -->
  <ellipse cx="196" cy="${crossY}" rx="5.5" ry="3.5" fill="${figMid}" opacity="0.80"/>
  <!-- Neck -->
  <line x1="150" y1="${crossY}" x2="150" y2="${f(headCY - 12)}"
        stroke="${fig}" stroke-width="8" stroke-linecap="round" opacity="0.88"/>
  <!-- Head — inverted; crown of head points toward the tomb below -->
  <circle cx="150" cy="${headCY}" r="12" fill="${fig}" opacity="0.90"/>
  <!-- Face: serene, eyes open — no agony; the Hanged Man contemplates, does not struggle -->
  <circle cx="${f(150 - 4)}" cy="${f(headCY - 1)}" r="2" fill="${figMid}" opacity="0.60"/>
  <circle cx="${f(150 + 4)}" cy="${f(headCY - 1)}" r="2" fill="${figMid}" opacity="0.60"/>`

  // ── Halo — same solarDisk palette; rays directed predominantly DOWNWARD ──
  // The same light that radiates freely on The Fool, burns secretly in The Hermit's lantern,
  // and is borne aloft by Babalon — here it is POURED DOWNWARD into the Abyss.
  // Kenosis (Phil 2:7) made geometric: the self-emptying is visible in the ray directions.
  // All 16 rays are present (the same function, the same light) but their prominence
  // scales with how directly downward they point — full opacity at nadir, fading toward zenith.
  const haloSvg = `
  <!-- Halo — fourth appearance of the solar light (Fool / Hermit / Babalon / Hanged Man) -->
  <!-- Rays poured downward: kenosis as optics; the light deliberately given to the Abyss -->
  <circle cx="150" cy="${haloCY}" r="${f(haloDiskR * 2.17)}" fill="#fffde0" opacity="0.14" filter="url(#softglow)"/>
  <circle cx="150" cy="${haloCY}" r="${f(haloDiskR * 1.5)}"  fill="#fffbe8" opacity="0.36" filter="url(#softglow)"/>
  <circle cx="150" cy="${haloCY}" r="${haloDiskR}"            fill="#fff5b0" opacity="0.85"/>
  ${Array.from({length: 16}, (_, i) => {
    const a      = (i * 22.5) * Math.PI / 180
    // downFactor: 0 when ray points straight UP, 1 when straight DOWN
    const downFactor = (1 + Math.sin(a)) / 2
    const isMajor = i % 2 === 0
    const r2      = isMajor ? haloDiskR * 2.17 : haloDiskR * 1.75
    const rayIn   = haloDiskR + 3
    const op      = f(0.18 + downFactor * 0.56)   // 0.18 (up) → 0.74 (down)
    const sw      = isMajor ? f(0.8 + downFactor * 1.0) : f(0.5 + downFactor * 0.6)
    return `<line x1="${f(150 + rayIn * Math.cos(a))}" y1="${f(haloCY + rayIn * Math.sin(a))}"
               x2="${f(150 + r2   * Math.cos(a))}"  y2="${f(haloCY + r2   * Math.sin(a))}"
               stroke="#ffee66" stroke-width="${sw}" opacity="${op}"/>`
  }).join('\n  ')}`

  // ── Nehushtan (נחשתן) — Brass Serpent raised on the Ankh stem ──
  // Numbers 21:8-9: Moses raises it; those bitten look upon it and live.
  // John 3:14: Jesus identifies himself with it. The wound elevated as medicine.
  // The Teth-serpent of Lust (card XI) translated from horizontal power to vertical sacrifice.
  const nehustanSvg = `
  <!-- Nehushtan — the Brass Serpent on the pole (Num 21:8-9; John 3:14) -->
  <!-- The Teth-serpent of Lust (card XI) elevated: same creature, new axis -->
  <!-- Left coil around stem -->
  <path d="M${f(150 - 15)},${f(nehustanY + 8)}
           C${f(150 - 20)},${f(nehustanY + 20)} ${f(150 - 3)},${f(nehustanY + 28)} ${f(150 + 4)},${f(nehustanY + 20)}
           C${f(150 + 16)},${f(nehustanY + 12)} ${f(150 + 18)},${f(nehustanY + 27)} ${f(150 + 7)},${f(nehustanY + 38)}"
        fill="none" stroke="${bronze}" stroke-width="4.5" stroke-linecap="round" opacity="0.85"/>
  <!-- Right coil -->
  <path d="M${f(150 + 15)},${f(nehustanY + 8)}
           C${f(150 + 20)},${f(nehustanY + 18)} ${f(150 + 5)},${f(nehustanY + 26)} ${f(150 - 2)},${f(nehustanY + 18)}"
        fill="none" stroke="${bronze}" stroke-width="3.5" stroke-linecap="round" opacity="0.72"/>
  <!-- Scale marks -->
  <path d="M${f(150 - 13)},${f(nehustanY + 10)} L${f(150 - 9)},${f(nehustanY + 16)}"
        stroke="${bronze}" stroke-width="0.8" opacity="0.52"/>
  <path d="M${f(150 + 11)},${f(nehustanY + 15)} L${f(150 + 7)},${f(nehustanY + 21)}"
        stroke="${bronze}" stroke-width="0.8" opacity="0.52"/>
  <!-- Serpent head — raised, facing LEFT-UPWARD (elevated, not striking) -->
  <ellipse cx="${f(150 - 20)}" cy="${f(nehustanY - 1)}" rx="7.5" ry="5"
           fill="${bronze}" stroke="#7a5420" stroke-width="0.8" opacity="0.92"
           transform="rotate(-28,${f(150 - 20)},${f(nehustanY - 1)})"/>
  <!-- Eye — gold, same palette as the halo: the serpent and the light share the same fire -->
  <circle cx="${f(150 - 24)}" cy="${f(nehustanY - 3)}" r="1.6" fill="#ffcc44" opacity="0.85"/>
  <!-- Tongue -->
  <path d="M${f(150 - 27)},${f(nehustanY + 1)} L${f(150 - 32)},${f(nehustanY - 2)}"
        stroke="#cc3300" stroke-width="1" stroke-linecap="round" opacity="0.68"/>
  <path d="M${f(150 - 32)},${f(nehustanY - 2)} L${f(150 - 35)},${f(nehustanY - 4)}"
        stroke="#cc3300" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M${f(150 - 32)},${f(nehustanY - 2)} L${f(150 - 36)},${f(nehustanY)}"
        stroke="#cc3300" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>`

  // ── Grain of wheat — at the tomb threshold (John 12:24) ──
  // "Unless a kernel of wheat falls to the ground and dies, it remains only a single seed."
  // Jesus speaks this verse about his own coming death. The grain is the seed of what follows:
  // it falls through this card into Death (XIII) and beyond.
  // The grain threads back to The Empress (card III, Venus/grain) — the sacrifice seeds abundance.
  const grainSvg = `
  <!-- Grain of wheat — John 12:24; the seed that must fall and die to bear fruit -->
  <!-- Threads forward to Death (XIII) and back to The Empress (III, Venus/grain) -->
  <ellipse cx="155" cy="${grainY}" rx="5" ry="8" fill="#c8a830" opacity="0.70"
           transform="rotate(18,155,${grainY})"/>
  <!-- Husk lines (grain texture) -->
  <line x1="152" y1="${f(grainY - 5)}" x2="158" y2="${f(grainY + 5)}"
        stroke="#a08020" stroke-width="0.7" opacity="0.50"
        transform="rotate(18,155,${grainY})"/>
  <line x1="151" y1="${f(grainY - 1)}" x2="159" y2="${f(grainY + 3)}"
        stroke="#a08020" stroke-width="0.5" opacity="0.38"
        transform="rotate(18,155,${grainY})"/>
  <!-- Awn -->
  <line x1="158" y1="${f(grainY - 6)}" x2="163" y2="${f(grainY - 14)}"
        stroke="#c8a830" stroke-width="0.8" stroke-linecap="round" opacity="0.55"
        transform="rotate(18,155,${grainY})"/>`

  // ── Water waves — Mem element above the rock surface ──
  const waterSvg = `
  <!-- Water of the Abyss — Mem (water = this path's element) -->
  <!-- Romans 6:4: "buried with him through baptism into death" — the waters of willing descent -->
  <path d="M18,${f(rockY - 16)} Q42,${f(rockY - 22)} 68,${f(rockY - 16)} Q96,${f(rockY - 10)} 122,${f(rockY - 16)} Q148,${f(rockY - 22)} 172,${f(rockY - 16)} Q196,${f(rockY - 10)} 222,${f(rockY - 16)} Q250,${f(rockY - 22)} 282,${f(rockY - 16)}"
        fill="none" stroke="${waveC}" stroke-width="1.2" opacity="0.65"/>
  <path d="M18,${f(rockY - 9)} Q44,${f(rockY - 14)} 72,${f(rockY - 9)} Q100,${f(rockY - 4)} 126,${f(rockY - 9)} Q152,${f(rockY - 14)} 178,${f(rockY - 9)} Q204,${f(rockY - 4)} 230,${f(rockY - 9)} Q258,${f(rockY - 14)} 282,${f(rockY - 9)}"
        fill="none" stroke="${waveC}" stroke-width="0.9" opacity="0.45"/>
  <path d="M18,${f(rockY - 3)} Q46,${f(rockY - 7)} 76,${f(rockY - 3)} Q104,${f(rockY + 1)} 130,${f(rockY - 3)} Q154,${f(rockY - 7)} 178,${f(rockY - 3)} Q204,${f(rockY + 1)} 232,${f(rockY - 3)} Q260,${f(rockY - 7)} 282,${f(rockY - 3)}"
        fill="none" stroke="${waveC}" stroke-width="0.7" opacity="0.30"/>`

  // ── Rock-cut tomb — borrowed, temporary, luminous inside ──
  // Joseph of Arimathea's tomb: not his own, not prepared for him, needed for three days.
  // The stone is rolled aside (ajar) — not sealed; its temporariness is the theological point.
  // The interior glows with the same solarDisk light the figure carries in the halo above:
  //   the light does not die with the body; the empty tomb shines.
  // Water laps at the threshold — baptism waters at the door of willing death.
  // After this door: no human figure appears in the remaining major arcana.
  const tombSvg = `
  <!-- Rock ground — hewn stone (Joseph's tomb was cut from rock, Matt 27:60) -->
  <path d="M18,${rockY} Q46,${f(rockY - 7)} 80,${f(rockY + 1)} Q110,${f(rockY + 5)} 128,${f(rockY - 1)}
           Q150,${f(rockY + 2)} 172,${f(rockY - 1)} Q192,${f(rockY + 5)} 220,${f(rockY + 1)}
           Q254,${f(rockY - 7)} 282,${rockY} L282,352 L18,352 Z"
        fill="${stone}" opacity="0.94"/>
  <!-- Hewn rock face — crack lines (cut stone, not natural earth) -->
  <line x1="36"  y1="${f(rockY + 6)}"  x2="30"  y2="${f(rockY + 20)}" stroke="${stoneL}" stroke-width="1"   opacity="0.55"/>
  <line x1="84"  y1="${f(rockY + 3)}"  x2="78"  y2="${f(rockY + 16)}" stroke="${stoneL}" stroke-width="1"   opacity="0.50"/>
  <line x1="200" y1="${f(rockY + 4)}"  x2="207" y2="${f(rockY + 18)}" stroke="${stoneL}" stroke-width="1"   opacity="0.50"/>
  <line x1="252" y1="${f(rockY + 3)}"  x2="258" y2="${f(rockY + 15)}" stroke="${stoneL}" stroke-width="1"   opacity="0.50"/>
  <line x1="54"  y1="${f(rockY + 18)}" x2="46"  y2="${f(rockY + 32)}" stroke="${stoneL}" stroke-width="0.8" opacity="0.38"/>
  <line x1="234" y1="${f(rockY + 16)}" x2="242" y2="${f(rockY + 28)}" stroke="${stoneL}" stroke-width="0.8" opacity="0.38"/>
  <!-- Tomb interior — dark, but luminous; the empty tomb is not dark (it never needed to be) -->
  <path d="M${f(150 - archRX)},${tombBottom}
           L${f(150 - archRX)},${archCY}
           A${archRX},${archRY} 0 0,1 ${f(150 + archRX)},${archCY}
           L${f(150 + archRX)},${tombBottom} Z"
        fill="#030110" opacity="0.96"/>
  <!-- Interior glow — same solarDisk palette: the light the figure carries is already inside -->
  <circle cx="150" cy="${f(archCY + 14)}" r="20" fill="#fffde0" opacity="0.06" filter="url(#softglow)"/>
  <circle cx="150" cy="${f(archCY + 11)}" r="12" fill="#fffbe8" opacity="0.12" filter="url(#softglow)"/>
  <circle cx="150" cy="${f(archCY + 8)}"  r="6"  fill="#fff5b0" opacity="0.16"/>
  <!-- Arch stone surround -->
  <path d="M${f(150 - archRX - 3)},${tombBottom}
           L${f(150 - archRX - 3)},${archCY}
           A${f(archRX + 3)},${f(archRY + 3)} 0 0,1 ${f(150 + archRX + 3)},${archCY}
           L${f(150 + archRX + 3)},${tombBottom}"
        fill="none" stroke="${stoneL}" stroke-width="2.2" opacity="0.75"/>
  <!-- Rolled stone — displaced to right; ajar, not sealed -->
  <!-- The borrowed tomb needed only three days; the stone was always going to move -->
  <ellipse cx="${f(150 + archRX + 18)}" cy="${f(archCY + archRY + 6)}" rx="13" ry="15"
           fill="${stone}" stroke="${stoneL}" stroke-width="1.5" opacity="0.88"/>
  <line x1="${f(150 + archRX + 12)}" y1="${f(archCY + archRY + 2)}"
        x2="${f(150 + archRX + 16)}" y2="${f(archCY + archRY + 16)}"
        stroke="${stoneL}" stroke-width="0.9" opacity="0.55"/>
  <line x1="${f(150 + archRX + 20)}" y1="${f(archCY + archRY + 4)}"
        x2="${f(150 + archRX + 23)}" y2="${f(archCY + archRY + 17)}"
        stroke="${stoneL}" stroke-width="0.8" opacity="0.42"/>
  <!-- Water at threshold — lapping at the tomb entrance (Mem-baptism at the door of death) -->
  <path d="M18,${f(rockY + 1)} Q${f(150 - archRX - 8)},${f(rockY - 3)} ${f(150 - archRX - 2)},${f(rockY + 1)}"
        fill="none" stroke="${waveC}" stroke-width="0.8" opacity="0.45"/>
  <path d="M${f(150 + archRX + 2)},${f(rockY + 1)} Q${f(150 + archRX + 20)},${f(rockY - 3)} 282,${f(rockY + 1)}"
        fill="none" stroke="${waveC}" stroke-width="0.8" opacity="0.45"/>`

  const bodyContent = `
  ${memBg}
  ${waterSvg}
  ${ankhSvg}
  ${tombSvg}
  ${grainSvg}
  ${nehustanSvg}
  ${figureSvg}
  ${haloSvg}
  ${nailsSvg}`

  return majorCard({
    title: 'THE HANGED MAN', number: 'XII',
    hebrew: 'Mem · Water · Path 23',
    hebrewLetter: 'מ', attribution: '▽',
    bg1: '#020810', bg2: '#040e22',
    border: '#1a3a6a', accent: '#3a6aaa',
    text: '#88bbee', dim: '#2a4a7a',
    bodyContent,
  })
}

function card13() {
  // ── Colour palette ──
  const teal    = '#2a7a5a'   // Nun/Scorpio teal — colour of transformation
  const tealDk  = '#0a2818'   // Deep teal, Azrael's robe
  const tealMd  = '#1a5a3a'   // Mid teal, secondary figure areas
  const tealLt  = '#3aaa7a'   // Light teal, highlights
  const stone   = '#141820'   // Stone: Passover doorpost, lintel
  const stoneL  = '#0c1016'   // Stone shadow / crack lines
  const waveC   = '#0a1a20'   // Deep water beneath (Scorpio / Nun)
  const ochre   = '#8a6020'   // Blood mark on doorpost (lamb's blood, ochre)
  const gebuRed = '#661111'   // Geburah (Mars/Severity) — deep red, not gore
  const phoenOr = '#dd8822'   // Phoenix amber — Scorpio's third form, rising
  const swordWh = '#d0d8dc'   // Sword blade: bright/cold — divine clarity
  const dropBlk = '#080610'   // Bitter drop at sword tip
  const wingDk  = '#0d3828'   // Wing dark fill
  const wingMd  = '#1a5040'   // Wing mid fill
  const wingLt  = '#2a7055'   // Wing light edge

  // Key vertical coordinates
  const figCX   = 152         // Figure centre x (slight right of card centre)
  const figTop  = 108         // Crown of Azrael's head
  const headCY  = 126         // Head centre y
  const figBot  = 297         // Base of robe (at water line)

  // ── Ghost Nun (נ) — letter of Fish, Seed, the dwelling in the deep ──
  const nunBg = `
  <!-- Ghost Nun (נ) — Fish; seed in the deep; path 24 from Geburah to Tiphareth -->
  <text x="152" y="218"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#041a10" opacity="0.11">נ</text>`

  // ── Geburah corner glows (Mars/Severity — source sephira of path 24) ──
  const gebuGlows = `
  <!-- Geburah corner glows — path 24 leads FROM Severity; the death-that-transforms -->
  <circle cx="28"  cy="82" r="24" fill="${gebuRed}" opacity="0.16" filter="url(#softglow)"/>
  <circle cx="272" cy="82" r="24" fill="${gebuRed}" opacity="0.16" filter="url(#softglow)"/>`

  // ── Phoenix crown glow — Scorpio's third and highest form: rising from ash ──
  const starPts = []
  for (let i = 0; i < 8; i++) {
    const aO = (i * Math.PI / 4) - Math.PI / 2
    const aI = aO + Math.PI / 8
    starPts.push(`${f(150 + 16 * Math.cos(aO))},${f(104 + 16 * Math.sin(aO))}`)
    starPts.push(`${f(150 +  7 * Math.cos(aI))},${f(104 +  7 * Math.sin(aI))}`)
  }
  const phoenixGlow = `
  <!-- Phoenix crown — Scorpio's third form; death-into-rebirth, Nun ascending to Tiphareth -->
  <circle cx="150" cy="104" r="28" fill="${phoenOr}" opacity="0.08" filter="url(#softglow)"/>
  <circle cx="150" cy="104" r="18" fill="${phoenOr}" opacity="0.10" filter="url(#softglow)"/>
  <circle cx="150" cy="104" r="10" fill="${phoenOr}" opacity="0.18"/>
  <polygon points="${starPts.join(' ')}"
           fill="${phoenOr}" opacity="0.55" filter="url(#glow)"/>
  <circle cx="150" cy="104" r="5" fill="${phoenOr}" opacity="0.85"/>`

  // ── Dark water / Abyss — Nun the fish moves in the deep ──
  const waterWaves = `
  <!-- Abyss waters — Nun domain; the crossing to Tiphareth begins in the depths -->
  <rect x="18" y="300" width="264" height="52" fill="${waveC}" opacity="0.70"/>
  <path d="M18,306 Q44,298 70,306 Q96,314 122,306 Q148,298 174,306 Q200,314 226,306 Q252,298 282,306"
        fill="none" stroke="${teal}" stroke-width="0.7" opacity="0.35"/>
  <path d="M18,316 Q44,308 70,316 Q96,324 122,316 Q148,308 174,316 Q200,324 226,316 Q252,308 282,316"
        fill="none" stroke="${teal}" stroke-width="0.7" opacity="0.28"/>
  <path d="M18,326 Q44,318 70,326 Q96,334 122,326 Q148,318 174,326 Q200,334 226,326 Q252,318 282,326"
        fill="none" stroke="${teal}" stroke-width="0.6" opacity="0.22"/>`

  // ── Eagle (Scorpio middle form) — soaring above the figure, subtle ──
  const eagle = `
  <!-- Eagle — Scorpio's second form; transcendence above material death -->
  <path d="M108,${figTop - 10} Q129,${figTop - 24} 150,${figTop - 18} Q171,${figTop - 24} 192,${figTop - 10}"
        fill="none" stroke="${teal}" stroke-width="1.5" opacity="0.28"/>
  <path d="M88,${figTop + 2} Q120,${figTop - 14} 150,${figTop - 8} Q180,${figTop - 14} 212,${figTop + 2}"
        fill="none" stroke="${teal}" stroke-width="1.2" opacity="0.22"/>
  <circle cx="150" cy="${figTop - 20}" r="3.5" fill="${teal}" opacity="0.22"/>
  <path d="M143,${figTop - 8} Q150,${figTop - 2} 157,${figTop - 8}"
        fill="none" stroke="${teal}" stroke-width="1.0" opacity="0.20"/>`

  // ── Six Wings — Isaiah 6:2 seraphic form ──
  //   Upper pair:  spread wide — "with two he did fly"
  //   Middle pair: folded inward — "with two he covered his face"
  //   Lower pair:  angling down — "with two he covered his feet"
  const uw = figTop + 22   // upper wing attach y
  const mw = figTop + 58   // middle wing attach y
  const lw = figTop + 102  // lower wing attach y

  const upperWingL = `M${figCX - 18},${uw} C${figCX - 62},${uw - 12} ${figCX - 92},${uw + 48} ${figCX - 80},${uw + 78} C${figCX - 68},${uw + 62} ${figCX - 38},${uw + 38} ${figCX - 18},${uw + 46} Z`
  const upperWingR = `M${figCX + 18},${uw} C${figCX + 62},${uw - 12} ${figCX + 92},${uw + 48} ${figCX + 80},${uw + 78} C${figCX + 68},${uw + 62} ${figCX + 38},${uw + 38} ${figCX + 18},${uw + 46} Z`

  const midWingL = `M${figCX - 16},${mw} C${figCX - 52},${mw + 14} ${figCX - 62},${mw + 48} ${figCX - 30},${mw + 58} C${figCX - 18},${mw + 42} ${figCX - 14},${mw + 18} ${figCX - 14},${mw} Z`
  const midWingR = `M${figCX + 16},${mw} C${figCX + 52},${mw + 14} ${figCX + 62},${mw + 48} ${figCX + 30},${mw + 58} C${figCX + 18},${mw + 42} ${figCX + 14},${mw + 18} ${figCX + 14},${mw} Z`

  const lowWingL = `M${figCX - 20},${lw} C${figCX - 66},${lw + 38} ${figCX - 76},${lw + 98} ${figCX - 46},${lw + 108} C${figCX - 28},${lw + 82} ${figCX - 20},${lw + 38} ${figCX - 18},${lw} Z`
  const lowWingR = `M${figCX + 20},${lw} C${figCX + 66},${lw + 38} ${figCX + 76},${lw + 98} ${figCX + 46},${lw + 108} C${figCX + 28},${lw + 82} ${figCX + 20},${lw + 38} ${figCX + 18},${lw} Z`

  const upperFeatherL = [
    `M${figCX - 18},${uw + 34} C${figCX - 52},${uw + 18} ${figCX - 82},${uw + 54}`,
    `M${figCX - 22},${uw + 40} C${figCX - 60},${uw + 28} ${figCX - 84},${uw + 66}`,
    `M${figCX - 24},${uw + 44} C${figCX - 62},${uw + 40} ${figCX - 80},${uw + 76}`,
  ]
  const upperFeatherR = [
    `M${figCX + 18},${uw + 34} C${figCX + 52},${uw + 18} ${figCX + 82},${uw + 54}`,
    `M${figCX + 22},${uw + 40} C${figCX + 60},${uw + 28} ${figCX + 84},${uw + 66}`,
    `M${figCX + 24},${uw + 44} C${figCX + 62},${uw + 40} ${figCX + 80},${uw + 76}`,
  ]
  const lowFeatherL = [
    `M${figCX - 22},${lw + 10} C${figCX - 56},${lw + 44} ${figCX - 68},${lw + 92}`,
    `M${figCX - 24},${lw + 28} C${figCX - 62},${lw + 64} ${figCX - 72},${lw + 104}`,
  ]
  const lowFeatherR = [
    `M${figCX + 22},${lw + 10} C${figCX + 56},${lw + 44} ${figCX + 68},${lw + 92}`,
    `M${figCX + 24},${lw + 28} C${figCX + 62},${lw + 64} ${figCX + 72},${lw + 104}`,
  ]

  const wings = `
  <!-- Six Wings of Azrael — Isaiah 6:2; seraph of the divine presence -->
  <!-- Lower wings (feet-covering, pointing down) drawn first -->
  <path d="${lowWingL}" fill="${wingDk}" opacity="0.60"/>
  <path d="${lowWingR}" fill="${wingDk}" opacity="0.60"/>
  ${lowFeatherL.map(d => `<path d="${d}" fill="none" stroke="${wingMd}" stroke-width="0.6" opacity="0.44"/>`).join('\n  ')}
  ${lowFeatherR.map(d => `<path d="${d}" fill="none" stroke="${wingMd}" stroke-width="0.6" opacity="0.44"/>`).join('\n  ')}
  <!-- Middle wings (folded, face-covering) -->
  <path d="${midWingL}" fill="${wingDk}" opacity="0.72"/>
  <path d="${midWingR}" fill="${wingDk}" opacity="0.72"/>
  <!-- Upper wings (spread to fly) — dominant visual feature -->
  <path d="${upperWingL}" fill="${wingMd}" opacity="0.82"/>
  <path d="${upperWingR}" fill="${wingMd}" opacity="0.82"/>
  <!-- Upper wing leading-edge highlights -->
  <path d="M${figCX - 18},${uw} C${figCX - 64},${uw - 14} ${figCX - 94},${uw + 46} ${figCX - 80},${uw + 78}"
        fill="none" stroke="${wingLt}" stroke-width="1.0" opacity="0.55"/>
  <path d="M${figCX + 18},${uw} C${figCX + 64},${uw - 14} ${figCX + 94},${uw + 46} ${figCX + 80},${uw + 78}"
        fill="none" stroke="${wingLt}" stroke-width="1.0" opacity="0.55"/>
  ${upperFeatherL.map(d => `<path d="${d}" fill="none" stroke="${wingMd}" stroke-width="0.7" opacity="0.40"/>`).join('\n  ')}
  ${upperFeatherR.map(d => `<path d="${d}" fill="none" stroke="${wingMd}" stroke-width="0.7" opacity="0.40"/>`).join('\n  ')}`

  // ── Azrael's body and robe ──
  const azraelBody = `
  <!-- Azrael — Angel of Death; divine executor, not destroyer (Exodus 12:23) -->
  <!-- Robe — tall, teal-black angelic form spanning almost full card height -->
  <path d="M${figCX - 18},${figTop + 20} Q${figCX - 28},${figBot - 78} ${figCX - 32},${figBot}
           L${figCX + 36},${figBot} Q${figCX + 30},${figBot - 78} ${figCX + 22},${figTop + 20} Z"
        fill="${tealDk}" opacity="0.88"/>
  <!-- Robe mid-teal highlight (catches Tiphareth light from above) -->
  <path d="M${figCX - 10},${figTop + 30} Q${figCX - 14},${headCY + 62} ${figCX},${headCY + 102}
           Q${figCX + 14},${headCY + 62} ${figCX + 10},${figTop + 30} Z"
        fill="${tealMd}" opacity="0.24"/>
  <!-- Head — veiled; the angel's face is hidden (middle wings cover; only obedience visible) -->
  <ellipse cx="${figCX}" cy="${headCY}" rx="12" ry="14" fill="${tealMd}" opacity="0.70"/>
  <!-- Scorpio ♏ on robe — astrological attribution of path 24 -->
  <text x="${figCX}" y="${headCY + 68}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,Georgia,serif"
        font-size="14" fill="${teal}" opacity="0.58">♏</text>`

  // ── Sword with bitter drop ──
  // Blade angled ~25° from vertical, pointing down-right
  // The bitter drop: God's judgement is measured, not arbitrary
  const sx1 = figCX + 22, sy1 = headCY + 18   // near shoulder (hilt end)
  const sx2 = figCX + 48, sy2 = figBot - 8     // near foot (point)
  const smx = f((sx1 + sx2) / 2 - 2)           // crossguard centre x (adjusted)
  const smy = f((sy1 + sy2) / 2 - 14)          // crossguard centre y (adjusted)

  const sword = `
  <!-- Sword — divine instrument of path 24; the cutting word that separates, not destroys -->
  <!-- Blade glow -->
  <line x1="${sx1}" y1="${sy1}" x2="${sx2}" y2="${sy2}"
        stroke="${swordWh}" stroke-width="6" opacity="0.08" filter="url(#softglow)"/>
  <!-- Blade -->
  <line x1="${sx1}" y1="${sy1}" x2="${sx2}" y2="${sy2}"
        stroke="${swordWh}" stroke-width="1.8" opacity="0.84" stroke-linecap="round"/>
  <!-- Fuller (central groove) -->
  <line x1="${f(sx1 - 0.5)}" y1="${sy1 + 4}" x2="${f(sx2 - 0.5)}" y2="${sy2 - 6}"
        stroke="${tealDk}" stroke-width="0.5" opacity="0.42"/>
  <!-- Edge highlight -->
  <line x1="${f(sx1 + 1)}" y1="${sy1}" x2="${f(sx2 + 1)}" y2="${sy2}"
        stroke="white" stroke-width="0.5" opacity="0.28"/>
  <!-- Crossguard — perpendicular to blade -->
  <line x1="${f(Number(smx) - 10)}" y1="${f(Number(smy) - 3)}" x2="${f(Number(smx) + 10)}" y2="${f(Number(smy) + 3)}"
        stroke="${swordWh}" stroke-width="2.2" opacity="0.74" stroke-linecap="round"/>
  <!-- Grip -->
  <line x1="${f(Number(smx) + 6)}" y1="${f(Number(smy) + 2)}" x2="${f(Number(smx) + 14)}" y2="${f(Number(smy) + 8)}"
        stroke="${teal}" stroke-width="3.5" opacity="0.66" stroke-linecap="round"/>
  <!-- Pommel -->
  <circle cx="${f(Number(smx) + 16)}" cy="${f(Number(smy) + 10)}" r="3.5"
          fill="${teal}" opacity="0.72"/>
  <!-- Bitter drop at tip — divine justice measured to the drop; not wrath but necessity -->
  <circle cx="${f(sx2 + 1)}" cy="${f(sy2 + 4)}" r="3.8"
          fill="${dropBlk}" opacity="0.90"/>
  <circle cx="${f(sx2 + 1)}" cy="${f(sy2 + 4)}" r="2.0"
          fill="${ochre}" opacity="0.45"/>`

  // ── Passover doorpost — Exodus 12:22-23 ──
  // Left side of card; lintel + post with tau-cross blood mark and two carved Ichthys
  const dpX1 = 22, dpX2 = 54
  const ltY1 = 256, ltY2 = 276   // lintel
  const ptY1 = ltY2, ptY2 = 345  // post

  // Local ichthys helper — body as lens bezier + V tail
  function ichthys(cx, cy, w, h, col, op = 0.55) {
    const rx = w / 2, ry = h / 2
    const nx = cx - rx * 0.15          // body centre (shifted left slightly)
    const bRx = rx * 0.85, tailX = cx + rx * 0.45, tailTip = cx + rx
    return `<ellipse cx="${f(nx)}" cy="${f(cy)}" rx="${f(bRx)}" ry="${f(ry)}"
              fill="none" stroke="${col}" stroke-width="0.8" opacity="${f(op)}"/>
           <path d="M${f(tailX)},${f(cy - ry * 0.6)} L${f(tailTip)},${f(cy)} L${f(tailX)},${f(cy + ry * 0.6)}"
                fill="none" stroke="${col}" stroke-width="0.8" opacity="${f(op)}"/>`
  }

  const passoverDoor = `
  <!-- Passover doorpost — Exodus 12:22-23; the blood on lintel and post marks the saved -->
  <!-- Stone lintel -->
  <rect x="${dpX1}" y="${ltY1}" width="${dpX2 - dpX1}" height="${ltY2 - ltY1}"
        fill="${stone}" stroke="${stoneL}" stroke-width="0.5"/>
  <!-- Blood mark — tau-cross form (the primal apotropaic cross pre-dating Calvary) -->
  <line x1="${dpX1 + 6}" y1="${ltY1 + 5}" x2="${dpX2 - 6}" y2="${ltY1 + 5}"
        stroke="${ochre}" stroke-width="2.5" opacity="0.76" stroke-linecap="round"/>
  <line x1="${f((dpX1 + dpX2) / 2)}" y1="${ltY1 + 2}" x2="${f((dpX1 + dpX2) / 2)}" y2="${ltY2 - 2}"
        stroke="${ochre}" stroke-width="2.5" opacity="0.76" stroke-linecap="round"/>
  <!-- Stone left post -->
  <rect x="${dpX1}" y="${ptY1}" width="${dpX2 - dpX1}" height="${ptY2 - ptY1}"
        fill="${stone}" stroke="${stoneL}" stroke-width="0.5"/>
  <!-- Stone crack lines -->
  <line x1="${dpX1 + 8}" y1="${ptY1 + 16}" x2="${dpX1 + 22}" y2="${ptY1 + 28}"
        stroke="${stoneL}" stroke-width="0.6" opacity="0.70"/>
  <line x1="${dpX1 + 14}" y1="${ptY1 + 46}" x2="${dpX1 + 6}"  y2="${ptY1 + 62}"
        stroke="${stoneL}" stroke-width="0.5" opacity="0.60"/>
  <!-- Two carved Ichthys on post — Apostolic mark of believers (pre-Constantine) -->
  ${ichthys(38, ptY1 + 22, 20, 11, tealLt, 0.46)}
  ${ichthys(38, ptY1 + 50, 18, 10, tealLt, 0.40)}
  <!-- Green shoot at doorpost base — grain of card XII now germinated (Jn 12:24) -->
  <ellipse cx="44" cy="${ptY2 - 4}" rx="4" ry="8" fill="#2a7030" opacity="0.72"
           transform="rotate(-20, 44, ${ptY2 - 4})"/>
  <line x1="44" y1="${ptY2 - 10}" x2="49" y2="${ptY2 - 20}"
        stroke="#2a7030" stroke-width="1.0" opacity="0.60"/>`

  // ── Three Ichthys fish in water — Peter, James, John ──
  // The three Apostles of the Transfiguration (Mt 17) and Gethsemane (Mk 14)
  // and the 153-fish resurrection haul (Jn 21); the three witnesses (1 Jn 5:8)
  const apostleFish = `
  <!-- Three Ichthys in the Abyss — Peter, James, John -->
  <!-- The three Transfiguration/Gethsemane witnesses; the 153 fish of Jn 21:11 -->
  ${ichthys(82,  321, 16, 9,   tealLt, 0.52)}
  ${ichthys(118, 327, 14, 8,   tealLt, 0.46)}
  ${ichthys(154, 322, 15, 8.5, tealLt, 0.49)}`

  // ── Scorpion — Scorpio's lowest form, at Azrael's feet ──
  const scX = 210, scY = 310
  const scorpion = `
  <!-- Scorpion — Scorpio's first form; venom, danger, the stinging death that initiates -->
  <ellipse cx="${scX}" cy="${scY}"     rx="9"  ry="6"  fill="${tealMd}" opacity="0.75"/>
  <ellipse cx="${scX}" cy="${scY - 8}" rx="6"  ry="5"  fill="${tealMd}" opacity="0.70"/>
  <!-- Chelae (claws) -->
  <path d="M${scX - 9},${scY} L${scX - 18},${scY - 5} L${scX - 22},${scY - 2} M${scX - 18},${scY - 5} L${scX - 20},${scY - 10}"
        fill="none" stroke="${tealLt}" stroke-width="1.0" opacity="0.65"/>
  <path d="M${scX + 9},${scY} L${scX + 18},${scY - 5} L${scX + 22},${scY - 2} M${scX + 18},${scY - 5} L${scX + 20},${scY - 10}"
        fill="none" stroke="${tealLt}" stroke-width="1.0" opacity="0.65"/>
  <!-- Walking legs (3 pairs) -->
  <line x1="${scX - 5}" y1="${scY + 2}" x2="${scX - 14}" y2="${scY + 9}"  stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <line x1="${scX - 2}" y1="${scY + 3}" x2="${scX - 10}" y2="${scY + 12}" stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <line x1="${scX + 2}" y1="${scY + 3}" x2="${scX + 10}" y2="${scY + 12}" stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <line x1="${scX + 5}" y1="${scY + 2}" x2="${scX + 14}" y2="${scY + 9}"  stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <line x1="${scX - 1}" y1="${scY + 4}" x2="${scX - 5}"  y2="${scY + 13}" stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <line x1="${scX + 1}" y1="${scY + 4}" x2="${scX + 5}"  y2="${scY + 13}" stroke="${tealLt}" stroke-width="0.7" opacity="0.55"/>
  <!-- Curved tail with venom stinger -->
  <path d="M${scX},${scY + 5} Q${scX + 18},${scY + 22} ${scX + 18},${scY + 8} Q${scX + 22},${scY - 2} ${scX + 20},${scY - 10}"
        fill="none" stroke="${tealLt}" stroke-width="1.2" opacity="0.65"/>
  <circle cx="${scX + 20}" cy="${scY - 11}" r="1.5" fill="${ochre}" opacity="0.80"/>`

  // ── Assemble body content ──
  // Z-order: ghost → glows → water → eagle → wings → body → phoenix crown → door → scorpion → fish → sword
  const bodyContent = [
    nunBg,
    gebuGlows,
    waterWaves,
    eagle,
    wings,
    azraelBody,
    phoenixGlow,
    passoverDoor,
    scorpion,
    apostleFish,
    sword,
  ].join('\n')

  return majorCard({
    title: 'DEATH', number: 'XIII',
    hebrew: 'Nun · Fish · Path 24',
    hebrewLetter: 'נ', attribution: '♏',
    bg1: '#020c0a', bg2: '#04100c',
    border: '#1a5a3a', accent: '#2a8a5a',
    text: '#88ddbb', dim: '#2a5a3a',
    bodyContent,
  })
}

function card14() {
  // ── Colour palette ──
  const solGold  = '#ddaa22'   // Solar gold — Art figure's solar face and gold cup
  const solDark  = '#cc8800'   // Deep gold (robe left panel)
  const lunSilv  = '#8899bb'   // Lunar silver — Art figure's lunar face and silver cup
  const lunDark  = '#5566aa'   // Deep silver-blue (robe right panel)
  const eagleC   = '#ddeeff'   // White eagle (volatile made fixed — left/solar robe panel)
  const lionC    = '#cc3322'   // Red lion (fixed made volatile — right/lunar robe panel)
  const fireStr  = '#ff6622'   // Fire stream (from lunar/silver cup — fixed volatilised)
  const waterStr = '#3366aa'   // Water stream (from solar/gold cup — volatile fixed)
  const cauld    = '#1a1010'   // Cauldron stone body
  const cauldRim = '#2a1a08'   // Cauldron rim
  const bowWood  = '#aa7722'   // Sagittarius bow wood
  const arrowGld = '#ddcc44'   // Arrow shaft and nock

  // Key vertical coordinates — documented for reference in the SVG data
  const headCY   = 148         // Art figure head centre y
  const crownY   = headCY - 24 // Crown elements centre y (= 124)
  const bodyTop  = headCY + 14  // Robe/body top y (= 162)
  const bodyBot  = 296         // Robe base y
  const cupY     = headCY + 36  // Cup hold height (= 184: shoulder-level arms)
  const cadTop   = bodyTop + 16  // Caduceus top (= 178: below shoulder)
  const streamCY = bodyTop + 76  // Stream crossing y (≈ 238)
  const cauldTop = 298         // Cauldron rim top
  const cauldY   = 305         // Cauldron body top
  const cauldBot = 326         // Cauldron body bottom
  const floorY   = 330         // Floor surface

  // Cup X positions
  const leftCupX  = 108        // Gold cup (solar/left hand)
  const rightCupX = 192        // Silver cup (lunar/right hand)

  // ── Ghost Samekh (ס) — Prop/Support; this path bears the weight of the Work ──
  const samBg = `
  <!-- Ghost Samekh (ס) — the Prop that supports the Great Work across the Abyss -->
  <text x="152" y="218"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#020c28" opacity="0.10">ס</text>`

  // ── Rainbow arcs — Sagittarius bow; Gen 9:13 covenant; Rev 4:3 throne-circle ──
  // 7 arcs from (22,198) to (278,198), rx=128 (half of 256 inner span)
  // sweep-flag=0 (counterclockwise) → arcs bow upward; peak at (150, 198-ry)
  // Outer red (ry=88) peaks at y=110; inner violet (ry=52) peaks at y=146
  const rainColors = [
    ['#dd2200', 88, 3.8],   // red — outermost
    ['#ee6622', 82, 3.5],   // orange
    ['#ddcc00', 76, 3.2],   // yellow
    ['#228844', 70, 3.0],   // green
    ['#2255cc', 64, 3.0],   // blue
    ['#4422aa', 58, 2.8],   // indigo
    ['#8822cc', 52, 2.5],   // violet — innermost
  ]
  const rainbow = `
  <!-- Rainbow — covenant, the Archer's bow, the throne-circle; arcs bow upward from y=198 -->
  <!-- Reuse: same solar/lunar gradient colours as the left/right split of The Lovers (VI), -->
  <!--        now unified into a single arc — the duality of VI resolved in XIV             -->
  ${rainColors.map(([col, ry, sw]) =>
    `<path d="M22,198 A128,${ry} 0 0,0 278,198"
        fill="none" stroke="${col}" stroke-width="${sw}" opacity="0.30"/>`
  ).join('\n  ')}`

  // ── Sagittarius bow — reused C-curve form from Eros's bow in The Lovers (VI) ──
  // Eros bow in VI: d="M${eX-22},${eY-16} C${eX-35},${eY-6} ${eX-35},${eY+10} ${eX-22},${eY+20}"
  // Now a full double-limbed bow spanning the card top; string pulled back to arrow nock
  const nockX = 150, nockY = 106
  const sagBow = `
  <!-- Sagittarius bow — C-curve form reused from Eros (VI); now the cosmic Archer's bow -->
  <!-- Left limb: same cubic bezier as Eros, now large and left-symmetric -->
  <path d="M60,86 C24,97 24,112 60,122"
        fill="none" stroke="${bowWood}" stroke-width="3.5" stroke-linecap="round" opacity="0.74"/>
  <!-- Right limb (mirror) -->
  <path d="M240,86 C276,97 276,112 240,122"
        fill="none" stroke="${bowWood}" stroke-width="3.5" stroke-linecap="round" opacity="0.74"/>
  <!-- Bowstring: from left tip, drawn back to nock, to right tip -->
  <path d="M60,86 L${nockX},${nockY} L240,86"
        fill="none" stroke="${arrowGld}" stroke-width="1.3" opacity="0.62"/>
  <path d="M60,122 L${nockX},${nockY} L240,122"
        fill="none" stroke="${arrowGld}" stroke-width="1.3" opacity="0.62"/>
  <!-- Nock point -->
  <circle cx="${nockX}" cy="${nockY}" r="2.8" fill="${arrowGld}" opacity="0.80"/>`

  // ── Arrow spine — vertical axis; same axis as Zain (VI), now a drawn arrow ──
  // Arrow flies UPWARD (aspiration toward Tiphareth even on the descending path 25)
  // Arrowhead at y=84; fletch at nockY=106; shaft enters cauldron at cauldTop
  const arrowSpine = `
  <!-- Arrow spine — the Zain axis of The Lovers (VI) made material and directed -->
  <!-- The path descends Tiphareth→Yesod, but the Archer's will aspires upward -->
  <!-- Shaft glow -->
  <line x1="150" y1="84" x2="150" y2="${cauldTop}"
        stroke="${arrowGld}" stroke-width="5" opacity="0.07" filter="url(#softglow)"/>
  <!-- Shaft -->
  <line x1="150" y1="84" x2="150" y2="${cauldTop}"
        stroke="${arrowGld}" stroke-width="1.2" opacity="0.58"/>
  <!-- Arrowhead (pointing up — toward Tiphareth) -->
  <polygon points="150,83 144.5,97 155.5,97"
           fill="${arrowGld}" opacity="0.72"/>
  <!-- Fletch (at nock, below the bowstring) -->
  <line x1="147" y1="${nockY + 6}" x2="142" y2="${nockY + 16}"
        stroke="${arrowGld}" stroke-width="1.1" opacity="0.54"/>
  <line x1="153" y1="${nockY + 6}" x2="158" y2="${nockY + 16}"
        stroke="${arrowGld}" stroke-width="1.1" opacity="0.54"/>`

  // ── Large caduceus — reused and scaled from the altar caduceus in The Lovers (VI) ──
  // Card VI altar: staff + two S-curves (left/right), tiny scale
  // Card XIV: same structure, full-height, intertwining serpents across 5 segments
  // Left serpent = Sulphur (fire/orange), Right serpent = Mercury (water/blue)
  const cadBot  = cauldTop          // staff enters cauldron
  const cadH    = cadBot - cadTop   // = 120
  const cadSegs = 5
  const segH    = cadH / cadSegs    // = 24

  let leftCoils = `M${f(150 - 9)},${cadTop}`
  let rightCoils = `M${f(150 + 9)},${cadTop}`
  for (let i = 0; i < cadSegs; i++) {
    const y0 = cadTop + i * segH
    const y2 = cadTop + (i + 1) * segH
    const dir = i % 2 === 0 ? 1 : -1   // alternate crossing direction
    // Each segment: serpent curves to the opposite side and returns to centre
    leftCoils  += ` C${f(150 + dir * 15)},${f(y0 + segH * 0.28)} ${f(150 + dir * 15)},${f(y0 + segH * 0.72)} ${f(150 - dir * 9)},${f(y2)}`
    rightCoils += ` C${f(150 - dir * 15)},${f(y0 + segH * 0.28)} ${f(150 - dir * 15)},${f(y0 + segH * 0.72)} ${f(150 + dir * 9)},${f(y2)}`
  }

  const caduceus = `
  <!-- Large caduceus — reused from the altar of The Lovers (VI), now the structural axis -->
  <!-- The altar of the Alchemical Marriage becomes the spine of the Great Work -->
  <!-- Staff -->
  <line x1="150" y1="${cadTop}" x2="150" y2="${cadBot}"
        stroke="${solGold}" stroke-width="1.8" opacity="0.44"/>
  <!-- Sulphur serpent (left coil, fire-orange) — volatile principle -->
  <path d="${leftCoils}"
        fill="none" stroke="${fireStr}" stroke-width="1.5" opacity="0.62"/>
  <!-- Mercury serpent (right coil, water-blue) — fixed principle -->
  <path d="${rightCoils}"
        fill="none" stroke="${waterStr}" stroke-width="1.5" opacity="0.62"/>
  <!-- Caduceus wing-pair at top — the winged staff signal -->
  <path d="M${f(150 - 9)},${f(cadTop + 4)} C${f(150 - 26)},${f(cadTop - 4)} ${f(150 - 30)},${f(cadTop + 8)} ${f(150 - 22)},${f(cadTop + 18)}"
        fill="none" stroke="${solGold}" stroke-width="1.3" opacity="0.52"/>
  <path d="M${f(150 + 9)},${f(cadTop + 4)} C${f(150 + 26)},${f(cadTop - 4)} ${f(150 + 30)},${f(cadTop + 8)} ${f(150 + 22)},${f(cadTop + 18)}"
        fill="none" stroke="${solGold}" stroke-width="1.3" opacity="0.52"/>`

  // ── Crossed streams (solve et coagula — the X of Art) ──
  // Gold cup (left, solar): pours WATER (blue) — volatile made fixed; curves right across centre
  // Silver cup (right, lunar): pours FIRE (orange) — fixed made volatile; curves left across centre
  // Streams cross at approximately (150, streamCY=238) — the quintessence point
  const streams = `
  <!-- Crossed streams — the X of solve et coagula; fire into water, water into fire -->
  <!-- Both streams arc PAST the centre line before converging in the cauldron -->
  <!-- Gold cup → water stream (blue): pours rightward, crosses left, enters cauldron -->
  <path d="M${leftCupX},${cupY + 10} C${f(leftCupX + 22)},${streamCY} ${f(streamCY - 6)},${f(streamCY + 22)} 150,${cauldTop}"
        fill="none" stroke="${waterStr}" stroke-width="2.6" opacity="0.54" stroke-linecap="round"/>
  <!-- Silver cup → fire stream (orange): pours leftward, crosses right, enters cauldron -->
  <path d="M${rightCupX},${cupY + 10} C${f(rightCupX - 22)},${streamCY} ${f(streamCY + 6)},${f(streamCY + 22)} 150,${cauldTop}"
        fill="none" stroke="${fireStr}" stroke-width="2.6" opacity="0.54" stroke-linecap="round"/>
  <!-- Quintessence glow at the crossing point — the new substance, neither fire nor water -->
  <circle cx="150" cy="${streamCY}" r="8" fill="#ffffbb" opacity="0.10" filter="url(#softglow)"/>
  <circle cx="150" cy="${streamCY}" r="3" fill="#ffffdd" opacity="0.28"/>`

  // ── Art figure body / robe (the Rebis of The Lovers, now full-height and active) ──
  const artBody = `
  <!-- Art figure — the Rebis of The Lovers (VI) grown to full active height -->
  <!-- Robe split at centre seam: left panel solar gold, right panel lunar silver -->
  <!-- Reuse: rebisGrad split concept from card VI, now as a full-length robe -->
  <!-- Left robe panel (solar, gold) -->
  <path d="M${f(150 - 3)},${bodyTop + 18} Q${f(150 - 30)},${bodyTop + 62} ${f(150 - 36)},${bodyBot}
           L150,${bodyBot} Z"
        fill="${solDark}" opacity="0.78"/>
  <!-- Right robe panel (lunar, silver-blue) -->
  <path d="M${f(150 + 3)},${bodyTop + 18} Q${f(150 + 30)},${bodyTop + 62} ${f(150 + 36)},${bodyBot}
           L150,${bodyBot} Z"
        fill="${lunDark}" opacity="0.70"/>
  <!-- Centre seam — same Zain/dashed axis as in The Lovers (VI) -->
  <line x1="150" y1="${bodyTop + 8}" x2="150" y2="${bodyBot}"
        stroke="#ffffff" stroke-width="0.6" stroke-dasharray="3 5" opacity="0.20"/>
  <!-- Neck -->
  <rect x="144" y="${headCY + 14}" width="12" height="10" rx="2"
        fill="#aa8855" opacity="0.70"/>`

  // ── White eagle on left (solar) robe panel ──
  // Wing curves derived from card IV heraldic phoenix; white = volatile made fixed
  const eagX = 128, eagY = bodyTop + 68
  const eagle = `
  <!-- White eagle (left/solar robe) — volatile principle fixed by Art's operation -->
  <!-- Volatile→Fixed: reversed position from The Lovers (VI) -->
  <!-- Wing curves derived from card IV heraldic phoenix -->
  <path d="M${eagX},${eagY} C${f(eagX - 18)},${f(eagY - 14)} ${f(eagX - 28)},${f(eagY - 4)} ${f(eagX - 18)},${f(eagY + 16)}"
        fill="${eagleC}" opacity="0.56"/>
  <path d="M${eagX},${eagY} C${f(eagX + 12)},${f(eagY - 10)} ${f(eagX + 18)},${f(eagY - 2)} ${f(eagX + 12)},${f(eagY + 12)}"
        fill="${eagleC}" opacity="0.50"/>
  <!-- Eagle head + beak -->
  <circle cx="${eagX}" cy="${f(eagY - 9)}" r="5" fill="${eagleC}" opacity="0.66"/>
  <path d="M${f(eagX - 2)},${f(eagY - 6)} L${f(eagX - 8)},${f(eagY - 3)}"
        stroke="${eagleC}" stroke-width="1.4" stroke-linecap="round" opacity="0.62"/>
  <!-- Tail feathers -->
  <path d="M${f(eagX - 2)},${f(eagY + 14)} L${f(eagX - 6)},${f(eagY + 22)} M${f(eagX + 2)},${f(eagY + 14)} L${f(eagX + 2)},${f(eagY + 23)}"
        fill="none" stroke="${eagleC}" stroke-width="1.0" opacity="0.44"/>`

  // ── Red lion on right (lunar) robe panel ──
  // Leonine shapes consistent with Lust (XI); red = fixed principle volatilised
  const liX = 172, liY = bodyTop + 70
  const liManeRays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI / 4) - Math.PI / 2
    const r1 = 9, r2 = 14
    return `<line x1="${f(liX + r1 * Math.cos(a))}" y1="${f(liY - 2 + r1 * Math.sin(a))}" x2="${f(liX + r2 * Math.cos(a))}" y2="${f(liY - 2 + r2 * Math.sin(a))}" stroke="${lionC}" stroke-width="1.5" opacity="0.46"/>`
  })
  const lion = `
  <!-- Red lion (right/lunar robe) — fixed principle volatilised by Art's operation -->
  <!-- Fixed→Volatile: reversed position from The Lovers (VI) -->
  <!-- Leonine form consistent with Lust (XI) -->
  <ellipse cx="${liX}" cy="${f(liY + 9)}" rx="10" ry="8" fill="${lionC}" opacity="0.58"/>
  <circle  cx="${liX}" cy="${f(liY - 2)}" r="9" fill="${lionC}" opacity="0.62"/>
  ${liManeRays.join('\n  ')}
  <circle cx="${f(liX - 3)}" cy="${f(liY - 4)}" r="1.5" fill="#ffaa00" opacity="0.80"/>
  <circle cx="${f(liX + 3)}" cy="${f(liY - 4)}" r="1.5" fill="#ffaa00" opacity="0.80"/>
  <path d="M${f(liX + 8)},${f(liY + 8)} Q${f(liX + 18)},${f(liY + 14)} ${f(liX + 22)},${f(liY + 6)}"
        fill="none" stroke="${lionC}" stroke-width="1.2" opacity="0.44" stroke-linecap="round"/>`

  // ── Cauldron (altar of The Lovers transformed) ──
  // Same plinth construction as card VI altar, scaled up; now receives the crossed streams
  // VITRIOL inscribed on the rim — the operational instruction of path 25
  const cauldron = `
  <!-- Cauldron — the Marriage altar of The Lovers (VI) transformed into the vessel of the Work -->
  <!-- Reuse: same plinth rect dimensions and stone palette (#1c0e00/#241200) scaled to 2× -->
  <!-- Rim — derived from altar top slab in VI (x=119 y=aY-4 width=62 h=6), scaled 2× -->
  <rect x="104" y="${cauldTop}" width="92" height="7" rx="2"
        fill="${cauldRim}" stroke="#443322" stroke-width="1" opacity="0.90"/>
  <!-- Body — derived from altar face in VI (x=123 y=aY width=54 h=18), scaled 2× -->
  <rect x="109" y="${cauldY}" width="82" height="${cauldBot - cauldY}" rx="2"
        fill="${cauld}" stroke="#332211" stroke-width="1" opacity="0.92"/>
  <!-- V.I.T.R.I.O.L. on the rim — "Visita Interiora Terrae Rectificando Invenies Occultum Lapidem" -->
  <text x="150" y="${f(cauldTop + 3.8)}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Courier New',monospace" letter-spacing="1.5"
        font-size="5.5" fill="#aa8833" opacity="0.74">V·I·T·R·I·O·L</text>
  <!-- Cauldron fire — rising from the mixed quintessence within -->
  <path d="M136,${cauldTop} Q141,${f(cauldTop - 16)} 148,${f(cauldTop - 26)} Q150,${f(cauldTop - 30)} 152,${f(cauldTop - 26)} Q159,${f(cauldTop - 16)} 164,${cauldTop}"
        fill="${fireStr}" opacity="0.52" filter="url(#glow)"/>
  <path d="M141,${cauldTop} Q146,${f(cauldTop - 12)} 150,${f(cauldTop - 18)} Q154,${f(cauldTop - 12)} 159,${cauldTop}"
        fill="#ffaa00" opacity="0.58"/>
  <!-- Rain drops falling into cauldron — fire and water coexist within -->
  <circle cx="129" cy="${f(cauldTop - 20)}" r="1.5" fill="${waterStr}" opacity="0.54"/>
  <circle cx="141" cy="${f(cauldTop - 30)}" r="1.5" fill="${waterStr}" opacity="0.47"/>
  <circle cx="159" cy="${f(cauldTop - 27)}" r="1.5" fill="${waterStr}" opacity="0.50"/>
  <circle cx="170" cy="${f(cauldTop - 19)}" r="1.5" fill="${waterStr}" opacity="0.44"/>
  <!-- Cauldron tripod legs — the threefold support of the Great Work -->
  <line x1="115" y1="${cauldBot}" x2="107" y2="${floorY}"
        stroke="#332211" stroke-width="2.2" stroke-linecap="round" opacity="0.84"/>
  <line x1="150" y1="${cauldBot}" x2="150" y2="${floorY}"
        stroke="#332211" stroke-width="2.2" stroke-linecap="round" opacity="0.84"/>
  <line x1="185" y1="${cauldBot}" x2="193" y2="${floorY}"
        stroke="#332211" stroke-width="2.2" stroke-linecap="round" opacity="0.84"/>`

  // ── Arms with cups ──
  // Arms are horizontal at shoulder height, same construction as King/Queen in The Lovers (VI)
  // Left arm (solar side) holds gold cup; right arm (lunar side) holds silver cup
  const arms = `
  <!-- Arms — same construction as King and Queen arm lines in The Lovers (VI) -->
  <!-- Left arm (solar, gold) — holds gold cup: same stroke as King's arm in VI -->
  <line x1="${f(150 - 14)}" y1="${f(bodyTop + 22)}" x2="${leftCupX}" y2="${cupY}"
        stroke="${solGold}" stroke-width="7" stroke-linecap="round" opacity="0.74"/>
  <!-- Right arm (lunar, silver) — holds silver cup: same stroke as Queen's arm in VI -->
  <line x1="${f(150 + 14)}" y1="${f(bodyTop + 22)}" x2="${rightCupX}" y2="${cupY}"
        stroke="${lunSilv}" stroke-width="7" stroke-linecap="round" opacity="0.70"/>
  <!-- Gold cup (solar — pours water; the same Grail lineage: Chariot VII → Lust XI → Art XIV) -->
  ${suitPip('cups', leftCupX, cupY, 14, solGold, 0.88)}
  <!-- Silver cup (lunar — pours fire; the Quintessence vessel) -->
  ${suitPip('cups', rightCupX, cupY, 14, lunSilv, 0.82)}`

  // ── Dual face of Art figure ──
  // Left semicircle: solar gold — King's face (#c8a060) from The Lovers (VI)
  // Right semicircle: lunar silver — Queen's face (#c0b8d0) from The Lovers (VI)
  // Same head radii; now co-present in one figure rather than separate figures
  const dualFace = `
  <!-- Dual face — solar left + lunar right; same face constructions as King and Queen in VI -->
  <!-- One figure, two natures — the Rebis made active -->
  <!-- Left half (solar gold, #c8a060) — reused from King's circle in card VI -->
  <path d="M150,${headCY - 14} A14,14 0 0,0 150,${headCY + 14} Z"
        fill="#c8a060" opacity="0.90"/>
  <!-- Right half (lunar silver, #c0b8d0) — reused from Queen's circle in card VI -->
  <path d="M150,${headCY - 14} A14,14 0 0,1 150,${headCY + 14} Z"
        fill="#c0b8d0" opacity="0.90"/>
  <!-- Facial dividing line (same dashed axis as Zain in card VI) -->
  <line x1="150" y1="${headCY - 14}" x2="150" y2="${headCY + 14}"
        stroke="#ccccee" stroke-width="0.5" opacity="0.38"/>`

  // ── Dual crown — solarDisk (left) + crescent (right) ──
  // Reused directly from the Rebis crown in The Lovers (VI)
  // Card VI rebis crown: solar disk cx="${rbX-8}" cy="${rbY-10}" r="6"
  //                      crescent circles cx="${rbX+8}" cy="${rbY-10}" r="6"/"5.2"
  // Now at full figure scale: solarDisk() + crescent circle-cutout
  const dualCrown = `
  <!-- Dual crown — solarDisk + crescent — reused from Rebis crown in The Lovers (VI) -->
  <!-- Crown band joining both halves -->
  <rect x="${f(150 - 20)}" y="${crownY + 7}" width="40" height="6" rx="2"
        fill="#aa8844" opacity="0.84"/>
  <!-- Solar crown left — fourth use of the solarDisk palette in the descent arc -->
  <!-- (Fool=free sky; Hermit=lantern; Babalon=nimbus; Hanged Man=inverted halo; Art=crown) -->
  ${solarDisk(137, crownY + 2, 11)}
  <!-- Lunar crescent right — circle-cutout construction from card VI rebis crown -->
  <circle cx="${f(150 + 11)}" cy="${crownY + 2}" r="10"   fill="${lunSilv}" opacity="0.85"/>
  <circle cx="${f(150 + 15)}" cy="${crownY + 2}" r="8.5"  fill="#040818"   opacity="0.94"/>`

  // ── Floor — Gemini ♊ of The Lovers (VI) resolved to Sagittarius ♐ of Art (XIV) ──
  // Same positions (x=68, x=232, y=336), same font sizing — opposite signs on the zodiac
  // The duality of Gemini has become the single directed arrow of Sagittarius
  const floor = `
  <!-- Floor — Gemini ♊ (card VI) resolved into Sagittarius ♐ (card XIV) -->
  <!-- Same positions, same sizing — opposite signs: duality unified into direction -->
  <path d="M18,${floorY} Q80,${f(floorY - 4)} 150,${f(floorY + 2)} Q220,${f(floorY - 4)} 282,${floorY} L282,352 L18,352 Z"
        fill="#040818" opacity="0.72"/>
  <text x="68"  y="${floorY + 14}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols',sans-serif"
        font-size="15" fill="${solGold}" opacity="0.38">♐</text>
  <text x="232" y="${floorY + 14}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols',sans-serif"
        font-size="15" fill="${lunSilv}" opacity="0.38">♐</text>`

  // ── Assemble body content ──
  // Z-order: ghost → rainbow → caduceus → streams → robe → eagle → lion → cauldron → arms → face → crown → bow → arrow → floor
  const bodyContent = [
    samBg,
    rainbow,
    caduceus,
    streams,
    artBody,
    eagle,
    lion,
    cauldron,
    arms,
    dualFace,
    dualCrown,
    sagBow,
    arrowSpine,
    floor,
  ].join('\n')

  return majorCard({
    title: 'ART', number: 'XIV',
    hebrew: 'Samekh · Sagittarius · Path 25',
    hebrewLetter: 'ס', attribution: '♐',
    bg1: '#040818', bg2: '#060c24',
    border: '#1a2a6a', accent: '#2a4aaa',
    text: '#88aaee', dim: '#2a3a6a',
    bodyContent,
  })
}

function card15() {
  // ── Colour palette ──
  const figDk   = '#2a1a10'   // Baphomet dark goat-flesh
  const figMd   = '#3a2418'   // Mid goat-flesh / hairy body
  const hornC   = '#1a0e08'   // Goat horns (very dark)
  const brimLt  = '#ee9900'   // Brimstone light (sulfur-orange)
  const brimDk  = '#cc6600'   // Brimstone dark
  const brimFl  = '#ffcc44'   // Brimstone flame-tip (sulfur-yellow)
  const eyeAmb  = '#ff9900'   // Third Eye amber
  const eyeGld  = '#ffcc44'   // Third Eye highlight
  const lakeC   = '#1a0800'   // Lake of Fire surface (dark sulfurous)
  const serpDk  = '#1a3010'   // Nachash dark green
  const serpMd  = '#2a5020'   // Nachash mid green
  const chainGd = '#886622'   // Corrupted gold chain (darkened from Art's solGold #ddaa22)
  const chainSv = '#445577'   // Corrupted silver chain (darkened from Art's lunSilv #8899bb)
  const towrC   = '#1c1408'   // Ziggurat stone (barely above bg)
  const towrLt  = '#2a2010'   // Ziggurat stone highlight / courses
  const lightnC = '#eeeebb'   // Lightning (same white energy as the Fool's solar disk)
  const qlGlow  = '#200028'   // Qliphothic corner glow — deep indigo-purple, pulling down
  const pentR   = '#880011'   // Inverted pentagram lines

  // Key vertical coordinates
  const headCX  = 150
  const headCY  = 152         // Goat head centre y
  const torsoT  = headCY + 22  // = 174: torso top
  const torsoB  = 240         // Torso base (below = haunches)
  const lakeY   = 296         // Lake of Fire surface y
  const floorY  = 346         // Lower edge

  // Inverted caduceus: held in right hand, pointing down into Lake
  const iCadX   = 184         // Caduceus X (right of centre)
  const iCadTop = torsoT + 14  // = 188: right-hand grip level
  const iCadBot = lakeY - 2   // = 294: tip enters Lake

  // Ziggurat: 4 tiers, centre x=212, tiers stored as [y_top, width]
  const zCX   = 212
  const tiers = [
    [168, 90],   // Tier 1 base (widest)
    [140, 70],   // Tier 2
    [112, 50],   // Tier 3
    [84,  30],   // Tier 4 top (narrowest)
  ]

  // ── Ghost Ayin (ע) — the Eye; this path is the capacity to see only matter ──
  const ayinBg = `
  <!-- Ghost Ayin (ע) — the Eye and Fountain; the Devil sees only material forms -->
  <text x="152" y="218"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="252" fill="#080418" opacity="0.12">ע</text>`

  // ── Qliphothic corner glows (BOTTOM) — inverted mirror of Geburah glows in XIII ──
  // Where Death (XIII) had top-corner Geburah glows pulling upward through Severity,
  // the Devil has bottom-corner Qliphothic glows pulling downward into the shells
  const qlGlows = `
  <!-- Qliphothic glows — bottom corners; inverted mirror of Geburah glows in Death (XIII) -->
  <circle cx="28"  cy="${lakeY + 28}" r="30" fill="${qlGlow}" opacity="0.55" filter="url(#softglow)"/>
  <circle cx="272" cy="${lakeY + 28}" r="30" fill="${qlGlow}" opacity="0.55" filter="url(#softglow)"/>`

  // ── Ziggurat = Qliphothic Tree ──
  // Babel was a stepped ziggurat (not a European tower) — the architectural Qliphoth
  // Its tiers are the hollow parody of the Tree of Life's paths; its 10 dark stone-nodes
  // are the shadow-Sephiroth (the husks/shells where the light was refused)
  // Lightning already descends at the crown: the judgment is accomplished, not pending
  const tierRects = tiers.map(([ty, tw]) =>
    `<rect x="${f(zCX - tw / 2)}" y="${ty}" width="${tw}" height="28"
          fill="${towrC}" stroke="${towrLt}" stroke-width="0.6" opacity="0.90"/>`
  ).join('\n  ')

  const tierCourses = tiers.flatMap(([ty, tw]) =>
    [1, 2].map(i =>
      `<line x1="${f(zCX - tw / 2 + 4)}" y1="${ty + 8 * i}" x2="${f(zCX + tw / 2 - 4)}" y2="${ty + 8 * i}"
            stroke="${towrLt}" stroke-width="0.4" opacity="0.45"/>`
    )
  ).join('\n  ')

  // 10 Qliphothic nodes in approximate Tree of Life positions mapped onto the ziggurat
  const qlNodes = [
    [zCX,       88,  'Kether'],
    [zCX + 13,  101, 'Chokmah'],
    [zCX - 13,  101, 'Binah'],
    [zCX + 21,  124, 'Chesed'],
    [zCX - 21,  124, 'Geburah'],
    [zCX,       132, 'Tiphareth'],
    [zCX + 28,  152, 'Netzach'],
    [zCX - 28,  152, 'Hod'],
    [zCX,       163, 'Yesod'],
    [zCX,       185, 'Malkuth'],
  ]
  const nodeMarks = qlNodes.map(([nx, ny, lbl]) =>
    `<!-- Qlipha of ${lbl} -->
  <circle cx="${f(nx)}" cy="${ny}" r="3.5"
          fill="#080412" stroke="#2a1830" stroke-width="0.8" opacity="0.82"/>`
  ).join('\n  ')

  // Lightning bolt: same white energy as the Fool's solar disk — the light cannot be counterfeited
  // Already descending: the Tower falls the moment it was built
  const lightning = `
  <!-- Lightning — divine judgment already in motion; the same white light as the Fool's sun -->
  <!-- The Tower falls the moment its architect confuses material accumulation with ascent -->
  <path d="M${f(zCX + 12)},78 L${f(zCX + 6)},92 L${f(zCX + 11)},96 L${f(zCX + 2)},116 L${f(zCX + 8)},120 L${f(zCX - 2)},140"
        fill="none" stroke="${lightnC}" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.84" filter="url(#glow)"/>
  <path d="M${f(zCX + 12)},78 L${f(zCX + 6)},92 L${f(zCX + 11)},96 L${f(zCX + 2)},116 L${f(zCX + 8)},120 L${f(zCX - 2)},140"
        fill="none" stroke="${lightnC}" stroke-width="6" opacity="0.10" filter="url(#softglow)"/>
  <!-- Crown crack at lightning strike -->
  <path d="M${f(zCX - 5)},84 L${zCX},91 L${f(zCX + 7)},87"
        fill="none" stroke="${brimLt}" stroke-width="1.6" opacity="0.72"/>`

  const ziggurat = `
  <!-- Ziggurat = Qliphothic Tree — Babel reaching for the divine through material accumulation -->
  <!-- "Let us build a tower whose top is in the heavens" (Gen 11:4) -->
  <!-- Same vertical aspiration as the Hermit's staff and Art's arrow — but built, not grown -->
  <!-- Ten hollow stone-nodes in Tree of Life positions: the Qliphoth, the shells of refused light -->
  ${tierRects}
  ${tierCourses}
  ${nodeMarks}
  ${lightning}`

  // ── Beast shadow on Tower ──
  // The seven-headed Beast (Lust XI) is the Devil's appetite as history has seen it
  // The torch-light casts the Devil's shadow on the Tower wall, and the shadow has seven heads
  // Extremely subtle — visible to those who look, invisible to those who don't
  const bHeads = [
    [zCX - 20, 100, 4],
    [zCX - 10,  95, 4],
    [zCX,       91, 6],   // central, largest
    [zCX + 10,  95, 4],
    [zCX + 20, 100, 4],
    [zCX - 6,  107, 3.5],
    [zCX + 6,  107, 3.5],
  ]
  const beastShadow = `
  <!-- Beast shadow — the Devil's appetite as history (and Revelation) has seen it -->
  <!-- Same seven heads as Lust (XI); the Beast is what Pan looks like in the light of empire -->
  ${bHeads.map(([bx, by, br]) =>
    `<ellipse cx="${f(bx)}" cy="${by}" rx="${br}" ry="${f(br * 0.75)}"
              fill="#050210" opacity="0.52"/>`
  ).join('\n  ')}
  <ellipse cx="${zCX}" cy="128" rx="22" ry="16" fill="#050210" opacity="0.38"/>`

  // ── Lake of Fire ──
  // Capricorn's sea — the sea-goat's fish-tail descends into this
  // The Devil rules it now; it will receive him (Rev 20:10)
  // Counter-image to Art's carefully managed cauldron: undifferentiated burning
  const lakeFlames = [
    [52,  lakeY - 7,  22, 14],
    [92,  lakeY - 13, 18, 20],
    [132, lakeY - 9,  14, 15],
    [150, lakeY - 22, 16, 28],   // central axis flame (echoes Art's cauldron flame)
    [168, lakeY - 9,  14, 15],
    [208, lakeY - 13, 18, 20],
    [248, lakeY - 7,  22, 14],
  ]
  const lakeOfFire = `
  <!-- Lake of Fire — Rev 20:10; Capricorn's sea; the anti-Art -->
  <!-- Where Art (XIV) had the V.I.T.R.I.O.L. cauldron, here is undifferentiated brimstone -->
  <!-- The Devil's domain is also his fate: the measure is already taken -->
  <rect x="18" y="${lakeY}" width="264" height="${floorY - lakeY + 6}" fill="${lakeC}" opacity="0.94"/>
  <!-- Sulfur-fire surface wave -->
  <path d="M18,${lakeY} Q50,${lakeY - 5} 82,${lakeY} Q114,${lakeY + 5} 150,${lakeY} Q186,${lakeY - 5} 218,${lakeY} Q250,${lakeY + 5} 282,${lakeY}"
        fill="none" stroke="${brimDk}" stroke-width="1.4" opacity="0.58"/>
  <!-- Flame tongues -->
  ${lakeFlames.map(([fx, fy, fw, fh]) =>
    `<path d="M${f(fx - fw / 2)},${lakeY} Q${f(fx - fw * 0.2)},${f(fy + fh * 0.3)} ${fx},${fy} Q${f(fx + fw * 0.2)},${f(fy + fh * 0.3)} ${f(fx + fw / 2)},${lakeY}"
          fill="${brimDk}" opacity="0.54"/>`
  ).join('\n  ')}
  <!-- Bright sulfur cores -->
  ${lakeFlames.filter((_, i) => i !== 3).map(([fx, fy, fw]) =>
    `<ellipse cx="${fx}" cy="${f(fy + 4)}" rx="${f(fw * 0.24)}" ry="${f(fw * 0.34)}"
              fill="${brimLt}" opacity="0.40"/>`
  ).join('\n  ')}
  <!-- Central axis flame (same position as Art's cauldron — the Work inverted) -->
  <path d="M143,${lakeY} Q148,${lakeY - 24} 150,${lakeY - 32} Q152,${lakeY - 24} 157,${lakeY}"
        fill="${brimLt}" opacity="0.52" filter="url(#glow)"/>
  <path d="M146,${lakeY} Q149,${lakeY - 16} 150,${lakeY - 20} Q151,${lakeY - 16} 154,${lakeY}"
        fill="${brimFl}" opacity="0.68"/>
  <!-- Sulfur glow on surface -->
  <rect x="18" y="${lakeY - 5}" width="264" height="5"
        fill="${brimDk}" opacity="0.18" filter="url(#softglow)"/>
  <!-- Capricorn ♑ and Ayin ע — attribution floating in the Lake -->
  <text x="72"  y="${lakeY + 28}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Segoe UI Symbol','Apple Symbols',sans-serif"
        font-size="13" fill="${brimDk}" opacity="0.38">♑</text>
  <text x="228" y="${lakeY + 28}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="14" fill="${brimDk}" opacity="0.38">ע</text>`

  // ── Inverted Caduceus — Art XIV's axis pointed downward into the Lake ──
  // The Logos turned toward matter; Mercury/Sulphur now descending not ascending
  const iCadH   = iCadBot - iCadTop
  const iSegs   = 4
  const iSegH   = iCadH / iSegs
  let iLeft  = `M${f(iCadX - 8)},${iCadTop}`
  let iRight = `M${f(iCadX + 8)},${iCadTop}`
  for (let i = 0; i < iSegs; i++) {
    const y0  = iCadTop + i * iSegH
    const y2  = iCadTop + (i + 1) * iSegH
    const dir = i % 2 === 0 ? 1 : -1
    iLeft  += ` C${f(iCadX + dir * 14)},${f(y0 + iSegH * 0.28)} ${f(iCadX + dir * 14)},${f(y0 + iSegH * 0.72)} ${f(iCadX - dir * 8)},${f(y2)}`
    iRight += ` C${f(iCadX - dir * 14)},${f(y0 + iSegH * 0.28)} ${f(iCadX - dir * 14)},${f(y0 + iSegH * 0.72)} ${f(iCadX + dir * 8)},${f(y2)}`
  }
  const invCaduceus = `
  <!-- Inverted Caduceus — Art XIV's axis reversed; the Logos turned toward matter -->
  <!-- Wings point INTO the Lake — the caduceus's aspiration inverted to immersion -->
  <line x1="${iCadX}" y1="${iCadTop}" x2="${iCadX}" y2="${iCadBot}"
        stroke="${figMd}" stroke-width="2" opacity="0.52"/>
  <path d="${iLeft}"  fill="none" stroke="${brimDk}" stroke-width="1.4" opacity="0.56"/>
  <path d="${iRight}" fill="none" stroke="${serpDk}" stroke-width="1.4" opacity="0.52"/>
  <!-- Inverted wings at base (entering the Lake) -->
  <path d="M${f(iCadX - 8)},${f(iCadBot - 4)} C${f(iCadX - 24)},${f(iCadBot + 6)} ${f(iCadX - 28)},${f(iCadBot - 8)} ${f(iCadX - 20)},${f(iCadBot - 18)}"
        fill="none" stroke="${figMd}" stroke-width="1.2" opacity="0.44"/>
  <path d="M${f(iCadX + 8)},${f(iCadBot - 4)} C${f(iCadX + 24)},${f(iCadBot + 6)} ${f(iCadX + 28)},${f(iCadBot - 8)} ${f(iCadX + 20)},${f(iCadBot - 18)}"
        fill="none" stroke="${figMd}" stroke-width="1.2" opacity="0.44"/>`

  // ── Baphomet/Pan — central figure ──
  // Horn tips at y=headCY-52=100; torch peaks near y=82 (top of body zone)
  const hornTipLy = headCY - 52   // = 100
  const hornTipRy = headCY - 52
  const hornL = `M${f(headCX - 18)},${f(headCY - 12)} C${f(headCX - 34)},${f(headCY - 32)} ${f(headCX - 30)},${f(headCY - 50)} ${f(headCX - 14)},${hornTipLy}`
  const hornR = `M${f(headCX + 18)},${f(headCY - 12)} C${f(headCX + 34)},${f(headCY - 32)} ${f(headCX + 30)},${f(headCY - 50)} ${f(headCX + 14)},${hornTipRy}`

  // Inverted pentagram — spirit subjugated to matter; microcosm inverted
  const pPts = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI / 5) + Math.PI / 2   // first point at bottom = inverted
    return [f(headCX + 11 * Math.cos(a)), f(headCY - 20 + 11 * Math.sin(a))]
  })
  const pentLines = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]].map(([a, b]) =>
    `<line x1="${pPts[a][0]}" y1="${pPts[a][1]}" x2="${pPts[b][0]}" y2="${pPts[b][1]}"
          stroke="${pentR}" stroke-width="0.9" opacity="0.64"/>`
  ).join('\n  ')

  const baphomet = `
  <!-- Baphomet/Pan — the irresistible principle of material force; Pan = All -->
  <!-- Joyful, not grimacing — the Devil is not malice but excess without direction -->
  <!-- The all-consuming Appetite; the Beast (XI) is one of his faces -->
  <!-- Horns — large, sweeping, dominant; horn tips just above header border -->
  <path d="${hornL}" fill="none" stroke="${hornC}" stroke-width="7" stroke-linecap="round" opacity="0.92"/>
  <path d="${hornR}" fill="none" stroke="${hornC}" stroke-width="7" stroke-linecap="round" opacity="0.92"/>
  <path d="${hornL}" fill="none" stroke="${brimDk}" stroke-width="3" opacity="0.14"/>
  <path d="${hornR}" fill="none" stroke="${brimDk}" stroke-width="3" opacity="0.14"/>
  <!-- Torch between horn tips — material fire imitating Tiphareth's light; always combustion, never illumination -->
  <!-- The Fool's solar disk is transcendence; this torch is its material parody -->
  <line x1="${headCX}" y1="${hornTipLy}" x2="${headCX}" y2="${f(headCY - 64)}"
        stroke="${figMd}" stroke-width="3.5" stroke-linecap="round" opacity="0.74"/>
  <path d="M${f(headCX - 7)},${f(headCY - 66)} Q${f(headCX - 5)},${f(headCY - 80)} ${headCX},${f(headCY - 88)} Q${f(headCX + 5)},${f(headCY - 80)} ${f(headCX + 7)},${f(headCY - 66)}"
        fill="${brimDk}" opacity="0.74" filter="url(#glow)"/>
  <path d="M${f(headCX - 4)},${f(headCY - 68)} Q${headCX},${f(headCY - 86)} ${headCX},${f(headCY - 92)} Q${headCX},${f(headCY - 86)} ${f(headCX + 4)},${f(headCY - 68)}"
        fill="${brimLt}" opacity="0.76"/>
  <path d="M${f(headCX - 2)},${f(headCY - 78)} Q${headCX},${f(headCY - 96)} ${f(headCX + 2)},${f(headCY - 78)}"
        fill="${brimFl}" opacity="0.70"/>
  <circle cx="${headCX}" cy="${f(headCY - 80)}" r="12" fill="${brimDk}" opacity="0.10" filter="url(#softglow)"/>
  <!-- Skull (goat — broad, flat) -->
  <ellipse cx="${headCX}" cy="${f(headCY - 4)}" rx="22" ry="18" fill="${figDk}" opacity="0.90"/>
  <!-- Snout (elongated goat muzzle) -->
  <path d="M${f(headCX - 10)},${headCY} Q${f(headCX - 14)},${f(headCY + 15)} ${f(headCX - 8)},${f(headCY + 23)} Q${headCX},${f(headCY + 27)} ${f(headCX + 8)},${f(headCY + 23)} Q${f(headCX + 14)},${f(headCY + 15)} ${f(headCX + 10)},${headCY}"
        fill="${figMd}" opacity="0.86"/>
  <!-- Beard -->
  <path d="M${f(headCX - 6)},${f(headCY + 23)} Q${headCX},${f(headCY + 40)} ${headCX},${f(headCY + 46)} Q${headCX},${f(headCY + 40)} ${f(headCX + 6)},${f(headCY + 23)}"
        fill="${hornC}" opacity="0.74"/>
  <!-- Goat ears (horizontal, swept back) -->
  <path d="M${f(headCX - 22)},${f(headCY - 6)} L${f(headCX - 38)},${f(headCY - 1)} L${f(headCX - 26)},${f(headCY + 9)}" fill="${figDk}" opacity="0.82"/>
  <path d="M${f(headCX + 22)},${f(headCY - 6)} L${f(headCX + 38)},${f(headCY - 1)} L${f(headCX + 26)},${f(headCY + 9)}" fill="${figDk}" opacity="0.82"/>
  <!-- Inverted pentagram on brow — spirit subjugated to matter; the microcosm inverted -->
  ${pentLines}
  <!-- Third Eye (Ayin ע — the Eye that is this path's letter; sees only material forms) -->
  <circle cx="${headCX}" cy="${f(headCY - 13)}" r="10" fill="${eyeAmb}" opacity="0.18" filter="url(#softglow)"/>
  <circle cx="${headCX}" cy="${f(headCY - 13)}" r="5.5" fill="${eyeAmb}" opacity="0.80"/>
  <ellipse cx="${headCX}" cy="${f(headCY - 13)}" rx="2.5" ry="3.5" fill="${eyeGld}" opacity="0.92"/>
  <!-- Hairy torso -->
  <path d="M${f(headCX - 22)},${torsoT} Q${f(headCX - 34)},${f(torsoT + 38)} ${f(headCX - 36)},${torsoB}
           L${f(headCX + 36)},${torsoB} Q${f(headCX + 34)},${f(torsoT + 38)} ${f(headCX + 22)},${torsoT} Z"
        fill="${figDk}" opacity="0.88"/>
  <!-- Chest/belly hair texture -->
  ${Array.from({ length: 9 }, (_, i) => {
    const hx = headCX - 20 + i * 5
    const hy = torsoT + 16 + (i % 3) * 9
    return `<line x1="${f(hx)}" y1="${hy}" x2="${f(hx + 3)}" y2="${f(hy + 7)}" stroke="${figMd}" stroke-width="0.7" opacity="0.48"/>`
  }).join('\n  ')}
  <!-- Left arm raised (the sign of material command — As Below; not As Above) -->
  <line x1="${f(headCX - 22)}" y1="${f(torsoT + 12)}" x2="${f(headCX - 56)}" y2="${f(torsoT - 8)}"
        stroke="${figMd}" stroke-width="7" stroke-linecap="round" opacity="0.80"/>
  <circle cx="${f(headCX - 56)}" cy="${f(torsoT - 8)}" r="6" fill="${figMd}" opacity="0.74"/>
  <!-- Right arm lowered (holds inverted caduceus, pointing into Lake) -->
  <line x1="${f(headCX + 22)}" y1="${f(torsoT + 12)}" x2="${iCadX}" y2="${iCadTop}"
        stroke="${figMd}" stroke-width="7" stroke-linecap="round" opacity="0.78"/>
  <!-- Goat haunches (below torso — Capricorn body) -->
  <path d="M${f(headCX - 36)},${torsoB} Q${f(headCX - 40)},${f(torsoB + 26)} ${f(headCX - 30)},${f(torsoB + 50)} L${f(headCX - 20)},${lakeY}"
        fill="${figDk}" opacity="0.84"/>
  <path d="M${f(headCX + 36)},${torsoB} Q${f(headCX + 40)},${f(torsoB + 26)} ${f(headCX + 30)},${f(torsoB + 50)} L${f(headCX + 20)},${lakeY}"
        fill="${figDk}" opacity="0.84"/>
  <!-- Cloven hooves just above Lake surface -->
  <ellipse cx="${f(headCX - 24)}" cy="${lakeY - 2}" rx="8" ry="5" fill="${hornC}" opacity="0.86"/>
  <ellipse cx="${f(headCX + 24)}" cy="${lakeY - 2}" rx="8" ry="5" fill="${hornC}" opacity="0.86"/>
  <!-- Fish-tail hint (Capricorn sea-goat: the tail descends into the Lake he rules and will consume him) -->
  <path d="M${f(headCX - 10)},${lakeY} Q${f(headCX - 6)},${lakeY + 18} ${f(headCX - 16)},${lakeY + 30}"
        fill="none" stroke="${serpDk}" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>
  <path d="M${f(headCX + 10)},${lakeY} Q${f(headCX + 6)},${lakeY + 18} ${f(headCX + 16)},${lakeY + 30}"
        fill="none" stroke="${serpDk}" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>`

  // ── Nachash — the Eden serpent; rises from the Lake, coils become chains ──
  // נחש — the shining one; same lie as Babel: "you shall be as gods" (Gen 3:5)
  // The Edenic promise and the Babel program are one voice; here it is embodied
  const nachash = `
  <!-- Nachash (נחש) — the Eden serpent; "you shall be as gods" = Babel's program -->
  <!-- Rises from the Lake it inhabits; its coils are the chains of the bound Lovers -->
  <!-- Nachash body rising from Lake centre -->
  <path d="M148,${lakeY} C146,${lakeY - 22} 154,${lakeY - 42} 148,${lakeY - 58} C142,${lakeY - 74} 152,${lakeY - 82} 150,${lakeY - 68}"
        fill="none" stroke="${serpDk}" stroke-width="5" stroke-linecap="round" opacity="0.74"/>
  <path d="M148,${lakeY} C146,${lakeY - 22} 154,${lakeY - 42} 148,${lakeY - 58} C142,${lakeY - 74} 152,${lakeY - 82} 150,${lakeY - 68}"
        fill="none" stroke="${serpMd}" stroke-width="2.5" stroke-linecap="round" opacity="0.50"/>
  <!-- Serpent head (facing upward — toward Baphomet, its master and its substance) -->
  <ellipse cx="150" cy="${lakeY - 72}" rx="7" ry="5" fill="${serpDk}" opacity="0.82"/>
  <!-- Forked tongue -->
  <path d="M147,${lakeY - 76} L150,${lakeY - 84} L153,${lakeY - 76}"
        fill="none" stroke="${serpMd}" stroke-width="1.2" opacity="0.65"/>
  <!-- Left coil → King's chain (corrupted gold: same palette lineage as Art's solGold) -->
  <!-- Gold darkened from #ddaa22 to #886622 — the same substance, unmaintained -->
  <path d="M145,${lakeY - 8} C120,${lakeY - 6} 102,${lakeY - 18} 88,${lakeY - 22}"
        fill="none" stroke="${chainGd}" stroke-width="3.5" stroke-linecap="round" opacity="0.70"/>
  <path d="M145,${lakeY - 8} C120,${lakeY - 6} 102,${lakeY - 18} 88,${lakeY - 22}"
        fill="none" stroke="${serpDk}" stroke-width="1.5" stroke-linecap="round" opacity="0.38"/>
  <!-- Right coil → Queen's chain (corrupted silver: same palette lineage as Art's lunSilv) -->
  <!-- Silver darkened from #8899bb to #445577 — the union of the Lovers, now divided and bound -->
  <path d="M155,${lakeY - 8} C180,${lakeY - 6} 198,${lakeY - 18} 212,${lakeY - 22}"
        fill="none" stroke="${chainSv}" stroke-width="3.5" stroke-linecap="round" opacity="0.66"/>
  <path d="M155,${lakeY - 8} C180,${lakeY - 6} 198,${lakeY - 18} 212,${lakeY - 22}"
        fill="none" stroke="${serpDk}" stroke-width="1.5" stroke-linecap="round" opacity="0.36"/>`

  // ── Chained figures — the King and Queen of The Lovers (VI) / Art (XIV), enslaved ──
  // Those who sought divinity through material accumulation rather than the Great Work
  // Their colouring is the corrupted echo of VI and XIV: recognisable to the attentive Reader
  // The Reader who has passed through the Hanged Man is not these figures
  const chainedFigures = `
  <!-- Chained King and Queen — echoing The Lovers (VI) and Art (XIV) -->
  <!-- The alchemical pair who chose the Nachash's shortcut; same colours, now darkened -->
  <!-- King (left) — corrupted gold (#886622 ← Lovers' King #c8a060 ← Art's solGold #ddaa22) -->
  <ellipse cx="80" cy="${lakeY - 24}" rx="7" ry="8" fill="${chainGd}" opacity="0.70"/>
  <path d="M74,${lakeY - 16} Q70,${lakeY - 5} 72,${lakeY}" fill="${chainGd}" opacity="0.56"/>
  <circle cx="76" cy="${lakeY - 18}" r="4.5" fill="none"
          stroke="${chainGd}" stroke-width="1.5" opacity="0.56"/>
  <!-- Queen (right) — corrupted silver (#445577 ← Lovers' Queen #c0b8d0 ← Art's lunSilv #8899bb) -->
  <ellipse cx="220" cy="${lakeY - 24}" rx="7" ry="8" fill="${chainSv}" opacity="0.66"/>
  <path d="M214,${lakeY - 16} Q210,${lakeY - 5} 212,${lakeY}" fill="${chainSv}" opacity="0.52"/>
  <circle cx="224" cy="${lakeY - 18}" r="4.5" fill="none"
          stroke="${chainSv}" stroke-width="1.5" opacity="0.52"/>`

  // ── Assemble ──
  // Z-order: ghost → qliphoth glows → ziggurat → beast shadow → lake →
  //          inverted caduceus → baphomet → nachash → chained figures
  const bodyContent = [
    ayinBg,
    qlGlows,
    ziggurat,
    beastShadow,
    lakeOfFire,
    invCaduceus,
    baphomet,
    nachash,
    chainedFigures,
  ].join('\n')

  return majorCard({
    title: 'THE DEVIL', number: 'XV',
    hebrew: 'Ayin · Capricorn · Path 26',
    hebrewLetter: 'ע', attribution: '♑',
    bg1: '#020208', bg2: '#040412',
    border: '#1a0a28', accent: '#2a1448',
    text: '#aa88cc', dim: '#2a1440',
    bodyContent,
  })
}

function card16() {
  // ── Colour palette ──
  const strikC  = '#ff3300'   // Mars scarlet — lightning strike (path 27, Peh)
  const strikMd = '#dd2200'   // Mars scarlet mid
  const glowC   = '#ff6600'   // Divine fire — orange-red outer burst
  const lightC  = '#ffcc44'   // Lightning core / divine burst inner (same family as solar disk)
  const waterC  = '#4488cc'   // Flood water — blue, Noaic / Meribah
  const waterLt = '#99ccee'   // Water highlight
  const waterDk = '#224466'   // Water shadow
  const doveC   = '#e8e0d0'   // Ivory dove
  const doveGy  = '#c0b8b0'   // Dove shadow
  const arkC    = '#3a2010'   // Tiny ark — dark wood
  const towrC   = '#1c1408'   // Ziggurat stone (same as XV)
  const towrLt  = '#2a2010'   // Ziggurat stone highlight / mortar
  const towrCr  = '#0e0806'   // Ziggurat cracked stone (darker fissures)
  const nephC   = '#2a1a08'   // Nephilim flesh — very dark warm-brown, almost stone
  const nephWg  = '#181008'   // Wing-stub — barely lighter than masonry
  const nodeIll = '#663311'   // Qliphothic node — dim amber, partially filled with divine fire
  const nodeDk  = '#150c04'   // Qliphothic node — still dark (XV palette)
  const lakeC   = '#1a0800'   // Receding Lake of Fire (XV palette, reduced)
  const lakeGl  = '#441100'   // Lake glow — fading
  const figGd   = '#886622'   // Fallen King — corrupted gold (XV chainGd)
  const figSv   = '#445577'   // Fallen Queen — corrupted silver (XV chainSv)
  const chainBk = '#555555'   // Broken chain links — grey, no longer gold or silver

  // ── Key coordinates ──
  // burstCY=68   — divine burst centre (top of card)
  // pehGY=150    — ghost Peh (פ) letterform centre-y (background)
  // zCX=148      — ziggurat centre-x (slightly left to leave space for Nephilim arm)
  // zTop=128     — ziggurat crown (where lightning strikes / Meribah rock)
  // tier tops (y, full-width): [128,52], [162,84], [200,116], [244,148]
  // strikeX=148, strikeY=128  — lightning impact / Meribah struck-stone crack
  // waterStartY=132           — flood water origin at crack
  // nephTorsoX=52             — Nephilim torso left edge (on ziggurat left face)
  // nephTorsoY=192            — Nephilim torso top (spans ~80px = ~4 stone courses)
  // nephArmY=224              — Nephilim reaching arm centre-y
  // nephWingY=200             — Wing-stub root
  // nodePositions: same 10 Tree-of-Life placements as XV, now mixed lit/dark
  // lakeY=320                 — receding Lake surface
  // floodMeetY=316            — flood water meets lake edge
  // kingCX=72, kingCY=304     — fallen King (tilted, chains breaking)
  // queenCX=232, queenCY=298  — fallen Queen (tilted opposite)
  // arkX=246, arkY=108        — tiny ark silhouette (upper right corner)
  // doveX=218, doveY=82       — dove with olive branch (upper right)

  const bodyContent = `
    <!-- ═══ Ghost Peh (פ) — mouth of divine decree, tongue of Babel ═══ -->
    <!-- פ: open curved form with descending inner leg -->
    <!-- Peh = the mouth Moses failed to use at Meribah; the tongue scattered at Babel -->
    <g opacity="0.09" fill="none" stroke="#ff6600" stroke-width="14" stroke-linecap="round">
      <!-- Outer bowl of Peh — wide C-curve opening right -->
      <path d="M96,82 C76,82 62,98 62,118 C62,146 82,158 108,158 C134,158 148,144 148,124"/>
      <!-- Inner descending leg — the distinctive element of Peh -->
      <line x1="118" y1="118" x2="118" y2="192"/>
      <!-- Foot of inner leg -->
      <line x1="118" y1="192" x2="102" y2="200"/>
    </g>

    <!-- ═══ Divine burst — top of card ═══ -->
    <!-- solarDisk lineage: Fool (free sky) → Hermit (lanterned) → Art (crowned) → Tower (exploded) -->
    <!-- Here the containment is gone: the light has burst its vessel entirely -->
    <defs>
      <radialGradient id="burstGrad" cx="50%" cy="0%" r="55%" fx="50%" fy="0%">
        <stop offset="0%"   stop-color="${lightC}" stop-opacity="1"/>
        <stop offset="18%"  stop-color="${glowC}"  stop-opacity="0.9"/>
        <stop offset="45%"  stop-color="${strikC}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${strikC}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="lakeRecede" cx="50%" cy="100%" r="50%">
        <stop offset="0%"   stop-color="${lakeGl}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${lakeC}"  stop-opacity="0.2"/>
      </radialGradient>
      <radialGradient id="waterBurst" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${waterLt}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${waterC}"  stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Burst corona — 16 rays fanning outward from top -->
    <g opacity="0.72">
      ${Array.from({length:16}, (_,i) => {
        const a = (i / 16) * Math.PI  // half-circle fan, top of card
        const x1 = 150 + Math.cos(a - Math.PI/2) * 18
        const y1 = 68  + Math.sin(a - Math.PI/2) * 18
        const x2 = 150 + Math.cos(a - Math.PI/2) * (52 + (i % 3) * 14)
        const y2 = 68  + Math.sin(a - Math.PI/2) * (52 + (i % 3) * 14)
        const w  = i % 4 === 0 ? 2.5 : i % 2 === 0 ? 1.8 : 1.0
        return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${strikC}" stroke-width="${w}" stroke-opacity="0.7"/>`
      }).join('')}
    </g>
    <!-- Burst glow fill -->
    <ellipse cx="150" cy="0" rx="130" ry="110" fill="url(#burstGrad)" opacity="0.85"/>
    <!-- Burst core disk — the burst containment-vessel -->
    <circle cx="150" cy="68" r="18" fill="${lightC}" opacity="0.92"/>
    <circle cx="150" cy="68" r="11" fill="white"    opacity="0.85"/>

    <!-- ═══ Dove with olive branch — Noaic peace; the Reader's safe harbour ═══ -->
    <!-- Dove descends from the burst, returning to the ark — the Reader occupies this space -->
    <g transform="translate(218,82) rotate(-18)">
      <!-- Body -->
      <ellipse cx="0" cy="0" rx="14" ry="8" fill="${doveC}" opacity="0.95"/>
      <!-- Head -->
      <circle cx="13" cy="-4" r="5.5" fill="${doveC}" opacity="0.95"/>
      <!-- Beak -->
      <path d="M17,-3 L22,-2 L17,-1" fill="${doveGy}" opacity="0.9"/>
      <!-- Eye -->
      <circle cx="15" cy="-5" r="1.2" fill="#333"/>
      <!-- Tail -->
      <path d="M-14,0 L-22,5 M-14,1 L-20,-4 M-14,-1 L-21,0"
            stroke="${doveGy}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.9"/>
      <!-- Right wing (near) -->
      <path d="M0,-8 C6,-18 14,-16 10,-8" fill="${doveC}" stroke="${doveGy}" stroke-width="0.8" opacity="0.9"/>
      <!-- Left wing (far, partial) -->
      <path d="M-4,-6 C-10,-14 -4,-18 2,-10" fill="${doveGy}" opacity="0.7"/>
      <!-- Olive branch in beak -->
      <line x1="20" y1="-2" x2="27" y2="-6" stroke="#5a8832" stroke-width="1.2" opacity="0.9"/>
      <ellipse cx="25" cy="-7" rx="3" ry="2" fill="#6a9a3a" opacity="0.9" transform="rotate(-20,25,-7)"/>
      <ellipse cx="28" cy="-5" rx="2.5" ry="1.8" fill="#5a8832" opacity="0.85" transform="rotate(10,28,-5)"/>
    </g>

    <!-- ═══ Tiny ark — upper-right corner; the Reader's refuge ═══ -->
    <!-- The Reader is Noah: protected through willing submission to the Great Work -->
    <g opacity="0.62" transform="translate(248,112)">
      <!-- Hull -->
      <path d="M-18,6 C-18,-2 18,-2 18,6 L14,12 L-14,12 Z" fill="${arkC}"/>
      <!-- Cabin/superstructure -->
      <rect x="-8" y="-2" width="16" height="8" rx="2" fill="${arkC}" opacity="0.85"/>
      <!-- Water line -->
      <path d="M-20,12 C-14,10 -8,13 0,11 C8,9 14,12 20,12"
            stroke="${waterC}" stroke-width="1.2" fill="none" opacity="0.7"/>
    </g>

    <!-- ═══ Lightning bolts — Mars scarlet, the completed judgment ═══ -->
    <!-- In XV the pale bolt was descending; here it has struck in full Martian force -->
    <!-- Multiple channels — the single judgment now branching through the whole structure -->
    <!-- Main bolt: burst to ziggurat crown -->
    <polyline points="150,68 145,88 153,96 144,112 152,118 148,128"
              fill="none" stroke="${strikC}" stroke-width="3.2" stroke-linejoin="round"
              opacity="0.98"/>
    <!-- Main bolt core (bright inner channel) -->
    <polyline points="150,68 145,88 153,96 144,112 152,118 148,128"
              fill="none" stroke="${lightC}" stroke-width="1.4" stroke-linejoin="round"
              opacity="0.85"/>
    <!-- Branch bolt left — forking at mid-height -->
    <polyline points="147,104 138,114 128,118 124,132"
              fill="none" stroke="${strikC}" stroke-width="1.8" stroke-linejoin="round"
              opacity="0.75"/>
    <!-- Branch bolt right — forking toward ziggurat right face -->
    <polyline points="151,110 160,118 168,116 174,130"
              fill="none" stroke="${strikC}" stroke-width="1.8" stroke-linejoin="round"
              opacity="0.75"/>
    <!-- Impact flash at strike point -->
    <circle cx="148" cy="128" r="8" fill="${lightC}" opacity="0.72"/>
    <circle cx="148" cy="128" r="4" fill="white"    opacity="0.85"/>
    <!-- Radial sparks at impact -->
    ${Array.from({length:8}, (_,i) => {
      const a = (i / 8) * Math.PI * 2
      const x2 = 148 + Math.cos(a) * (10 + (i%3)*4)
      const y2 = 128 + Math.sin(a) * (8  + (i%3)*4)
      return `<line x1="148" y1="128" x2="${f(x2)}" y2="${f(y2)}" stroke="${lightC}" stroke-width="1.2" opacity="0.7"/>`
    }).join('')}

    <!-- ═══ Ziggurat (Tower of Babel = Qliphothic Tree) — crumbling ═══ -->
    <!-- Same 4-tier structure and stone palette as XV, now struck and fractured -->
    <!-- The crumbling is redemptive, not entropic — the Qliphothic husks are being opened -->
    <!-- Tier 4 (crown): y=128–162, w=52 → x=122–174 -->
    <rect x="122" y="128" width="52" height="34" fill="${towrC}" stroke="${towrLt}" stroke-width="0.7" opacity="0.95"/>
    <!-- Crown crack from lightning strike — the Meribah rock moment -->
    <path d="M148,128 L144,138 L150,142 L146,154 L152,158 L148,162"
          fill="none" stroke="${towrCr}" stroke-width="2.2" opacity="0.9"/>
    <!-- Mortar lines tier 4 -->
    <line x1="122" y1="140" x2="174" y2="140" stroke="${towrLt}" stroke-width="0.5" opacity="0.5"/>
    <line x1="122" y1="152" x2="174" y2="152" stroke="${towrLt}" stroke-width="0.5" opacity="0.5"/>
    <line x1="140" y1="128" x2="140" y2="162" stroke="${towrLt}" stroke-width="0.4" opacity="0.4"/>
    <line x1="158" y1="128" x2="158" y2="162" stroke="${towrLt}" stroke-width="0.4" opacity="0.4"/>

    <!-- Tier 3: y=162–200, w=84 → x=106–190 -->
    <rect x="106" y="162" width="84" height="38" fill="${towrC}" stroke="${towrLt}" stroke-width="0.7" opacity="0.95"/>
    <!-- Tier 3 crack continuing from crown -->
    <path d="M148,162 L142,172 L154,178 L144,188 L152,194 L148,200"
          fill="none" stroke="${towrCr}" stroke-width="1.8" opacity="0.8"/>
    <!-- Mortar lines tier 3 -->
    ${[174,186].map(y=>`<line x1="106" y1="${y}" x2="190" y2="${y}" stroke="${towrLt}" stroke-width="0.5" opacity="0.45"/>`).join('')}
    ${[124,142,160,178].map(x=>`<line x1="${x}" y1="162" x2="${x}" y2="200" stroke="${towrLt}" stroke-width="0.4" opacity="0.35"/>`).join('')}
    <!-- Flying debris tier 3 -->
    <rect x="96"  y="164" width="8"  height="6"  fill="${towrC}" opacity="0.82" transform="rotate(-12,96,164)"/>
    <rect x="188" y="168" width="10" height="7"  fill="${towrC}" opacity="0.78" transform="rotate(15,188,168)"/>
    <rect x="100" y="176" width="6"  height="5"  fill="${towrC}" opacity="0.65" transform="rotate(-8,100,176)"/>
    <rect x="192" y="172" width="7"  height="5"  fill="${towrC}" opacity="0.6"  transform="rotate(20,192,172)"/>

    <!-- Tier 2: y=200–244, w=116 → x=90–206 -->
    <rect x="90" y="200" width="116" height="44" fill="${towrC}" stroke="${towrLt}" stroke-width="0.7" opacity="0.95"/>
    <!-- Tier 2 crack -->
    <path d="M148,200 L144,210 L152,218 L142,228 L150,234 L148,244"
          fill="none" stroke="${towrCr}" stroke-width="1.6" opacity="0.7"/>
    <!-- Mortar lines tier 2 -->
    ${[212,224,236].map(y=>`<line x1="90" y1="${y}" x2="206" y2="${y}" stroke="${towrLt}" stroke-width="0.5" opacity="0.4"/>`).join('')}
    ${[108,126,144,162,180,198].map(x=>`<line x1="${x}" y1="200" x2="${x}" y2="244" stroke="${towrLt}" stroke-width="0.4" opacity="0.3"/>`).join('')}

    <!-- Tier 1 (base): y=244–296, w=148 → x=74–222 -->
    <rect x="74" y="244" width="148" height="52" fill="${towrC}" stroke="${towrLt}" stroke-width="0.7" opacity="0.95"/>
    <!-- Mortar lines tier 1 -->
    ${[258,270,282].map(y=>`<line x1="74" y1="${y}" x2="222" y2="${y}" stroke="${towrLt}" stroke-width="0.5" opacity="0.35"/>`).join('')}
    ${[92,110,130,148,166,184,204].map(x=>`<line x1="${x}" y1="244" x2="${x}" y2="296" stroke="${towrLt}" stroke-width="0.4" opacity="0.25"/>`).join('')}

    <!-- ═══ Qliphothic nodes (Tree of Life positions) — mixed lit / dark ═══ -->
    <!-- Same 10 positions as XV; lightning begins to fill the hollow husks -->
    <!-- Kether(148,136): closest to strike → brightest, first to be filled -->
    <!-- Lower nodes still mostly dark — the purging works downward through the structure -->
    <circle cx="148" cy="136" r="5.5" fill="${nodeIll}" stroke="${strikC}"  stroke-width="1.2" opacity="0.92"/>
    <circle cx="148" cy="136" r="2.5" fill="${lightC}"  opacity="0.75"/>
    <!-- Chokmah(168,158), Binah(128,158) — partially lit -->
    <circle cx="168" cy="158" r="4.5" fill="${nodeIll}" stroke="${strikMd}" stroke-width="0.9" opacity="0.82"/>
    <circle cx="128" cy="158" r="4.5" fill="${nodeIll}" stroke="${strikMd}" stroke-width="0.9" opacity="0.82"/>
    <!-- Chesed(178,182), Geburah(118,182) — dim glow -->
    <circle cx="178" cy="182" r="4"   fill="${nodeIll}" stroke="${towrLt}"  stroke-width="0.7" opacity="0.65"/>
    <circle cx="118" cy="182" r="4"   fill="${nodeIll}" stroke="${towrLt}"  stroke-width="0.7" opacity="0.65"/>
    <!-- Tiphareth(148,190) — central, mid-lit -->
    <circle cx="148" cy="190" r="5"   fill="${nodeIll}" stroke="${strikMd}" stroke-width="0.8" opacity="0.72"/>
    <!-- Netzach(194,218), Hod(102,218) — still mostly dark -->
    <circle cx="194" cy="218" r="4"   fill="${nodeDk}"  stroke="${towrLt}"  stroke-width="0.6" opacity="0.55"/>
    <circle cx="102" cy="218" r="4"   fill="${nodeDk}"  stroke="${towrLt}"  stroke-width="0.6" opacity="0.55"/>
    <!-- Yesod(148,232), Malkuth(148,260) — darkest, purging not yet reached -->
    <circle cx="148" cy="232" r="4.5" fill="${nodeDk}"  stroke="${towrLt}"  stroke-width="0.6" opacity="0.45"/>
    <circle cx="148" cy="264" r="5"   fill="${nodeDk}"  stroke="${towrLt}"  stroke-width="0.6" opacity="0.45"/>

    <!-- ═══ Flood water — Meribah struck-rock + Noaic flood converged ═══ -->
    <!-- Water bursts from the crack at the lightning impact point -->
    <!-- The same act: God said "speak to the rock" (Peh) — Moses struck it instead -->
    <!-- The water that punished Moses' disobedience is the same water that drowned the Nephilim -->
    <defs>
      <linearGradient id="waterL" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stop-color="${waterLt}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${waterC}"  stop-opacity="0.4"/>
      </linearGradient>
      <linearGradient id="waterR" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="${waterLt}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${waterC}"  stop-opacity="0.4"/>
      </linearGradient>
    </defs>
    <!-- Burst from crack point -->
    <ellipse cx="148" cy="132" rx="12" ry="6" fill="url(#waterBurst)" opacity="0.8"/>
    <!-- Left water stream down ziggurat face -->
    <path d="M142,132 C138,148 130,162 118,174 C108,184 96,196 84,216 C76,230 74,252 74,272"
          fill="none" stroke="${waterC}" stroke-width="3.5" opacity="0.72" stroke-linecap="round"/>
    <path d="M140,132 C136,146 128,160 116,172 C106,182 94,194 82,214"
          fill="none" stroke="${waterLt}" stroke-width="1.4" opacity="0.55"/>
    <!-- Right water stream -->
    <path d="M154,132 C158,148 166,162 178,174 C188,184 200,196 214,218 C220,232 222,254 222,272"
          fill="none" stroke="${waterC}" stroke-width="3.5" opacity="0.72" stroke-linecap="round"/>
    <path d="M156,132 C160,146 168,160 180,172 C190,182 202,194 216,216"
          fill="none" stroke="${waterLt}" stroke-width="1.4" opacity="0.55"/>
    <!-- Cascade drips from tier edges -->
    ${[[106,200],[90,244],[74,296]].map(([x,y])=>
      `<path d="M${x},${y} C${x-4},${y+8} ${x-2},${y+16} ${x-6},${y+24}" fill="none" stroke="${waterC}" stroke-width="2" opacity="0.5"/>`
    ).join('')}
    ${[[190,200],[206,244],[222,296]].map(([x,y])=>
      `<path d="M${x},${y} C${x+4},${y+8} ${x+2},${y+16} ${x+6},${y+24}" fill="none" stroke="${waterC}" stroke-width="2" opacity="0.5"/>`
    ).join('')}

    <!-- ═══ Nephilim — giant form embedded in the masonry ═══ -->
    <!-- Sons of God and daughters of men (Genesis 6:1-4) -->
    <!-- Holders of divine knowledge who followed Lucifer's pride — they ARE the Tower -->
    <!-- Purged in the Flood of Water (Noah); typifying Lucifer purged in the Flood of Blood (Armageddon) -->
    <!-- Their scale dwarfs the architecture: no size or divine lineage resists the divine judgment -->
    <!-- Near-invisible: opacity ~0.3–0.38 — in the stone, not on it -->

    <!-- Left Nephilim — main figure, torso spanning tier 2 and into tier 1 -->
    <!-- Head/shoulder at y≈196 (above tier 2 top), torso body to y≈280 -->
    <g opacity="0.34">
      <!-- Skull / head (giant — spans 2+ stone courses in implied height) -->
      <ellipse cx="56" cy="208" rx="26" ry="22" fill="${nephC}"/>
      <!-- Jaw -->
      <path d="M32,218 C34,232 42,238 56,240 C70,238 78,232 80,218"
            fill="${nephC}" stroke="none"/>
      <!-- Eye sockets — hollow, vacant -->
      <ellipse cx="46" cy="204" rx="7" ry="8" fill="${towrC}" opacity="0.6"/>
      <ellipse cx="66" cy="204" rx="7" ry="8" fill="${towrC}" opacity="0.6"/>
      <!-- Torso -->
      <path d="M30,240 C24,258 22,278 28,296 L84,296 C88,278 86,258 82,240 Z"
            fill="${nephC}"/>
      <!-- Reaching arm — extends leftward out of the masonry toward viewer -->
      <!-- Forearm breaks through the tier 2 left wall, grasping at air -->
      <path d="M30,256 C14,252 -2,248 -10,244 C-16,240 -14,232 -8,230 C0,228 16,234 30,240"
            fill="${nephC}"/>
      <!-- Hand (partial, fingertips) -->
      <path d="M-10,244 C-16,242 -20,238 -18,234 M-8,246 C-14,246 -18,244 -16,240 M-6,248 C-12,250 -16,248 -14,244"
            stroke="${nephC}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </g>

    <!-- Vestigial wing-stub — emerges from the crack between tier 2 and tier 3 on the left face -->
    <!-- The angelic lineage — now vestigial, being swept by the flood water -->
    <g opacity="0.28">
      <path d="M90,200 C68,188 48,182 32,188 C22,192 20,202 28,208 C40,214 60,210 90,210"
            fill="${nephWg}" stroke="none"/>
      <!-- Wing-feather traces — barely visible -->
      <path d="M88,202 C70,192 52,188 36,194 M86,205 C68,196 50,192 34,198"
            stroke="${nephWg}" stroke-width="1.8" fill="none" opacity="0.6"/>
    </g>

    <!-- Second Nephilim — right side, tier 1, even more buried/dissolved -->
    <!-- Only shoulder-mass and partial arm visible — the flood water already covering most of it -->
    <g opacity="0.22">
      <ellipse cx="214" cy="270" rx="22" ry="18" fill="${nephC}"/>
      <path d="M214,260 C226,254 238,252 246,256 C252,260 250,268 242,272 C234,274 224,272 214,272"
            fill="${nephC}"/>
    </g>

    <!-- ═══ Fallen King — corrupted gold, chains breaking, being released ═══ -->
    <!-- XV's chained King now in motion — the fall is liberation for those who submit -->
    <!-- Left of ziggurat, tilted ~30° clockwise, descending -->
    <g transform="translate(72,306) rotate(28)" opacity="0.88">
      <!-- Body -->
      <rect x="-10" y="-24" width="20" height="36" rx="4" fill="${figGd}" opacity="0.9"/>
      <!-- Head -->
      <circle cx="0" cy="-30" r="9" fill="${figGd}"/>
      <!-- Crown (broken) -->
      <path d="M-9,-38 L-6,-28 M-3,-40 L-1,-28 M3,-40 L2,-28 M8,-38 L6,-28"
            stroke="${figGd}" stroke-width="2.2" stroke-linecap="round"/>
      <!-- Broken chain — link still attached at wrist, rest trailing -->
      <path d="M10,8 C16,12 18,18 14,22 M14,22 C18,26 16,30 12,28"
            stroke="${chainBk}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="14" cy="22" r="2.5" fill="none" stroke="${chainBk}" stroke-width="1.8"/>
    </g>

    <!-- ═══ Fallen Queen — corrupted silver, chains breaking ═══ -->
    <!-- XV's chained Queen, tilted ~28° counter-clockwise, descending right -->
    <g transform="translate(228,300) rotate(-26)" opacity="0.85">
      <!-- Body -->
      <rect x="-10" y="-24" width="20" height="36" rx="4" fill="${figSv}" opacity="0.9"/>
      <!-- Head -->
      <circle cx="0" cy="-30" r="9" fill="${figSv}"/>
      <!-- Hair / veil -->
      <path d="M-9,-24 C-12,-18 -12,4 -10,12 M9,-24 C12,-18 12,4 10,12"
            stroke="${figSv}" stroke-width="2" fill="none" opacity="0.7"/>
      <!-- Broken chain -->
      <path d="M-10,8 C-16,12 -18,18 -14,22 M-14,22 C-18,26 -16,30 -12,28"
            stroke="${chainBk}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="-14" cy="22" r="2.5" fill="none" stroke="${chainBk}" stroke-width="1.8"/>
    </g>

    <!-- ═══ Receding Lake of Fire — diminished from XV ═══ -->
    <!-- Armageddon is prefigured here; the Lake is its destination, not its present state -->
    <!-- Flood water descending from above meets the receding infernal fire below -->
    <rect x="0" y="316" width="300" height="104" fill="${lakeC}" opacity="0.75"/>
    <!-- Lake surface texture — receding waves -->
    ${Array.from({length:5}, (_,i) => {
      const y = 318 + i * 6
      return `<path d="M0,${y} C30,${y-3} 60,${y+3} 90,${y} C120,${y-3} 150,${y+3} 180,${y} C210,${y-3} 240,${y+3} 270,${y} C285,${y-1.5} 295,${y+1} 300,${y}" fill="none" stroke="${lakeGl}" stroke-width="0.8" opacity="${0.35 - i*0.05}"/>`
    }).join('')}
    <!-- Fading flame tongues — smaller than XV, retreating -->
    ${[60,100,148,196,240].map((x,i) => {
      const h = [18,14,22,12,16][i]
      const col = i === 2 ? '#dd4400' : '#aa3300'
      return `<path d="M${x},316 C${x-5},${316-h*0.6} ${x-2},${316-h} ${x},${316-h-4} C${x+2},${316-h} ${x+5},${316-h*0.6} ${x},316" fill="${col}" opacity="${0.28 + i%2*0.08}"/>`
    }).join('')}
    <!-- Flood/fire junction — water (blue) meeting fire (orange-red) at the surface -->
    <path d="M0,316 C40,312 80,318 120,314 C160,310 200,318 240,314 C265,312 285,316 300,314"
          fill="none" stroke="${waterDk}" stroke-width="1.8" opacity="0.45"/>
  `

  return majorCard({
    title: 'THE TOWER', number: 'XVI',
    hebrew: 'Peh · Mars · Path 27',
    hebrewLetter: 'פ', attribution: '♂',
    bg1: '#0e0202', bg2: '#1e0404',
    border: '#3a0808', accent: '#aa2200',
    text: '#dd8866', dim: '#3a1a10',
    bodyContent,
  })
}

function card17() {
  // ── Colour palette — Heh / Aquarius, King Scale violet ──
  const violC   = '#6622aa'   // King Scale violet (Heh/Aquarius path)
  const violLt  = '#9955dd'   // Violet lighter
  const starC   = '#f0ecff'   // Star white (violet-tinted)
  const starGl  = '#bb88ff'   // Star glow — violet
  const milkW   = '#1a1030'   // Milky Way band (barely above bg — the river of stars)
  const watC    = '#d0c4f8'   // Water/star stream — luminous silver-violet
  const watLt   = '#f0ecff'   // Water highlight
  const poolC   = '#080618'   // Mirror pool surface
  const solC    = '#ddaa22'   // Solar garment (same as Art's solGold — now woven into her)
  const solLt   = '#ffcc55'   // Solar garment highlight
  const cresC   = '#c8b8e8'   // Crescent moon — silver-violet (Priestess crescent, subordinated)
  const nuitC   = '#160838'   // Nuit body — she IS the sky (very dark violet)
  const nuitLt  = '#2a1462'   // Nuit highlight / veil
  const heptC   = '#bb88ff'   // Heptagram lines
  const hexC    = '#ffdd88'   // Hexagram — golden Davidic/Abrahamic star
  const magiC   = '#2a1c0a'   // Magi silhouettes
  const towrSil = '#060310'   // Tower silhouette — barely visible, margin of darkness
  const ichC    = '#9878d8'   // Ichthys in stream — faint violet-silver

  // ── Heptagram {7/2} — center (150,170), outer radius 62 ──
  // Connect every 2nd vertex: 0→2→4→6→1→3→5→0
  const hCX = 150, hCY = 170, hR = 62
  const hPts = Array.from({length:7}, (_,i) => {
    const a = -Math.PI/2 + i*(2*Math.PI/7)
    return [hCX + hR*Math.cos(a), hCY + hR*Math.sin(a)]
  })
  const heptPath = [0,2,4,6,1,3,5].map((i,j) =>
    `${j===0?'M':'L'}${f(hPts[i][0])},${f(hPts[i][1])}`).join(' ') + ' Z'

  // ── Inner hexagram (Star of David) — same center, radius 22 ──
  const hexPts = Array.from({length:6}, (_,i) => {
    const a = -Math.PI/2 + i*(Math.PI/3)
    return [hCX + 22*Math.cos(a), hCY + 22*Math.sin(a)]
  })
  const tri1 = [0,2,4].map((i,j)=>`${j===0?'M':'L'}${f(hexPts[i][0])},${f(hexPts[i][1])}`).join(' ')+' Z'
  const tri2 = [1,3,5].map((i,j)=>`${j===0?'M':'L'}${f(hexPts[i][0])},${f(hexPts[i][1])}`).join(' ')+' Z'

  // ── 12-star crown — ring around head (150,106), radius 24 ──
  const crownPts = Array.from({length:12}, (_,i) => {
    const a = -Math.PI/2 + i*(Math.PI/6)
    return [150 + 24*Math.cos(a), 106 + 24*Math.sin(a)]
  })

  // ── Background stars (deterministic positions) ──
  const bgStars = [
    [20,30],[45,15],[80,22],[110,8],[170,18],[210,12],[250,25],[280,15],
    [15,55],[60,48],[95,62],[200,42],[240,58],[275,44],
    [12,90],[50,85],[220,78],[270,88],[295,72],
    [22,128],[58,118],[240,112],[282,125],
    [185,35],[220,48],[258,32],[290,55],
    [165,52],[195,68],[228,75],[265,62],
  ]

  const bodyContent = `
    <defs>
      <linearGradient id="milkyGrad17" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="${milkW}" stop-opacity="0"/>
        <stop offset="30%"  stop-color="${milkW}" stop-opacity="0.9"/>
        <stop offset="50%"  stop-color="#221848"  stop-opacity="1"/>
        <stop offset="70%"  stop-color="${milkW}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${milkW}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="poolGrad17" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stop-color="${poolC}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#020110"  stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="solarGarm17" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${solLt}" stop-opacity="0.55"/>
        <stop offset="42%"  stop-color="${solC}"  stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${solC}"  stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="heptGlow17" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${starC}"  stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${violC}"  stop-opacity="0"/>
      </radialGradient>
      <clipPath id="poolClip17">
        <rect x="0" y="310" width="300" height="110"/>
      </clipPath>
    </defs>

    <!-- Milky Way band: the river of stars crossing the night sky -->
    <!-- In ancient perception the Milky Way was a river — water and stars always one substance -->
    <rect x="-60" y="20" width="460" height="90"
          transform="rotate(20, 150, 210)"
          fill="url(#milkyGrad17)" opacity="0.38"/>

    <!-- Background starfield: the hosts of heaven, children of Abraham, angelic multitude -->
    ${bgStars.map(([x,y],i) => {
      const r = i%5===0 ? 1.9 : i%3===0 ? 1.4 : 1.0
      const op = 0.45 + (i%4)*0.12
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${starC}" opacity="${f(op)}"/>`
    }).join('\n    ')}
    ${Array.from({length:28}, (_,i) => {
      const x = ((i*37+11) % 290) + 5
      const y = ((i*53+17) % 295) + 5
      return `<circle cx="${x}" cy="${y}" r="0.7" fill="${starGl}" opacity="${f(0.25+(i%3)*0.08)}"/>`
    }).join('\n    ')}

    <!-- Ghost Heh: the window — not vessel, weapon, or mouth, but pure aperture -->
    <!-- The gap at upper-right IS the window the star shines through -->
    <!-- "Tzaddi is not the Star" resolves by Heh = window = water; the star shines through both -->
    <g opacity="0.10" fill="none" stroke="${violLt}" stroke-width="11" stroke-linecap="round">
      <line x1="75"  y1="120" x2="208" y2="120"/>
      <line x1="75"  y1="120" x2="75"  y2="242"/>
      <line x1="208" y1="150" x2="208" y2="242"/>
      <line x1="196" y1="242" x2="208" y2="242"/>
    </g>

    <!-- Central heptagram {7/2} — 7 classical planets, 7 days, 7 divine eyes -->
    <!-- The seven-fold completion: planetary cycles encoded as star geometry -->
    <circle cx="${hCX}" cy="${hCY}" r="${hR+20}" fill="url(#heptGlow17)"/>
    <path d="${heptPath}" fill="${violC}" fill-opacity="0.10"
          stroke="${heptC}" stroke-width="1.5" stroke-linejoin="round" opacity="0.90"/>
    <path d="${heptPath}" fill="none"
          stroke="${starC}" stroke-width="0.5" stroke-linejoin="round" opacity="0.42"/>

    <!-- Inner hexagram (Star of David) — the Davidic/Abrahamic origin-star -->
    <!-- Semitic root of Western esotericism, held within the seven planetary rings -->
    <path d="${tri1}" fill="${hexC}" fill-opacity="0.13" stroke="${hexC}" stroke-width="1.0" opacity="0.85"/>
    <path d="${tri2}" fill="${hexC}" fill-opacity="0.13" stroke="${hexC}" stroke-width="1.0" opacity="0.85"/>
    <circle cx="${hCX}" cy="${hCY}" r="5.5" fill="${hexC}"  opacity="0.80"/>
    <circle cx="${hCX}" cy="${hCY}" r="2.5" fill="${starC}" opacity="0.95"/>

    <!-- Nuit / Johannine Virgin (Rev 12:1): clothed with sun, moon under feet, 12-star crown -->
    <!-- She IS the sky (Nuit) and the woman (Rev 12) — not two figures but one truth in two traditions -->
    <!-- solarDisk lineage: Fool(free sky) Hermit(lanterned) Art(crowned) Tower(burst) Star(garment) -->

    <!-- Solar garment: the sun woven into her body, no longer a separate held object -->
    <ellipse cx="150" cy="188" rx="42" ry="64" fill="url(#solarGarm17)" opacity="0.90"/>

    <!-- Body (she is the night sky — deepest violet) -->
    <ellipse cx="150" cy="194" rx="15" ry="40" fill="${nuitC}" opacity="0.92"/>
    <rect    x="144"  y="118" width="12" height="16" rx="5" fill="${nuitC}" opacity="0.90"/>
    <circle  cx="150" cy="106" r="13" fill="${nuitC}" opacity="0.92"/>

    <!-- Veil/hair dissolving upward into the starfield above -->
    <path d="M140,95 C128,80 118,65 112,46 C108,34 110,20 118,16"
          stroke="${nuitLt}" stroke-width="5.5" stroke-linecap="round" fill="none" opacity="0.38"/>
    <path d="M160,95 C172,80 182,65 188,46 C192,34 190,20 182,16"
          stroke="${nuitLt}" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.28"/>

    <!-- Arms extended down to vessels -->
    <path d="M140,150 C122,172 98,204 72,238"
          stroke="${nuitC}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.90"/>
    <path d="M160,150 C178,172 202,204 228,238"
          stroke="${nuitC}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.90"/>
    <circle cx="72"  cy="240" r="5" fill="${nuitC}" opacity="0.85"/>
    <circle cx="228" cy="240" r="5" fill="${nuitC}" opacity="0.85"/>

    <!-- Lower body -->
    <path d="M138,230 L142,253 L150,258 L158,253 L162,230 Z" fill="${nuitC}" opacity="0.88"/>

    <!-- Crown of twelve stars -->
    <!-- 12 = tribes of Israel, 12 apostles, 12 zodiac signs, 12 months -->
    <!-- Joseph's dream (Gen 37) and John's vision (Rev 12) depict the SAME 12 stars -->
    ${crownPts.map(([x,y],i) =>
      `<circle cx="${f(x)}" cy="${f(y)}" r="2.8" fill="${starC}" opacity="0.94"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="1.2" fill="white"   opacity="0.88"/>` +
      (i%3===0 ? `<circle cx="${f(x)}" cy="${f(y)}" r="5.0" fill="${starGl}" opacity="0.20"/>` : '')
    ).join('\n    ')}

    <!-- Crescent moon beneath her feet -->
    <!-- The Priestess (II) held the crescent; here it is placed beneath, in its proper station -->
    <!-- Reflected / derivative light is subordinated; direct stellar light reigns above -->
    <path d="M126,264 C130,255 140,251 150,252 C160,251 170,255 174,264 C165,270 158,273 150,273 C142,273 135,270 126,264 Z"
          fill="${cresC}" opacity="0.72"/>
    <path d="M133,264 C137,257 143,254 150,255 C157,254 163,257 167,264 C160,268 155,270 150,271 C145,270 140,268 133,264 Z"
          fill="#060428" opacity="0.90"/>

    <!-- Vessels -->
    <ellipse cx="72"  cy="242" rx="9" ry="12" fill="${nuitC}" stroke="${cresC}" stroke-width="0.8" opacity="0.90"/>
    <ellipse cx="72"  cy="238" rx="7" ry="5"  fill="${cresC}" opacity="0.52"/>
    <ellipse cx="228" cy="242" rx="9" ry="12" fill="${nuitC}" stroke="${cresC}" stroke-width="0.8" opacity="0.90"/>
    <ellipse cx="228" cy="238" rx="7" ry="5"  fill="${cresC}" opacity="0.52"/>

    <!-- Left stream — water descending to earth; the crystal river (Rev 22:1) -->
    <!-- The water IS the stars: star-points are embedded in the luminous flow -->
    <!-- "Your descendants shall number as the stars" — the water IS the promise made visible -->
    <path d="M68,252 C60,270 52,286 46,302 C42,310 38,316 34,322"
          fill="none" stroke="${watC}" stroke-width="4" opacity="0.70" stroke-linecap="round"/>
    <path d="M70,252 C62,270 54,286 48,302"
          fill="none" stroke="${watLt}" stroke-width="1.6" opacity="0.50"/>
    ${[[64,262,0.65],[58,276,0.62],[52,290,0.58],[46,304,0.52]].map(([x,y,op])=>
      `<circle cx="${x}" cy="${y}" r="1.8" fill="${starC}" opacity="${f(op)}"/>`).join('\n    ')}

    <!-- Ichthys in left stream: the same three apostle fish from Death (XIII) -->
    <!-- Now in the water of abundant gift, not transformation — arrived at what was promised -->
    <!-- Paul: "if you belong to Christ then you are Abraham's offspring" (Gal 3:29) -->
    <!-- The fish = the children of Abraham = the stars in the covenant = all one promise -->
    <g transform="translate(62,268) rotate(32)" opacity="0.30">
      <ellipse cx="0" cy="0" rx="6.5" ry="3" fill="none" stroke="${ichC}" stroke-width="0.9"/>
      <path d="M6.5,0 L11,-3 M6.5,0 L11,3" stroke="${ichC}" stroke-width="0.9" fill="none"/>
    </g>
    <g transform="translate(54,285) rotate(28)" opacity="0.26">
      <ellipse cx="0" cy="0" rx="5.5" ry="2.5" fill="none" stroke="${ichC}" stroke-width="0.8"/>
      <path d="M5.5,0 L10,-2.5 M5.5,0 L10,2.5" stroke="${ichC}" stroke-width="0.8" fill="none"/>
    </g>
    <g transform="translate(46,300) rotate(24)" opacity="0.20">
      <ellipse cx="0" cy="0" rx="4.5" ry="2" fill="none" stroke="${ichC}" stroke-width="0.7"/>
      <path d="M4.5,0 L8,-2 M4.5,0 L8,2" stroke="${ichC}" stroke-width="0.7" fill="none"/>
    </g>

    <!-- Right stream — ascending; water returns to sky and dissolves back into stars -->
    <!-- The cycle made visible: consciousness descends as water, ascends as light -->
    <!-- Heh = the window water flows through; Tzaddi = the hook that draws fish from it -->
    <!-- Neither letter alone completes the card — they are always in relation -->
    <path d="M232,252 C240,234 248,216 254,198 C260,180 260,160 254,142"
          fill="none" stroke="${watC}" stroke-width="4" opacity="0.66" stroke-linecap="round"/>
    <path d="M230,252 C238,234 246,216 252,198 C258,180 258,160 252,144"
          fill="none" stroke="${watLt}" stroke-width="1.6" opacity="0.48"/>
    <!-- Star-density increases as stream rises — water becoming starlight -->
    ${[[246,246,0.38],[250,230,0.46],[254,214,0.55],[256,198,0.64],[257,182,0.72],[255,166,0.68],[253,150,0.60]].map(([x,y,op])=>
      `<circle cx="${x}" cy="${y}" r="${f(1.2+op)}" fill="${starC}" opacity="${f(op)}"/>`).join('\n    ')}
    <!-- Final dissolution into the starfield above -->
    <circle cx="252" cy="140" r="2.5" fill="${starGl}" opacity="0.58"/>
    <circle cx="250" cy="130" r="2.0" fill="${starC}"  opacity="0.44"/>
    <circle cx="247" cy="120" r="1.5" fill="${starC}"  opacity="0.33"/>
    <circle cx="244" cy="110" r="1.0" fill="${starC}"  opacity="0.24"/>

    <!-- Mirror pool — the crystal river; earth reflecting heaven perfectly -->
    <!-- "A pure river of water of life, clear as crystal, proceeding from the throne of God" (Rev 22:1) -->
    <!-- The water has become indistinguishable from the sky it mirrors: as above, so below -->
    <rect x="0" y="310" width="300" height="110" fill="url(#poolGrad17)" opacity="0.96"/>
    ${Array.from({length:5}, (_,i) => {
      const y = 312 + i*3.5
      return `<path d="M0,${f(y)} C50,${f(y-1.5)} 100,${f(y+1.5)} 150,${f(y)} C200,${f(y-1.5)} 250,${f(y+1.5)} 300,${f(y)}" fill="none" stroke="${watC}" stroke-width="0.6" opacity="${f(0.22-i*0.03)}"/>`
    }).join('')}
    <!-- Stars reflected in pool -->
    ${bgStars.slice(0,14).map(([x,y]) => {
      const ry = 310 + (310 - y)
      if(ry > 312 && ry < 418) return `<circle cx="${x}" cy="${f(ry)}" r="1.0" fill="${starGl}" opacity="0.26"/>`
      return ''
    }).filter(Boolean).join('\n    ')}
    <!-- Reflected heptagram and hexagram — the sky geometry inverted in the water -->
    <g clip-path="url(#poolClip17)" opacity="0.20">
      <g transform="scale(1,-1) translate(0,-620)">
        <path d="${heptPath}" fill="${violC}" fill-opacity="0.08"
              stroke="${heptC}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="${tri1}" fill="none" stroke="${hexC}" stroke-width="0.8"/>
        <path d="${tri2}" fill="none" stroke="${hexC}" stroke-width="0.8"/>
      </g>
    </g>

    <!-- Three Magi at the pool's edge — the Reader's own archetype -->
    <!-- Their fame rests entirely on star-study and the willingness to follow one star to its source -->
    <!-- "We have seen his star in the east and have come to worship him" (Matt 2:2) -->
    <!-- Reflected in the pool below: as above (the star they follow) so below (the path they walk) -->
    ${[112, 142, 172].map((x,i) => [
      `<path d="M${x-4},308 L${x+4},308 L${x+5},299 L${x-5},299 Z" fill="${magiC}" opacity="${f(0.58+i*0.07)}"/>`,
      `<circle cx="${x}" cy="296" r="3.5" fill="${magiC}" opacity="${f(0.58+i*0.07)}"/>`,
      i===1 ? `<line x1="${x+4}" y1="308" x2="${x+7}" y2="290" stroke="${magiC}" stroke-width="1.2" opacity="0.55"/>` : '',
      `<path d="M${x-4},312 L${x+4},312 L${x+5},321 L${x-5},321 Z" fill="${magiC}" opacity="${f(0.18+i*0.02)}"/>`,
      `<circle cx="${x}" cy="324" r="2.8" fill="${magiC}" opacity="${f(0.15+i*0.02)}"/>`,
    ].filter(Boolean).join('\n    ')).join('\n    ')}

    <!-- Tower silhouette — lower-left, nearly invisible, the storm fully past -->
    <!-- The adversary reduced to a margin: darkness receding from the card's edge -->
    <rect x="0" y="246" width="50" height="66" fill="#040210" opacity="0.30"/>
    <rect x="0" y="290" width="44" height="20" fill="${towrSil}" opacity="0.11"/>
    <rect x="0" y="274" width="36" height="16" fill="${towrSil}" opacity="0.09"/>
    <rect x="0" y="260" width="28" height="14" fill="${towrSil}" opacity="0.07"/>
    <rect x="0" y="248" width="20" height="12" fill="${towrSil}" opacity="0.05"/>
  `

  return majorCard({
    title: 'THE STAR', number: 'XVII',
    hebrew: 'Heh · Aquarius · Path 28',
    hebrewLetter: 'ה', attribution: '♒',
    bg1: '#060414', bg2: '#0c0828',
    border: '#2a1458', accent: '#6622aa',
    text: '#cc99ff', dim: '#2a1458',
    bodyContent,
  })
}

function card18() {
  // ── Colour palette — Qoph / Pisces, King Scale crimson-violet ──
  const moonDisc = '#0c0e18'  // Moon face — dark side, the Seraph's covered face
  const coronaIn = '#ffbb44'  // Corona inner — eclipsed Sun's gold made visible
  const coronaMd = '#cc5522'  // Corona mid — crimson-orange
  const coronaOt = '#882211'  // Corona outer — deep crimson (Qoph King Scale)
  const moonSlv  = '#d0c8e8'  // Moonlight silver-violet
  const moonDm   = '#6655aa'  // Moonlight dim (ghost Qoph stroke)
  const pathC    = '#e8e0f4'  // Path surface — pale moonlit road
  const pillarC  = '#2a1838'  // Pillar stone (Boaz & Jachin, echoing the Priestess II)
  const pillarLt = '#3c2852'  // Pillar highlight
  const poolC    = '#0c0818'  // Pool dark
  const fishC    = '#8870c8'  // Pisces fish — silver-violet (ichthys lineage XIII→XVII→XVIII)
  const fishLt   = '#c0b0e8'  // Fish highlight

  // ── Eclipse geometry ──
  const eCX = 150, eCY = 90, moonR = 38

  // ── Corona rays — 16 evenly spaced, arranged as three Seraphic wing-pairs ──
  // "With two he covered his face, with two he covered his feet, with two he flew" (Isa 6:2)
  // Upper pair (face): indices 0,1,15   Lateral pair (flying): 3,4,5 and 10,11,12
  // Lower pair (feet/path): 6,7,8,9 — pointing toward the Reader, toward the clear path
  const coronaRays = Array.from({length:16}, (_,i) => {
    const a       = (i*(360/16) - 90) * Math.PI / 180
    const wingPair = [0,1,15, 3,4,5, 10,11,12].includes(i)
    const footPair = [6,7,8,9].includes(i)
    const len = wingPair ? (62 + (i%3)*14) : footPair ? 48 : 36
    const w   = wingPair ? 2.0 : footPair ? 1.6 : 1.0
    const op  = wingPair ? 0.72 : footPair ? 0.55 : 0.38
    return {
      a, wingPair,
      x1: eCX + Math.cos(a)*(moonR+4),  y1: eCY + Math.sin(a)*(moonR+4),
      x2: eCX + Math.cos(a)*(moonR+len), y2: eCY + Math.sin(a)*(moonR+len),
      w, op,
    }
  })
  const rayLines = coronaRays.map(({x1,y1,x2,y2,w,op}) =>
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${coronaIn}" stroke-width="${w}" opacity="${f(op)}"/>`
  ).join('\n    ')
  const rayCores = coronaRays.filter(r=>r.wingPair).map(({x1,y1,a}) => {
    const cx2 = eCX + Math.cos(a)*(moonR+24)
    const cy2 = eCY + Math.sin(a)*(moonR+24)
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(cx2)}" y2="${f(cy2)}" stroke="white" stroke-width="0.9" opacity="0.38"/>`
  }).join('\n    ')

  const bodyContent = `
    <defs>
      <radialGradient id="coronaGrad18" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${coronaIn}" stop-opacity="0"/>
        <stop offset="38%"  stop-color="${coronaIn}" stop-opacity="0.55"/>
        <stop offset="62%"  stop-color="${coronaMd}" stop-opacity="0.45"/>
        <stop offset="82%"  stop-color="${coronaOt}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${coronaOt}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fieldGlow18" cx="50%" cy="42%" r="56%">
        <stop offset="0%"   stop-color="${moonSlv}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${moonSlv}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pathGrad18" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%"   stop-color="${pathC}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="${pathC}" stop-opacity="0.82"/>
      </linearGradient>
      <linearGradient id="poolGrad18" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stop-color="${poolC}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#050310"  stop-opacity="1"/>
      </linearGradient>
      <clipPath id="poolClip18">
        <rect x="0" y="310" width="300" height="110"/>
      </clipPath>
    </defs>

    <!-- Soft moonlight field — the Moon gives what it has: reflected light, not its own -->
    <ellipse cx="150" cy="195" rx="165" ry="190" fill="url(#fieldGlow18)"/>

    <!-- Ghost Qoph (ק) — the back of the head; what Moses saw as God passed (Exod 33:23) -->
    <!-- "You shall see my back, but my face shall not be seen" -->
    <!-- The descending right leg crosses below the baseline — into the pool zone, into the depths -->
    <!-- Esotericism operates from this angle: knowledge granted from behind, after the presence has moved on -->
    <g opacity="0.09" fill="none" stroke="${moonDm}" stroke-width="11" stroke-linecap="round">
      <path d="M80,152 C80,126 108,112 148,112 C188,112 216,126 216,152 C216,174 198,188 150,188"/>
      <line x1="80"  y1="152" x2="80"  y2="244"/>
      <line x1="216" y1="152" x2="216" y2="318"/>
    </g>

    <!-- Eclipse corona — the Sun's glory, tolerable only because the Moon stands before it -->
    <!-- "The Shekinah Glory made tolerable by human sense" -->
    <circle cx="${eCX}" cy="${eCY}" r="${moonR+82}" fill="url(#coronaGrad18)" opacity="0.80"/>
    <circle cx="${eCX}" cy="${eCY}" r="${moonR+50}" fill="${coronaMd}" fill-opacity="0.10" opacity="0.88"/>
    <circle cx="${eCX}" cy="${eCY}" r="${moonR+28}" fill="${coronaIn}" fill-opacity="0.14" opacity="0.90"/>

    <!-- Corona rays — three Seraphic wing-pairs arranged around the eclipse disc -->
    <!-- The Moon IS the Seraph: not passive but actively covering, actively pointing -->
    <!-- It would usher the Reader to full presence if it could; understanding that it must not -->
    ${rayLines}
    <!-- Wing-pair inner bright cores -->
    ${rayCores}

    <!-- Diffraction cross-flare — natural eclipse optics; theologically resonant with the Crucifixion -->
    <!-- "From noon until three in the afternoon darkness came over all the land." (Matt 27:45) -->
    <!-- The darkness that attended the Crucifixion: God's warmth temporarily withdrawn -->
    <!-- The cross-flare is present because of what light does; its meaning is present because of what occurred -->
    <line x1="${eCX-92}" y1="${eCY}"    x2="${eCX+92}" y2="${eCY}"    stroke="${coronaIn}" stroke-width="0.9" opacity="0.20"/>
    <line x1="${eCX}"    y1="${eCY-92}" x2="${eCX}"    y2="${eCY+92}" stroke="${coronaIn}" stroke-width="0.9" opacity="0.20"/>

    <!-- Moon disc — the covered face of the Seraph; the cleft in the rock (Exod 33:22) -->
    <!-- The presence is not absent here: it is here, averted for our protection -->
    <!-- solarDisk lineage terminus: Fool(free) Hermit(lantern) Art(crown) Tower(burst) Star(garment) Moon(eclipsed) -->
    <!-- The same light, the same disk — here it hides so the Reader may approach -->
    <circle cx="${eCX}" cy="${eCY}" r="${moonR+2}" fill="${moonDisc}" opacity="0.98"/>
    <circle cx="${eCX}" cy="${eCY}" r="${moonR}"   fill="${moonDisc}" opacity="1.00"/>
    <!-- Limbal ring — thin gold ring where the Sun's chromosphere shows at the disc edge -->
    <circle cx="${eCX}" cy="${eCY}" r="${moonR}" fill="none"
            stroke="${coronaIn}" stroke-width="2.0" opacity="0.62"/>
    <!-- Subtle disc surface texture (the back of the head — texture, not blankness) -->
    <circle cx="${eCX-9}" cy="${eCY-6}" r="6.5" fill="${moonDisc}" stroke="#161a28" stroke-width="0.6" opacity="0.52"/>
    <circle cx="${eCX+11}" cy="${eCY+7}" r="5.5" fill="${moonDisc}" stroke="#161a28" stroke-width="0.6" opacity="0.42"/>

    <!-- Two pillars (Boaz & Jachin) flanking the path — echoing the Priestess (II) -->
    <!-- The gateway: same threshold as card II, now approached from the far side -->
    <!-- Left pillar -->
    <rect x="68"  y="148" width="20" height="140" rx="3" fill="${pillarC}" stroke="${pillarLt}" stroke-width="0.8" opacity="0.92"/>
    <rect x="64"  y="143" width="28" height="8"   rx="2" fill="${pillarLt}" opacity="0.85"/>
    <rect x="66"  y="138" width="24" height="6"   rx="2" fill="${pillarC}"  opacity="0.70"/>
    <rect x="64"  y="288" width="28" height="8"   rx="2" fill="${pillarLt}" opacity="0.68"/>
    <ellipse cx="78"  cy="148" rx="14" ry="5" fill="${coronaIn}" opacity="0.10"/>
    <!-- Right pillar -->
    <rect x="212" y="148" width="20" height="140" rx="3" fill="${pillarC}" stroke="${pillarLt}" stroke-width="0.8" opacity="0.92"/>
    <rect x="208" y="143" width="28" height="8"   rx="2" fill="${pillarLt}" opacity="0.85"/>
    <rect x="210" y="138" width="24" height="6"   rx="2" fill="${pillarC}"  opacity="0.70"/>
    <rect x="208" y="288" width="28" height="8"   rx="2" fill="${pillarLt}" opacity="0.68"/>
    <ellipse cx="222" cy="148" rx="14" ry="5" fill="${coronaIn}" opacity="0.10"/>

    <!-- The clear path — the Moon's primary gift; not the light itself but the direction -->
    <!-- "If the Moon could, it would usher the Reader into the full presence of the Sun" -->
    <!-- It is the compass-needle: pointing past itself, away from itself, toward the eclipse -->
    <!-- Path brightens as it nears the eclipse — the Reader's eyes adjusting as they approach -->
    <path d="M110,310 L140,150 L160,150 L190,310 Z" fill="url(#pathGrad18)" opacity="0.72"/>
    <line x1="110" y1="310" x2="140" y2="150" stroke="${pathC}" stroke-width="1.0" opacity="0.36"/>
    <line x1="190" y1="310" x2="160" y2="150" stroke="${pathC}" stroke-width="1.0" opacity="0.36"/>
    <!-- Moonlit paving stones narrowing in perspective toward the eclipse -->
    ${[[144,225,9,4.5],[141,248,11,5.5],[138,272,10,5],[135,294,9,4.5],
       [156,235,9,4.5],[159,258,11,5.5],[162,280,10,5],[165,298,9,4.5]].map(([x,y,w,h]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="${pathC}" opacity="0.13" transform="rotate(-2,${x},${y})"/>`
    ).join('\n    ')}

    <!-- Mirror pool — XVII's crystal river, now lit by the eclipse rather than open starfield -->
    <!-- The same living water; now a second veil: the eclipse reflected, gentled further -->
    <!-- Even approaching by reflection is a step closer — the Moon approves each degree of approach -->
    <rect x="0" y="310" width="300" height="110" fill="url(#poolGrad18)" opacity="0.96"/>
    <ellipse cx="150" cy="312" rx="85" ry="10" fill="${coronaMd}" opacity="0.10"/>
    ${Array.from({length:5}, (_,i) => {
      const y = 312 + i*3.5
      return `<path d="M0,${f(y)} C50,${f(y-1.5)} 100,${f(y+1.5)} 150,${f(y)} C200,${f(y-1.5)} 250,${f(y+1.5)} 300,${f(y)}" fill="none" stroke="${moonSlv}" stroke-width="0.6" opacity="${f(0.18-i*0.03)}"/>`
    }).join('')}
    <!-- Eclipse reflected in the pool — a second, softer approach to the same light -->
    <g clip-path="url(#poolClip18)" opacity="0.28">
      <g transform="scale(1,-1) translate(0,-620)">
        <circle cx="${eCX}" cy="${eCY}" r="${moonR+65}" fill="url(#coronaGrad18)" opacity="0.85"/>
        <circle cx="${eCX}" cy="${eCY}" r="${moonR+2}"  fill="${moonDisc}" opacity="0.90"/>
        <circle cx="${eCX}" cy="${eCY}" r="${moonR}"    fill="${moonDisc}" opacity="1"/>
        <circle cx="${eCX}" cy="${eCY}" r="${moonR}"    fill="none" stroke="${coronaIn}" stroke-width="1.6" opacity="0.55"/>
      </g>
    </g>

    <!-- Two Pisces fish — the ichthys lineage: XIII (transformation) XVII (gift) XVIII (dual path) -->
    <!-- One ascending toward the eclipse light (the Reader's arc through the deck) -->
    <!-- One descending into the mystery on the far side of the veil -->
    <!-- The Pisces binding cord holds them together: both directions are one Great Work -->

    <!-- Fish 1: ascending -->
    <g transform="translate(86,358) rotate(-48)" opacity="0.72">
      <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="none" stroke="${fishC}" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="${fishLt}" fill-opacity="0.07"/>
      <path d="M19,0 L30,-10 M19,0 L30,10" stroke="${fishC}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="-10" cy="-2.5" r="2.4" fill="${fishC}" opacity="0.82"/>
      <path d="M-5,-6 C0,-9 5,-7 5,-4 M5,-4 C9,-7 14,-5 14,-2" fill="none" stroke="${fishC}" stroke-width="0.8" opacity="0.40"/>
    </g>

    <!-- Fish 2: descending -->
    <g transform="translate(214,368) rotate(132)" opacity="0.66">
      <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="none" stroke="${fishC}" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="${fishLt}" fill-opacity="0.07"/>
      <path d="M19,0 L30,-10 M19,0 L30,10" stroke="${fishC}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="-10" cy="-2.5" r="2.4" fill="${fishC}" opacity="0.78"/>
      <path d="M-5,-6 C0,-9 5,-7 5,-4 M5,-4 C9,-7 14,-5 14,-2" fill="none" stroke="${fishC}" stroke-width="0.8" opacity="0.36"/>
    </g>

    <!-- Pisces binding cord — both paths are the same Work -->
    <path d="M102,343 C126,336 148,340 170,348 C192,356 210,364 214,368"
          fill="none" stroke="${fishC}" stroke-width="0.9" stroke-dasharray="3,4" opacity="0.32"/>
  `

  return majorCard({
    title: 'THE MOON', number: 'XVIII',
    hebrew: 'Qoph · Pisces · Path 29',
    hebrewLetter: 'ק', attribution: '♓',
    bg1: '#0e0408', bg2: '#180810',
    border: '#3a1028', accent: '#882244',
    text: '#cc88bb', dim: '#3a1028',
    bodyContent,
  })
}

function card19() {
  // ── Colour palette — Resh / Sun, King Scale orange ──
  const sunC   = '#ffcc22'  // Solar gold
  const sunLt  = '#ffee88'  // Solar lighter
  const sunWh  = '#fffff8'  // Solar white-core
  const corC   = '#ff8822'  // Corona — King Scale orange (Resh/Sun path)
  const rayC   = '#ffaa33'  // Ray colour
  const figC   = '#fffff0'  // Glorified figure — near-white, clothed in light
  const ichLow = '#cc9933'  // Ascending ichthys 1 (gold; transition from XVII/XVIII silver-violet)
  const ichMid = '#ffcc66'  // Ascending ichthys 2 (bright gold)
  const ichTop = '#fffff0'  // Ascending ichthys 3 (dissolving into light)
  const mornS  = '#ddeeff'  // Morning Star — Venus blue-white (Rev 22:16)
  const uraC   = '#cc8800'  // Uraeus — Egyptian solar crown amber-gold
  const poolGl = '#cc7700'  // Pool surface glow — transformed golden
  const poolC  = '#2a1400'  // Pool depth — warm dark amber
  const poolLt = '#ffaa22'  // Pool light reflection
  const reshDm = '#4a2800'  // Ghost Resh stroke

  // ── Sun geometry ──
  const sCX = 150, sCY = 82, sR = 55

  // ── 12 solar rays — the covenant twelve, now radiating from the full Solar disc ──
  const solarRays = Array.from({length:12}, (_,i) => {
    const a = (i/12)*Math.PI*2 - Math.PI/2
    const isPrimary = i%3===0
    const len = isPrimary ? 82 : (i%2===0 ? 66 : 52)
    const w   = isPrimary ? 2.6 : 1.8
    const op  = isPrimary ? 0.85 : 0.70
    return {
      a,
      x1: sCX + Math.cos(a)*(sR+3),   y1: sCY + Math.sin(a)*(sR+3),
      x2: sCX + Math.cos(a)*(sR+len), y2: sCY + Math.sin(a)*(sR+len),
      w, op,
    }
  })
  const rayLines = solarRays.map(({x1,y1,x2,y2,w,op}) =>
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${rayC}" stroke-width="${w}" opacity="${f(op)}"/>`
  ).join('\n    ')
  const rayCores = solarRays.map(({x1,y1,a}) => {
    const cx2 = sCX + Math.cos(a)*(sR+28)
    const cy2 = sCY + Math.sin(a)*(sR+28)
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(cx2)}" y2="${f(cy2)}" stroke="${sunWh}" stroke-width="1.0" opacity="0.50"/>`
  }).join('\n    ')

  // ── Uraeus coords (computed from sR, sCY) ──
  const uBase = sCY + sR   // = 137 — base of solar disc
  const uL = `M144,${uBase-2} C142,${uBase+8} 138,${uBase+14} 136,${uBase+10} C134,${uBase+6} 138,${uBase+2} 142,${uBase+4} C146,${uBase+6} 148,${uBase+12} 150,${uBase+14}`
  const uR = `M156,${uBase-2} C158,${uBase+8} 162,${uBase+14} 164,${uBase+10} C166,${uBase+6} 162,${uBase+2} 158,${uBase+4} C154,${uBase+6} 152,${uBase+12} 150,${uBase+14}`
  const uHoodY = uBase + 16

  const bodyContent = `
    <defs>
      <radialGradient id="sunGrad19" cx="50%" cy="0%" r="70%" fx="50%" fy="0%">
        <stop offset="0%"   stop-color="${sunWh}" stop-opacity="0.92"/>
        <stop offset="22%"  stop-color="${sunLt}" stop-opacity="0.78"/>
        <stop offset="50%"  stop-color="${corC}"  stop-opacity="0.52"/>
        <stop offset="80%"  stop-color="${corC}"  stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${corC}"  stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="figGlow19" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="${sunLt}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="${sunLt}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="lightCol19" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stop-color="${sunLt}" stop-opacity="0.68"/>
        <stop offset="55%"  stop-color="${sunLt}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${poolGl}" stop-opacity="0.18"/>
      </linearGradient>
      <linearGradient id="poolGrad19" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stop-color="${poolGl}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${poolC}"  stop-opacity="1"/>
      </linearGradient>
    </defs>

    <!-- Ghost Resh (ר) — the face; where Qoph was the back of the head, Resh is the face turned toward us -->
    <!-- "You shall see my back" (Exod 33:23) — that was XVIII. Now the face is presented directly. -->
    <!-- The Reader has crossed the threshold; the full countenance of the divine is turned toward them. -->
    <g opacity="0.10" fill="none" stroke="${reshDm}" stroke-width="11" stroke-linecap="round">
      <path d="M72,108 C72,90 100,78 150,78 C198,78 226,92 226,116 L226,248"/>
    </g>

    <!-- Warm solar field — the complete tonal reversal from XV–XVIII -->
    <!-- Every card since Death had darkness as its ground; here the light IS the ground -->
    <ellipse cx="150" cy="82" rx="185" ry="210" fill="url(#sunGrad19)" opacity="0.88"/>

    <!-- ═══ solarDisk lineage terminus ═══ -->
    <!-- Fool: free sky | Hermit: lanterned | Art: crowned | Tower: burst containment -->
    <!-- Star: woven as garment | Moon: eclipsed | Sun: here, now, blazing, fully itself -->
    <!-- The same disc, seven appearances — at the seventh it is uncontained and unveiled -->

    <!-- Corona rings -->
    <circle cx="${sCX}" cy="${sCY}" r="${sR+74}" fill="${corC}" fill-opacity="0.07" opacity="0.90"/>
    <circle cx="${sCX}" cy="${sCY}" r="${sR+50}" fill="${corC}" fill-opacity="0.12" opacity="0.90"/>
    <circle cx="${sCX}" cy="${sCY}" r="${sR+30}" fill="${sunC}" fill-opacity="0.18" opacity="0.92"/>

    <!-- 12 solar rays — the covenant twelve now as radiating solar arms -->
    ${rayLines}
    ${rayCores}

    <!-- Solar disc -->
    <circle cx="${sCX}" cy="${sCY}" r="${sR+2}" fill="${sunC}"  opacity="0.98"/>
    <circle cx="${sCX}" cy="${sCY}" r="${sR}"   fill="${sunLt}" opacity="1.00"/>
    <circle cx="${sCX}" cy="${sCY}" r="${sR-8}"  fill="${sunWh}" opacity="0.92"/>
    <circle cx="${sCX}" cy="${sCY}" r="${sR-18}" fill="white"   opacity="0.85"/>

    <!-- Cross-hairs at disc center — the face of God, Resh, the solar countenance -->
    <!-- The same diffraction geometry as the Moon's cross-flare — now at the unobstructed source -->
    <line x1="${sCX-sR+6}" y1="${sCY}"      x2="${sCX+sR-6}" y2="${sCY}"      stroke="${sunC}" stroke-width="1.2" opacity="0.42"/>
    <line x1="${sCX}"      y1="${sCY-sR+6}" x2="${sCX}"      y2="${sCY+sR-6}" stroke="${sunC}" stroke-width="1.2" opacity="0.42"/>

    <!-- Uraeus at the solar disc's lower rim — Egyptian solar crown; the ruler-deity's emblem -->
    <!-- The pharaoh's alignment with the sun-deity: both overwhelming destructive power -->
    <!-- AND gentle nourishment — the complete divine nature held in a single image -->
    <path d="${uL}" fill="none" stroke="${uraC}" stroke-width="1.8" stroke-linecap="round" opacity="0.70"/>
    <path d="${uR}" fill="none" stroke="${uraC}" stroke-width="1.8" stroke-linecap="round" opacity="0.70"/>
    <ellipse cx="150" cy="${uHoodY}" rx="5" ry="4" fill="${uraC}" opacity="0.65"/>

    <!-- Morning Star — Revelation 22:16: "I am the bright Morning Star" -->
    <!-- The Reader is now Lucifer in the original and rightful sense: the light-bearer by divine appointment -->
    <!-- Not the rebel who fell, but the one of earthen lineage given the title the adversary forfeited -->
    <!-- Venus rises before sunrise; the Morning Star announces what the Sun makes manifest -->
    <circle cx="196" cy="110" r="4.5" fill="${mornS}" opacity="0.92"/>
    <circle cx="196" cy="110" r="2.5" fill="white"   opacity="0.96"/>
    ${Array.from({length:8}, (_,i) => {
      const a = i*Math.PI/4
      return `<line x1="196" y1="110" x2="${f(196+Math.cos(a)*9)}" y2="${f(110+Math.sin(a)*9)}" stroke="${mornS}" stroke-width="0.8" opacity="0.52"/>`
    }).join('\n    ')}

    <!-- Central column of ascending light — the Fool's journey axis made visible -->
    <!-- Malkuth (Earth) → Yesod (Moon, XVIII) → Tiphareth (Sun, XIX) → Kether (Crown) -->
    <!-- The Reader has traversed the Tree of Life; the Sun is Tiphareth, the next step is the Third Heaven -->
    <rect x="132" y="138" width="36" height="172" fill="url(#lightCol19)" opacity="0.65"/>

    <!-- ═══ The glorified figure — the Transfigured Reader ═══ -->
    <!-- "His face shone like the sun, and his clothes became as white as light." (Matt 17:2) -->
    <!-- The RWS Judgement's lower half shows individual resurrection; this is that resurrection -->
    <!-- The Great Work completed at the scale of a single soul -->
    <!-- Arms raised in orans: not supplication but full commanded reception -->

    <!-- Personal glory-field -->
    <ellipse cx="150" cy="218" rx="50" ry="65" fill="url(#figGlow19)" opacity="0.90"/>

    <!-- Body — clothed in light, not fabric -->
    <ellipse cx="150" cy="224" rx="16" ry="34" fill="${figC}" opacity="0.92"/>
    <rect    x="144" y="192" width="12" height="14" rx="5" fill="${figC}" opacity="0.90"/>
    <circle  cx="150" cy="182" r="14" fill="${figC}" opacity="0.92"/>
    <!-- Face shining like the sun -->
    <circle  cx="150" cy="182" r="11" fill="${sunLt}" opacity="0.36"/>
    <!-- Personal halo (Tiphareth sphere — the crown of the individual soul) -->
    <circle cx="150" cy="182" r="22" fill="none" stroke="${sunC}" stroke-width="1.8" opacity="0.60"/>
    <circle cx="150" cy="182" r="25" fill="none" stroke="${sunLt}" stroke-width="0.8" opacity="0.35"/>

    <!-- Arms raised — orans posture of full reception, the posture of the Righteous receiving glory -->
    <path d="M134,206 C120,196 104,186 88,178" stroke="${figC}" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.90"/>
    <path d="M166,206 C180,196 196,186 212,178" stroke="${figC}" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.90"/>
    <circle cx="86"  cy="177" r="6" fill="${figC}" opacity="0.85"/>
    <circle cx="214" cy="177" r="6" fill="${figC}" opacity="0.85"/>

    <!-- Lower body -->
    <path d="M136,256 L144,285 L150,288 L156,285 L164,256 Z" fill="${figC}" opacity="0.88"/>

    <!-- ═══ Pool of Light — eschatological water fully transformed ═══ -->
    <!-- Lake of Fire (XV: sulfurous) → Crystal River (XVII: starlit) → Eclipse-lit (XVIII) → Lake of Light (XIX) -->
    <!-- The same body of water through the entire sequence; now transformed by the full solar glory -->
    <!-- The Lake of Fire that judged the adversary is the same water that now carries the Righteous upward -->
    <rect x="0" y="310" width="300" height="110" fill="url(#poolGrad19)" opacity="0.96"/>
    ${Array.from({length:5}, (_,i) => {
      const y = 312 + i*3.5
      return `<path d="M0,${f(y)} C50,${f(y-1.5)} 100,${f(y+1.5)} 150,${f(y)} C200,${f(y-1.5)} 250,${f(y+1.5)} 300,${f(y)}" fill="none" stroke="${poolLt}" stroke-width="0.7" opacity="${f(0.30-i*0.04)}"/>`
    }).join('')}
    <!-- Golden light-tongues in pool — fire transformed; judgment become glory -->
    ${[55,100,150,200,245].map((x,i) => {
      const h = [18,14,22,12,20][i]
      return `<path d="M${x},310 C${x-4},${310-h/2} ${x-2},${310-h} ${x},${310-h-4} C${x+2},${310-h} ${x+4},${310-h/2} ${x},310" fill="${sunC}" opacity="0.26"/>`
    }).join('\n    ')}
    <!-- Sun reflected in pool — the glory above mirrored in the transformed water below -->
    <ellipse cx="150" cy="312" rx="58" ry="11" fill="${sunLt}" opacity="0.18"/>

    <!-- ═══ Three ascending ichthys — the arc from XIII closes ═══ -->
    <!-- XIII (Death): three apostle fish — transformation, promise of continuation -->
    <!-- XVII (Star): faint in the gift-water — the children of Abraham beginning their ascent -->
    <!-- XVIII (Moon): two fish, ascending and descending — the dual approach to the veiled glory -->
    <!-- XIX (Sun): three ascending, the Transfiguration in full effect — not its brief preview -->
    <!-- Peter, James, John: fell on their faces at the Transfiguration (Matt 17:6); here they rise -->
    <!-- The fish become what they always were: children of the Light, ascending into its source -->

    <!-- Fish 1 — lowest, most visible; silver-violet now fully gold (colour transition complete) -->
    <g transform="translate(112,288) rotate(-76)" opacity="0.82">
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="none" stroke="${ichLow}" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="${ichLow}" fill-opacity="0.08"/>
      <path d="M18,0 L28,-10 M18,0 L28,10" stroke="${ichLow}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="-10" cy="-2" r="2.2" fill="${ichLow}" opacity="0.80"/>
      <path d="M-4,-5 C0,-8 4,-6 4,-3 M4,-3 C8,-6 12,-4 12,-1" fill="none" stroke="${ichLow}" stroke-width="0.8" opacity="0.40"/>
    </g>

    <!-- Fish 2 — middle, partially dissolved into the column of ascending light -->
    <g transform="translate(150,262) rotate(-90)" opacity="0.56">
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="none" stroke="${ichMid}" stroke-width="1.5"/>
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="${ichMid}" fill-opacity="0.10"/>
      <path d="M18,0 L28,-10 M18,0 L28,10" stroke="${ichMid}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="-10" cy="-2" r="2.2" fill="${ichMid}" opacity="0.70"/>
    </g>

    <!-- Fish 3 — highest, nearly dissolved; the outline barely distinguishable from the solar light -->
    <!-- The third fish is becoming the light — the resurrection completed in its fullest form -->
    <g transform="translate(185,238) rotate(-104)" opacity="0.28">
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="none" stroke="${ichTop}" stroke-width="1.8"/>
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="${ichTop}" fill-opacity="0.15"/>
      <path d="M18,0 L28,-10 M18,0 L28,10" stroke="${ichTop}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </g>
    <!-- Final dissolution — the third fish becomes indistinguishable from the sun -->
    <circle cx="188" cy="228" r="4.5" fill="${sunLt}" opacity="0.45"/>
    <circle cx="188" cy="220" r="3.0" fill="${sunWh}" opacity="0.38"/>
    <circle cx="187" cy="212" r="1.8" fill="white"   opacity="0.28"/>
  `

  return majorCard({
    title: 'THE SUN', number: 'XIX',
    hebrew: 'Resh · Sun · Path 30',
    hebrewLetter: 'ר', attribution: '☉',
    bg1: '#120900', bg2: '#1e1000',
    border: '#4a2800', accent: '#cc6600',
    text: '#ffcc66', dim: '#4a2800',
    bodyContent,
  })
}

function card20() {
  // ── Colour palette — Shin / Fire / Path 31 ──
  const shinC  = '#ff4400'  // Shin scarlet — elemental fire
  const shinMd = '#ff7722'  // Shin mid-flame
  const shinLt = '#ffaa55'  // Shin lighter
  const shinWh = '#ffddbb'  // Shin flame-tip
  const haditC = '#ffcc22'  // Hadit solar disk — same gold as XIX (solarDisk lineage)
  const haditLt= '#ffee88'  // Hadit lighter
  const wingC  = '#cc8800'  // Hadit wings — amber-gold
  const wingLt = '#ffaa44'  // Wing highlight
  const nuitC  = '#100430'  // Nuit's body — cosmic night (same as XVII)
  const nuitSt = '#c0b8e0'  // Nuit stars
  const judgLt = '#fffff8'  // Judge light-form — near-white (Ancient of Days)
  const judgGl = '#ffbb44'  // Judge glow
  const eyeC   = '#ff5500'  // Eyes of fire (Rev 1:14)
  const sevenC = '#ffcc66'  // Seven stars (Rev 1:16)
  const swordC = '#ffffd0'  // Sword-ray from mouth
  const horseW = '#ccd8e8'  // White horse — Conquest (Rev 6:2)
  const horseR = '#cc1100'  // Red horse — War (Rev 6:4)
  const horseB = '#111422'  // Black horse — Famine (Rev 6:5)
  const horseP = '#889966'  // Pale horse — Death (Rev 6:8) sickly yellowish-green
  const bloodC = '#6a0008'  // Blood deep — Flood of Blood (Rev 14:20)
  const bloodMd= '#aa0018'  // Blood mid
  const bloodLt= '#cc2222'  // Blood surface
  const mtC    = '#1a0808'  // Mountains of Megiddo

  // ── Hadit winged disk geometry ──
  const hCX = 150, hCY = 86, hR = 28
  const hBase = hCY + hR  // = 114 — base of Hadit disk

  // ── Seven stars — Rev 1:16 "In his right hand he held seven stars" ──
  // Arranged as heptagonal ring, centered at Judge's right hand area (192, 178)
  const sevenStars = Array.from({length:7}, (_,i) => {
    const a = -Math.PI/2 + i*(2*Math.PI/7)
    return [f(192 + 20*Math.cos(a)), f(178 + 20*Math.sin(a))]
  })

  const bodyContent = `
    <defs>
      <radialGradient id="judgGrad20" cx="50%" cy="38%" r="60%">
        <stop offset="0%"   stop-color="${judgLt}" stop-opacity="0.88"/>
        <stop offset="26%"  stop-color="${judgGl}" stop-opacity="0.55"/>
        <stop offset="58%"  stop-color="${shinMd}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${shinC}"  stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="shinGlow20" cx="50%" cy="78%" r="62%">
        <stop offset="0%"   stop-color="${shinC}"  stop-opacity="0.42"/>
        <stop offset="100%" stop-color="${shinC}"  stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bloodGrad20" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stop-color="${bloodLt}" stop-opacity="0.92"/>
        <stop offset="60%"  stop-color="${bloodMd}" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="${bloodC}"  stop-opacity="1"/>
      </linearGradient>
    </defs>

    <!-- Background fire-glow rising from below — the field of the Aeon is fire, not darkness -->
    <ellipse cx="150" cy="290" rx="168" ry="185" fill="url(#shinGlow20)" opacity="0.78"/>

    <!-- Nuit — the cosmic sky-body arching over the entire Aeon -->
    <!-- She contained the stars (XVII); now she contains the Last Day -->
    <!-- The Apocalypse happens within her; she remains after it -->
    <path d="M0,130 C62,54 118,28 150,26 C182,28 238,54 300,130"
          fill="none" stroke="${nuitC}" stroke-width="30" opacity="0.88"/>
    <path d="M0,130 C62,54 118,28 150,26 C182,28 238,54 300,130"
          fill="none" stroke="${nuitSt}" stroke-width="1.2" opacity="0.32"/>
    <!-- Stars along Nuit's arc (12 — the covenant number, now the Judge's crown) -->
    ${Array.from({length:12}, (_,i) => {
      const t  = i / 11
      const x  = t * 300
      const y  = 130 - Math.sin(t * Math.PI) * 104
      return `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="${nuitSt}" opacity="${f(0.52+(i%3)*0.1)}"/>`
    }).join('\n    ')}

    <!-- Shin (ש) — three ascending flame-prongs; more visible than other ghost letterforms -->
    <!-- The fire is not background here: Shin IS the substance of the Apocalypse -->
    <!-- The three prongs connect at the blood-line below — Shin rises from the Flood of Blood -->
    <!-- Left prong — ascending and curving slightly left at top -->
    <path d="M90,316 C88,288 82,252 78,212 C74,172 78,140 84,110 C88,88 90,68 91,50"
          fill="none" stroke="${shinC}" stroke-width="7" stroke-linecap="round" opacity="0.26"/>
    <path d="M90,316 C88,288 82,252 78,212 C74,172 78,140 84,110 C88,88 90,68 91,50"
          fill="none" stroke="${shinLt}" stroke-width="3" stroke-linecap="round" opacity="0.20"/>
    <!-- Center prong — tallest, straight up to Nuit and Hadit -->
    <path d="M150,320 C150,292 150,252 150,210 C150,168 150,128 150,92 C150,76 150,58 150,44"
          fill="none" stroke="${shinC}" stroke-width="7" stroke-linecap="round" opacity="0.26"/>
    <path d="M150,320 C150,292 150,252 150,210 C150,168 150,128 150,92 C150,76 150,58 150,48"
          fill="none" stroke="${shinLt}" stroke-width="3" stroke-linecap="round" opacity="0.20"/>
    <!-- Right prong — ascending and curving slightly right at top -->
    <path d="M210,316 C212,288 218,252 222,212 C226,172 222,140 216,110 C212,88 210,68 209,50"
          fill="none" stroke="${shinC}" stroke-width="7" stroke-linecap="round" opacity="0.26"/>
    <path d="M210,316 C212,288 218,252 222,212 C226,172 222,140 216,110 C212,88 210,68 209,50"
          fill="none" stroke="${shinLt}" stroke-width="3" stroke-linecap="round" opacity="0.20"/>
    <!-- Base connector at blood-line -->
    <path d="M90,316 C110,312 132,318 150,320 C168,318 190,312 210,316"
          fill="none" stroke="${shinC}" stroke-width="5.5" stroke-linecap="round" opacity="0.22"/>

    <!-- ═══ Hadit — winged solar disk, final form of the solarDisk lineage ═══ -->
    <!-- Fool(free) Hermit(lantern) Art(crown) Tower(burst) Star(garment) Moon(eclipse) Sun(blazing) Aeon(winged) -->
    <!-- The eighth appearance: the disk given wings — Horus Behdety, the Egyptian solar Aeon -->
    <!-- This is simultaneously the Egyptian solar emblem and the Throne described in Ezekiel 1 -->

    <!-- Left wing -->
    <path d="M${hCX-hR},${hCY} C${hCX-62},${hCY-20} ${hCX-90},${hCY-10} ${hCX-92},${hCY+4} C${hCX-90},${hCY+16} ${hCX-68},${hCY+20} ${hCX-hR},${hCY+8} Z"
          fill="${wingC}" stroke="${wingLt}" stroke-width="0.8" opacity="0.90"/>
    <!-- Left feather tips -->
    ${Array.from({length:5}, (_,i) => {
      const x1 = hCX - hR - 8 - i*11
      const y1 = hCY + 12 - i*1.5
      return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x1-6)}" y2="${f(y1+14)}" stroke="${wingC}" stroke-width="1.5" stroke-linecap="round" opacity="${f(0.68-i*0.08)}"/>`
    }).join('\n    ')}

    <!-- Right wing -->
    <path d="M${hCX+hR},${hCY} C${hCX+62},${hCY-20} ${hCX+90},${hCY-10} ${hCX+92},${hCY+4} C${hCX+90},${hCY+16} ${hCX+68},${hCY+20} ${hCX+hR},${hCY+8} Z"
          fill="${wingC}" stroke="${wingLt}" stroke-width="0.8" opacity="0.90"/>
    <!-- Right feather tips -->
    ${Array.from({length:5}, (_,i) => {
      const x1 = hCX + hR + 8 + i*11
      const y1 = hCY + 12 - i*1.5
      return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x1+6)}" y2="${f(y1+14)}" stroke="${wingC}" stroke-width="1.5" stroke-linecap="round" opacity="${f(0.68-i*0.08)}"/>`
    }).join('\n    ')}

    <!-- Hadit disk (same solar gold as XIX — the lineage is explicit) -->
    <circle cx="${hCX}" cy="${hCY}" r="${hR+2}" fill="${haditC}"  opacity="0.96"/>
    <circle cx="${hCX}" cy="${hCY}" r="${hR}"   fill="${haditLt}" opacity="1.00"/>
    <circle cx="${hCX}" cy="${hCY}" r="${hR-8}"  fill="#fffff0"   opacity="0.90"/>
    <!-- Uraeus pair at disk base (solar ruler emblem, same as XIX) -->
    <path d="M144,${hBase-2} C142,${hBase+7} 138,${hBase+12} 136,${hBase+8} C134,${hBase+4} 138,${hBase} 142,${hBase+2} C146,${hBase+4} 148,${hBase+10} 150,${hBase+12}"
          fill="none" stroke="${wingC}" stroke-width="1.6" stroke-linecap="round" opacity="0.62"/>
    <path d="M156,${hBase-2} C158,${hBase+7} 162,${hBase+12} 164,${hBase+8} C166,${hBase+4} 162,${hBase} 158,${hBase+2} C154,${hBase+4} 152,${hBase+10} 150,${hBase+12}"
          fill="none" stroke="${wingC}" stroke-width="1.6" stroke-linecap="round" opacity="0.62"/>

    <!-- ═══ Cosmic Judge — Ancient of Days + Christ as Last Judge ═══ -->
    <!-- Daniel 7:9-10: throne of fire, hair white as wool, river of fire -->
    <!-- Revelation 1:14-16: eyes like blazing fire, sword from mouth, face like the sun in its strength -->
    <!-- Not a human-scale figure: a presence of concentrated cosmic light -->
    <!-- The seven stars from XVII (heptagram in the sky) are now held in the Judge's right hand -->

    <!-- Judge's light-field -->
    <ellipse cx="150" cy="178" rx="74" ry="90" fill="url(#judgGrad20)" opacity="0.90"/>

    <!-- Body of light — the Ancient of Days, column of white fire -->
    <rect x="138" y="130" width="24" height="108" rx="12" fill="${judgLt}" fill-opacity="0.72" opacity="0.88"/>

    <!-- Crown / head — white as wool (Dan 7:9), blazing as fire (Rev 1:14) -->
    <ellipse cx="150" cy="130" rx="29" ry="20" fill="${judgLt}" opacity="0.84"/>
    <ellipse cx="150" cy="130" rx="22" ry="14" fill="#ffffd8"   opacity="0.80"/>
    <!-- Eyes like blazing fire -->
    <circle cx="142" cy="128" r="3.5" fill="${eyeC}"  opacity="0.90"/>
    <circle cx="158" cy="128" r="3.5" fill="${eyeC}"  opacity="0.90"/>
    <circle cx="142" cy="128" r="1.8" fill="${shinWh}" opacity="0.88"/>
    <circle cx="158" cy="128" r="1.8" fill="${shinWh}" opacity="0.88"/>

    <!-- Seven stars held in the right hand — Rev 1:16 -->
    <!-- The same seven of XVII's heptagram, now in the Judge's palm -->
    ${sevenStars.map(([x,y],i) =>
      `<circle cx="${x}" cy="${y}" r="2.5" fill="${sevenC}" opacity="0.88"/>` +
      `<circle cx="${x}" cy="${y}" r="1.2" fill="white"    opacity="0.82"/>` +
      (i===0 ? `<circle cx="${x}" cy="${y}" r="4.5" fill="${sevenC}" opacity="0.22"/>` : '')
    ).join('\n    ')}
    <!-- Hand outline (faint) -->
    <ellipse cx="192" cy="178" rx="27" ry="23" fill="none" stroke="${judgLt}" stroke-width="1.0" opacity="0.28"/>

    <!-- Sword from mouth — Rev 1:16, 19:15: "a sharp sword to strike down the nations" -->
    <!-- The same cross-axis as XVIII's eclipse flare and XIX's disc cross-hairs, now weaponised -->
    <!-- The word of judgement is the same word of creation — spoken, it accomplishes the new order -->
    <line x1="150" y1="142" x2="150" y2="228" stroke="${swordC}" stroke-width="2.2" opacity="0.62"/>
    <line x1="150" y1="142" x2="150" y2="215" stroke="white"     stroke-width="0.9" opacity="0.55"/>
    <!-- Crossguard suggestion — the double-edged sword -->
    <line x1="143" y1="185" x2="157" y2="185" stroke="${swordC}" stroke-width="1.5" opacity="0.45"/>

    <!-- ═══ Four Horsemen — Revelation 6 ═══ -->
    <!-- Simple abstract forms: the four canonical colors identify each rider -->
    <!-- Riding in the zone between the Judge above and the blood-flood below -->
    <!-- White (Conquest), Red (War), Black (Famine), Pale (Death) -->
    <!-- The Pale rider is Death — card XIII's figure, now at cosmic scale and final commission -->

    <!-- White horse — Conquest (Rev 6:2: "a crown was given to him, and he rode out conquering") -->
    <ellipse cx="52"  cy="264" rx="23" ry="11" fill="${horseW}" opacity="0.62" transform="rotate(-14,52,264)"/>
    <circle  cx="70"  cy="253" r="6.5"          fill="${horseW}" opacity="0.56"/>

    <!-- Red horse — War (Rev 6:4: "its rider was given power to take peace from the earth") -->
    <ellipse cx="115" cy="274" rx="24" ry="11" fill="${horseR}" opacity="0.68" transform="rotate(-10,115,274)"/>
    <circle  cx="134" cy="263" r="6.5"          fill="${horseR}" opacity="0.62"/>

    <!-- Black horse — Famine (Rev 6:5: "a pair of scales in its rider's hand") -->
    <ellipse cx="183" cy="267" rx="23" ry="11" fill="${horseB}" opacity="0.75" transform="rotate(-12,183,267)"/>
    <circle  cx="202" cy="256" r="6.5"          fill="${horseB}" opacity="0.68"/>

    <!-- Pale horse — Death (Rev 6:8: "its rider was named Death, and Hades was following close behind") -->
    <!-- The same pale rider as XIII, now at the scale of the Last Day -->
    <ellipse cx="247" cy="277" rx="23" ry="11" fill="${horseP}" opacity="0.58" transform="rotate(-8,247,277)"/>
    <circle  cx="266" cy="266" r="6.5"          fill="${horseP}" opacity="0.52"/>

    <!-- ═══ Flood of Blood — Revelation 14:20 ═══ -->
    <!-- "Blood flowed out of the press, rising as high as the horses' bridles" -->
    <!-- The eschatological water arc completes its penultimate station: -->
    <!--   XV Devil:  Lake of Fire (sulfurous; foreshadowing) -->
    <!--   XVI Tower: Flood of Water (Noaic type) -->
    <!--   XVII Star: Crystal River (living water, gift) -->
    <!--   XVIII Moon: Eclipse-lit pool (veiled approach) -->
    <!--   XIX Sun:   Lake of Light (individual resurrection) -->
    <!--   XX Aeon:   Flood of Blood (antitype of the Flood of Water; Rev 14:20) -->
    <!--   XXI Universe: River of Life in the New Jerusalem (water fully redeemed) -->
    <rect x="0" y="314" width="300" height="106" fill="url(#bloodGrad20)" opacity="0.96"/>

    <!-- Mountains of Megiddo — dark silhouettes rising above the blood -->
    <!-- Their peaks are above the blood-line; their lower slopes are submerged -->
    <!-- These are the mountains that will flee and be found no more (Rev 20:11) -->
    <path d="M0,314 L20,276 L44,294 L70,256 L96,288 L122,262 L148,290 L150,314 Z"
          fill="${mtC}" opacity="0.92"/>
    <path d="M150,314 L152,290 L178,265 L204,284 L230,258 L256,282 L282,268 L300,280 L300,314 Z"
          fill="${mtC}" opacity="0.92"/>
    <!-- Pale ash on mountain peaks — the mountains already beginning their dissolution -->
    <path d="M67,259 L70,256 L73,259" stroke="#d8d0c8" stroke-width="1.2" fill="none" opacity="0.42"/>
    <path d="M119,265 L122,262 L125,265" stroke="#d8d0c8" stroke-width="1.2" fill="none" opacity="0.38"/>
    <path d="M227,261 L230,258 L233,261" stroke="#d8d0c8" stroke-width="1.2" fill="none" opacity="0.36"/>

    <!-- Blood surface — same structural position as the pool in XVII-XIX; the same water, transformed -->
    ${Array.from({length:5}, (_,i) => {
      const y = 316 + i*3.5
      return `<path d="M0,${f(y)} C50,${f(y-1.5)} 100,${f(y+1.5)} 150,${f(y)} C200,${f(y-1.5)} 250,${f(y+1.5)} 300,${f(y)}" fill="none" stroke="${bloodLt}" stroke-width="0.7" opacity="${f(0.28-i*0.04)}"/>`
    }).join('')}
    <!-- Blood depths -->
    <rect x="0" y="362" width="300" height="58" fill="${bloodC}" opacity="0.52"/>
  `

  return majorCard({
    title: 'THE AEON', number: 'XX',
    hebrew: 'Shin · Fire · Path 31',
    hebrewLetter: 'ש', attribution: '△',
    bg1: '#0a0200', bg2: '#140400',
    border: '#4a1000', accent: '#cc3300',
    text: '#ff9966', dim: '#4a1000',
    bodyContent,
  })
}

// ─── Card 21 — The Universe ───────────────────────────────────────────────────
// Element: Saturn / Earth  |  Tau (ת)  |  Path 32: Yesod → Malkuth
// King Scale: Indigo
// Motifs: New Jerusalem (Bride), 72 angel-circles / 12 gates, Four Living Creatures,
//         River of Life, Tree of Life, Tetragrammaton on forehead,
//         ambient glory (dissolved solarDisk lineage), Ghost Tau (Cross)

function card21() {
  // ── Palette ────────────────────────────────────────────────────────────────
  const tauC   = '#3322aa'  // indigo — King Scale for Tau/Saturn (ghost letter)
  const figC   = '#fffff8'  // ivory-white — the Bride, pure linen
  const gownC  = '#eeddaa'  // gold-white linen — Rev 19:8
  const gloryC = '#ccaa44'  // dissolved solarDisk lineage — ambient radiance
  const crownC = '#ddbb55'  // mural crown — New Jerusalem is a city
  const tetrC  = '#ffdd66'  // Tetragrammaton יהוה — Rev 22:4
  const circC  = '#aa8822'  // 72 wreath circles — angels released
  const gateC  = '#ffffff'  // 12 gate circles — brighter, pearl-white
  const riverC = '#b0ccff'  // River of Life — crystal-clear (Rev 22:1)
  const treeC  = '#336633'  // Tree of Life — both banks (Rev 22:2)
  const beastC = '#886644'  // Four Living Creatures — warm stone
  const starC  = '#eeddff'  // ambient starfield — New Heaven

  // ── Pre-compute wreath of 72 circles ──────────────────────────────────────
  // 72 angels no longer bound to maintaining the old Creation's structure.
  // Every 6th circle (12 total) = the 12 gates of New Jerusalem (Rev 21:12).
  // These 12 gate-circles are the same 12 stars present from XVII to XX,
  // now at rest as the pearl-gates of the eternal city.
  const wCX = 150, wCY = 210, wRX = 95, wRY = 115
  const wreathDots = Array.from({ length: 72 }, (_, i) => {
    const angle = (i / 72) * 2 * Math.PI - Math.PI / 2  // start at top
    const cx = f(wCX + wRX * Math.cos(angle))
    const cy = f(wCY + wRY * Math.sin(angle))
    const isGate = i % 6 === 0
    return `<circle cx="${cx}" cy="${cy}" r="${isGate ? 4.5 : 2.5}" fill="${isGate ? gateC : circC}" opacity="${isGate ? 0.90 : 0.52}"/>`
  }).join('\n    ')

  // ── Pre-compute 16 ambient glory rays (dissolved solarDisk lineage) ───────
  // Rev 21:23: the city has no need of sun or moon — the glory of God is its light.
  // The solarDisk that appeared in 8 discrete forms (I through XX) dissolves here
  // into ambient radiance. No point-source remains; the light fills the whole card.
  const gCX = 150, gCY = 186
  const gloryRays = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 2 * Math.PI
    const x2 = f(gCX + 162 * Math.cos(angle))
    const y2 = f(gCY + 162 * Math.sin(angle))
    return `<line x1="${gCX}" y1="${gCY}" x2="${x2}" y2="${y2}" stroke="${gloryC}" stroke-width="0.7" opacity="0.10"/>`
  }).join('\n    ')

  const bodyContent = `
  <!-- ═══ XXI THE UNIVERSE ════════════════════════════════════════════════ -->
  <!-- Tau · Saturn · Path 32: Yesod → Malkuth                              -->
  <!-- King Scale: Indigo                                                    -->
  <!-- New Heaven and New Earth (Rev 21-22) — the Great Work complete       -->
  <!-- Eschatological water arc VII/VII: River of Life (Rev 22:1-2)         -->
  <!-- Dante: Paradiso finale — the River of Light, the Beatific Vision     -->
  <!-- Christ type: Ascension fulfilled — Man and God restored to union     -->
  <defs>
    <!-- Ambient glory — dissolved solarDisk lineage, no discrete point     -->
    <radialGradient id="gloryGrad21" cx="50%" cy="44%" r="55%">
      <stop offset="0%"   stop-color="${gloryC}" stop-opacity="0.22"/>
      <stop offset="40%"  stop-color="${gloryC}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${gloryC}" stop-opacity="0"/>
    </radialGradient>
    <!-- Figure inner glow -->
    <radialGradient id="figGlow21" cx="50%" cy="30%" r="55%">
      <stop offset="0%"   stop-color="${figC}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${figC}" stop-opacity="0"/>
    </radialGradient>
    <!-- River of Life gradient -->
    <linearGradient id="riverGrad21" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${riverC}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="${riverC}" stop-opacity="0.50"/>
    </linearGradient>
  </defs>

  <!-- Ghost Tau — the final letter; the Cross as cosmic completion          -->
  <!-- Paleo-Hebrew Tau is a cross mark: the seal placed on the righteous   -->
  <!-- Ezek 9:4 — the same mark, now written over the whole New Creation    -->
  <!-- XII Hanged Man (the Cross as sacrifice) → XXI Universe (the Cross    -->
  <!-- as completion): Tau bookends the personal and the cosmic arc         -->
  <text x="152" y="265"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="310" fill="${tauC}" opacity="0.09">ת</text>

  <!-- Ambient starfield — New Heaven -->
  <circle cx="36"  cy="90"  r="1.0" fill="${starC}" opacity="0.38"/>
  <circle cx="70"  cy="104" r="0.7" fill="${starC}" opacity="0.28"/>
  <circle cx="52"  cy="145" r="0.8" fill="${starC}" opacity="0.32"/>
  <circle cx="22"  cy="168" r="1.0" fill="${starC}" opacity="0.24"/>
  <circle cx="18"  cy="248" r="0.8" fill="${starC}" opacity="0.20"/>
  <circle cx="260" cy="93"  r="0.8" fill="${starC}" opacity="0.36"/>
  <circle cx="244" cy="137" r="1.0" fill="${starC}" opacity="0.28"/>
  <circle cx="276" cy="162" r="0.7" fill="${starC}" opacity="0.26"/>
  <circle cx="272" cy="252" r="0.8" fill="${starC}" opacity="0.20"/>

  <!-- Dissolved solar lineage: ambient glory (no discrete disk)            -->
  <!-- 8 appearances of the solarDisk: I Magician → IX Hermit → X Wheel    -->
  <!--   → XIV Art → XV Devil → XVI Tower → XIX Sun → XX Aeon (Hadit)      -->
  <!-- Here the barrier between Mankind and Godhead has dissolved entirely  -->
  <ellipse cx="150" cy="186" rx="148" ry="148" fill="url(#gloryGrad21)"/>
  ${gloryRays}

  <!-- ── Wreath of 72 circles — Angels released, 12 Gates ──────────────── -->
  <!-- 72 = the traditional count of bound angels maintaining creation      -->
  <!-- Rev 5:11 — ten thousand times ten thousand; here the 72 are freed    -->
  <!-- Every 6th circle (12 total) = pearl-gate of New Jerusalem            -->
  <!-- These 12 gate-circles complete the journey of the 12 stars:         -->
  <!--   XVII crown of Johannine Virgin → XX Judge's right hand → XXI gates -->
  ${wreathDots}

  <!-- ── Four Living Creatures in their proper Johannine context ────────── -->
  <!-- Rev 4:6-8: full of eyes, six wings, before the Throne               -->
  <!-- No longer merely the four witnesses of creation (RWS) but the       -->
  <!-- eternal creatures before the Throne in the New Jerusalem             -->

  <!-- NW — Human face (Aquarius / Reuben) -->
  <ellipse cx="42" cy="103" rx="13" ry="14" fill="none" stroke="${beastC}" stroke-width="1.2" opacity="0.70"/>
  <ellipse cx="42" cy="101" rx="6"  ry="7"  fill="none" stroke="${beastC}" stroke-width="0.8" opacity="0.52"/>
  <path d="M30,104 C22,97 16,88 20,82 C24,88 28,95 30,101" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.52"/>
  <path d="M30,104 C18,101 12,110 16,117 C22,113 27,107 30,106" fill="none" stroke="${beastC}" stroke-width="0.8" opacity="0.42"/>
  <path d="M54,104 C62,97 68,88 64,82 C60,88 56,95 54,101" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.52"/>
  <path d="M54,104 C66,101 72,110 68,117 C62,113 57,107 54,106" fill="none" stroke="${beastC}" stroke-width="0.8" opacity="0.42"/>

  <!-- NE — Eagle (Scorpio / Dan) -->
  <ellipse cx="258" cy="101" rx="8" ry="10" fill="none" stroke="${beastC}" stroke-width="1.2" opacity="0.65"/>
  <path d="M255,101 L251,105 L258,103" fill="${beastC}" opacity="0.62"/>
  <path d="M252,97 C240,90 232,81 236,75 C244,83 250,92 252,98" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.50"/>
  <path d="M264,97 C276,90 284,81 280,75 C272,83 266,92 264,98" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.50"/>
  <path d="M252,99 C238,96 230,104 234,112 C240,107 246,101 252,101" fill="none" stroke="${beastC}" stroke-width="0.7" opacity="0.38"/>
  <path d="M264,99 C278,96 286,104 282,112 C276,107 270,101 264,101" fill="none" stroke="${beastC}" stroke-width="0.7" opacity="0.38"/>

  <!-- SW — Bull/Ox (Taurus / Ephraim) -->
  <ellipse cx="42" cy="316" rx="12" ry="11" fill="none" stroke="${beastC}" stroke-width="1.2" opacity="0.65"/>
  <path d="M34,309 C30,301 26,294 29,290 C33,297 36,305 36,309" fill="none" stroke="${beastC}" stroke-width="1.3" opacity="0.65"/>
  <path d="M50,309 C54,301 58,294 55,290 C51,297 48,305 48,309" fill="none" stroke="${beastC}" stroke-width="1.3" opacity="0.65"/>
  <path d="M31,317 C20,311 14,321 17,329 C23,323 28,318 32,318" fill="none" stroke="${beastC}" stroke-width="0.8" opacity="0.42"/>
  <path d="M53,317 C64,311 70,321 67,329 C61,323 56,318 52,318" fill="none" stroke="${beastC}" stroke-width="0.8" opacity="0.42"/>

  <!-- SE — Lion (Leo / Judah) -->
  <circle  cx="258" cy="317" r="16" fill="none" stroke="${beastC}" stroke-width="2.5" opacity="0.30"/>
  <ellipse cx="258" cy="317" rx="10" ry="11" fill="none" stroke="${beastC}" stroke-width="1.2" opacity="0.65"/>
  <path d="M269,311 C280,304 287,295 283,289 C276,297 272,306 270,311" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.50"/>
  <path d="M269,313 C282,311 290,319 286,327 C280,321 274,315 270,313" fill="none" stroke="${beastC}" stroke-width="0.7" opacity="0.38"/>
  <path d="M247,311 C236,304 229,295 233,289 C240,297 244,306 246,311" fill="none" stroke="${beastC}" stroke-width="0.9" opacity="0.50"/>

  <!-- ── The Figure: New Jerusalem, Bride of Christ ─────────────────────── -->
  <!-- Rev 19:7-8 — fine linen, bright and clean; the righteousness of the  -->
  <!-- saints. She is simultaneously: New Jerusalem (Rev 21:2), New Israel, -->
  <!-- the Bride of the Lamb, and the perfected Great Work — the alchemical  -->
  <!-- Philosopher's Stone as a Person rather than a substance.             -->
  <!-- The chemical wedding of VI Lovers and the alchemical process of      -->
  <!-- XIV Art are here resolved in a Person, not in gold.                  -->

  <!-- Background figure glow -->
  <ellipse cx="150" cy="196" rx="54" ry="92" fill="url(#figGlow21)"/>

  <!-- Gown — flowing, tapered, luminous linen -->
  <path d="M138,146 C131,150 117,167 113,188 C109,210 111,234 115,260
            C118,278 124,291 130,299 L170,299 C176,291 182,278 185,260
            C189,234 191,210 187,188 C183,167 169,150 162,146 Z"
        fill="${gownC}" opacity="0.20"/>
  <!-- Inner luminosity of the linen -->
  <path d="M143,149 C138,157 131,172 129,190 C127,212 131,237 138,261
            L150,263 L162,261 C169,237 173,212 171,190 C169,172 162,157 157,149 Z"
        fill="${figC}" opacity="0.13"/>

  <!-- Orans arms — raised in worship and reception -->
  <path d="M137,159 C131,155 111,147 89,141 C79,138 75,137 73,139"
        fill="none" stroke="${gownC}" stroke-width="3.5" stroke-linecap="round" opacity="0.52"/>
  <path d="M163,159 C169,155 189,147 211,141 C221,138 225,137 227,139"
        fill="none" stroke="${gownC}" stroke-width="3.5" stroke-linecap="round" opacity="0.52"/>
  <!-- Hands -->
  <ellipse cx="72"  cy="140" rx="5" ry="4" fill="${figC}" opacity="0.42" transform="rotate(-22,72,140)"/>
  <ellipse cx="228" cy="140" rx="5" ry="4" fill="${figC}" opacity="0.42" transform="rotate(22,228,140)"/>

  <!-- Head -->
  <ellipse cx="150" cy="128" rx="14" ry="16" fill="${figC}" opacity="0.80"/>
  <ellipse cx="150" cy="128" rx="10" ry="12" fill="${figC}" opacity="0.22"/>

  <!-- Personal halo — golden ring, the Lamb's own light about her         -->
  <circle cx="150" cy="128" r="22" fill="none" stroke="${gloryC}" stroke-width="1.4" opacity="0.62"/>
  <circle cx="150" cy="128" r="26" fill="none" stroke="${gloryC}" stroke-width="0.6" opacity="0.26"/>

  <!-- Mural crown — New Jerusalem is a city; her crown is architectural    -->
  <!-- Rev 21:10-21: walls of jasper, foundations of every precious stone  -->
  <rect x="135" y="110" width="30" height="5"  rx="1" fill="${crownC}" opacity="0.82"/>
  <rect x="138" y="102" width="7"  height="9"  rx="1" fill="${crownC}" opacity="0.82"/>
  <rect x="147" y="99"  width="7"  height="12" rx="1" fill="${crownC}" opacity="0.82"/>
  <rect x="156" y="102" width="7"  height="9"  rx="1" fill="${crownC}" opacity="0.82"/>
  <rect x="134" y="99"  width="32" height="18" rx="2" fill="none" stroke="${tetrC}" stroke-width="0.6" opacity="0.32"/>

  <!-- Tetragrammaton on forehead — Rev 22:4: "His name shall be on their foreheads" -->
  <!-- The seal and completion of the entire deck and the Great Divine Work  -->
  <!-- This seal was placed on the righteous in Ezek 9:4 (the Tau mark);   -->
  <!-- the ghost Tau behind the card is the same seal writ cosmologically  -->
  <text x="150" y="126"
        text-anchor="middle" dominant-baseline="middle"
        font-family="'Times New Roman','FreeSerif',serif"
        font-size="9" fill="${tetrC}" opacity="0.92" filter="url(#glow)">יהוה</text>

  <!-- ── River of Life — eschatological water arc VII/VII ────────────────── -->
  <!-- Rev 22:1-2: crystal-clear water flowing from the Throne of God and   -->
  <!-- the Lamb; the Tree of Life on each bank bearing twelve fruits         -->
  <!--                                                                        -->
  <!-- The complete water arc across the eschatological sequence:            -->
  <!--   XV  Lake of Fire     — Inferno / Descent / Sheol                   -->
  <!--   XVI Flood of Water   — Purgatorio begins / Noah / Baptismal death  -->
  <!--   XVII Crystal River   — Milky Way / covenant stars / Lethe          -->
  <!--   XVIII Eclipse pool   — Purgatorio summit / the Cloud of Unknowing  -->
  <!--   XIX Lake of Light    — Paradiso opens / Resurrection morning       -->
  <!--   XX  Flood of Blood   — Final judgment / Armageddon / Rev 14:20     -->
  <!--   XXI River of Life    — Paradiso finale / Beatific Vision / Rev 22  -->
  <!--                                                                        -->
  <!-- Dante: the River of Light in Paradiso XXX flows into the Celestial   -->
  <!-- Rose and the direct sight of God — the same sequence, same waters    -->
  <!-- Christ type: Death(XV) → Burial(XVI) → Resurrection(XIX) →          -->
  <!--              Ascension → Sending(XX) → New Life(XXI)                 -->

  <!-- Tree of Life — left bank -->
  <line x1="108" y1="310" x2="108" y2="278" stroke="${treeC}" stroke-width="1.9" opacity="0.62"/>
  <line x1="108" y1="302" x2="96"  y2="291" stroke="${treeC}" stroke-width="1.2" opacity="0.52"/>
  <line x1="108" y1="295" x2="100" y2="283" stroke="${treeC}" stroke-width="1.0" opacity="0.48"/>
  <line x1="108" y1="289" x2="116" y2="280" stroke="${treeC}" stroke-width="1.0" opacity="0.48"/>
  <line x1="108" y1="284" x2="102" y2="275" stroke="${treeC}" stroke-width="0.8" opacity="0.42"/>
  <line x1="108" y1="280" x2="113" y2="272" stroke="${treeC}" stroke-width="0.8" opacity="0.38"/>
  <!-- Tree of Life — right bank -->
  <line x1="192" y1="310" x2="192" y2="278" stroke="${treeC}" stroke-width="1.9" opacity="0.62"/>
  <line x1="192" y1="302" x2="204" y2="291" stroke="${treeC}" stroke-width="1.2" opacity="0.52"/>
  <line x1="192" y1="295" x2="200" y2="283" stroke="${treeC}" stroke-width="1.0" opacity="0.48"/>
  <line x1="192" y1="289" x2="184" y2="280" stroke="${treeC}" stroke-width="1.0" opacity="0.48"/>
  <line x1="192" y1="284" x2="198" y2="275" stroke="${treeC}" stroke-width="0.8" opacity="0.42"/>
  <line x1="192" y1="280" x2="187" y2="272" stroke="${treeC}" stroke-width="0.8" opacity="0.38"/>

  <!-- River channel — crystal-clear, flowing from beneath the figure      -->
  <path d="M118,311 C122,305 128,301 130,296 L170,296 C172,301 178,305 182,311
            C186,320 185,332 181,342 L119,342 C115,332 114,320 118,311 Z"
        fill="url(#riverGrad21)" opacity="0.80"/>
  <!-- River sparkle — crystal surface (Rev 22:1: clear as crystal)        -->
  <line x1="128" y1="303" x2="135" y2="303" stroke="${riverC}" stroke-width="0.6" opacity="0.72"/>
  <line x1="141" y1="306" x2="150" y2="306" stroke="${riverC}" stroke-width="0.6" opacity="0.62"/>
  <line x1="156" y1="303" x2="164" y2="303" stroke="${riverC}" stroke-width="0.6" opacity="0.72"/>
  <line x1="125" y1="315" x2="136" y2="315" stroke="${riverC}" stroke-width="0.5" opacity="0.55"/>
  <line x1="144" y1="319" x2="157" y2="319" stroke="${riverC}" stroke-width="0.5" opacity="0.55"/>
  <line x1="164" y1="315" x2="175" y2="315" stroke="${riverC}" stroke-width="0.5" opacity="0.55"/>
  <line x1="130" y1="329" x2="139" y2="329" stroke="${riverC}" stroke-width="0.4" opacity="0.44"/>
  <line x1="150" y1="333" x2="163" y2="333" stroke="${riverC}" stroke-width="0.4" opacity="0.44"/>
  <line x1="168" y1="329" x2="178" y2="329" stroke="${riverC}" stroke-width="0.4" opacity="0.38"/>
  `

  return majorCard({
    title: 'THE UNIVERSE', number: 'XXI',
    hebrew: 'Tau · Saturn · Path 32',
    hebrewLetter: 'ת', attribution: '♄',
    bg1: '#020210', bg2: '#06042a',
    border: '#2a1e66', accent: '#6644cc',
    text: '#ccaaff', dim: '#2a1e66',
    bodyContent,
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const CARDS = [
  { num: 0,  slug: 'the-fool',        fn: card0 },
  { num: 1,  slug: 'the-magus',       fn: card1 },
  { num: 2,  slug: 'the-priestess',   fn: card2 },
  { num: 3,  slug: 'the-empress',     fn: card3 },
  { num: 4,  slug: 'the-emperor',     fn: card4 },
  { num: 5,  slug: 'the-hierophant',  fn: card5 },
  { num: 6,  slug: 'the-lovers',      fn: card6 },
  { num: 7,  slug: 'the-chariot',    fn: card7 },
  { num: 8,  slug: 'adjustment',     fn: card8 },
  { num: 9,  slug: 'the-hermit',     fn: card9 },
  { num: 10, slug: 'fortune',        fn: card10 },
  { num: 11, slug: 'lust',           fn: card11 },
  { num: 12, slug: 'the-hanged-man', fn: card12 },
  { num: 13, slug: 'death',          fn: card13 },
  { num: 14, slug: 'art',            fn: card14 },
  { num: 15, slug: 'the-devil',      fn: card15 },
  { num: 16, slug: 'the-tower',      fn: card16 },
  { num: 17, slug: 'the-star',       fn: card17 },
  { num: 18, slug: 'the-moon',       fn: card18 },
  { num: 19, slug: 'the-sun',        fn: card19 },
  { num: 20, slug: 'the-aeon',       fn: card20 },
  { num: 21, slug: 'the-universe',   fn: card21 },
  // Future cards added here as each is developed
]

const args    = process.argv.slice(2)
const filters = args.length > 0 ? new Set(args.map(Number)) : null

console.log('Grimoire Atziluth — Thoth Major Arcana Generator')
console.log(`Output: ${ART_ROOT}\n`)

let written = 0, skipped = 0

for (const { num, slug, fn } of CARDS) {
  if (filters && !filters.has(num)) continue
  const cn   = `tarot.major.thoth.${slug}`
  const dest = path.join(ART_ROOT, `${cn.replace(/\./g, '-')}.svg`)
  // Delete existing so regeneration works cleanly
  if (fs.existsSync(dest) && filters) fs.unlinkSync(dest)
  const ok   = write(dest, fn())
  console.log(`  ${num.toString().padStart(2)} — ${slug} … ${ok ? 'ok' : 'already exists'}`)
  ok ? written++ : skipped++
}

console.log(`\nWritten: ${written}  |  Already existed: ${skipped}`)
console.log('Done.')
