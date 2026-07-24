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
const KARMIC_DEBT = new Set([13, 14, 16, 19])

/** Reduce a number to a single digit or master number, recording each step. */
function reduce(n: number): { steps: number[]; result: number; karmicDebt: number | null } {
  const steps: number[] = [n]
  let cur = n
  while (cur > 9 && !MASTER.has(cur)) {
    cur = String(cur).split('').reduce((s, d) => s + Number(d), 0)
    steps.push(cur)
  }
  return { steps, result: cur, karmicDebt: KARMIC_DEBT.has(n) ? n : null }
}

/** Reduce fully to a single digit 1–9, ignoring master numbers — used for the
 * month/day/year building blocks of Challenge, Pinnacle, and Personal Year/Month/Day. */
function reduceFully(n: number): number {
  let cur = n
  while (cur > 9) cur = String(cur).split('').reduce((s, d) => s + Number(d), 0)
  return cur
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
  reduction: { steps: number[]; result: number; karmicDebt: number | null }
}

function buildNameResult(label: string, tokens: LetterToken[]): NameResult {
  const sum = tokens.reduce((s, t) => s + t.value, 0)
  return { label, tokens, sum, reduction: reduce(sum) }
}

function calcName(name: string, table: Record<string, number>): {
  expression: NameResult
  soulUrge: NameResult
  personality: NameResult
} | null {
  const all = tokenise(name, table)
  if (all.length === 0) return null
  const vowels     = all.filter(t =>  t.isVowel)
  const consonants = all.filter(t => !t.isVowel)

  return {
    expression:  buildNameResult('Expression',  all),
    soulUrge:    buildNameResult('Soul Urge',   vowels),
    personality: buildNameResult('Personality', consonants),
  }
}

/** Balance Number: initial letter of each word in the name, summed and reduced.
 * Traditionally used to indicate how one reacts under stress or adversity. */
function calcBalance(name: string, table: Record<string, number>): NameResult | null {
  const initials = name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('')
  if (!initials) return null
  return buildNameResult('Balance', tokenise(initials, table))
}

/** Hidden Passion Number(s): the most frequently occurring letter-value(s) in the
 * full name. Usually a single number; ties are shown together. */
function calcHiddenPassion(tokens: LetterToken[]): number[] {
  if (tokens.length === 0) return []
  const freq = new Map<number, number>()
  for (const t of tokens) freq.set(t.value, (freq.get(t.value) ?? 0) + 1)
  const max = Math.max(...freq.values())
  return [...freq.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b)
}

/** Karmic Lesson Numbers: values the letter table can produce (1–9, or 1–8 for
 * Chaldean, which never assigns 9) that are entirely absent from the name. */
function calcKarmicLessons(tokens: LetterToken[], table: Record<string, number>): number[] {
  if (tokens.length === 0) return []
  const present = new Set(tokens.map(t => t.value))
  const possible = new Set(Object.values(table))
  const lessons: number[] = []
  for (let v = 1; v <= 9; v++) {
    if (possible.has(v) && !present.has(v)) lessons.push(v)
  }
  return lessons
}

// ─── Date / birth-date numbers ─────────────────────────────────────────────────

interface DateParts { month: number; day: number; year: number }

function parseDateStr(dateStr: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function calcLifePath({ month, day, year }: DateParts) {
  const digits = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`.split('').map(Number)
  return reduce(digits.reduce((s, d) => s + d, 0))
}

function calcBirthday({ day }: DateParts) {
  return reduce(day)
}

/** Attitude (Sun) Number: birth month + birth day, reduced. Reflects one's
 * outward-facing first impression / instinctive approach to the world. */
function calcAttitude({ month, day }: DateParts) {
  return reduce(reduceFully(month) + reduceFully(day))
}

function calcPersonalYear({ month, day }: DateParts, forYear: number) {
  return reduce(reduceFully(month) + reduceFully(day) + reduceFully(forYear))
}

function calcPersonalMonth(personalYearResult: number, forMonth: number) {
  return reduce(personalYearResult + reduceFully(forMonth))
}

function calcPersonalDay(personalMonthResult: number, forDay: number) {
  return reduce(personalMonthResult + reduceFully(forDay))
}

/** The four Challenge Numbers, derived by successive subtraction of the reduced
 * month/day/year. Range 0–8 — 0 is a valid, meaningful result ("the challenge of
 * having no clear challenge"), not an absence of data. */
function calcChallenges({ month, day, year }: DateParts): number[] {
  const m = reduceFully(month), d = reduceFully(day), y = reduceFully(year)
  const c1 = Math.abs(m - d)
  const c2 = Math.abs(d - y)
  const c3 = Math.abs(c1 - c2)
  const c4 = Math.abs(m - y)
  return [c1, c2, c3, c4]
}

/** The four Pinnacle Numbers and the age at which each period begins/ends —
 * broad life chapters, each with its own numerological theme. */
function calcPinnacles({ month, day, year }: DateParts, lifePathResult: number) {
  const m = reduceFully(month), d = reduceFully(day), y = reduceFully(year)
  const p1 = reduce(m + d).result
  const p2 = reduce(d + y).result
  const p3 = reduce(p1 + p2).result
  const p4 = reduce(m + y).result
  const firstEnd = 36 - lifePathResult
  return {
    pinnacles: [p1, p2, p3, p4],
    ageRanges: [
      `Birth – ${firstEnd}`,
      `${firstEnd} – ${firstEnd + 9}`,
      `${firstEnd + 9} – ${firstEnd + 18}`,
      `${firstEnd + 18}+`,
    ],
  }
}

/** Maturity (Realization) Number: Life Path + Expression, reduced. Said to
 * describe the self one grows into during the second half of life. */
function calcMaturity(lifePathResult: number, expressionResult: number) {
  return reduce(lifePathResult + expressionResult)
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

function KarmicDebtNote({ karmicDebt }: { karmicDebt: number | null }) {
  if (karmicDebt == null) return null
  return (
    <span
      title="A Karmic Debt Number: the raw total before reduction carries a lesson from a past pattern of misuse — of power (13), freedom (14), love (16), or self (19)."
      style={{
        fontSize: '10px', fontWeight: 600, color: 'var(--color-danger)',
        border: '1px solid var(--color-danger)', borderRadius: '3px',
        padding: '1px 5px', marginLeft: '8px', letterSpacing: '0.03em', cursor: 'help',
      }}
    >
      KARMIC DEBT {karmicDebt}
    </span>
  )
}

function ResultBadge({ n, onClick }: { n: number; onClick?: () => void }) {
  const isMaster = MASTER.has(n)
  const clickable = !!onClick && n > 0
  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      title={clickable ? `View ${n} in Reference` : undefined}
      style={{
        fontSize: isMaster ? '20px' : '24px',
        fontWeight: 600,
        color: isMaster ? 'var(--color-accent)' : 'var(--color-text)',
        background: 'var(--color-surface-3)',
        border: `1px solid ${isMaster ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        padding: '8px 18px',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.borderColor = isMaster ? 'var(--color-accent-muted)' : 'var(--color-border)' }}
    >
      {n}
      {isMaster && <span style={{ fontSize: '10px', display: 'block', color: 'var(--color-accent)', letterSpacing: '0.1em', marginTop: '1px' }}>MASTER</span>}
    </button>
  )
}

function SmallBadge({ n, sub, onClick }: { n: number; sub?: string; onClick?: () => void }) {
  const clickable = !!onClick && n > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <button
        onClick={clickable ? onClick : undefined}
        disabled={!clickable}
        title={clickable ? `View ${n} in Reference` : undefined}
        style={{
          fontSize: '16px', fontWeight: 600, color: 'var(--color-text)',
          background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '6px', padding: '6px 12px', cursor: clickable ? 'pointer' : 'default',
          fontFamily: 'inherit', minWidth: '20px',
        }}
      >
        {n}
      </button>
      {sub && <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textAlign: 'center', maxWidth: '64px' }}>{sub}</span>}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
        {hint && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{hint}</span>}
      </div>
      {children}
    </div>
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
            <KarmicDebtNote karmicDebt={result.reduction.karmicDebt} />
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

function SingleResultCard({ label, formula, result, onNavigate }: {
  label: string
  formula?: string
  result: { steps: number[]; result: number; karmicDebt: number | null }
  onNavigate: (cn: string) => void
}) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            {label}
          </div>
          {formula && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{formula}</span>
              <ReductionSteps steps={result.steps} />
              <KarmicDebtNote karmicDebt={result.karmicDebt} />
            </div>
          )}
        </div>
        <ResultBadge n={result.result} onClick={() => onNavigate(digitCN(result.result))} />
      </div>
    </div>
  )
}

function NumberListCard({ label, note, values, onNavigate }: {
  label: string
  note: string
  values: number[]
  onNavigate: (cn: string) => void
}) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
        {label}
      </div>
      {values.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>None — {note}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
          {values.map(v => (
            <SmallBadge key={v} n={v} onClick={() => onNavigate(digitCN(v))} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'name' | 'date' | 'combined'
type System = 'pythagorean' | 'chaldean'

function NumerologyPage() {
  const navigate = useNavigate()
  const [tab, setTab]       = useState<Tab>('name')
  const [system, setSystem] = useState<System>('pythagorean')
  const [name, setName]     = useState('')
  const [date, setDate]     = useState('')

  const table = system === 'pythagorean' ? PYTHAGOREAN : CHALDEAN

  const nameData = useMemo(() => name.trim() ? calcName(name, table) : null, [name, table])
  const dateParts = useMemo(() => parseDateStr(date), [date])

  const balance       = useMemo(() => name.trim() ? calcBalance(name, table) : null, [name, table])
  const hiddenPassion = useMemo(() => nameData ? calcHiddenPassion(tokenise(name, table)) : [], [nameData, name, table])
  const karmicLessons = useMemo(() => nameData ? calcKarmicLessons(tokenise(name, table), table) : [], [nameData, name, table])

  const now = useMemo(() => new Date(), [])

  const lifePath     = useMemo(() => dateParts ? calcLifePath(dateParts) : null, [dateParts])
  const birthday     = useMemo(() => dateParts ? calcBirthday(dateParts) : null, [dateParts])
  const attitude     = useMemo(() => dateParts ? calcAttitude(dateParts) : null, [dateParts])
  const personalYear = useMemo(() => dateParts ? calcPersonalYear(dateParts, now.getFullYear()) : null, [dateParts, now])
  const personalMonth = useMemo(() => personalYear ? calcPersonalMonth(personalYear.result, now.getMonth() + 1) : null, [personalYear, now])
  const personalDay  = useMemo(() => personalMonth ? calcPersonalDay(personalMonth.result, now.getDate()) : null, [personalMonth, now])
  const challenges   = useMemo(() => dateParts ? calcChallenges(dateParts) : null, [dateParts])
  const pinnacles    = useMemo(() => dateParts && lifePath ? calcPinnacles(dateParts, lifePath.result) : null, [dateParts, lifePath])

  const maturity = useMemo(
    () => (lifePath && nameData) ? calcMaturity(lifePath.result, nameData.expression.reduction.result) : null,
    [lifePath, nameData]
  )

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

      {/* Name + date inputs, always visible since Combined needs both */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Full Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter full name…"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '15px',
              outline: 'none', boxSizing: 'border-box', letterSpacing: '0.05em',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Date of Birth
          </label>
          <DateInput
            value={date}
            onChange={setDate}
            style={{
              padding: '10px 14px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
              outline: 'none', colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <button style={tabStyle(tab === 'name')} onClick={() => setTab('name')}>Name</button>
        <button style={tabStyle(tab === 'date')} onClick={() => setTab('date')}>Date</button>
        <button style={tabStyle(tab === 'combined')} onClick={() => setTab('combined')}>Combined</button>
      </div>

      {/* ── Name tab ── */}
      {tab === 'name' && (
        nameData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <NameResultRow result={nameData.expression}  onNavigate={goDigit} />
            <NameResultRow result={nameData.soulUrge}    onNavigate={goDigit} />
            <NameResultRow result={nameData.personality} onNavigate={goDigit} />
            {balance && <NameResultRow result={balance} onNavigate={goDigit} />}

            <NumberListCard
              label="Hidden Passion"
              note="no letter value stands out in frequency."
              values={hiddenPassion}
              onNavigate={goDigit}
            />
            <NumberListCard
              label="Karmic Lessons"
              note="every value the system can produce appears somewhere in the name."
              values={karmicLessons}
              onNavigate={goDigit}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', margin: '4px 0 0' }}>
              Vowels (Soul Urge) highlighted in gold. Balance uses each name's first letter. Click any number to view its entity.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            Enter a full name above to calculate Expression, Soul Urge, Personality, Balance, Hidden Passion, and Karmic Lessons.
          </p>
        )
      )}

      {/* ── Date tab ── */}
      {tab === 'date' && (
        dateParts && lifePath && birthday && attitude && personalYear && personalMonth && personalDay && challenges && pinnacles ? (
          <div>
            <Section title="Life Path">
              <SingleResultCard
                label="Life Path"
                formula={`${date.replace(/-/g, '').split('').join(' + ')} = ${date.replace(/-/g, '').split('').reduce((s, d) => s + Number(d), 0)}`}
                result={lifePath}
                onNavigate={goDigit}
              />
            </Section>

            <Section title="Birthday & Attitude">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SingleResultCard label="Birthday" formula={`Day ${dateParts.day}`} result={birthday} onNavigate={goDigit} />
                <SingleResultCard label="Attitude (Sun)" formula={`Month ${dateParts.month} + Day ${dateParts.day}`} result={attitude} onNavigate={goDigit} />
              </div>
            </Section>

            <Section title="Personal Cycles" hint={`as of ${now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SingleResultCard label={`Personal Year (${now.getFullYear()})`} result={personalYear} onNavigate={goDigit} />
                <SingleResultCard label="Personal Month" result={personalMonth} onNavigate={goDigit} />
                <SingleResultCard label="Personal Day" result={personalDay} onNavigate={goDigit} />
              </div>
            </Section>

            <Section title="Challenge Numbers" hint="range 0–8; 0 is a valid result">
              <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-around' }}>
                {challenges.map((c, i) => (
                  <SmallBadge key={i} n={c} sub={`Challenge ${i + 1}`} onClick={() => goDigit(digitCN(c))} />
                ))}
              </div>
            </Section>

            <Section title="Pinnacle Numbers" hint="broad life chapters">
              <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-around' }}>
                {pinnacles.pinnacles.map((p, i) => (
                  <SmallBadge key={i} n={p} sub={`${i + 1}: age ${pinnacles.ageRanges[i]}`} onClick={() => goDigit(digitCN(p))} />
                ))}
              </div>
            </Section>

            <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', margin: 0 }}>
              Challenge and Pinnacle formulas vary somewhat between numerology schools; these follow the most widely taught method.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            Enter a date of birth above to calculate Life Path, Birthday, Attitude, Personal Year/Month/Day, Challenge Numbers, and Pinnacle Numbers.
          </p>
        )
      )}

      {/* ── Combined tab ── */}
      {tab === 'combined' && (
        maturity ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SingleResultCard
              label="Maturity (Realization)"
              formula={`Life Path ${lifePath!.result} + Expression ${nameData!.expression.reduction.result}`}
              result={maturity}
              onNavigate={goDigit}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', margin: '4px 0 0' }}>
              The Maturity Number is said to describe the self one grows into during the second half of life, once
              the Life Path's early lessons and the Expression's innate talents have had time to integrate.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            Enter both a full name and a date of birth above to calculate the Maturity Number.
          </p>
        )
      )}
    </div>
  )
}
