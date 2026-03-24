/**
 * thoth-shared.mjs
 * Shared utilities for Thoth Tarot SVG generators.
 * Imported by generate-thoth.mjs and generate-thoth-major.mjs.
 */

// ─── Number formatter ─────────────────────────────────────────────────────────

export function f(n) { return Math.round(n * 100) / 100 }

// ─── Solar Disk ───────────────────────────────────────────────────────────────
// The hidden/revealed Sun. Used in The Fool (free in sky) and The Hermit
// (enclosed inside the lantern). Same function, same colours — one card's open
// light is the other's secret fire.
//   cx/cy  = centre
//   diskR  = inner disk radius (the Fool uses 24; the Hermit's lantern uses 11)
//
// Proportional scaling: glow rings at ×1.5 and ×2.17; rays from diskR+4 outward.

export function solarDisk(cx, cy, diskR) {
  const g1R   = diskR * 1.5
  const g2R   = diskR * 2.17
  const rayIn = diskR + 4
  return `<g>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(g2R)}" fill="#fffde0" opacity="0.18" filter="url(#softglow)"/>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(g1R)}" fill="#fffbe8" opacity="0.45" filter="url(#softglow)"/>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(diskR)}" fill="#fff5b0" opacity="0.88"/>
  ${Array.from({length: 16}, (_, i) => {
    const a  = (i * 22.5) * Math.PI / 180
    const r2 = i % 2 === 0 ? g2R : diskR * 1.75
    return `<line x1="${f(cx + rayIn*Math.cos(a))}" y1="${f(cy + rayIn*Math.sin(a))}"
               x2="${f(cx + r2*Math.cos(a))}"       y2="${f(cy + r2*Math.sin(a))}"
               stroke="#ffee66" stroke-width="${i % 2 === 0 ? 1.5 : 0.8}" opacity="0.65"/>`
  }).join('\n  ')}
</g>`
}

// ─── Solar Ray Endpoints ──────────────────────────────────────────────────────
// Returns the 16 outer ray-tip positions from solarDisk(cx, cy, diskR).
// Used in The Hermit to place Yod (י) glyphs at exactly those positions —
// the same angular geometry as the Fool's solar rays, expressed as falling seeds
// rather than radiating light.

export function solarRayEndpoints(cx, cy, diskR) {
  const g2R = diskR * 2.17
  return Array.from({length: 16}, (_, i) => {
    const a  = (i * 22.5) * Math.PI / 180
    const r2 = i % 2 === 0 ? g2R : diskR * 1.75
    return { x: f(cx + r2 * Math.cos(a)), y: f(cy + r2 * Math.sin(a)), major: i % 2 === 0 }
  })
}

// ─── Suit Pip Symbol ──────────────────────────────────────────────────────────
// Returns SVG element string for one suit pip, centered at (cx, cy), height h.
// These are the canonical Thoth suit symbols — used in minor arcana pips
// and the four weapons on The Magus major arcana card.

export function suitPip(suit, cx, cy, h, color, opacity = 1) {
  const op = opacity < 1 ? ` opacity="${opacity}"` : ''
  const w  = h * 0.62

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
      const r  = h * 0.43
      const pr = r * 0.82
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return [cx + pr * Math.cos(a), cy + pr * Math.sin(a)]
      })
      const star = [0,2,4,1,3].map(i => `${f(pts[i][0])},${f(pts[i][1])}`).join(' ')
      const sw   = Math.max(1.5, h * 0.045)
      return `<g${op}>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${color}" stroke-width="${f(sw)}"/>
  <polygon points="${star}" fill="none" stroke="${color}" stroke-width="${f(sw)}" stroke-linejoin="round"/>
</g>`
    }
    default: return ''
  }
}

// ─── Alchemical Triangle ──────────────────────────────────────────────────────
// Fire=upward △, Water=downward ▽, Air=upward △ with bar, Earth=downward ▽ with bar

export function elemTriangle(element, cx, cy, size, color) {
  const h  = size
  const r  = size * 0.5
  const sw = Math.max(2, size * 0.06)

  if (element === 'Fire') {
    const pts = `${f(cx)},${f(cy - h*0.55)} ${f(cx - r)},${f(cy + h*0.3)} ${f(cx + r)},${f(cy + h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Water') {
    const pts = `${f(cx)},${f(cy + h*0.55)} ${f(cx - r)},${f(cy - h*0.3)} ${f(cx + r)},${f(cy - h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Air') {
    const pts = `${f(cx)},${f(cy - h*0.55)} ${f(cx - r)},${f(cy + h*0.3)} ${f(cx + r)},${f(cy + h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>
<line x1="${f(cx - r*0.6)}" y1="${f(cy + h*0.02)}" x2="${f(cx + r*0.6)}" y2="${f(cy + h*0.02)}"
      stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  if (element === 'Earth') {
    const pts = `${f(cx)},${f(cy + h*0.55)} ${f(cx - r)},${f(cy - h*0.3)} ${f(cx + r)},${f(cy - h*0.3)}`
    return `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>
<line x1="${f(cx - r*0.6)}" y1="${f(cy - h*0.02)}" x2="${f(cx + r*0.6)}" y2="${f(cy - h*0.02)}"
      stroke="${color}" stroke-width="${f(sw)}" opacity="0.8"/>`
  }
  return ''
}

// ─── Caduceus ─────────────────────────────────────────────────────────────────
// Mercury's staff: vertical rod, two serpents intertwining, winged top.
// cx/cy = centre of staff, h = total height.

export function caduceus(cx, cy, h, color) {
  const top  = cy - h * 0.5
  const bot  = cy + h * 0.5
  const mid  = cy
  const sw   = Math.max(1.5, h * 0.032)
  const wr   = h * 0.22   // wing half-span
  const wh   = h * 0.1    // wing height
  const sx   = h * 0.18   // serpent x-amplitude

  // Staff
  const staff = `<line x1="${f(cx)}" y1="${f(top + h*0.08)}" x2="${f(cx)}" y2="${f(bot)}"
      stroke="${color}" stroke-width="${f(sw)}" stroke-linecap="round"/>`

  // Left serpent (winds clockwise when viewed from front)
  const lSerpent = `<path d="M${f(cx)},${f(top + h*0.12)}
    C${f(cx - sx)},${f(top + h*0.22)} ${f(cx - sx)},${f(top + h*0.36)} ${f(cx)},${f(mid - h*0.06)}
    C${f(cx + sx)},${f(mid + h*0.04)} ${f(cx + sx)},${f(mid + h*0.2)}  ${f(cx)},${f(mid + h*0.3)}
    C${f(cx - sx)},${f(mid + h*0.4)}  ${f(cx - sx)},${f(bot - h*0.14)} ${f(cx)},${f(bot - h*0.04)}"
    fill="none" stroke="${color}" stroke-width="${f(sw * 0.85)}" stroke-linecap="round" opacity="0.9"/>`

  // Right serpent (mirror)
  const rSerpent = `<path d="M${f(cx)},${f(top + h*0.12)}
    C${f(cx + sx)},${f(top + h*0.22)} ${f(cx + sx)},${f(top + h*0.36)} ${f(cx)},${f(mid - h*0.06)}
    C${f(cx - sx)},${f(mid + h*0.04)} ${f(cx - sx)},${f(mid + h*0.2)}  ${f(cx)},${f(mid + h*0.3)}
    C${f(cx + sx)},${f(mid + h*0.4)}  ${f(cx + sx)},${f(bot - h*0.14)} ${f(cx)},${f(bot - h*0.04)}"
    fill="none" stroke="${color}" stroke-width="${f(sw * 0.85)}" stroke-linecap="round" opacity="0.9"/>`

  // Wings at top (two curved wing shapes)
  const lWing = `<path d="M${f(cx)},${f(top + h*0.08)}
    C${f(cx - wr*0.5)},${f(top - wh*0.2)} ${f(cx - wr)},${f(top + wh*0.1)} ${f(cx - wr*0.6)},${f(top + wh*0.7)}
    C${f(cx - wr*0.3)},${f(top + wh*0.4)} ${f(cx)},${f(top + wh*0.3)} ${f(cx)},${f(top + h*0.08)} Z"
    fill="${color}" opacity="0.75"/>`
  const rWing = `<path d="M${f(cx)},${f(top + h*0.08)}
    C${f(cx + wr*0.5)},${f(top - wh*0.2)} ${f(cx + wr)},${f(top + wh*0.1)} ${f(cx + wr*0.6)},${f(top + wh*0.7)}
    C${f(cx + wr*0.3)},${f(top + wh*0.4)} ${f(cx)},${f(top + wh*0.3)} ${f(cx)},${f(top + h*0.08)} Z"
    fill="${color}" opacity="0.75"/>`

  // Serpent heads (small circles at bottom)
  const heads = `<circle cx="${f(cx - sx*0.3)}" cy="${f(bot - h*0.02)}" r="${f(sw*1.4)}" fill="${color}" opacity="0.7"/>
  <circle cx="${f(cx + sx*0.3)}" cy="${f(bot - h*0.02)}" r="${f(sw*1.4)}" fill="${color}" opacity="0.7"/>`

  return `<g>${staff}${lSerpent}${rSerpent}${lWing}${rWing}${heads}</g>`
}

// ─── Winged hat (petasos) ─────────────────────────────────────────────────────
// cx/cy = centre of brim, size = brim width.

export function petasos(cx, cy, size, color) {
  const bw = size        // brim width
  const bh = size * 0.2  // brim thickness
  const cw = size * 0.55 // crown width
  const ch = size * 0.35 // crown height
  const ww = size * 0.42 // wing span per side
  const wh = size * 0.28 // wing height

  const brim  = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(bw*0.5)}" ry="${f(bh*0.5)}"
    fill="${color}" opacity="0.85"/>`
  const crown = `<path d="M${f(cx - cw*0.5)},${f(cy)}
    C${f(cx - cw*0.5)},${f(cy - ch)} ${f(cx + cw*0.5)},${f(cy - ch)} ${f(cx + cw*0.5)},${f(cy)} Z"
    fill="${color}" opacity="0.85"/>`

  // Left wing
  const lWing = `<path d="M${f(cx - bw*0.5)},${f(cy)}
    C${f(cx - bw*0.5 - ww*0.4)},${f(cy - wh*0.6)}
     ${f(cx - bw*0.5 - ww)},${f(cy - wh*0.2)}
     ${f(cx - bw*0.5 - ww*0.7)},${f(cy + wh*0.5)}
    C${f(cx - bw*0.5 - ww*0.3)},${f(cy + wh*0.1)} ${f(cx - bw*0.5)},${f(cy + bh*0.3)} ${f(cx - bw*0.5)},${f(cy)} Z"
    fill="${color}" opacity="0.7"/>`
  // Right wing (mirror)
  const rWing = `<path d="M${f(cx + bw*0.5)},${f(cy)}
    C${f(cx + bw*0.5 + ww*0.4)},${f(cy - wh*0.6)}
     ${f(cx + bw*0.5 + ww)},${f(cy - wh*0.2)}
     ${f(cx + bw*0.5 + ww*0.7)},${f(cy + wh*0.5)}
    C${f(cx + bw*0.5 + ww*0.3)},${f(cy + wh*0.1)} ${f(cx + bw*0.5)},${f(cy + bh*0.3)} ${f(cx + bw*0.5)},${f(cy)} Z"
    fill="${color}" opacity="0.7"/>`

  return `<g>${brim}${crown}${lWing}${rWing}</g>`
}

// ─── Winged sandal (talaria) ──────────────────────────────────────────────────
// cx/cy = ankle centre, size = sandal width. flip=true mirrors horizontally.

export function talaria(cx, cy, size, color, flip = false) {
  const fw = size        // foot width
  const fh = size * 0.35 // foot height
  const ww = size * 0.5  // wing width
  const wh = size * 0.38 // wing height
  const dir = flip ? -1 : 1

  const sole = `<ellipse cx="${f(cx)}" cy="${f(cy + fh*0.3)}" rx="${f(fw*0.5)}" ry="${f(fh*0.3)}"
    fill="${color}" opacity="0.7"/>`
  const wing = `<path d="M${f(cx + dir*fw*0.35)},${f(cy)}
    C${f(cx + dir*(fw*0.35 + ww*0.4))},${f(cy - wh*0.7)}
     ${f(cx + dir*(fw*0.35 + ww))},${f(cy - wh*0.3)}
     ${f(cx + dir*(fw*0.35 + ww*0.6))},${f(cy + wh*0.4)}
    C${f(cx + dir*(fw*0.35 + ww*0.2))},${f(cy + wh*0.1)} ${f(cx + dir*fw*0.35)},${f(cy + fh*0.1)} ${f(cx + dir*fw*0.35)},${f(cy)} Z"
    fill="${color}" opacity="0.65"/>`

  return `<g>${sole}${wing}</g>`
}
