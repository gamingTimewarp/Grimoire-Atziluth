#!/usr/bin/env node
/**
 * seed-geodata.mjs
 * Generates grimoire-app/public/geodata/cities.json from an inline curated list
 * of ~86 major world cities. No external downloads required.
 *
 * Usage:  node scripts/seed-geodata.mjs
 *
 * For the full 55 000-city dataset, use build-geodata.mjs with GeoNames source files.
 *
 * Schema per city row:
 *   [displayName, asciiName, countryCode, admin1, lat, lon, timezone]
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT_DIR  = join(__dir, '../grimoire-app/public/geodata')
const OUT_FILE = join(OUT_DIR, 'cities.json')

// ─── Country code → name ──────────────────────────────────────────────────────

const COUNTRIES = {
  AF: 'Afghanistan',     AE: 'United Arab Emirates', AM: 'Armenia',
  AO: 'Angola',          AR: 'Argentina',             AT: 'Austria',
  AU: 'Australia',       AZ: 'Azerbaijan',            BD: 'Bangladesh',
  BE: 'Belgium',         BG: 'Bulgaria',              BR: 'Brazil',
  BY: 'Belarus',         CA: 'Canada',                CD: 'DR Congo',
  CH: 'Switzerland',     CL: 'Chile',                 CN: 'China',
  CO: 'Colombia',        CY: 'Cyprus',                CZ: 'Czech Republic',
  DE: 'Germany',         DK: 'Denmark',               EC: 'Ecuador',
  EG: 'Egypt',           ES: 'Spain',                 ET: 'Ethiopia',
  FI: 'Finland',         FR: 'France',                GB: 'United Kingdom',
  GE: 'Georgia',         GH: 'Ghana',                 GR: 'Greece',
  HK: 'Hong Kong',       HR: 'Croatia',               HU: 'Hungary',
  ID: 'Indonesia',       IE: 'Ireland',               IL: 'Israel',
  IN: 'India',           IQ: 'Iraq',                  IR: 'Iran',
  IS: 'Iceland',         IT: 'Italy',                 JP: 'Japan',
  KE: 'Kenya',           KP: 'North Korea',           KR: 'South Korea',
  LB: 'Lebanon',         LY: 'Libya',                 MA: 'Morocco',
  MM: 'Myanmar',         MN: 'Mongolia',              MX: 'Mexico',
  MY: 'Malaysia',        NA: 'Namibia',               NG: 'Nigeria',
  NL: 'Netherlands',     NO: 'Norway',                NP: 'Nepal',
  NZ: 'New Zealand',     PE: 'Peru',                  PH: 'Philippines',
  PK: 'Pakistan',        PL: 'Poland',                PT: 'Portugal',
  RO: 'Romania',         RS: 'Serbia',                RU: 'Russia',
  SA: 'Saudi Arabia',    SE: 'Sweden',                SG: 'Singapore',
  SY: 'Syria',           TH: 'Thailand',              TN: 'Tunisia',
  TR: 'Turkey',          TW: 'Taiwan',                UA: 'Ukraine',
  US: 'United States',   UZ: 'Uzbekistan',            VE: 'Venezuela',
  VN: 'Vietnam',         ZA: 'South Africa',          ZM: 'Zambia',
}

// ─── Seed cities ──────────────────────────────────────────────────────────────
// [displayName, asciiName, countryCode, admin1, lat, lon, timezone]

const SEED = [
  ['Abuja',          'Abuja',          'NG', 'FCT',                           9.058,   7.495,   'Africa/Lagos'],
  ['Accra',          'Accra',          'GH', 'Greater Accra',                 5.556,  -0.197,   'Africa/Accra'],
  ['Addis Ababa',    'Addis Ababa',    'ET', 'Addis Ababa',                   9.025,  38.747,   'Africa/Addis_Ababa'],
  ['Amsterdam',      'Amsterdam',      'NL', 'North Holland',                52.368,   4.904,   'Europe/Amsterdam'],
  ['Ankara',         'Ankara',         'TR', 'Ankara',                       39.933,  32.860,   'Europe/Istanbul'],
  ['Athens',         'Athens',         'GR', 'Attica',                       37.984,  23.728,   'Europe/Athens'],
  ['Auckland',       'Auckland',       'NZ', 'Auckland',                    -36.849, 174.763,   'Pacific/Auckland'],
  ['Baghdad',        'Baghdad',        'IQ', 'Baghdad',                      33.341,  44.401,   'Asia/Baghdad'],
  ['Baku',           'Baku',           'AZ', 'Baku',                         40.410,  49.867,   'Asia/Baku'],
  ['Bangkok',        'Bangkok',        'TH', 'Bangkok',                      13.756, 100.502,   'Asia/Bangkok'],
  ['Barcelona',      'Barcelona',      'ES', 'Catalonia',                    41.389,   2.159,   'Europe/Madrid'],
  ['Beijing',        'Beijing',        'CN', 'Beijing',                      39.904, 116.407,   'Asia/Shanghai'],
  ['Beirut',         'Beirut',         'LB', 'Beirut',                       33.887,  35.513,   'Asia/Beirut'],
  ['Belgrade',       'Belgrade',       'RS', 'Central Serbia',               44.818,  20.457,   'Europe/Belgrade'],
  ['Berlin',         'Berlin',         'DE', 'Berlin',                       52.520,  13.405,   'Europe/Berlin'],
  ['Bogota',         'Bogota',         'CO', 'Bogotá D.C.',                   4.711, -74.072,   'America/Bogota'],
  ['Brussels',       'Brussels',       'BE', 'Brussels Capital',             50.850,   4.352,   'Europe/Brussels'],
  ['Bucharest',      'Bucharest',      'RO', 'Bucharest',                    44.432,  26.104,   'Europe/Bucharest'],
  ['Budapest',       'Budapest',       'HU', 'Budapest',                     47.498,  19.040,   'Europe/Budapest'],
  ['Buenos Aires',   'Buenos Aires',   'AR', 'Buenos Aires F.D.',           -34.604, -58.382,   'America/Argentina/Buenos_Aires'],
  ['Cairo',          'Cairo',          'EG', 'Cairo',                        30.044,  31.236,   'Africa/Cairo'],
  ['Canberra',       'Canberra',       'AU', 'Australian Capital Territory', -35.281, 149.130,  'Australia/Sydney'],
  ['Cape Town',      'Cape Town',      'ZA', 'Western Cape',                -33.925,  18.424,   'Africa/Johannesburg'],
  ['Caracas',        'Caracas',        'VE', 'Capital District',             10.480, -66.879,   'America/Caracas'],
  ['Chicago',        'Chicago',        'US', 'Illinois',                     41.878, -87.630,   'America/Chicago'],
  ['Copenhagen',     'Copenhagen',     'DK', 'Capital Region',               55.676,  12.568,   'Europe/Copenhagen'],
  ['Damascus',       'Damascus',       'SY', 'Damascus',                     33.510,  36.291,   'Asia/Damascus'],
  ['Delhi',          'Delhi',          'IN', 'Delhi',                        28.704,  77.103,   'Asia/Kolkata'],
  ['Dubai',          'Dubai',          'AE', 'Dubai',                        25.205,  55.271,   'Asia/Dubai'],
  ['Dublin',         'Dublin',         'IE', 'Leinster',                     53.350,  -6.260,   'Europe/Dublin'],
  ['Edinburgh',      'Edinburgh',      'GB', 'Scotland',                     55.953,  -3.188,   'Europe/London'],
  ['Helsinki',       'Helsinki',       'FI', 'Uusimaa',                      60.170,  24.938,   'Europe/Helsinki'],
  ['Ho Chi Minh City','Ho Chi Minh City','VN','Ho Chi Minh City',            10.823, 106.630,   'Asia/Ho_Chi_Minh'],
  ['Hong Kong',      'Hong Kong',      'HK', 'Hong Kong Island',             22.319, 114.169,   'Asia/Hong_Kong'],
  ['Istanbul',       'Istanbul',       'TR', 'Istanbul',                     41.008,  28.978,   'Europe/Istanbul'],
  ['Jakarta',        'Jakarta',        'ID', 'Jakarta',                      -6.209, 106.846,   'Asia/Jakarta'],
  ['Jerusalem',      'Jerusalem',      'IL', 'Jerusalem',                    31.768,  35.214,   'Asia/Jerusalem'],
  ['Johannesburg',   'Johannesburg',   'ZA', 'Gauteng',                     -26.204,  28.047,   'Africa/Johannesburg'],
  ['Kabul',          'Kabul',          'AF', 'Kabul',                        34.555,  69.208,   'Asia/Kabul'],
  ['Karachi',        'Karachi',        'PK', 'Sindh',                        24.861,  67.001,   'Asia/Karachi'],
  ['Kathmandu',      'Kathmandu',      'NP', 'Bagmati',                      27.717,  85.324,   'Asia/Kathmandu'],
  ['Kinshasa',       'Kinshasa',       'CD', 'Kinshasa',                     -4.322,  15.322,   'Africa/Kinshasa'],
  ['Kuala Lumpur',   'Kuala Lumpur',   'MY', 'Kuala Lumpur',                  3.139, 101.687,   'Asia/Kuala_Lumpur'],
  ['Lagos',          'Lagos',          'NG', 'Lagos',                         6.524,   3.379,   'Africa/Lagos'],
  ['Lima',           'Lima',           'PE', 'Lima',                        -12.046, -77.043,   'America/Lima'],
  ['Lisbon',         'Lisbon',         'PT', 'Lisbon',                       38.722,  -9.139,   'Europe/Lisbon'],
  ['London',         'London',         'GB', 'England',                      51.507,  -0.128,   'Europe/London'],
  ['Los Angeles',    'Los Angeles',    'US', 'California',                   34.052,-118.244,   'America/Los_Angeles'],
  ['Luanda',         'Luanda',         'AO', 'Luanda',                       -8.836,  13.234,   'Africa/Luanda'],
  ['Madrid',         'Madrid',         'ES', 'Community of Madrid',          40.417,  -3.704,   'Europe/Madrid'],
  ['Manila',         'Manila',         'PH', 'Metro Manila',                 14.600, 120.984,   'Asia/Manila'],
  ['Melbourne',      'Melbourne',      'AU', 'Victoria',                    -37.814, 144.963,   'Australia/Melbourne'],
  ['Mexico City',    'Mexico City',    'MX', 'Mexico City',                  19.433, -99.133,   'America/Mexico_City'],
  ['Milan',          'Milan',          'IT', 'Lombardy',                     45.464,   9.190,   'Europe/Rome'],
  ['Minsk',          'Minsk',          'BY', 'Minsk City',                   53.905,  27.561,   'Europe/Minsk'],
  ['Montreal',       'Montreal',       'CA', 'Quebec',                       45.502, -73.567,   'America/Toronto'],
  ['Moscow',         'Moscow',         'RU', 'Moscow',                       55.756,  37.617,   'Europe/Moscow'],
  ['Mumbai',         'Mumbai',         'IN', 'Maharashtra',                  19.076,  72.878,   'Asia/Kolkata'],
  ['Nairobi',        'Nairobi',        'KE', 'Nairobi',                      -1.292,  36.822,   'Africa/Nairobi'],
  ['New York City',  'New York City',  'US', 'New York',                     40.713, -74.006,   'America/New_York'],
  ['Oslo',           'Oslo',           'NO', 'Oslo',                         59.914,  10.752,   'Europe/Oslo'],
  ['Ottawa',         'Ottawa',         'CA', 'Ontario',                      45.422, -75.697,   'America/Toronto'],
  ['Paris',          'Paris',          'FR', 'Île-de-France',                48.857,   2.352,   'Europe/Paris'],
  ['Prague',         'Prague',         'CZ', 'Prague',                       50.076,  14.438,   'Europe/Prague'],
  ['Quito',          'Quito',          'EC', 'Pichincha',                    -0.220, -78.513,   'America/Guayaquil'],
  ['Reykjavik',      'Reykjavik',      'IS', 'Capital Region',               64.127, -21.817,   'Atlantic/Reykjavik'],
  ['Rio de Janeiro', 'Rio de Janeiro', 'BR', 'Rio de Janeiro',              -22.907, -43.173,   'America/Sao_Paulo'],
  ['Riyadh',         'Riyadh',         'SA', 'Riyadh Region',                24.714,  46.675,   'Asia/Riyadh'],
  ['Rome',           'Rome',           'IT', 'Lazio',                        41.903,  12.496,   'Europe/Rome'],
  ['San Francisco',  'San Francisco',  'US', 'California',                   37.775,-122.419,   'America/Los_Angeles'],
  ['Santiago',       'Santiago',       'CL', 'Santiago Metropolitan',       -33.449, -70.669,   'America/Santiago'],
  ['Sao Paulo',      'Sao Paulo',      'BR', 'São Paulo',                   -23.551, -46.633,   'America/Sao_Paulo'],
  ['Seoul',          'Seoul',          'KR', 'Seoul',                        37.567, 126.978,   'Asia/Seoul'],
  ['Shanghai',       'Shanghai',       'CN', 'Shanghai',                     31.230, 121.474,   'Asia/Shanghai'],
  ['Singapore',      'Singapore',      'SG', '',                              1.352, 103.820,   'Asia/Singapore'],
  ['Sofia',          'Sofia',          'BG', 'Sofia City Province',          42.698,  23.322,   'Europe/Sofia'],
  ['Stockholm',      'Stockholm',      'SE', 'Stockholm County',             59.329,  18.069,   'Europe/Stockholm'],
  ['Sydney',         'Sydney',         'AU', 'New South Wales',             -33.869, 151.209,   'Australia/Sydney'],
  ['Taipei',         'Taipei',         'TW', 'Taipei City',                  25.033, 121.565,   'Asia/Taipei'],
  ['Tashkent',       'Tashkent',       'UZ', 'Tashkent',                     41.300,  69.240,   'Asia/Tashkent'],
  ['Tehran',         'Tehran',         'IR', 'Tehran',                       35.689,  51.389,   'Asia/Tehran'],
  ['Tel Aviv',       'Tel Aviv',       'IL', 'Tel Aviv',                     32.085,  34.782,   'Asia/Jerusalem'],
  ['Tokyo',          'Tokyo',          'JP', 'Tokyo',                        35.676, 139.650,   'Asia/Tokyo'],
  ['Toronto',        'Toronto',        'CA', 'Ontario',                      43.653, -79.383,   'America/Toronto'],
  ['Tunis',          'Tunis',          'TN', 'Tunis',                        36.819,  10.166,   'Africa/Tunis'],
  ['Ulaanbaatar',    'Ulaanbaatar',    'MN', 'Ulaanbaatar',                  47.886, 106.905,   'Asia/Ulaanbaatar'],
  ['Vienna',         'Vienna',         'AT', 'Vienna',                       48.208,  16.374,   'Europe/Vienna'],
  ['Warsaw',         'Warsaw',         'PL', 'Masovian Voivodeship',         52.230,  21.012,   'Europe/Warsaw'],
  ['Washington DC',  'Washington DC',  'US', 'District of Columbia',         38.907, -77.037,   'America/New_York'],
  ['Wellington',     'Wellington',     'NZ', 'Wellington Region',           -41.287, 174.776,   'Pacific/Auckland'],
  ['Yangon',         'Yangon',         'MM', 'Yangon Region',                16.800,  96.150,   'Asia/Rangoon'],
  ['Yerevan',        'Yerevan',        'AM', 'Yerevan',                      40.177,  44.503,   'Asia/Yerevan'],
  ['Zagreb',         'Zagreb',         'HR', 'City of Zagreb',               45.815,  15.982,   'Europe/Zagreb'],
  ['Zurich',         'Zurich',         'CH', 'Zurich',                       47.377,   8.542,   'Europe/Zurich'],
]

// ─── Build helpers (shared with build-geodata.mjs) ────────────────────────────

function buildOutput(cities, countries) {
  // Sort by lowercase ascii name
  const sorted = [...cities].sort((a, b) =>
    a[1].toLowerCase().localeCompare(b[1].toLowerCase())
  )

  // 3-char prefix index: prefix → [startIndex, count]
  const index = {}
  for (let i = 0; i < sorted.length; i++) {
    const prefix = sorted[i][1].toLowerCase().slice(0, 3)
    if (!index[prefix]) index[prefix] = [i, 0]
    index[prefix][1]++
  }

  // Timezone centroids (average lat/lon of all cities per zone)
  const tzGroups = {}
  for (const [,,,,lat,lon,tz] of sorted) {
    if (!tzGroups[tz]) tzGroups[tz] = []
    tzGroups[tz].push([lat, lon])
  }
  const tzCentroids = {}
  for (const [tz, coords] of Object.entries(tzGroups)) {
    const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length
    const lon = coords.reduce((s, c) => s + c[1], 0) / coords.length
    tzCentroids[tz] = [+lat.toFixed(3), +lon.toFixed(3)]
  }

  return { v: 1, countries, cities: sorted, index, tzCentroids }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })
const output = buildOutput(SEED, COUNTRIES)
writeFileSync(OUT_FILE, JSON.stringify(output))
console.log(`Seed: ${output.cities.length} cities, ${Object.keys(output.index).length} prefixes → ${OUT_FILE}`)
console.log('Run scripts/build-geodata.mjs with GeoNames source files for the full 55k-city dataset.')
