import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type ComponentType } from 'react'
import { BookOpen, X, Accessibility, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useReadingStore } from '@/stores/reading'
import { loadHomeWidgetConfig } from '@/lib/home-widgets-store'
import { DailyReadingWidget } from '@/components/widgets/DailyReadingWidget'
import { DayInfoWidget } from '@/components/widgets/DayInfoWidget'
import { TodaysActivityWidget } from '@/components/widgets/TodaysActivityWidget'
import { BookmarksWidget } from '@/components/widgets/BookmarksWidget'
import { MiniMoonWidget } from '@/components/widgets/MiniMoonWidget'
import { RetrogradeWidget } from '@/components/widgets/RetrogradeWidget'
import { StatisticsWidget } from '@/components/widgets/StatisticsWidget'
import { StudyWidget } from '@/components/widgets/StudyWidget'
import { UpcomingHolidaysWidget } from '@/components/widgets/UpcomingHolidaysWidget'
import { NatalTransitsWidget } from '@/components/widgets/NatalTransitsWidget'
import { OnThisDayWidget } from '@/components/widgets/OnThisDayWidget'
import { RecentlyViewedWidget } from '@/components/widgets/RecentlyViewedWidget'
import { DiscoverWidget } from '@/components/widgets/DiscoverWidget'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// ─── Widget registry ────────────────────────────────────────────────────────
// The direct analog of Sidebar.tsx's NAV_MAP: home-widgets-store.ts owns the
// persisted order/visibility (ids only), this maps each id to the component
// that actually renders it.

const HOME_WIDGET_DEFS: Record<string, ComponentType> = {
  'daily-reading':     DailyReadingWidget,
  'day-info':          DayInfoWidget,
  'todays-activity':   TodaysActivityWidget,
  'bookmarks':         BookmarksWidget,
  'mini-moon':         MiniMoonWidget,
  'retrograde':        RetrogradeWidget,
  'statistics':        StatisticsWidget,
  'study':             StudyWidget,
  'upcoming-holidays': UpcomingHolidaysWidget,
  'natal-transits':    NatalTransitsWidget,
  'on-this-day':       OnThisDayWidget,
  'recently-viewed':   RecentlyViewedWidget,
  'discover':          DiscoverWidget,
}

// ─── Root page ────────────────────────────────────────────────────────────────

function HomePage() {
  const navigate = useNavigate()
  const reset = useReadingStore(s => s.reset)

  const [widgetIds, setWidgetIds] = useState<string[]>(() =>
    loadHomeWidgetConfig().filter(c => c.visible).map(c => c.id)
  )

  useEffect(() => {
    const handler = () => setWidgetIds(loadHomeWidgetConfig().filter(c => c.visible).map(c => c.id))
    window.addEventListener('grimoire:home-widgets-changed', handler)
    return () => window.removeEventListener('grimoire:home-widgets-changed', handler)
  }, [])

  const today = new Date()
  const label = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const startReading = () => { reset(); navigate({ to: '/read' }) }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* First-run welcome banners */}
      <WelcomeBanner />
      <AccessibilityBanner />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.04em', margin: 0 }}>Grimoire Atziluth</h1>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>{label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => navigate({ to: '/settings/home-widgets' })}
            title="Customise Home widgets"
            style={{
              display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px',
              cursor: 'pointer', border: '1px solid transparent', background: 'none',
              color: 'var(--color-text-subtle)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            <Settings2 size={16} />
          </button>
          <Button size="sm" onClick={startReading}><BookOpen size={14} /> Start Reading</Button>
        </div>
      </div>

      {/* Widgets, in configured order — see Settings -> Home Widgets */}
      {widgetIds.map(id => {
        const Widget = HOME_WIDGET_DEFS[id]
        return Widget ? <Widget key={id} /> : null
      })}
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
