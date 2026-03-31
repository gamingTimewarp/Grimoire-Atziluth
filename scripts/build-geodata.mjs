#!/usr/bin/env node
/**
 * build-geodata.mjs
 * Processes GeoNames city data into a prefix-indexed JSON for offline geocoding.
 * Produces grimoire-app/public/geodata/cities.json (~1.2 MB gzip).
 *
 * Setup (one time):
 *   mkdir -p scripts/geodata-source
 *   cd scripts/geodata-source
 *   curl -O https://download.geonames.org/export/dump/cities5000.zip
 *   curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *   curl -O https://download.geonames.org/export/dump/countryInfo.txt
 *   unzip cities5000.zip
 *
 * Usage:  node scripts/build-geodata.mjs
 *
 * GeoNames data is licensed under Creative Commons Attribution 4.0.
 * https://creativecommons.org/licenses/by/4.0/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir   = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = join(__dir, 'geodata-source')
const OUT_DIR = join(__dir, '../grimoire-app/public/geodata')
const OUT_FILE = join(OUT_DIR, 'cities.json')

// ─── Validate source files ────────────────────────────────────────────────────

const CITIES_FILE = join(SRC_DIR, 'cities5000.txt')
const ADMIN1_FILE = join(SRC_DIR, 'admin1CodesASCII.txt')
const COUNTRY_FILE = join(SRC_DIR, 'countryInfo.txt')

for (const f of [CITIES_FILE, ADMIN1_FILE]) {
  if (!existsSync(f)) {
    console.error(`Missing source file: ${f}`)
    console.error('See the setup instructions at the top of this script.')
    process.exit(1)
  }
}

// ─── Load admin1 codes (CC.admin1code → name) ────────────────────────────────

const admin1Map = new Map()
for (const line of readFileSync(ADMIN1_FILE, 'utf8').split('\n')) {
  const [code, name] = line.split('\t')
  if (code && name) admin1Map.set(code.trim(), name.trim())
}
console.log(`Admin1 entries: ${admin1Map.size}`)

// ─── Load country names ───────────────────────────────────────────────────────

const countries = {}
if (existsSync(COUNTRY_FILE)) {
  for (const line of readFileSync(COUNTRY_FILE, 'utf8').split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue
    const fields = line.split('\t')
    if (fields.length >= 5) {
      const iso2 = fields[0].trim()
      const name = fields[4].trim()
      if (iso2 && name) countries[iso2] = name
    }
  }
  console.log(`Country entries: ${Object.keys(countries).length}`)
} else {
  console.warn('countryInfo.txt not found — country names will fall back to ISO codes')
}

// ─── Load cities ──────────────────────────────────────────────────────────────
// GeoNames cities5000.txt columns (tab-separated):
//  0  geonameid        1  name              2  asciiname
//  3  alternatenames   4  latitude          5  longitude
//  6  feature class    7  feature code      8  country code
//  9  cc2             10  admin1 code      11  admin2 code
// 12  admin3 code     13  admin4 code      14  population
// 15  elevation       16  dem              17  timezone
// 18  modification date

const cities = []
let skipped = 0

for (const line of readFileSync(CITIES_FILE, 'utf8').split('\n')) {
  const f = line.split('\t')
  if (f.length < 18) { skipped++; continue }

  const name      = f[1].trim()
  const asciiname = f[2].trim()
  const lat       = parseFloat(f[4])
  const lon       = parseFloat(f[5])
  const cc        = f[8].trim()
  const admin1key = `${cc}.${f[10].trim()}`
  const tz        = f[17].trim()

  if (!asciiname || isNaN(lat) || isNaN(lon) || !tz) { skipped++; continue }

  const admin1 = admin1Map.get(admin1key) ?? ''
  cities.push([name, asciiname, cc, admin1, lat, lon, tz])
}

console.log(`Cities loaded: ${cities.length} (${skipped} skipped)`)

// ─── Sort + index ─────────────────────────────────────────────────────────────

cities.sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()))

const index = {}
for (let i = 0; i < cities.length; i++) {
  const prefix = cities[i][1].toLowerCase().slice(0, 3)
  if (!index[prefix]) index[prefix] = [i, 0]
  index[prefix][1]++
}

// ─── Timezone centroids ───────────────────────────────────────────────────────

const tzGroups = {}
for (const [,,,,lat,lon,tz] of cities) {
  if (!tzGroups[tz]) tzGroups[tz] = []
  tzGroups[tz].push([lat, lon])
}
const tzCentroids = {}
for (const [tz, coords] of Object.entries(tzGroups)) {
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length
  const lon = coords.reduce((s, c) => s + c[1], 0) / coords.length
  tzCentroids[tz] = [+lat.toFixed(3), +lon.toFixed(3)]
}

// ─── Write ────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })
const output = { v: 1, countries, cities, index, tzCentroids }
const json = JSON.stringify(output)
writeFileSync(OUT_FILE, json)

const kb = Math.round(json.length / 1024)
console.log(`Output: ${cities.length} cities, ${Object.keys(index).length} prefixes, ${Object.keys(tzCentroids).length} tz zones`)
console.log(`File: ${OUT_FILE} (${kb} KB uncompressed)`)
