/**
 * fetch-art.mjs
 * Downloads public-domain / CC0 / Open-Licensed divination art into grimoire-app/public/art/.
 *
 * Run from the repo root:
 *   node scripts/fetch-art.mjs
 *
 * Sources:
 *  tarot/rws      — searge/tarot on GitHub (Rider-Waite-Smith 1909, PD)
 *  tarot/tdm      — Jean Dodal Tarot 1701 via Wikimedia Commons (PD)
 *  tarot/etteilla  — Grand Etteilla via BnF Gallica IIIF (Etalab Open Licence 2.0)
 *  mahjong         — FluffyStuff/riichi-mahjong-tiles on GitHub (CC0 SVG)
 *  geomancy        — Wikimedia Commons (PD SVG symbols)
 *  playing-cards   — nicubunu set via Wikimedia Commons (CC0 SVG, Lenormand fallback)
 *
 * Output:
 *  grimoire-app/public/art/tarot/      *.jpg
 *  grimoire-app/public/art/mahjong/    *.svg
 *  grimoire-app/public/art/geomancy/   *.svg
 *
 * Attribution note (Etteilla):
 *  Images sourced from Bibliothèque nationale de France (BnF / Gallica).
 *  Licence: Etalab Open Licence 2.0 — attribution required in app/docs, NOT on images.
 *  Source: https://gallica.bnf.fr/ark:/12148/btv1b10540366b
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ART_ROOT  = path.join(__dirname, '../grimoire-app/public/art')

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function download(url, dest) {
  const dir = path.dirname(dest)
  fs.mkdirSync(dir, { recursive: true })

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)

  const buf = await res.arrayBuffer()
  fs.writeFileSync(dest, Buffer.from(buf))
}

async function downloadAll(items, label, { delay = 150, retries = 3 } = {}) {
  let ok = 0, fail = 0
  for (const { url, dest, name } of items) {
    if (fs.existsSync(dest)) { ok++; continue }      // already present
    let lastErr
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const wait = delay * Math.pow(3, attempt)
        process.stdout.write(`  retry ${attempt} (wait ${wait}ms)… `)
        await new Promise(r => setTimeout(r, wait))
      }
      try {
        if (attempt === 0) process.stdout.write(`  ${label}: ${name} … `)
        await download(url, dest)
        process.stdout.write('ok\n')
        ok++
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        if (!e.message.includes('429')) break   // only retry on rate-limit
      }
    }
    if (lastErr) {
      process.stdout.write(`FAIL (${lastErr.message})\n`)
      fail++
    }
    await new Promise(r => setTimeout(r, delay))
  }
  return { ok, fail }
}

// ─── RWS Tarot (searge/tarot, PD) ────────────────────────────────────────────

const RWS_BASE = 'https://raw.githubusercontent.com/searge/tarot/master/assets/img/big'

// canonicalName (without tarot. prefix) → searge source filename (no extension)
const RWS_MAJOR_MAP = {
  'major.rws.the-fool':          'maj00',
  'major.rws.the-magician':      'maj01',
  'major.rws.the-high-priestess':'maj02',
  'major.rws.the-empress':       'maj03',
  'major.rws.the-emperor':       'maj04',
  'major.rws.the-hierophant':    'maj05',
  'major.rws.the-lovers':        'maj06',
  'major.rws.the-chariot':       'maj07',
  'major.rws.strength':          'maj08',
  'major.rws.the-hermit':        'maj09',
  'major.rws.wheel-of-fortune':  'maj10',
  'major.rws.justice':           'maj11',
  'major.rws.the-hanged-man':    'maj12',
  'major.rws.death':             'maj13',
  'major.rws.temperance':        'maj14',
  'major.rws.the-devil':         'maj15',
  'major.rws.the-tower':         'maj16',
  'major.rws.the-star':          'maj17',
  'major.rws.the-moon':          'maj18',
  'major.rws.the-sun':           'maj19',
  'major.rws.judgement':         'maj20',
  'major.rws.the-world':         'maj21',
}

const RANK_TO_NUM = {
  ace: '01', '2':'02', '3':'03', '4':'04', '5':'05',
  '6':'06', '7':'07', '8':'08', '9':'09', '10':'10',
  page:'11', knight:'12', queen:'13', king:'14',
}
const SUIT_TO_PREFIX = {
  wands: 'wands', cups: 'cups', swords: 'swords', pentacles: 'pents',
}

function rwsItems() {
  const items = []

  // Major arcana
  for (const [cn, src] of Object.entries(RWS_MAJOR_MAP)) {
    const slug = `tarot-${cn.replace(/\./g, '-')}`
    items.push({
      url:  `${RWS_BASE}/${src}.jpg`,
      dest: path.join(ART_ROOT, 'tarot', `${slug}.jpg`),
      name: cn,
    })
  }

  // Minor arcana — derive searge filename from canonical name
  // Pattern: tarot.minor.rws.{suit}.{rank}
  const SUITS  = ['wands', 'cups', 'swords', 'pentacles']
  const RANKS  = ['ace','2','3','4','5','6','7','8','9','10','page','knight','queen','king']

  for (const suit of SUITS) {
    const prefix = SUIT_TO_PREFIX[suit]
    for (const rank of RANKS) {
      const cn   = `minor.rws.${suit}.${rank}`
      const num  = RANK_TO_NUM[rank]
      const src  = `${prefix}${num}`
      const slug = `tarot-${cn.replace(/\./g, '-')}`
      items.push({
        url:  `${RWS_BASE}/${src}.jpg`,
        dest: path.join(ART_ROOT, 'tarot', `${slug}.jpg`),
        name: cn,
      })
    }
  }

  return items
}

// ─── TdM (Jean Dodal 1701 via Wikimedia Commons, PD) ─────────────────────────
//
// Resolves download URLs via the Wikimedia Commons imageinfo API so we never
// have to hard-code the hashed upload paths.

async function wikimediaImageUrls(filenames) {
  const map = {}
  for (let i = 0; i < filenames.length; i += 50) {
    const batch  = filenames.slice(i, i + 50)
    const titles = batch.map(f => `File:${f}`).join('|')
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json&origin=*`
    const res  = await fetch(apiUrl)
    if (!res.ok) throw new Error(`Wikimedia API HTTP ${res.status}`)
    const data = await res.json()
    // Build reverse-normalisation map (API may normalise spaces/underscores)
    const normRev = {}
    for (const n of (data.query?.normalized ?? [])) {
      normRev[n.to.replace(/^File:/, '')] = n.from.replace(/^File:/, '')
    }
    for (const page of Object.values(data.query?.pages ?? {})) {
      const url = page.imageinfo?.[0]?.url
      if (!url) continue
      const resolved = page.title.replace(/^File:/, '')
      const original = normRev[resolved] ?? resolved
      map[original] = url
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return map
}

// TdM major arcana: Jean Dodal 1701 file names on Wikimedia Commons
const TDM_MAJOR_MAP = {
  'tarot.major.tdm.le-mat':            'Jean-Dodal-Tarot-trump-00.jpg',
  'tarot.major.tdm.le-bateleur':       'Jean-Dodal-Tarot-trump-01.jpg',
  'tarot.major.tdm.la-papesse':        'Jean-Dodal-Tarot-trump-02.jpg',
  'tarot.major.tdm.la-imperatrice':    'Jean-Dodal-Tarot-trump-03.jpg',
  'tarot.major.tdm.la-empereur':       'Jean-Dodal-Tarot-trump-04.jpg',
  'tarot.major.tdm.le-pape':           'Jean-Dodal-Tarot-trump-05.jpg',
  'tarot.major.tdm.l-amoureux':        'Jean-Dodal-Tarot-trump-06.jpg',
  'tarot.major.tdm.le-chariot':        'Jean-Dodal-Tarot-trump-07.jpg',
  'tarot.major.tdm.la-justice':        'Jean-Dodal-Tarot-trump-08.jpg',
  'tarot.major.tdm.l-ermite':          'Jean-Dodal-Tarot-trump-09.jpg',
  'tarot.major.tdm.la-roue-de-fortune':'Jean-Dodal-Tarot-trump-10.jpg',
  'tarot.major.tdm.la-force':          'Jean-Dodal-Tarot-trump-11.jpg',
  'tarot.major.tdm.le-pendu':          'Jean-Dodal-Tarot-trump-12.jpg',
  'tarot.major.tdm.la-mort':           'Jean-Dodal-Tarot-trump-13.jpg',
  'tarot.major.tdm.temperance':        'Jean-Dodal-Tarot-trump-14.jpg',
  'tarot.major.tdm.le-diable':         'Jean-Dodal-Tarot-trump-15.jpg',
  'tarot.major.tdm.la-maison-dieu':    'Jean-Dodal-Tarot-trump-16.jpg',
  'tarot.major.tdm.l-etoile':          'Jean-Dodal-Tarot-trump-17.jpg',
  'tarot.major.tdm.la-lune':           'Jean-Dodal-Tarot-trump-18.jpg',
  'tarot.major.tdm.le-soleil':         'Jean-Dodal-Tarot-trump-19.jpg',
  'tarot.major.tdm.le-jugement':       'Jean-Dodal-Tarot-trump-20.jpg',
  'tarot.major.tdm.le-monde':          'Jean-Dodal-Tarot-trump-21.jpg',
}

// TdM minor arcana: rank → 2-digit number
const TDM_RANK_NUM = {
  ace: '01', '2':'02', '3':'03', '4':'04', '5':'05',
  '6':'06', '7':'07', '8':'08', '9':'09', '10':'10',
  valet:'11', cavalier:'12', reine:'13', roi:'14',
}
const TDM_SUITS = ['batons', 'coupes', 'epees', 'deniers']
const TDM_RANKS = ['ace','2','3','4','5','6','7','8','9','10','valet','cavalier','reine','roi']

function tdmMinorMap() {
  const map = {}
  for (const suit of TDM_SUITS) {
    for (const rank of TDM_RANKS) {
      const cn  = `tarot.minor.tdm.${suit}.${rank}`
      const num = TDM_RANK_NUM[rank]
      map[cn] = `Jean-Dodal-Tarot-suit-of-${suit}-${num}.jpg`
    }
  }
  return map
}

async function tdmItems() {
  const allMap = { ...TDM_MAJOR_MAP, ...tdmMinorMap() }
  const filenames = Object.values(allMap)
  console.log('  Resolving TdM URLs via Wikimedia API…')
  const urlMap = await wikimediaImageUrls(filenames)

  const items = []
  for (const [cn, filename] of Object.entries(allMap)) {
    const url = urlMap[filename]
    if (!url) {
      console.warn(`  WARNING: no URL resolved for ${filename} (${cn})`)
      continue
    }
    const slug = `tarot-${cn.replace(/\./g, '-')}`
    items.push({ url, dest: path.join(ART_ROOT, 'tarot', `${slug}.jpg`), name: cn })
  }
  return items
}

// ─── Etteilla (BnF Gallica IIIF, Etalab Open Licence 2.0) ────────────────────
//
// Source: Bibliothèque nationale de France, "Grand Etteilla ou Tarots Égyptiens"
// ARK: btv1b10540366b  (Lismon edition, c.1838)
// IIIF manifest: https://gallica.bnf.fr/iiif/ark:/12148/btv1b10540366b/manifest.json
//
// Attribution required in app and docs — see credits page. NOT required on images.
//
// The scan has 78 card images. Folio 1 is typically the title page;
// cards 1-78 appear in Etteilla's canonical number order starting at folio 2:
//   Major arcana cards 1-22 → f2–f23
//   Minor arcana cards 23-78 → f24–f79  (wands ace→king, cups, swords, pentacles)

const ETTEILLA_ARK = 'btv1b10540366b'

// Ordered list of canonical names in Etteilla card-number order (1-78)
// Major arcana in etteillaCN order, then minor arcana in suit order.
const ETTEILLA_ORDERED_CNS = [
  // Major arcana (etteillaCN 1-22)
  'tarot.major.etteilla.etteilla',
  'tarot.major.etteilla.the-sun',
  'tarot.major.etteilla.the-moon',
  'tarot.major.etteilla.the-stars',
  'tarot.major.etteilla.the-last-judgment',
  'tarot.major.etteilla.the-wheel-of-fortune',
  'tarot.major.etteilla.the-tower',
  'tarot.major.etteilla.temperance',
  'tarot.major.etteilla.strength',
  'tarot.major.etteilla.the-hermit',
  'tarot.major.etteilla.the-hanged-man',
  'tarot.major.etteilla.justice',
  'tarot.major.etteilla.the-high-priestess',
  'tarot.major.etteilla.the-hierophant',
  'tarot.major.etteilla.the-magician',
  'tarot.major.etteilla.death',
  'tarot.major.etteilla.the-devil',
  'tarot.major.etteilla.the-lovers',
  'tarot.major.etteilla.the-chariot',
  'tarot.major.etteilla.the-emperor',
  'tarot.major.etteilla.the-empress',
  'tarot.major.etteilla.the-world',
  // Minor arcana (cards 23-78): wands, cups, swords, pentacles; ace→10→page→knight→queen→king
  ...['wands','cups','swords','pentacles'].flatMap(suit =>
    ['ace','2','3','4','5','6','7','8','9','10','page','knight','queen','king']
      .map(rank => `tarot.minor.etteilla.${suit}.${rank}`)
  ),
]

async function etteillaBnfManifest() {
  const url = `https://gallica.bnf.fr/iiif/ark:/12148/${ETTEILLA_ARK}/manifest.json`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`BnF manifest HTTP ${res.status}`)
  return res.json()
}

async function etteillaItems() {
  console.log('  Fetching BnF IIIF manifest for Etteilla deck…')
  const manifest = await etteillaBnfManifest()

  // Extract canvas image service URLs in order
  const canvases = manifest.sequences?.[0]?.canvases ?? []
  if (canvases.length === 0) throw new Error('No canvases in BnF manifest')

  // Find the first canvas that is a card image (skip title/cover pages).
  // BnF manifests include a label per canvas; we look for the first one whose
  // label contains a number, or simply skip f1 (the title page) as a heuristic.
  // If the scan has exactly 79+ canvases, canvas index 1 (f2) is card 1.
  const cardCanvases = canvases.length >= 78
    ? canvases.slice(canvases.length - 78)   // last 78 = all card fronts
    : canvases

  if (cardCanvases.length < 78) {
    console.warn(`  WARNING: only ${cardCanvases.length} canvases found; expected 78`)
  }

  const items = []
  for (let i = 0; i < ETTEILLA_ORDERED_CNS.length && i < cardCanvases.length; i++) {
    const cn     = ETTEILLA_ORDERED_CNS[i]
    const canvas = cardCanvases[i]

    // Get the image resource URL from the canvas
    const imgResource = canvas.images?.[0]?.resource
    if (!imgResource) { console.warn(`  WARNING: no image resource for canvas ${i}`); continue }

    // Use the IIIF image service at full resolution (native.jpg or full/full)
    let url
    if (imgResource['@type'] === 'dctypes:Image' && imgResource.service?.['@id']) {
      url = `${imgResource.service['@id']}/full/full/0/native.jpg`
    } else {
      url = imgResource['@id'] ?? imgResource.url
    }
    if (!url) { console.warn(`  WARNING: cannot determine URL for canvas ${i}`); continue }

    const slug = `tarot-${cn.replace(/\./g, '-')}`
    items.push({ url, dest: path.join(ART_ROOT, 'tarot', `${slug}.jpg`), name: cn })
  }
  return items
}

// ─── Mahjong (FluffyStuff CC0 SVG) ───────────────────────────────────────────

const MJ_BASE = 'https://raw.githubusercontent.com/FluffyStuff/riichi-mahjong-tiles/master/Regular'

// Our canonical name → FluffyStuff filename (no extension, SVG)
const MAHJONG_MAP = {
  'divination.mahjong-tile.wan-1': 'Man1',
  'divination.mahjong-tile.wan-2': 'Man2',
  'divination.mahjong-tile.wan-3': 'Man3',
  'divination.mahjong-tile.wan-4': 'Man4',
  'divination.mahjong-tile.wan-5': 'Man5',
  'divination.mahjong-tile.wan-6': 'Man6',
  'divination.mahjong-tile.wan-7': 'Man7',
  'divination.mahjong-tile.wan-8': 'Man8',
  'divination.mahjong-tile.wan-9': 'Man9',
  'divination.mahjong-tile.circle-1': 'Pin1',
  'divination.mahjong-tile.circle-2': 'Pin2',
  'divination.mahjong-tile.circle-3': 'Pin3',
  'divination.mahjong-tile.circle-4': 'Pin4',
  'divination.mahjong-tile.circle-5': 'Pin5',
  'divination.mahjong-tile.circle-6': 'Pin6',
  'divination.mahjong-tile.circle-7': 'Pin7',
  'divination.mahjong-tile.circle-8': 'Pin8',
  'divination.mahjong-tile.circle-9': 'Pin9',
  'divination.mahjong-tile.bamboo-1': 'Sou1',
  'divination.mahjong-tile.bamboo-2': 'Sou2',
  'divination.mahjong-tile.bamboo-3': 'Sou3',
  'divination.mahjong-tile.bamboo-4': 'Sou4',
  'divination.mahjong-tile.bamboo-5': 'Sou5',
  'divination.mahjong-tile.bamboo-6': 'Sou6',
  'divination.mahjong-tile.bamboo-7': 'Sou7',
  'divination.mahjong-tile.bamboo-8': 'Sou8',
  'divination.mahjong-tile.bamboo-9': 'Sou9',
  'divination.mahjong-tile.wind-east':  'Ton',
  'divination.mahjong-tile.wind-south': 'Nan',
  'divination.mahjong-tile.wind-west':  'Shaa',
  'divination.mahjong-tile.wind-north': 'Pei',
  'divination.mahjong-tile.dragon-white': 'Haku',
  'divination.mahjong-tile.dragon-green': 'Hatsu',
  'divination.mahjong-tile.dragon-red':   'Chun',
  // Note: flower-* and season-* tiles are not in FluffyStuff's CC0 set
}

function mahjongItems() {
  return Object.entries(MAHJONG_MAP).map(([cn, src]) => ({
    url:  `${MJ_BASE}/${src}.svg`,
    dest: path.join(ART_ROOT, 'mahjong', `${cn.replace(/\./g, '-')}.svg`),
    name: cn,
  }))
}

// ─── Geomancy (Wikimedia Commons PD SVG) ─────────────────────────────────────
// Direct content URLs resolved via Wikimedia API (stable hashed paths).

const GEOMANCY_DIRECT = {
  'geomancy.figure.via':            'https://upload.wikimedia.org/wikipedia/commons/6/67/Geomantic_via.svg',
  'geomancy.figure.amissio':        'https://upload.wikimedia.org/wikipedia/commons/f/f9/Geomantic_amissio.svg',
  'geomancy.figure.albus':          'https://upload.wikimedia.org/wikipedia/commons/f/f7/Geomantic_albus.svg',
  'geomancy.figure.populus':        'https://upload.wikimedia.org/wikipedia/commons/e/eb/Geomantic_populus.svg',
  'geomancy.figure.fortuna-major':  'https://upload.wikimedia.org/wikipedia/commons/2/21/Geomantic_fortunamajor.svg',
  'geomancy.figure.conjunctio':     'https://upload.wikimedia.org/wikipedia/commons/c/c5/Geomantic_conjunctio.svg',
  'geomancy.figure.puella':         'https://upload.wikimedia.org/wikipedia/commons/1/13/Geomantic_puella.svg',
  'geomancy.figure.rubeus':         'https://upload.wikimedia.org/wikipedia/commons/e/e4/Geomantic_rubeus.svg',
  'geomancy.figure.acquisitio':     'https://upload.wikimedia.org/wikipedia/commons/d/d7/Geomantic_acquisitio.svg',
  'geomancy.figure.carcer':         'https://upload.wikimedia.org/wikipedia/commons/9/95/Geomantic_carcer.svg',
  'geomancy.figure.tristitia':      'https://upload.wikimedia.org/wikipedia/commons/6/6e/Geomantic_tristitia.svg',
  'geomancy.figure.laetitia':       'https://upload.wikimedia.org/wikipedia/commons/1/12/Geomantic_laetitia.svg',
  'geomancy.figure.cauda-draconis': 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Geomantic_caudadraconis.svg',
  'geomancy.figure.caput-draconis': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Geomantic_caputdraconis.svg',
  'geomancy.figure.fortuna-minor':  'https://upload.wikimedia.org/wikipedia/commons/a/a5/Geomantic_fortunaminor.svg',
  'geomancy.figure.puer':           'https://upload.wikimedia.org/wikipedia/commons/d/d1/Geomantic_puer.svg',
}

async function geomancyItems() {
  return Object.entries(GEOMANCY_DIRECT).map(([cn, url]) => ({
    url,
    dest: path.join(ART_ROOT, 'geomancy', `${cn.replace(/\./g, '-')}.svg`),
    name: cn,
  }))
}

// ─── Playing Cards (nicubunu / Wikimedia Commons, CC0) ───────────────────────
//
// 52 standard French-suited playing cards used as the Lenormand classic art fallback.
// Source: Wikimedia Commons, nicubunu set, CC0 / public domain.
// Files: Playing_card_{suit}_{rank}.svg
//   suits: heart, diamond, club, spade
//   ranks: A, 2–10, J, Q, K

const PC_SUITS  = ['hearts', 'diamonds', 'clubs', 'spades']
const PC_RANKS  = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king']

const PC_SUIT_WMF  = { hearts: 'heart', diamonds: 'diamond', clubs: 'club', spades: 'spade' }
const PC_RANK_WMF  = {
  ace: 'A', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6',
  '7':'7', '8':'8', '9':'9', '10':'10', jack:'J', queen:'Q', king:'K',
}

async function playingCardItems() {
  const cnToFile = {}
  for (const suit of PC_SUITS) {
    for (const rank of PC_RANKS) {
      const cn       = `playing.card.${suit}.${rank}`
      const filename = `Playing_card_${PC_SUIT_WMF[suit]}_${PC_RANK_WMF[rank]}.svg`
      cnToFile[cn]   = filename
    }
  }
  // Jokers
  cnToFile['playing.card.joker.red']   = 'Playing_card_red_joker.svg'
  cnToFile['playing.card.joker.black'] = 'Playing_card_black_joker.svg'

  console.log('  Resolving playing card URLs via Wikimedia API…')
  const urlMap = await wikimediaImageUrls(Object.values(cnToFile))

  const items = []
  for (const [cn, filename] of Object.entries(cnToFile)) {
    const url = urlMap[filename]
    if (!url) { console.warn(`  WARNING: no URL for ${filename}`); continue }
    const slug = cn.replace(/\./g, '-')
    items.push({ url, dest: path.join(ART_ROOT, 'playing-cards', `${slug}.svg`), name: cn })
  }
  return items
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Grimoire Atziluth — Art Pack Downloader')
  console.log(`Output: ${ART_ROOT}\n`)

  const results = {}

  // RWS Tarot
  console.log('── RWS Tarot (searge/tarot, Rider-Waite-Smith 1909 PD) ──')
  results.tarot = await downloadAll(rwsItems(), 'tarot')
  console.log(`   ${results.tarot.ok} ok, ${results.tarot.fail} failed\n`)

  // TdM — Jean Dodal 1701 via Wikimedia Commons
  console.log('── Tarot de Marseille (Jean Dodal 1701, Wikimedia Commons PD) ──')
  try {
    const tdmItemsList = await tdmItems()
    results.tdm = await downloadAll(tdmItemsList, 'tdm', { delay: 300, retries: 3 })
  } catch (e) {
    console.error(`  ERROR resolving TdM URLs: ${e.message}`)
    results.tdm = { ok: 0, fail: 78 }
  }
  console.log(`   ${results.tdm.ok} ok, ${results.tdm.fail} failed\n`)

  // Etteilla — BnF Gallica IIIF (Etalab Open Licence 2.0)
  console.log('── Etteilla Grand Tarot (BnF Gallica, Etalab Open Licence 2.0) ──')
  try {
    const etteillaItemsList = await etteillaItems()
    results.etteilla = await downloadAll(etteillaItemsList, 'etteilla', { delay: 800, retries: 4 })
  } catch (e) {
    console.error(`  ERROR fetching Etteilla manifest: ${e.message}`)
    results.etteilla = { ok: 0, fail: 78 }
  }
  console.log(`   ${results.etteilla.ok} ok, ${results.etteilla.fail} failed\n`)

  // Mahjong
  console.log('── Mahjong Tiles (FluffyStuff CC0 SVG) ──')
  results.mahjong = await downloadAll(mahjongItems(), 'mahjong')
  console.log(`   ${results.mahjong.ok} ok, ${results.mahjong.fail} failed\n`)

  // Geomancy
  console.log('── Geomantic Figures (Wikimedia Commons PD SVG) ──')
  const geoItems = await geomancyItems()
  results.geomancy = await downloadAll(geoItems, 'geomancy', { delay: 1000, retries: 4 })
  console.log(`   ${results.geomancy.ok} ok, ${results.geomancy.fail} failed\n`)

  // Playing Cards — nicubunu CC0 SVG via Wikimedia Commons (Lenormand fallback)
  console.log('── Playing Cards (nicubunu CC0 SVG, Wikimedia Commons) ──')
  try {
    const pcItems = await playingCardItems()
    results['playing-cards'] = await downloadAll(pcItems, 'playing-cards', { delay: 300, retries: 3 })
  } catch (e) {
    console.error(`  ERROR resolving playing card URLs: ${e.message}`)
    results['playing-cards'] = { ok: 0, fail: 54 }
  }
  console.log(`   ${results['playing-cards'].ok} ok, ${results['playing-cards'].fail} failed\n`)

  // Summary
  console.log('── Summary ──')
  for (const [group, r] of Object.entries(results)) {
    const total = r.ok + r.fail
    console.log(`  ${group.padEnd(12)} ${r.ok}/${total} files`)
  }
  console.log('\nDone. Run `npm run build` in grimoire-app to bake assets into the bundle.')
}

main().catch(e => { console.error(e); process.exit(1) })
