import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw, ArrowLeft } from 'lucide-react'
import { loadHomeWidgetConfig, saveHomeWidgetConfig, resetHomeWidgetConfig } from '@/lib/home-widgets-store'
import type { HomeWidgetConfig } from '@/lib/home-widgets-store'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/settings/home-widgets')({
  component: HomeWidgetsSettingsPage,
})

const ITEM_LABELS: Record<string, string> = {
  'daily-reading':     'Daily Reading',
  'day-info':          'Day Info',
  'todays-activity':   "Today's Activity",
  'bookmarks':         'Bookmarks',
  'mini-moon':         'Moon',
  'retrograde':        'Retrograde',
  'statistics':        'Statistics',
  'study':             'Study',
  'upcoming-holidays': 'Upcoming Holidays & Sabbats',
  'natal-transits':    'Natal Transits',
  'on-this-day':       'On This Day',
  'recently-viewed':   'Recently Viewed',
  'discover':          'Discover',
}

function HomeWidgetsSettingsPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<HomeWidgetConfig[]>(() => loadHomeWidgetConfig())

  const persist = (next: HomeWidgetConfig[]) => {
    setConfig(next)
    saveHomeWidgetConfig(next)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...config]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    persist(next)
  }

  const moveDown = (index: number) => {
    if (index === config.length - 1) return
    const next = [...config]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    persist(next)
  }

  const toggleVisible = (index: number) => {
    const next = config.map((c, i) => i === index ? { ...c, visible: !c.visible } : c)
    persist(next)
  }

  const handleReset = () => {
    setConfig(resetHomeWidgetConfig())
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Home Widgets</h1>
        <button
          onClick={handleReset}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-subtle)', padding: '4px 0' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <RotateCcw size={12} /> Reset to defaults
        </button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Reorder or show/hide widgets on the Home page. Changes take effect immediately. Some
        widgets (Today's Activity, Bookmarks, Natal Transits, On This Day, Recently Viewed) only
        appear on Home when they actually have something to show.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {config.map((item, index) => {
          const label = ITEM_LABELS[item.id] ?? item.id
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', marginBottom: '4px',
                background: item.visible ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                opacity: item.visible ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  style={{ background: 'none', border: 'none', padding: '1px', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'var(--color-border)' : 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === config.length - 1}
                  style={{ background: 'none', border: 'none', padding: '1px', cursor: index === config.length - 1 ? 'default' : 'pointer', color: index === config.length - 1 ? 'var(--color-border)' : 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)' }}>
                {label}
              </span>

              <button
                onClick={() => toggleVisible(index)}
                title={item.visible ? 'Hide from Home' : 'Show on Home'}
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', color: item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
                onMouseEnter={e => { e.currentTarget.style.color = item.visible ? 'var(--color-text)' : 'var(--color-accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
              >
                {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
