import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { loadSettings, patchSettings } from '@/lib/settings-store'
import { CALENDAR_TABS } from '@/lib/calendar-systems'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, CalendarDays, Check } from 'lucide-react'

export const Route = createFileRoute('/settings/calendar')({
  component: CalendarSettingsPage,
})

function CalendarSettingsPage() {
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(() => loadSettings().enabledCalendarSystems)
  const [saved, setSaved] = useState(false)

  const toggle = (id: string) => {
    const next = enabled.includes(id) ? enabled.filter(x => x !== id) : [...enabled, id]
    setEnabled(next)
    patchSettings({ enabledCalendarSystems: next })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={14} /> Settings
      </Button>

      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '8px' }}>Calendar Tabs</h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Choose which lunar/lunisolar calendars appear as tabs on the Calendar page, alongside the
        always-available Gregorian tab.
      </p>

      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <CalendarDays size={15} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Available calendars</span>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-accent)', marginLeft: '8px' }}>
              <Check size={12} /> Saved
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {CALENDAR_TABS.map(tab => (
            <label
              key={tab.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none',
                padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: '6px',
              }}
            >
              <input
                type="checkbox"
                checked={enabled.includes(tab.id)}
                onChange={() => toggle(tab.id)}
                style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
              />
              <span style={{ fontSize: '14px' }}>{tab.emoji}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{tab.tabLabel}</span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '14px' }}>
          Each tab shows its own month/year navigation in that tradition's calendar system, with today
          highlighted and days clickable for detail — the same as the Gregorian view. You can also toggle
          tabs directly from the Calendar page.
        </p>
      </section>
    </div>
  )
}
