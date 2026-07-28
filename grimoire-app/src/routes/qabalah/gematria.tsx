import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { loadGematriaState, saveGematriaState, type GematriaDisplayMode } from '@/lib/gematria-store'

export const Route = createFileRoute('/qabalah/gematria')({
  component: GematriaPage,
})

// ─── Letter data ──────────────────────────────────────────────────────────────

const HEBREW_VALUES: Record<string, number> = {
  aleph: 1,   beth: 2,    gimel: 3,   daleth: 4,  he: 5,
  vav: 6,     zayin: 7,   cheth: 8,   teth: 9,    yod: 10,
  kaph: 20,   lamed: 30,  mem: 40,    nun: 50,    samekh: 60,
  ayin: 70,   pe: 80,     tzaddi: 90, qoph: 100,  resh: 200,
  shin: 300,  tav: 400,
  // Mispar Gadol — final (sofit) form values
  'kaph-final': 500, 'mem-final': 600, 'nun-final': 700,
  'pe-final': 800,   'tzaddi-final': 900,
}

// Unicode Hebrew → internal name.  Finals map to their '-final' names so the
// parser can resolve them correctly based on the useFinalValues flag.
const UNICODE_TO_NAME: Record<string, string> = {
  'א': 'aleph', 'ב': 'beth',   'ג': 'gimel',  'ד': 'daleth', 'ה': 'he',
  'ו': 'vav',   'ז': 'zayin',  'ח': 'cheth',  'ט': 'teth',   'י': 'yod',
  'כ': 'kaph',  'ל': 'lamed',  'מ': 'mem',    'נ': 'nun',    'ס': 'samekh',
  'ע': 'ayin',  'פ': 'pe',     'צ': 'tzaddi', 'ק': 'qoph',   'ר': 'resh',
  'ש': 'shin',  'ת': 'tav',
  'ך': 'kaph-final', 'ם': 'mem-final', 'ן': 'nun-final',
  'ף': 'pe-final',   'ץ': 'tzaddi-final',
}

// Base letter for each final form (for resolving back to standard value)
const FINAL_BASE: Record<string, string> = {
  'kaph-final': 'kaph', 'mem-final': 'mem', 'nun-final': 'nun',
  'pe-final': 'pe', 'tzaddi-final': 'tzaddi',
}

const LATIN_TO_NAME: Record<string, string> = {
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

interface LetterToken {
  display: string   // Hebrew char or Latin name as typed
  name: string      // resolved internal name (e.g. 'kaph' or 'kaph-final')
  value: number
  isFinal: boolean
}

function parseInput(raw: string, useFinalValues: boolean): {
  tokens: LetterToken[]
  total: number
  error: string | null
} {
  const tokens: LetterToken[] = []
  const s = raw.trim()
  if (!s) return { tokens: [], total: 0, error: null }

  const hasHebrew = /[\u05D0-\u05EA]/.test(s)
  if (hasHebrew) {
    for (const ch of s) {
      if (/\s/.test(ch)) continue
      const raw_name = UNICODE_TO_NAME[ch]
      if (!raw_name) continue
      const isFinal = raw_name.endsWith('-final')
      const name = (isFinal && !useFinalValues) ? FINAL_BASE[raw_name] : raw_name
      tokens.push({ display: ch, name, value: HEBREW_VALUES[name] ?? 0, isFinal })
    }
    return {
      tokens,
      total: tokens.reduce((a, t) => a + t.value, 0),
      error: tokens.length === 0 ? 'No recognized Hebrew characters.' : null,
    }
  }

  // Latin: split on whitespace and commas only — hyphens are part of "kaph-final" etc.
  const parts = s.toLowerCase().split(/[\s,]+/).filter(Boolean)
  for (const part of parts) {
    const raw_name = LATIN_TO_NAME[part]
    if (!raw_name) return { tokens: [], total: 0, error: `Unrecognized letter: "${part}"` }
    const isFinal = raw_name.endsWith('-final')
    const name = (isFinal && !useFinalValues) ? FINAL_BASE[raw_name] : raw_name
    tokens.push({ display: part, name, value: HEBREW_VALUES[name] ?? 0, isFinal })
  }
  return {
    tokens,
    total: tokens.reduce((a, t) => a + t.value, 0),
    error: null,
  }
}

// ─── Letter table ─────────────────────────────────────────────────────────────

interface LetterEntry {
  name: string
  latinKey: string      // key used for adding to input (and for LETTER_CANONICAL lookup)
  heb: string
  value: number
  finalHeb?: string
  finalLatinKey?: string
  finalValue?: number   // mispar gadol value
  canonicalName: string
}

const LETTER_TABLE: LetterEntry[] = [
  { name: 'Aleph',  latinKey: 'aleph',  heb: 'א', value: 1,   canonicalName: 'letter.hebrew.aleph'  },
  { name: 'Beth',   latinKey: 'beth',   heb: 'ב', value: 2,   canonicalName: 'letter.hebrew.beth'   },
  { name: 'Gimel',  latinKey: 'gimel',  heb: 'ג', value: 3,   canonicalName: 'letter.hebrew.gimel'  },
  { name: 'Daleth', latinKey: 'daleth', heb: 'ד', value: 4,   canonicalName: 'letter.hebrew.daleth' },
  { name: 'Heh',    latinKey: 'he',     heb: 'ה', value: 5,   canonicalName: 'letter.hebrew.heh'    },
  { name: 'Vau',    latinKey: 'vav',    heb: 'ו', value: 6,   canonicalName: 'letter.hebrew.vau'    },
  { name: 'Zayin',  latinKey: 'zayin',  heb: 'ז', value: 7,   canonicalName: 'letter.hebrew.zayin'  },
  { name: 'Cheth',  latinKey: 'cheth',  heb: 'ח', value: 8,   canonicalName: 'letter.hebrew.cheth'  },
  { name: 'Teth',   latinKey: 'teth',   heb: 'ט', value: 9,   canonicalName: 'letter.hebrew.teth'   },
  { name: 'Yod',    latinKey: 'yod',    heb: 'י', value: 10,  canonicalName: 'letter.hebrew.yod'    },
  { name: 'Kaph',   latinKey: 'kaph',   heb: 'כ', value: 20,  finalHeb: 'ך', finalLatinKey: 'kaph-final', finalValue: 500, canonicalName: 'letter.hebrew.kaph'   },
  { name: 'Lamed',  latinKey: 'lamed',  heb: 'ל', value: 30,  canonicalName: 'letter.hebrew.lamed'  },
  { name: 'Mem',    latinKey: 'mem',    heb: 'מ', value: 40,  finalHeb: 'ם', finalLatinKey: 'mem-final',  finalValue: 600, canonicalName: 'letter.hebrew.mem'    },
  { name: 'Nun',    latinKey: 'nun',    heb: 'נ', value: 50,  finalHeb: 'ן', finalLatinKey: 'nun-final',  finalValue: 700, canonicalName: 'letter.hebrew.nun'    },
  { name: 'Samekh', latinKey: 'samekh', heb: 'ס', value: 60,  canonicalName: 'letter.hebrew.samekh' },
  { name: 'Ayin',   latinKey: 'ayin',   heb: 'ע', value: 70,  canonicalName: 'letter.hebrew.ayin'   },
  { name: 'Peh',    latinKey: 'pe',     heb: 'פ', value: 80,  finalHeb: 'ף', finalLatinKey: 'pe-final',   finalValue: 800, canonicalName: 'letter.hebrew.peh'    },
  { name: 'Tzaddi', latinKey: 'tzaddi', heb: 'צ', value: 90,  finalHeb: 'ץ', finalLatinKey: 'tzaddi-final', finalValue: 900, canonicalName: 'letter.hebrew.tzaddi' },
  { name: 'Qoph',   latinKey: 'qoph',   heb: 'ק', value: 100, canonicalName: 'letter.hebrew.qoph'   },
  { name: 'Resh',   latinKey: 'resh',   heb: 'ר', value: 200, canonicalName: 'letter.hebrew.resh'   },
  { name: 'Shin',   latinKey: 'shin',   heb: 'ש', value: 300, canonicalName: 'letter.hebrew.shin'   },
  { name: 'Tav',    latinKey: 'tav',    heb: 'ת', value: 400, canonicalName: 'letter.hebrew.tau'    },
]

// ─── Character/Name display conversion ─────────────────────────────────────────

/** Resolves a letter tile's latinKey/finalLatinKey to its Hebrew char or Latin key,
 * for use both when inserting a tile click and when converting the whole input. */
function findLetterEntry(key: string): { entry: LetterEntry; isFinal: boolean } | null {
  const isFinal = key.endsWith('-final')
  const baseKey = isFinal ? FINAL_BASE[key] : key
  const entry = LETTER_TABLE.find(l => l.latinKey === baseKey)
  return entry ? { entry, isFinal } : null
}

function keyToDisplay(key: string, mode: GematriaDisplayMode): string {
  const found = findLetterEntry(key)
  if (!found) return key
  const { entry, isFinal } = found
  if (mode === 'character') return (isFinal ? entry.finalHeb : entry.heb) ?? entry.heb
  return (isFinal ? entry.finalLatinKey : entry.latinKey) ?? entry.latinKey
}

/** Resolves a token's *originally typed* form (not its value-collapsed `name`, which
 * loses the sofit distinction when Mispar Gadol is off) back to its canonical latinKey,
 * so mode conversion round-trips correctly regardless of the Mispar Gadol toggle. */
function tokenToKey(display: string): string | null {
  const hebName = UNICODE_TO_NAME[display]
  if (hebName) return hebName
  return LATIN_TO_NAME[display.toLowerCase()] ?? null
}

function tokenToDisplay(token: LetterToken, mode: GematriaDisplayMode): string {
  const key = tokenToKey(token.display)
  if (!key) return token.display
  return keyToDisplay(key, mode)
}

// ─── Component ────────────────────────────────────────────────────────────────

function GematriaPage() {
  const navigate = useNavigate()
  const initial = useMemo(loadGematriaState, [])
  const [input, setInput] = useState(initial.input)
  const [useFinalValues, setUseFinalValues] = useState(initial.useFinalValues)
  const [displayMode, setDisplayMode] = useState<GematriaDisplayMode>(initial.displayMode)

  useEffect(() => {
    saveGematriaState({ input, useFinalValues, displayMode })
  }, [input, useFinalValues, displayMode])

  const parsed = useMemo(() => parseInput(input, useFinalValues), [input, useFinalValues])

  const addToInput = (key: string) =>
    setInput(prev => { const v = keyToDisplay(key, displayMode); return prev ? prev + ' ' + v : v })

  const changeDisplayMode = (mode: GematriaDisplayMode) => {
    if (mode === displayMode) return
    if (parsed.tokens.length > 0) {
      setInput(parsed.tokens.map(t => tokenToDisplay(t, mode)).join(' '))
    }
    setDisplayMode(mode)
  }

  const goToLetter = (e: React.MouseEvent, canonicalName: string) => {
    e.stopPropagation()
    navigate({ to: '/reference/$canonicalName', params: { canonicalName } })
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/qabalah' })}>
          <ArrowLeft size={13} /> Tree
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Gematria</h1>
      </div>

      {/* Input */}
      <div style={{ marginBottom: '24px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Input
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {input && (
              <Button variant="ghost" size="sm" onClick={() => setInput('')}>
                Clear
              </Button>
            )}

            {/* Character/Name display mode */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {(['character', 'name'] as GematriaDisplayMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => changeDisplayMode(m)}
                  style={{
                    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                    background: displayMode === m ? 'var(--color-surface-3)' : 'transparent',
                    color: displayMode === m ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: `1px solid ${displayMode === m ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                    fontWeight: displayMode === m ? 500 : 400,
                  }}
                >
                  {m === 'character' ? 'Character' : 'Name'}
                </button>
              ))}
            </div>

            {/* Mispar Gadol toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: '11px', color: useFinalValues ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                Mispar Gadol (terminal forms)
              </span>
              <button
                onClick={() => setUseFinalValues(v => !v)}
                style={{
                  width: '32px', height: '18px', borderRadius: '9px', border: 'none',
                  cursor: 'pointer', padding: 0, flexShrink: 0, position: 'relative',
                  transition: 'background 0.15s',
                  background: useFinalValues ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <div style={{
                  width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '3px',
                  left: useFinalValues ? '17px' : '3px',
                  transition: 'left 0.15s',
                }} />
              </button>
            </label>
          </div>
        </div>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Hebrew characters (א ב ג) or Latin names (aleph beth gimel)"
          style={{
            width: '100%', padding: '9px 12px',
            background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {parsed.error && (
          <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '6px' }}>
            {parsed.error}
          </div>
        )}

        {parsed.tokens.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {parsed.tokens.map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontSize: '18px', fontFamily: 'serif', color: 'var(--color-text)' }}>{t.display}</span>
                  <span style={{ fontSize: '11px', color: t.isFinal && useFinalValues ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {t.value}
                  </span>
                  {t.isFinal && (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', lineHeight: 1 }}>
                      sofit
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 300, color: 'var(--color-accent)', marginLeft: 'auto' }}>
              = {parsed.total}
            </div>
          </div>
        )}
      </div>

      {/* Letter value table */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          Letter Values
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '4px' }}>
          {LETTER_TABLE.map(l => (
            <LetterTile
              key={l.name}
              heb={l.heb}
              label={l.name}
              value={l.value}
              canonicalName={l.canonicalName}
              onAdd={() => addToInput(l.latinKey)}
              onNavigate={e => goToLetter(e, l.canonicalName)}
            />
          ))}
          {/* Final form tiles — always shown; value reflects useFinalValues toggle */}
          {LETTER_TABLE.filter(l => l.finalHeb).map(l => (
            <LetterTile
              key={l.name + '-final'}
              heb={l.finalHeb!}
              label={l.name + ' Sofit'}
              value={useFinalValues ? l.finalValue! : l.value}
              isFinal
              canonicalName={l.canonicalName}
              onAdd={() => addToInput(l.finalLatinKey!)}
              onNavigate={e => goToLetter(e, l.canonicalName)}
            />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px', lineHeight: '1.5' }}>
          Click a tile to add the letter to the input.{' '}
          <span style={{ color: 'var(--color-text-subtle)' }}>
            Mispar Gadol gives terminal forms their extended values (500–900).
            In Latin mode, type e.g. <em>kaph-final</em> or <em>mem-sofit</em>.
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Tile sub-component ───────────────────────────────────────────────────────

function LetterTile({
  heb, label, value, isFinal = false, canonicalName, onAdd, onNavigate,
}: {
  heb: string
  label: string
  value: number
  isFinal?: boolean
  canonicalName: string
  onAdd: () => void
  onNavigate: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onAdd}
      title={`Add ${label} (${value})`}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 8px',
        background: isFinal ? 'var(--color-surface-1)' : 'var(--color-surface-2)',
        borderRadius: '4px',
        border: `1px solid ${isFinal ? 'var(--color-border)' : 'var(--color-border)'}`,
        cursor: 'pointer',
        opacity: isFinal ? 0.85 : 1,
      }}
    >
      <span style={{ fontSize: '18px', color: 'var(--color-text)', fontFamily: 'serif', minWidth: '20px', textAlign: 'center' }}>
        {heb}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-accent)', flexShrink: 0 }}>
        {value}
      </span>
      <button
        onClick={onNavigate}
        title={`View ${label} in Reference`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '1px',
          color: 'var(--color-text-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center',
          lineHeight: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        <ExternalLink size={11} />
      </button>
    </div>
  )
}
