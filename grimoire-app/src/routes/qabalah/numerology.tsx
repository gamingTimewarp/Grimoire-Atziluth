import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ArrowLeft, Hash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'

export const Route = createFileRoute('/qabalah/numerology')({
  component: NumerologyPage,
})

// ─── Letter value tables ───────────────────────────────────────────────────────

const PYTHAGOREAN: Record<string, number> = {
  a:1,  b:2,  c:3,  d:4,  e:5,  f:6,  g:7,  h:8,  i:9,
  j:1,  k:2,  l:3,  m:4,  n:5,  o:6,  p:7,  q:8,  r:9,
  s:1,  t:2,  u:3,  v:4,  w:5,  x:6,  y:7,  z:8,
}

// Chaldean assigns no value to 9 (sacred/complete)
const CHALDEAN: Record<string, number> = {
  a:1, b:2, c:3, d:4, e:5, f:8, g:3, h:5, i:1,
  j:1, k:2, l:3, m:4, n:5, o:7, p:8, q:1, r:2,
  s:3, t:4, u:6, v:6, w:6, x:5, y:1, z:7,
}

const VOWELS = new Set(['a','e','i','o','u'])

// ─── Reduction logic ───────────────────────────────────────────────────────────

const MASTER = new Set([11, 22, 33])

/** Reduce a number to a single digit or master number, recording each step. */
function reduce(n: number): { steps: number[]; result: number } {
  const steps: number[] = [n]
  let cur = n
  while (cur > 9 && !MASTER.has(cur)) {
    cur = String(cur).split('').reduce((s, d) => s + Number(d), 0)
    steps.push(cur)
  }
  return { steps, result: cur }
}

function digitCN(n: number): string {
  return `numerology.digit.${n}`
}

// ─── Name calculation ──────────────────────────────────────────────────────────

interface LetterToken { char: string; value: number; isVowel: boolean }

function tokenise(name: string, table: Record<string, number>): LetterToken[] {
  return name.toLowerCase().split('').flatMap(ch => {
    const v = table[ch]
    if (v == null) return []
    return [{ char: ch.toUpperCase(), value: v, isVowel: VOWELS.has(ch) }]
  })
}

interface NameResult {
  label: string
  tokens: LetterToken[]
  sum: number
  reduction: { steps: number[]; result: number }
}

function calcName(name: string, table: Record<string, number>): {
  expression: NameResult
  soulUrge: NameResult
  personality: NameResult
} | null {
  const all = tokenise(name, table)
  if (all.length === 0) return null
  const vowels    = all.filter(t =>  t.isVowel)
  const consonants = all.filter(t => !t.isVowel)

  const build = (label: string, tokens: LetterToken[]): NameResult => {
    const sum = tokens.reduce((s, t) => s + t.value, 0)
    return { label, tokens, sum, reduction: reduce(sum) }
  }

  return {
    expression:  build('Expression',  all),
    soulUrge:    build('Soul Urge',   vowels),
    personality: build('Personality', consonants),
  }
}

// ─── Date / Life Path ──────────────────────────────────────────────────────────

function calcLifePath(dateStr: string): { steps: number[]; result: number } | null {
  // dateStr: YYYY-MM-DD
  const digits = dateStr.replace(/-/g, '').split('').map(Number)
  if (digits.length !== 8 || digits.some(isNaN)) return null
  const sum = digits.reduce((s, d) => s + d, 0)
  return reduce(sum)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ReductionSteps({ steps }: { steps: number[] }) {
  if (steps.length <= 1) return null
  return (
    <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>
      {steps.slice(0, -1).join(' → ')} → {steps[steps.length - 1]}
    </span>
  )
}

function ResultBadge({ n, onClick }: { n: number; onClick: () => void }) {
  const isMaster = MASTER.has(n)
  return (
    <button
      onClick={onClick}
      title={`View ${n} in Reference`}
      style={{
        fontSize: isMaster ? '20px' : '24px',
        fontWeight: 600,
        color: isMaster ? 'var(--color-accent)' : 'var(--color-text)',
        background: 'var(--color-surface-3)',
        border: `1px solid ${isMaster ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        padding: '8px 18px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isMaster ? 'var(--color-accent-muted)' : 'var(--color-border)' }}
    >
      {n}
      {isMaster && <span style={{ fontSize: '10px', display: 'block', color: 'var(--color-accent)', letterSpacing: '0.1em', marginTop: '1px' }}>MASTER</span>}
    </button>
  )
}

function NameResultRow({ result, onNavigate }: { result: NameResult; onNavigate: (cn: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const r = result.reduction.result
  return (
    <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            {result.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {result.sum}
            </span>
            <ReductionSteps steps={result.reduction.steps} />
          </div>
        </div>
        <ResultBadge n={r} onClick={() => onNavigate(digitCN(r))} />
      </div>

      {/* Token breakdown toggle */}
      {result.tokens.length > 0 && (
        <button
          onClick={() => setExpanded(o => !o)}
          style={{ background: 'none', border: 'none', padding: '6px 0 0', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
          Letter breakdown
        </button>
      )}
      {expanded && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {result.tokens.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '4px 6px', borderRadius: '4px',
                background: t.isVowel ? 'rgba(196,146,42,0.10)' : 'var(--color-surface-3)',
                border: `1px solid ${t.isVowel ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                minWidth: '28px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: t.isVowel ? 'var(--color-accent)' : 'var(--color-text)' }}>{t.char}</span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>{t.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'name' | 'date'
type System = 'pythagorean' | 'chaldean'

function NumerologyPage() {
  const navigate = useNavigate()
  const [tab, setTab]       = useState<Tab>('name')
  const [system, setSystem] = useState<System>('pythagorean')
  const [name, setName]     = useState('')
  const [date, setDate]     = useState('')

  const table = system === 'pythagorean' ? PYTHAGOREAN : CHALDEAN

  const nameResult = useMemo(() => name.trim() ? calcName(name, table) : null, [name, table])
  const lifePath   = useMemo(() => date ? calcLifePath(date) : null, [date])

  const goDigit = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 18px', fontSize: '13px', fontWeight: active ? 500 : 400,
    background: active ? 'var(--color-surface-3)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/qabalah' })}>
          <ArrowLeft size={14} /> Qabalah
        </Button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={18} style={{ color: 'var(--color-accent)' }} />
            Numerology
          </h1>
        </div>
      </div>

      {/* System selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>System:</span>
        {(['pythagorean', 'chaldean'] as System[]).map(s => (
          <button
            key={s}
            onClick={() => setSystem(s)}
            style={{
              padding: '5px 14px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
              background: system === s ? 'var(--color-surface-3)' : 'transparent',
              color: system === s ? 'var(--color-accent)' : 'var(--color-text-muted)',
              border: `1px solid ${system === s ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
              fontWeight: system === s ? 500 : 400,
            }}
          >
            {s === 'pythagorean' ? 'Pythagorean' : 'Chaldean'}
          </button>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '4px' }}>
          {system === 'chaldean' ? '(9 is sacred — unassigned)' : '(A=1…Z=8, cyclical)'}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <button style={tabStyle(tab === 'name')} onClick={() => setTab('name')}>Name</button>
        <button style={tabStyle(tab === 'date')} onClick={() => setTab('date')}>Date / Life Path</button>
      </div>

      {/* ── Name tab ── */}
      {tab === 'name' && (
        <div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter full name…"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', marginBottom: '20px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '15px',
              outline: 'none', boxSizing: 'border-box', letterSpacing: '0.05em',
            }}
          />
          {nameResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <NameResultRow result={nameResult.expression}  onNavigate={goDigit} />
              <NameResultRow result={nameResult.soulUrge}    onNavigate={goDigit} />
              <NameResultRow result={nameResult.personality} onNavigate={goDigit} />
              <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', margin: '4px 0 0' }}>
                Vowels (Soul Urge) highlighted in gold. Click any number to view its entity.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              Enter a name to calculate Expression, Soul Urge, and Personality numbers.
            </p>
          )}
        </div>
      )}

      {/* ── Date tab ── */}
      {tab === 'date' && (
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Date of Birth
          </label>
          <DateInput
            value={date}
            onChange={setDate}
            style={{
              padding: '10px 14px', marginBottom: '24px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
              outline: 'none', colorScheme: 'dark',
            }}
          />

          {lifePath ? (
            <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Life Path
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {date.replace(/-/g, '').split('').join(' + ')} = {date.replace(/-/g, '').split('').reduce((s,d) => s+Number(d), 0)}
                    </span>
                  </div>
                  <ReductionSteps steps={lifePath.steps} />
                </div>
                <ResultBadge n={lifePath.result} onClick={() => goDigit(digitCN(lifePath.result))} />
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
              Enter a date of birth to calculate the Life Path number.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
