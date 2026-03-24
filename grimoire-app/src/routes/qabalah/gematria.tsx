import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/qabalah/gematria')({
  component: GematriaPage,
})

// Standard Hebrew letter values
const HEBREW_VALUES: Record<string, number> = {
  aleph: 1,   beth: 2,    gimel: 3,   daleth: 4,  he: 5,
  vav: 6,     zayin: 7,   cheth: 8,   teth: 9,    yod: 10,
  kaph: 20,   lamed: 30,  mem: 40,    nun: 50,    samekh: 60,
  ayin: 70,   pe: 80,     tzaddi: 90, qoph: 100,  resh: 200,
  shin: 300,  tav: 400,
}

// Simple Hebrew Unicode → letter name mapping for input parsing
const UNICODE_TO_NAME: Record<string, string> = {
  'א': 'aleph', 'ב': 'beth',   'ג': 'gimel',  'ד': 'daleth', 'ה': 'he',
  'ו': 'vav',   'ז': 'zayin',  'ח': 'cheth',  'ט': 'teth',   'י': 'yod',
  'כ': 'kaph',  'ל': 'lamed',  'מ': 'mem',    'נ': 'nun',    'ס': 'samekh',
  'ע': 'ayin',  'פ': 'pe',     'צ': 'tzaddi', 'ק': 'qoph',   'ר': 'resh',
  'ש': 'shin',  'ת': 'tav',
  // Finals (same value as regular)
  'ך': 'kaph',  'ם': 'mem',   'ן': 'nun',   'ף': 'pe',    'ץ': 'tzaddi',
}

// Basic Latin transliteration → letter name
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
}

interface LetterToken {
  letter: string
  value: number
}

function parseInput(raw: string): { tokens: LetterToken[]; total: number; error: string | null } {
  const tokens: LetterToken[] = []
  let i = 0
  const s = raw.trim()
  if (!s) return { tokens: [], total: 0, error: null }

  // If input contains Hebrew Unicode chars, parse char by char
  const hasHebrew = /[\u05D0-\u05EA]/.test(s)
  if (hasHebrew) {
    for (const ch of s) {
      if (/\s/.test(ch)) continue
      const name = UNICODE_TO_NAME[ch]
      if (name) {
        tokens.push({ letter: ch, value: HEBREW_VALUES[name] ?? 0 })
      }
    }
    const total = tokens.reduce((a, t) => a + t.value, 0)
    return { tokens, total, error: tokens.length === 0 ? 'No recognized Hebrew characters.' : null }
  }

  // Latin transliteration: split on whitespace / hyphens / commas
  const parts = s.toLowerCase().split(/[\s,\-]+/).filter(Boolean)
  for (const part of parts) {
    const name = LATIN_TO_NAME[part]
    if (name) {
      tokens.push({ letter: part, value: HEBREW_VALUES[name] ?? 0 })
    } else {
      return { tokens: [], total: 0, error: `Unrecognized letter: "${part}"` }
    }
  }
  const total = tokens.reduce((a, t) => a + t.value, 0)
  return { tokens, total, error: null }
}

const LETTER_TABLE = [
  { name: 'Aleph',   heb: 'א', value: 1   },
  { name: 'Beth',    heb: 'ב', value: 2   },
  { name: 'Gimel',   heb: 'ג', value: 3   },
  { name: 'Daleth',  heb: 'ד', value: 4   },
  { name: 'He',      heb: 'ה', value: 5   },
  { name: 'Vav',     heb: 'ו', value: 6   },
  { name: 'Zayin',   heb: 'ז', value: 7   },
  { name: 'Cheth',   heb: 'ח', value: 8   },
  { name: 'Teth',    heb: 'ט', value: 9   },
  { name: 'Yod',     heb: 'י', value: 10  },
  { name: 'Kaph',    heb: 'כ', value: 20  },
  { name: 'Lamed',   heb: 'ל', value: 30  },
  { name: 'Mem',     heb: 'מ', value: 40  },
  { name: 'Nun',     heb: 'נ', value: 50  },
  { name: 'Samekh',  heb: 'ס', value: 60  },
  { name: 'Ayin',    heb: 'ע', value: 70  },
  { name: 'Pe',      heb: 'פ', value: 80  },
  { name: 'Tzaddi',  heb: 'צ', value: 90  },
  { name: 'Qoph',    heb: 'ק', value: 100 },
  { name: 'Resh',    heb: 'ר', value: 200 },
  { name: 'Shin',    heb: 'ש', value: 300 },
  { name: 'Tav',     heb: 'ת', value: 400 },
]

function GematriaPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  const parsed = useMemo(() => parseInput(input), [input])

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
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          Input
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
                  <span style={{ fontSize: '18px', fontFamily: 'serif', color: 'var(--color-text)' }}>{t.letter}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t.value}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '4px' }}>
          {LETTER_TABLE.map(l => (
            <div
              key={l.name}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', background: 'var(--color-surface-2)',
                borderRadius: '4px', border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
              onClick={() => setInput(prev => prev ? prev + ' ' + l.name.toLowerCase() : l.name.toLowerCase())}
              title={`Add ${l.name} (${l.value})`}
            >
              <span style={{ fontSize: '18px', color: 'var(--color-text)', fontFamily: 'serif', minWidth: '20px', textAlign: 'center' }}>{l.heb}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{l.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: 'auto' }}>{l.value}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
          Click a letter to add it to the input. Finals (ך ם ן ף ץ) use same values as regular forms.
        </div>
      </div>
    </div>
  )
}
