/**
 * astro-calc.ts
 * Pure-math astronomical/calendrical calculations — no external dependencies.
 * Accuracy: sufficient for calendar display (moon phase ±hours, sun sign ±1 day).
 */

// ─── Julian Day ───────────────────────────────────────────────────────────────

/** Unix epoch = JD 2440587.5 */
function dateToJD(date: Date): number {
  return 2440587.5 + date.getTime() / 86400000
}

// ─── Moon Phase ───────────────────────────────────────────────────────────────

/** Reference new moon: 2000-01-06 18:14 UTC ≈ JD 2451550.1 */
const KNOWN_NEW_MOON_JD = 2451550.1
const SYNODIC_MONTH = 29.530588853 // days

export type MoonPhaseName =
  | 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous'
  | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent'

export type MoonPhaseInfo = {
  phase: number        // 0–1
  name: MoonPhaseName
  emoji: string
  illumination: number // 0–100 %
  isMajor: boolean     // new, quarter, or full
  canonicalName: string
}

const MOON_PHASE_ENTRIES: Array<{ max: number; name: MoonPhaseName; emoji: string; isMajor: boolean; canonicalName: string }> = [
  { max: 0.0625, name: 'New Moon',        emoji: '🌑', isMajor: true,  canonicalName: 'astrology.moon-phase.new-moon'        },
  { max: 0.25,   name: 'Waxing Crescent', emoji: '🌒', isMajor: false, canonicalName: 'astrology.moon-phase.waxing-crescent' },
  { max: 0.3125, name: 'First Quarter',   emoji: '🌓', isMajor: true,  canonicalName: 'astrology.moon-phase.first-quarter'   },
  { max: 0.5,    name: 'Waxing Gibbous',  emoji: '🌔', isMajor: false, canonicalName: 'astrology.moon-phase.waxing-gibbous'  },
  { max: 0.5625, name: 'Full Moon',       emoji: '🌕', isMajor: true,  canonicalName: 'astrology.moon-phase.full-moon'       },
  { max: 0.75,   name: 'Waning Gibbous',  emoji: '🌖', isMajor: false, canonicalName: 'astrology.moon-phase.waning-gibbous'  },
  { max: 0.8125, name: 'Last Quarter',    emoji: '🌗', isMajor: true,  canonicalName: 'astrology.moon-phase.last-quarter'    },
  { max: 1.0,    name: 'Waning Crescent', emoji: '🌘', isMajor: false, canonicalName: 'astrology.moon-phase.waning-crescent' },
]

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const jd = dateToJD(date)
  let phase = ((jd - KNOWN_NEW_MOON_JD) % SYNODIC_MONTH) / SYNODIC_MONTH
  if (phase < 0) phase += 1

  const entry = MOON_PHASE_ENTRIES.find(p => phase < p.max) ?? MOON_PHASE_ENTRIES[MOON_PHASE_ENTRIES.length - 1]
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100)

  return { phase, name: entry.name, emoji: entry.emoji, illumination, isMajor: entry.isMajor, canonicalName: entry.canonicalName }
}

// ─── Planetary Day Ruler ──────────────────────────────────────────────────────

export type PlanetaryRuler = {
  name: string
  canonicalName: string
  symbol: string
}

/** Traditional Chaldean order by day of week (JS getDay(): 0=Sun … 6=Sat) */
const DAY_RULERS: PlanetaryRuler[] = [
  { name: 'Sol',     canonicalName: 'astrology.planet.sol',     symbol: '☉' }, // Sunday
  { name: 'Luna',    canonicalName: 'astrology.planet.luna',    symbol: '☽' }, // Monday
  { name: 'Mars',    canonicalName: 'astrology.planet.mars',    symbol: '♂' }, // Tuesday
  { name: 'Mercury', canonicalName: 'astrology.planet.mercury', symbol: '☿' }, // Wednesday
  { name: 'Jupiter', canonicalName: 'astrology.planet.jupiter', symbol: '♃' }, // Thursday
  { name: 'Venus',   canonicalName: 'astrology.planet.venus',   symbol: '♀' }, // Friday
  { name: 'Saturn',  canonicalName: 'astrology.planet.saturn',  symbol: '♄' }, // Saturday
]

export function getPlanetaryDayRuler(date: Date): PlanetaryRuler {
  return DAY_RULERS[date.getDay()]
}

/** Column headers: day name + planetary symbol + ruling planet's canonical name, for Sun-first grid */
export const WEEKDAY_HEADERS = DAY_RULERS.map((ruler, i) => ({
  label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
  symbol: ruler.symbol,
  canonicalName: ruler.canonicalName,
}))

// ─── Wu Xing Phase by Season ──────────────────────────────────────────────────

export type WuxingPhaseInfo = {
  name: string
  nameZh: string
  canonicalName: string
  season: string
}

/** Approximate seasonal mapping (Northern Hemisphere, month-based).
 *  August = Earth/Late Summer; traditional Earth also governs 18-day transitions. */
const MONTH_WUXING: Record<number, WuxingPhaseInfo> = {
  1:  { name: 'Water', nameZh: '水', canonicalName: 'wuxing.phase.water', season: 'Winter'      },
  2:  { name: 'Water', nameZh: '水', canonicalName: 'wuxing.phase.water', season: 'Winter'      },
  3:  { name: 'Wood',  nameZh: '木', canonicalName: 'wuxing.phase.wood',  season: 'Spring'      },
  4:  { name: 'Wood',  nameZh: '木', canonicalName: 'wuxing.phase.wood',  season: 'Spring'      },
  5:  { name: 'Wood',  nameZh: '木', canonicalName: 'wuxing.phase.wood',  season: 'Spring'      },
  6:  { name: 'Fire',  nameZh: '火', canonicalName: 'wuxing.phase.fire',  season: 'Summer'      },
  7:  { name: 'Fire',  nameZh: '火', canonicalName: 'wuxing.phase.fire',  season: 'Summer'      },
  8:  { name: 'Earth', nameZh: '土', canonicalName: 'wuxing.phase.earth', season: 'Late Summer' },
  9:  { name: 'Metal', nameZh: '金', canonicalName: 'wuxing.phase.metal', season: 'Autumn'      },
  10: { name: 'Metal', nameZh: '金', canonicalName: 'wuxing.phase.metal', season: 'Autumn'      },
  11: { name: 'Metal', nameZh: '金', canonicalName: 'wuxing.phase.metal', season: 'Autumn'      },
  12: { name: 'Water', nameZh: '水', canonicalName: 'wuxing.phase.water', season: 'Winter'      },
}

export function getWuxingPhase(date: Date): WuxingPhaseInfo {
  return MONTH_WUXING[date.getMonth() + 1]
}

// ─── Sun Sign (IAU 13-sign, approximate) ──────────────────────────────────────

export type SunSignInfo = {
  name: string
  canonicalName: string
  symbol: string
}

type SignBounds = SunSignInfo & { sm: number; sd: number; em: number; ed: number }

/** Approximate IAU boundaries (corrected to nearest day). */
const SUN_SIGNS: SignBounds[] = [
  { name: 'Sagittarius', canonicalName: 'astrology.zodiac-sign.sagittarius', symbol: '♐', sm: 12, sd: 18, em: 1,  ed: 20 },
  { name: 'Capricorn',   canonicalName: 'astrology.zodiac-sign.capricorn',   symbol: '♑', sm: 1,  sd: 20, em: 2,  ed: 16 },
  { name: 'Aquarius',    canonicalName: 'astrology.zodiac-sign.aquarius',    symbol: '♒', sm: 2,  sd: 16, em: 3,  ed: 11 },
  { name: 'Pisces',      canonicalName: 'astrology.zodiac-sign.pisces',      symbol: '♓', sm: 3,  sd: 11, em: 4,  ed: 18 },
  { name: 'Aries',       canonicalName: 'astrology.zodiac-sign.aries',       symbol: '♈', sm: 4,  sd: 18, em: 5,  ed: 13 },
  { name: 'Taurus',      canonicalName: 'astrology.zodiac-sign.taurus',      symbol: '♉', sm: 5,  sd: 13, em: 6,  ed: 21 },
  { name: 'Gemini',      canonicalName: 'astrology.zodiac-sign.gemini',      symbol: '♊', sm: 6,  sd: 21, em: 7,  ed: 20 },
  { name: 'Cancer',      canonicalName: 'astrology.zodiac-sign.cancer',      symbol: '♋', sm: 7,  sd: 20, em: 8,  ed: 10 },
  { name: 'Leo',         canonicalName: 'astrology.zodiac-sign.leo',         symbol: '♌', sm: 8,  sd: 10, em: 9,  ed: 16 },
  { name: 'Virgo',       canonicalName: 'astrology.zodiac-sign.virgo',       symbol: '♍', sm: 9,  sd: 16, em: 10, ed: 30 },
  { name: 'Libra',       canonicalName: 'astrology.zodiac-sign.libra',       symbol: '♎', sm: 10, sd: 30, em: 11, ed: 23 },
  { name: 'Scorpio',     canonicalName: 'astrology.zodiac-sign.scorpio',     symbol: '♏', sm: 11, sd: 23, em: 11, ed: 29 },
  { name: 'Ophiuchus',   canonicalName: 'astrology.zodiac-sign.ophiuchus',   symbol: '⛎', sm: 11, sd: 29, em: 12, ed: 18 },
]

function inRange(m: number, d: number, sm: number, sd: number, em: number, ed: number): boolean {
  const val = m * 100 + d
  const start = sm * 100 + sd
  const end = em * 100 + ed
  if (start <= end) return val >= start && val < end
  // Wraps year (e.g. Sagittarius: Dec 18 – Jan 20)
  return val >= start || val < end
}

export function getSunSign(date: Date): SunSignInfo {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const found = SUN_SIGNS.find(s => inRange(m, d, s.sm, s.sd, s.em, s.ed))
  const { name, canonicalName, symbol } = found ?? SUN_SIGNS[0]
  return { name, canonicalName, symbol }
}

// ─── Chinese Zodiac Year ──────────────────────────────────────────────────────

export type ChineseZodiacAnimalInfo = {
  name: string
  chineseChar: string
  pinyin: string
  emoji: string
  canonicalName: string
}

// Lunar New Year month/day for 1990–2043.
// For years outside this range, Feb 5 is used as a fallback approximation.
const CNY_DATES: Record<number, [number, number]> = {
  1990: [1, 27], 1991: [2, 15], 1992: [2,  4], 1993: [1, 23],
  1994: [2, 10], 1995: [1, 31], 1996: [2, 19], 1997: [2,  7],
  1998: [1, 28], 1999: [2, 16], 2000: [2,  5], 2001: [1, 24],
  2002: [2, 12], 2003: [2,  1], 2004: [1, 22], 2005: [2,  9],
  2006: [1, 29], 2007: [2, 18], 2008: [2,  7], 2009: [1, 26],
  2010: [2, 14], 2011: [2,  3], 2012: [1, 23], 2013: [2, 10],
  2014: [1, 31], 2015: [2, 19], 2016: [2,  8], 2017: [1, 28],
  2018: [2, 16], 2019: [2,  5], 2020: [1, 25], 2021: [2, 12],
  2022: [2,  1], 2023: [1, 22], 2024: [2, 10], 2025: [1, 29],
  2026: [2, 17], 2027: [2,  6], 2028: [1, 26], 2029: [2, 13],
  2030: [2,  3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31],
  2034: [2, 19], 2035: [2,  8], 2036: [1, 28], 2037: [2, 15],
  2038: [2,  4], 2039: [1, 24], 2040: [2, 12], 2041: [2,  1],
  2042: [1, 22], 2043: [2, 10],
}

// Animal cycle: index 0 = Rat; (year - 4) % 12
const CHINESE_ANIMALS: ChineseZodiacAnimalInfo[] = [
  { name: 'Rat',     chineseChar: '鼠', pinyin: 'Shǔ',  emoji: '🐀', canonicalName: 'chinese-zodiac.animal.rat'     },
  { name: 'Ox',      chineseChar: '牛', pinyin: 'Niú',  emoji: '🐂', canonicalName: 'chinese-zodiac.animal.ox'      },
  { name: 'Tiger',   chineseChar: '虎', pinyin: 'Hǔ',   emoji: '🐯', canonicalName: 'chinese-zodiac.animal.tiger'   },
  { name: 'Rabbit',  chineseChar: '兔', pinyin: 'Tù',   emoji: '🐇', canonicalName: 'chinese-zodiac.animal.rabbit'  },
  { name: 'Dragon',  chineseChar: '龙', pinyin: 'Lóng', emoji: '🐉', canonicalName: 'chinese-zodiac.animal.dragon'  },
  { name: 'Snake',   chineseChar: '蛇', pinyin: 'Shé',  emoji: '🐍', canonicalName: 'chinese-zodiac.animal.snake'   },
  { name: 'Horse',   chineseChar: '马', pinyin: 'Mǎ',   emoji: '🐴', canonicalName: 'chinese-zodiac.animal.horse'   },
  { name: 'Goat',    chineseChar: '羊', pinyin: 'Yáng', emoji: '🐐', canonicalName: 'chinese-zodiac.animal.goat'    },
  { name: 'Monkey',  chineseChar: '猴', pinyin: 'Hóu', emoji: '🐒', canonicalName: 'chinese-zodiac.animal.monkey'  },
  { name: 'Rooster', chineseChar: '鸡', pinyin: 'Jī',   emoji: '🐓', canonicalName: 'chinese-zodiac.animal.rooster' },
  { name: 'Dog',     chineseChar: '狗', pinyin: 'Gǒu',  emoji: '🐕', canonicalName: 'chinese-zodiac.animal.dog'     },
  { name: 'Pig',     chineseChar: '猪', pinyin: 'Zhū',  emoji: '🐷', canonicalName: 'chinese-zodiac.animal.pig'     },
]

/** Returns the Chinese zodiac animal for the lunar year containing the given date. */
export function getChineseZodiacYear(date: Date): ChineseZodiacAnimalInfo {
  const calYear = date.getFullYear()
  const cnyEntry = CNY_DATES[calYear] ?? [2, 5]
  const cnyDate = new Date(calYear, cnyEntry[0] - 1, cnyEntry[1])
  const chineseYear = date < cnyDate ? calYear - 1 : calYear
  const idx = ((chineseYear - 4) % 12 + 12) % 12
  return CHINESE_ANIMALS[idx]
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

/** Builds a week-array for the given month. Sun-first columns. Pads with adjacent-month dates. */
export function buildCalendarGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPad = firstDay.getDay() // 0=Sun

  const days: Date[] = []
  for (let i = startPad - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, -i))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month - 1, d))
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1]
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** Format a Date as YYYY-MM-DD (local time) */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
