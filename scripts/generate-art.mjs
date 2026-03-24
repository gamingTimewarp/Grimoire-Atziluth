/**
 * generate-art.mjs
 * Generates SVG art assets for entity groups that have no suitable CC0 source.
 *
 * Run from the repo root:
 *   node scripts/generate-art.mjs
 *
 * Generates:
 *  grimoire-app/public/art/runes/    *.svg  — stone-tablet style for 24 Elder Futhark runes
 *  grimoire-app/public/art/mahjong/  *.svg  — flower & season tiles (missing from FluffyStuff)
 *
 * All output is original work (programmatically generated), no licence restrictions.
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART_ROOT  = path.join(__dirname, '../grimoire-app/public/art')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function write(dest, content) {
  const dir = path.dirname(dest)
  fs.mkdirSync(dir, { recursive: true })
  if (fs.existsSync(dest)) return false  // idempotent
  fs.writeFileSync(dest, content, 'utf8')
  return true
}

// ─── Rune SVGs ────────────────────────────────────────────────────────────────
//
// Stone-tablet aesthetic: dark stone background, ivory runic glyph, name label.
// viewBox: 200×280 (matches tarot card aspect ratio roughly).
// Font: system runic-capable fonts with broad fallback chain.

const RUNES = [
  { cn: 'rune.elder-futhark.fehu',     glyph: 'ᚠ', name: 'Fehu'     },
  { cn: 'rune.elder-futhark.uruz',     glyph: 'ᚢ', name: 'Uruz'     },
  { cn: 'rune.elder-futhark.thurisaz', glyph: 'ᚦ', name: 'Thurisaz' },
  { cn: 'rune.elder-futhark.ansuz',    glyph: 'ᚨ', name: 'Ansuz'    },
  { cn: 'rune.elder-futhark.raidho',   glyph: 'ᚱ', name: 'Raidho'   },
  { cn: 'rune.elder-futhark.kenaz',    glyph: 'ᚲ', name: 'Kenaz'    },
  { cn: 'rune.elder-futhark.gebo',     glyph: 'ᚷ', name: 'Gebo'     },
  { cn: 'rune.elder-futhark.wunjo',    glyph: 'ᚹ', name: 'Wunjo'    },
  { cn: 'rune.elder-futhark.hagalaz',  glyph: 'ᚺ', name: 'Hagalaz'  },
  { cn: 'rune.elder-futhark.nauthiz',  glyph: 'ᚾ', name: 'Nauthiz'  },
  { cn: 'rune.elder-futhark.isa',      glyph: 'ᛁ', name: 'Isa'      },
  { cn: 'rune.elder-futhark.jera',     glyph: 'ᛃ', name: 'Jera'     },
  { cn: 'rune.elder-futhark.eihwaz',   glyph: 'ᛇ', name: 'Eihwaz'   },
  { cn: 'rune.elder-futhark.perthro',  glyph: 'ᛈ', name: 'Perthro'  },
  { cn: 'rune.elder-futhark.algiz',    glyph: 'ᛉ', name: 'Algiz'    },
  { cn: 'rune.elder-futhark.sowilo',   glyph: 'ᛊ', name: 'Sowilo'   },
  { cn: 'rune.elder-futhark.tiwaz',    glyph: 'ᛏ', name: 'Tiwaz'    },
  { cn: 'rune.elder-futhark.berkano',  glyph: 'ᛒ', name: 'Berkano'  },
  { cn: 'rune.elder-futhark.ehwaz',    glyph: 'ᛖ', name: 'Ehwaz'    },
  { cn: 'rune.elder-futhark.mannaz',   glyph: 'ᛗ', name: 'Mannaz'   },
  { cn: 'rune.elder-futhark.laguz',    glyph: 'ᛚ', name: 'Laguz'    },
  { cn: 'rune.elder-futhark.ingwaz',   glyph: 'ᛜ', name: 'Ingwaz'   },
  { cn: 'rune.elder-futhark.dagaz',    glyph: 'ᛞ', name: 'Dagaz'    },
  { cn: 'rune.elder-futhark.othala',   glyph: 'ᛟ', name: 'Othala'   },
]

function runesvg(glyph, name) {
  // Encode the glyph as a numeric XML character reference to avoid encoding issues
  const codePoint = glyph.codePointAt(0)
  const glyphRef  = `&#x${codePoint.toString(16).toUpperCase()};`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280">
  <defs>
    <filter id="carve" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
      <feOffset dx="1" dy="2" result="offset"/>
      <feComposite in="SourceGraphic" in2="offset" operator="over"/>
    </filter>
  </defs>

  <!-- Stone tablet background -->
  <rect width="200" height="280" rx="10" fill="#28231e"/>
  <!-- Inner stone face with slight lighter tone -->
  <rect x="7" y="7" width="186" height="266" rx="7"
        fill="#3a332c" stroke="#504840" stroke-width="1"/>
  <!-- Subtle vertical grain lines to suggest stone -->
  <line x1="50"  y1="20" x2="48"  y2="260" stroke="#302a24" stroke-width="0.5" opacity="0.6"/>
  <line x1="100" y1="15" x2="102" y2="265" stroke="#302a24" stroke-width="0.5" opacity="0.4"/>
  <line x1="150" y1="18" x2="152" y2="262" stroke="#302a24" stroke-width="0.5" opacity="0.5"/>

  <!-- Rune glyph (carved ivory) -->
  <text x="100" y="148"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Noto Sans Runic','Segoe UI Historic','FreeSerif',FreeSerif,serif"
        font-size="108"
        fill="#c8b880"
        filter="url(#carve)"
        opacity="0.92">${glyphRef}</text>

  <!-- Rune name -->
  <text x="100" y="252"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"
        font-size="13"
        fill="#8a7a58"
        letter-spacing="3">${name.toUpperCase()}</text>
</svg>`
}

function generateRunes() {
  let ok = 0
  for (const { cn, glyph, name } of RUNES) {
    const slug = cn.replace(/\./g, '-')
    const dest = path.join(ART_ROOT, 'runes', `${slug}.svg`)
    const written = write(dest, runesvg(glyph, name))
    console.log(`  rune: ${name} … ${written ? 'ok' : 'already exists'}`)
    ok++
  }
  return ok
}

// ─── Mahjong Flower & Season SVGs ─────────────────────────────────────────────
//
// Matches FluffyStuff's 300×400 viewBox tile style:
//   ivory tile body, rounded corners, coloured inner border,
//   corner number, large central Chinese character, English name at foot.
//
// Flowers are green-bordered; seasons are red-bordered.

const FLOWERS = [
  { cn: 'divination.mahjong-tile.flower-plum',         num: 1, char: '梅', en: 'Plum'         },
  { cn: 'divination.mahjong-tile.flower-orchid',       num: 2, char: '蘭', en: 'Orchid'       },
  { cn: 'divination.mahjong-tile.flower-chrysanthemum',num: 3, char: '菊', en: 'Chrysanthemum' },
  { cn: 'divination.mahjong-tile.flower-bamboo',       num: 4, char: '竹', en: 'Bamboo'       },
]

const SEASONS = [
  { cn: 'divination.mahjong-tile.season-spring', num: 1, char: '春', en: 'Spring' },
  { cn: 'divination.mahjong-tile.season-summer', num: 2, char: '夏', en: 'Summer' },
  { cn: 'divination.mahjong-tile.season-autumn', num: 3, char: '秋', en: 'Autumn' },
  { cn: 'divination.mahjong-tile.season-winter', num: 4, char: '冬', en: 'Winter' },
]

function mahjongTileSvg(num, char, en, borderColor, numColor) {
  const codePoint = char.codePointAt(0)
  const charRef   = `&#x${codePoint.toString(16).toUpperCase()};`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <!-- Tile shadow -->
  <rect x="6" y="8" width="288" height="388" rx="18" fill="rgba(0,0,0,0.25)"/>
  <!-- Tile body -->
  <rect x="2" y="2" width="288" height="388" rx="16" fill="#f5eedc"/>
  <!-- Tile highlight (top edge) -->
  <rect x="2" y="2" width="288" height="60" rx="16" fill="rgba(255,255,255,0.35)"/>
  <!-- Coloured inner border -->
  <rect x="14" y="14" width="264" height="364" rx="10"
        fill="none" stroke="${borderColor}" stroke-width="5"/>

  <!-- Corner number -->
  <text x="30" y="58"
        font-family="'Arial','Helvetica',sans-serif"
        font-size="38"
        font-weight="bold"
        fill="${numColor}">${num}</text>

  <!-- Mirrored number (bottom-right, rotated) -->
  <text x="270" y="360"
        text-anchor="end"
        font-family="'Arial','Helvetica',sans-serif"
        font-size="38"
        font-weight="bold"
        fill="${numColor}"
        transform="rotate(180,255,346)">${num}</text>

  <!-- Central Chinese character -->
  <text x="150" y="215"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Noto Serif CJK SC','Source Han Serif SC','SimSun','MS Mincho',serif"
        font-size="160"
        fill="${borderColor}">${charRef}</text>

  <!-- English name at bottom -->
  <text x="150" y="370"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Arial','Helvetica',sans-serif"
        font-size="20"
        fill="#666655">${en}</text>
</svg>`
}

function generateMahjong() {
  let ok = 0
  for (const { cn, num, char, en } of FLOWERS) {
    const dest    = path.join(ART_ROOT, 'mahjong', `${cn.replace(/\./g, '-')}.svg`)
    const written = write(dest, mahjongTileSvg(num, char, en, '#2d7a2d', '#2d7a2d'))
    console.log(`  mahjong: ${en} (flower ${num}) … ${written ? 'ok' : 'already exists'}`)
    ok++
  }
  for (const { cn, num, char, en } of SEASONS) {
    const dest    = path.join(ART_ROOT, 'mahjong', `${cn.replace(/\./g, '-')}.svg`)
    const written = write(dest, mahjongTileSvg(num, char, en, '#a02020', '#a02020'))
    console.log(`  mahjong: ${en} (season ${num}) … ${written ? 'ok' : 'already exists'}`)
    ok++
  }
  return ok
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Grimoire Atziluth — Art Generator')
console.log(`Output: ${ART_ROOT}\n`)

console.log('── Elder Futhark Runes (generated SVG) ──')
const runeCount = generateRunes()
console.log(`   ${runeCount} files\n`)

console.log('── Mahjong Flower & Season Tiles (generated SVG) ──')
const mahjongCount = generateMahjong()
console.log(`   ${mahjongCount} files\n`)

console.log('Done.')
