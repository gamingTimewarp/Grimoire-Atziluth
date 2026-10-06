/**
 * numerology-calc.ts
 * Shared letter-value tables and reduction/summation helpers for Western
 * numerology (Pythagorean/Chaldean) and Hebrew gematria. Originally
 * page-local to qabalah/numerology.tsx and qabalah/gematria.tsx respectively;
 * extracted here so the Practice page's Numerology widget can compute the
 * same totals without duplicating (and risking drift from) either page's
 * value tables.
 */

// ─── Western numerology (Pythagorean / Chaldean) ────────────────────────────

export const PYTHAGOREAN_TABLE: Record<string, number> = {
  a:1,  b:2,  c:3,  d:4,  e:5,  f:6,  g:7,  h:8,  i:9,
  j:1,  k:2,  l:3,  m:4,  n:5,  o:6,  p:7,  q:8,  r:9,
  s:1,  t:2,  u:3,  v:4,  w:5,  x:6,  y:7,  z:8,
}

// Chaldean assigns no value to 9 (sacred/complete)
export const CHALDEAN_TABLE: Record<string, number> = {
  a:1, b:2, c:3, d:4, e:5, f:8, g:3, h:5, i:1,
  j:1, k:2, l:3, m:4, n:5, o:7, p:8, q:1, r:2,
  s:3, t:4, u:6, v:6, w:6, x:5, y:1, z:7,
}

export const MASTER = new Set([11, 22, 33])
const KARMIC_DEBT = new Set([13, 14, 16, 19])

/** Reduce a number to a single digit or master number, recording each step. */
export function reduceNumber(n: number): { steps: number[]; result: number; karmicDebt: number | null } {
  const steps: number[] = [n]
  let cur = n
  while (cur > 9 && !MASTER.has(cur)) {
    cur = String(cur).split('').reduce((s, d) => s + Number(d), 0)
    steps.push(cur)
  }
  return { steps, result: cur, karmicDebt: KARMIC_DEBT.has(n) ? n : null }
}

/** Sums a word/phrase's letters against a Pythagorean/Chaldean table,
 *  ignoring anything not in the table (spaces, punctuation, digits). */
export function sumLatinWord(word: string, table: Record<string, number>): number {
  let sum = 0
  for (const ch of word.toLowerCase()) {
    const v = table[ch]
    if (v != null) sum += v
  }
  return sum
}

// ─── Hebrew gematria ────────────────────────────────────────────────────────

export const HEBREW_VALUES: Record<string, number> = {
  aleph: 1,   beth: 2,    gimel: 3,   daleth: 4,  he: 5,
  vav: 6,     zayin: 7,   cheth: 8,   teth: 9,    yod: 10,
  kaph: 20,   lamed: 30,  mem: 40,    nun: 50,    samekh: 60,
  ayin: 70,   pe: 80,     tzaddi: 90, qoph: 100,  resh: 200,
  shin: 300,  tav: 400,
  // Mispar Gadol — final (sofit) form values
  'kaph-final': 500, 'mem-final': 600, 'nun-final': 700,
  'pe-final': 800,   'tzaddi-final': 900,
}

// Unicode Hebrew → internal name. Finals map to their '-final' names so
// callers can resolve them correctly based on the useFinalValues flag.
export const HEBREW_UNICODE_TO_NAME: Record<string, string> = {
  'א': 'aleph', 'ב': 'beth',   'ג': 'gimel',  'ד': 'daleth', 'ה': 'he',
  'ו': 'vav',   'ז': 'zayin',  'ח': 'cheth',  'ט': 'teth',   'י': 'yod',
  'כ': 'kaph',  'ל': 'lamed',  'מ': 'mem',    'נ': 'nun',    'ס': 'samekh',
  'ע': 'ayin',  'פ': 'pe',     'צ': 'tzaddi', 'ק': 'qoph',   'ר': 'resh',
  'ש': 'shin',  'ת': 'tav',
  'ך': 'kaph-final', 'ם': 'mem-final', 'ן': 'nun-final',
  'ף': 'pe-final',   'ץ': 'tzaddi-final',
}

// Base letter for each final form (for resolving back to standard value)
export const HEBREW_FINAL_BASE: Record<string, string> = {
  'kaph-final': 'kaph', 'mem-final': 'mem', 'nun-final': 'nun',
  'pe-final': 'pe', 'tzaddi-final': 'tzaddi',
}

export const HEBREW_LATIN_TO_NAME: Record<string, string> = {
  'aleph': 'aleph', 'alef': 'aleph', 'beth': 'beth', 'bet': 'beth', 'vet': 'beth',
  'gimel': 'gimel', 'daleth': 'daleth', 'dalet': 'daleth', 'he': 'he', 'heh': 'he',
  'vav': 'vav', 'wav': 'vav', 'waw': 'vav', 'zayin': 'zayin', 'zain': 'zayin',
  'cheth': 'cheth', 'chet': 'cheth', 'het': 'cheth', 'teth': 'teth', 'tet': 'teth',
  'yod': 'yod', 'yud': 'yod', 'kaph': 'kaph', 'kaf': 'kaph', 'koph': 'kaph',
  'lamed': 'lamed', 'lamedh': 'lamed', 'mem': 'mem', 'nun': 'nun', 'samekh': 'samekh',
  'samech': 'samekh', 'ayin': 'ayin', 'pe': 'pe', 'peh': 'pe', 'fe': 'pe',
  'tzaddi': 'tzaddi', 'tsadi': 'tzaddi', 'tzade': 'tzaddi', 'sadhe': 'tzaddi',
  'qoph': 'qoph', 'qof': 'qoph', 'kuf': 'qoph', 'resh': 'resh', 'shin': 'shin',
  'tav': 'tav', 'taw': 'tav', 'tau': 'tav',
  // Final forms — Latin input (multiple spellings)
  'kaph-final': 'kaph-final', 'kaf-sofit': 'kaph-final', 'final-kaph': 'kaph-final',
  'mem-final':  'mem-final',  'mem-sofit':  'mem-final',  'final-mem':  'mem-final',
  'nun-final':  'nun-final',  'nun-sofit':  'nun-final',  'final-nun':  'nun-final',
  'pe-final':   'pe-final',   'peh-sofit':  'pe-final',   'final-pe':   'pe-final',
  'tzaddi-final': 'tzaddi-final', 'tsadi-sofit': 'tzaddi-final', 'final-tzaddi': 'tzaddi-final',
}

/** Sums a Hebrew word/phrase's letter values — accepts Hebrew Unicode text
 *  or space/comma-separated Latin letter names (e.g. "aleph beth gimel"),
 *  the same two input modes the Gematria page accepts. Mirrors that page's
 *  parseInput, minus the per-token display info only its letter-tile UI needs. */
export function sumGematriaWord(raw: string, useFinalValues = false): { total: number; error: string | null } {
  const s = raw.trim()
  if (!s) return { total: 0, error: null }

  const hasHebrew = /[א-ת]/.test(s)
  if (hasHebrew) {
    let total = 0
    let matched = 0
    for (const ch of s) {
      if (/\s/.test(ch)) continue
      const rawName = HEBREW_UNICODE_TO_NAME[ch]
      if (!rawName) continue
      matched++
      const isFinal = rawName.endsWith('-final')
      const name = (isFinal && !useFinalValues) ? HEBREW_FINAL_BASE[rawName] : rawName
      total += HEBREW_VALUES[name] ?? 0
    }
    return { total, error: matched === 0 ? 'No recognized Hebrew characters.' : null }
  }

  const parts = s.toLowerCase().split(/[\s,]+/).filter(Boolean)
  let total = 0
  for (const part of parts) {
    const rawName = HEBREW_LATIN_TO_NAME[part]
    if (!rawName) return { total: 0, error: `Unrecognized letter: "${part}"` }
    const isFinal = rawName.endsWith('-final')
    const name = (isFinal && !useFinalValues) ? HEBREW_FINAL_BASE[rawName] : rawName
    total += HEBREW_VALUES[name] ?? 0
  }
  return { total, error: null }
}
