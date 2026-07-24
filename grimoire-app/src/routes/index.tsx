import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { BookOpen, Star, BookMarked, PenLine, ChevronRight, X, Accessibility } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getMoonPhase, getPlanetaryDayRuler, getWuxingPhase } from '@/lib/astro-calc'
import { getSunSignForMode } from '@/lib/astro-engine'
import { getVoidOfCourseMoon } from '@/lib/astro-engine'
import { getTodaysDailyReading, listTodaysActivity } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import type { Reading, BaseEntity } from '@grimoire/core'
import { getBookmarks } from '@/lib/bookmarks-store'
import { useEngineStore } from '@/stores/engine'
import { useReadingStore } from '@/stores/reading'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'
import { loadTraditionSettings, resolveDisplayName } from '@/lib/tradition-store'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const deckById = new Map(BUILT_IN_DECK_FILTERS.map(d => [d.id, d]))

// ─── Root page ────────────────────────────────────────────────────────────────

function HomePage() {
  const navigate  = useNavigate()
  const { engine } = useEngineStore()
  const reset = useReadingStore(s => s.reset)
  const spreadById = useSpreadById()

  const [dailyReading,  setDailyReading]  = useState<Reading | null | undefined>(undefined)
  const [todayReadings, setTodayReadings] = useState<Reading[]>([])
  const [todayEntries,  setTodayEntries]  = useState<JournalEntry[]>([])
  const [bookmarks,     setBookmarks]     = useState<string[]>([])
  const [bookmarkNames, setBookmarkNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getTodaysDailyReading()
      .then(r => setDailyReading(r))
      .catch(() => setDailyReading(null))

    listTodaysActivity()
      .then(({ readings, entries }) => {
        setTodayReadings(readings)
        setTodayEntries(entries)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const bms = getBookmarks()
    setBookmarks(bms)
  }, [])

  useEffect(() => {
    if (!engine || bookmarks.length === 0) return
    const { primaryBySystem } = loadTraditionSettings()
    Promise.all(
      bookmarks.map(cn =>
        engine.adapter.getEntityByCanonicalName(cn)
          .then(e => e ? [cn, resolveDisplayName(e, primaryBySystem)] as const : null)
      )
    ).then(results => {
      const map = new Map<string, string>()
      for (const r of results) { if (r) map.set(r[0], r[1]) }
      setBookmarkNames(map)
    }).catch(console.error)
  }, [engine, bookmarks])

  const today = new Date()
  const label = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const startReading = () => { reset(); navigate({ to: '/read' }) }

  // Non-daily today's activity (excluding the daily reading)
  const activityReadings = todayReadings.filter(r => !r.isDaily)
  const hasActivity = activityReadings.length > 0 || todayEntries.length > 0

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* First-run welcome banner */}
      <WelcomeBanner />
      <AccessibilityBanner />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.04em', margin: 0 }}>Grimoire Atziluth</h1>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>{label}</div>
        </div>
        <Button size="sm" onClick={startReading}><BookOpen size={14} /> Start Reading</Button>
      </div>

      {/* Daily context row */}
      <DailyContextRow date={today} />

      {/* Daily reading */}
      <DailyReadingSection reading={dailyReading} engine={engine ?? null} />

      {/* Today's activity */}
      {hasActivity && (
        <HomeSection label="Today's Activity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activityReadings.map(r => (
              <ActivityItem
                key={r.id}
                icon={<BookMarked size={13} />}
                label={spreadById.get(r.spreadId ?? '')?.displayName ?? 'Free Reading'}
                sub={deckById.get(r.deckId)?.displayName}
                onClick={() => navigate({ to: '/journal' })}
              />
            ))}
            {todayEntries.map(e => (
              <ActivityItem
                key={e.id}
                icon={<PenLine size={13} />}
                label={e.title ?? 'Journal Entry'}
                onClick={() => navigate({ to: '/journal' })}
              />
            ))}
          </div>
        </HomeSection>
      )}

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <HomeSection label="Bookmarks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {bookmarks.map(cn => (
              <ActivityItem
                key={cn}
                icon={<Star size={13} style={{ color: 'var(--color-accent)' }} />}
                label={bookmarkNames.get(cn) ?? cn}
                onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
              />
            ))}
          </div>
        </HomeSection>
      )}
    </div>
  )
}

// ─── First-run welcome banner ──────────────────────────────────────────────────

const ONBOARDED_KEY = 'grimoire:onboarded'

function WelcomeBanner() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(() => !localStorage.getItem(ONBOARDED_KEY))

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(ONBOARDED_KEY, '1')
    setVisible(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 16px', marginBottom: '24px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-accent-muted)',
      borderRadius: '8px', fontSize: '13px',
    }}>
      <div style={{ flex: 1, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>Welcome to Grimoire Atziluth.</span>
        {' '}All tradition systems are active by default — every attribution, link, and symbol is visible from day one.
        {' '}Visit{' '}
        <button
          type="button"
          onClick={() => { dismiss(); navigate({ to: '/settings/traditions' }) }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', fontSize: 'inherit' }}
        >
          Settings → Traditions
        </button>
        {' '}to focus on specific systems.
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-subtle)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── First-run accessibility banner ─────────────────────────────────────────────

const ACCESSIBILITY_PROMPTED_KEY = 'grimoire:accessibility-prompted'

function AccessibilityBanner() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(() => !localStorage.getItem(ACCESSIBILITY_PROMPTED_KEY))

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(ACCESSIBILITY_PROMPTED_KEY, '1')
    setVisible(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 16px', marginBottom: '24px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-accent-muted)',
      borderRadius: '8px', fontSize: '13px',
    }}>
      <Accessibility size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>Accessibility options are available.</span>
        {' '}Colour-vision filters, dyslexia-friendly font, reduced motion, larger text, and other display preferences can be set up any time in{' '}
        <button
          type="button"
          onClick={() => { dismiss(); navigate({ to: '/settings/accessibility' }) }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-accent)', fontSize: 'inherit' }}
        >
          Settings → Accessibility
        </button>
        .
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-subtle)', flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Daily context ─────────────────────────────────────────────────────────────

function DailyContextRow({ date }: { date: Date }) {
  const navigate = useNavigate()
  const { astrologyMode } = loadTraditionSettings()
  const moon   = getMoonPhase(date)
  const ruler  = getPlanetaryDayRuler(date)
  const sun    = getSunSignForMode(date, astrologyMode)
  const wuxing = getWuxingPhase(date)
  const voc    = getVoidOfCourseMoon(date)

  const chip = (label: string, sub: string, cn?: string) => {
    const inner = (
      <>
        <div style={{ fontSize: '16px', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub}</div>
      </>
    )
    const sharedStyle = {
      padding: '10px 14px', background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)', borderRadius: '6px',
      flex: '1 1 100px', transition: 'border-color 0.15s',
    }
    if (cn) {
      return (
        <button
          key={label}
          type="button"
          onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
          style={{ ...sharedStyle, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'block' }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)' }}
        >
          {inner}
        </button>
      )
    }
    return <div key={label} style={{ ...sharedStyle, cursor: 'default' }}>{inner}</div>
  }

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {chip(`${ruler.symbol} ${ruler.name}`, 'Day ruler', ruler.canonicalName)}
        {chip(`${moon.emoji} ${moon.name}`, `${moon.illumination}% illuminated`, moon.canonicalName)}
        {chip(`${sun.symbol} ${sun.name}`, 'Sun sign', sun.canonicalName)}
        {chip(`${wuxing.nameZh} ${wuxing.name}`, wuxing.season + ' season', wuxing.canonicalName)}
        {voc.isVoid && chip('☽ v/c', `${voc.degreesRemaining.toFixed(1)}° to ingress`)}
      </div>
    </div>
  )
}

// ─── Daily reading section ─────────────────────────────────────────────────────

function DailyReadingSection({ reading, engine }: { reading: Reading | null | undefined; engine: { adapter: { getEntityByCanonicalName: (cn: string) => Promise<BaseEntity | null> } } | null }) {
  const navigate = useNavigate()
  const [cardNames, setCardNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!reading || !engine) return
    const { primaryBySystem } = loadTraditionSettings()
    Promise.all(
      reading.cards.map(c =>
        engine.adapter.getEntityByCanonicalName(c.cardCanonicalName)
          .then(e => [c.cardCanonicalName, e ? resolveDisplayName(e, primaryBySystem) : c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName] as const)
      )
    ).then(pairs => setCardNames(new Map(pairs))).catch(console.error)
  }, [reading, engine])

  return (
    <HomeSection label="Daily Reading">
      {reading === undefined && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      )}
      {reading === null && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
          No daily reading yet — it will appear here shortly after the app loads.
        </div>
      )}
      {reading && (
        <button
          type="button"
          onClick={() => navigate({ to: '/journal' })}
          aria-label="View daily reading in journal"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            cursor: 'pointer', padding: '14px 16px',
            background: 'var(--color-surface-2)', borderRadius: '8px',
            border: '1px solid var(--color-border)',
            transition: 'border-color 0.15s',
            width: '100%', fontFamily: 'inherit', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--color-border)' }}
        >
          {/* Card placeholder art */}
          <div style={{
            width: 48, height: 76, flexShrink: 0, borderRadius: '4px',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: 'var(--color-accent)',
          }}>
            🂠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {reading.cards.map((c, i) => {
              const label = cardNames.get(c.cardCanonicalName) ?? c.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ') ?? c.cardCanonicalName
              return (
                <div key={i} style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>
                  {label}
                  {c.orientation === 'reversed' && <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: '6px' }}>↓ Reversed</span>}
                </div>
              )
            })}
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {deckById.get(reading.deckId)?.displayName ?? reading.deckId}
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
        </button>
      )}
    </HomeSection>
  )
}

// ─── Shared layout helpers ─────────────────────────────────────────────────────

function HomeSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function ActivityItem({ icon, label, sub, onClick }: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)', borderRadius: '6px',
        cursor: 'pointer', transition: 'border-color 0.15s',
        width: '100%', fontFamily: 'inherit', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <span style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{label}</span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '4px' }}>{sub}</span>}
      <ChevronRight size={13} style={{ color: 'var(--color-text-subtle)', marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  )
}
