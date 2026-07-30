import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { saveNatalChart, updateNatalChart, getNatalChartById, listNatalCharts } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { loadSettings } from '@/lib/settings-store'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { LocationInput } from '@/components/ui/LocationInput'
import type { LocationValue } from '@/components/ui/LocationInput'
import { Toast } from '@/components/ui/Toast'

export const Route = createFileRoute('/astrology/new')({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === 'string' ? s.edit : undefined,
  }),
  component: NewChartPage,
})

/**
 * A quiet nod for anyone who enters one of these exact birth dates — no
 * explanation, no theme tied to it, just the line itself. Every figure here
 * is someone the app's own content already points at directly (a credited
 * deck artist/author, a deck's namesake, or the tradition behind attributions
 * used throughout), so trying their birthday is a natural thing for a
 * practitioner to think of, not something stumbled into by chance.
 */
const NATAL_CHART_EASTER_EGGS: Record<string, string> = {
  '1875-10-12': 'Do what thou wilt.',
  '1878-02-16': 'Pixie signed her work quietly. So does this.',
  '1857-10-02': 'Every card in this deck bears his name too.',
  '1738-09-01': 'The first to read these cards as a system of their own.',
  '1854-01-08': 'Founder of an Order this app owes a great deal to.',
  '1772-05-27': 'Court fortune-teller to an Empress.',
}

function NewChartPage() {
  const navigate  = useNavigate()
  const { edit }  = Route.useSearch()

  const [name,     setName]    = useState('')
  const [date,     setDate]    = useState('')
  const [time,     setTime]    = useState('')
  const [location, setLocation] = useState<LocationValue>({ label: '', lat: '', lon: '', timezone: '' })
  const [notes,    setNotes]   = useState('')
  const [isSelf,   setIsSelf]  = useState(false)
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState<string | null>(null)
  const [existingSelfChart, setExistingSelfChart] = useState<NatalChartRecord | null>(null)
  const [secretToastMessage, setSecretToastMessage] = useState<string | null>(null)

  // Track whether another chart already holds the "self" flag, so checking the
  // box here can warn that it will take over that role.
  useEffect(() => {
    listNatalCharts().then(charts => {
      const other = charts.find(c => c.isSelf && c.id !== edit)
      setExistingSelfChart(other ?? null)
    }).catch(console.error)
  }, [edit])

  // Load existing chart if editing
  useEffect(() => {
    if (edit) {
      getNatalChartById(edit).then(chart => {
        if (!chart) return
        setName(chart.name)
        setDate(chart.birthDate)
        setTime(chart.birthTime ?? '')
        setLocation({
          label:    chart.birthLocationLabel ?? '',
          lat:      chart.birthLat?.toString() ?? '',
          lon:      chart.birthLon?.toString() ?? '',
          timezone: chart.birthTimezone ?? '',
        })
        setNotes(chart.notes)
        setIsSelf(chart.isSelf)
      }).catch(console.error)
    }
  }, [edit])

  // Pre-fill location from settings
  useEffect(() => {
    if (!edit) {
      const settings = loadSettings()
      if (settings.homeLocation) {
        setLocation({
          label:    settings.homeLocation.label,
          lat:      settings.homeLocation.lat.toString(),
          lon:      settings.homeLocation.lon.toString(),
          timezone: settings.homeLocation.timezone,
        })
      }
    }
  }, [])

  const handleSave = async () => {
    if (!name.trim() || !date) return
    setSaving(true)
    setError(null)
    try {
      const input: Omit<NatalChartRecord, 'id' | 'createdAt'> = {
        name: name.trim(),
        birthDate: date,
        birthTime: time || null,
        birthLat: location.lat ? parseFloat(location.lat) : null,
        birthLon: location.lon ? parseFloat(location.lon) : null,
        birthLocationLabel: location.label.trim() || null,
        birthTimezone: location.timezone.trim() || null,
        notes: notes.trim(),
        isSelf,
      }
      let targetId: string
      if (edit) {
        await updateNatalChart(edit, input)
        targetId = edit
      } else {
        const chart = await saveNatalChart(input)
        targetId = chart.id
      }

      const secretMessage = NATAL_CHART_EASTER_EGGS[date]
      if (secretMessage) {
        setSecretToastMessage(secretMessage)
        setTimeout(() => navigate({ to: '/astrology/$id', params: { id: targetId } }), 1800)
      } else {
        navigate({ to: '/astrology/$id', params: { id: targetId } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  }
  const label = (text: string) => (
    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
      {text}
    </label>
  )

  return (
    <div style={{ maxWidth: '560px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '24px' }}>
        {edit ? 'Edit Chart' : 'New Natal Chart'}
      </h1>

      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          {label('Name')}
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Self, or a person's name" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <input
              type="checkbox"
              checked={isSelf}
              onChange={e => setIsSelf(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
            />
            This is my own natal chart
          </label>
        </div>

        {isSelf && existingSelfChart && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', padding: '8px 12px', background: 'var(--color-surface-1)', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '-8px' }}>
            "{existingSelfChart.name}" is currently your self chart. Saving will replace it with this one.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            {label('Birth Date')}
            <DateInput value={date} onChange={setDate} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div>
            {label('Birth Time (optional)')}
            <input type="time" value={time} onChange={e => setTime(e.target.value)} placeholder="HH:MM" style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
        </div>

        <LocationInput value={location} onChange={setLocation} inputStyle={inputStyle} />

        {(!location.lat || !location.lon) && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', padding: '8px 12px', background: 'var(--color-surface-1)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            Without coordinates, houses cannot be calculated. Planet positions will still be shown.
          </div>
        )}

        <div>
          {label('Notes')}
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="Optional notes…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(196,74,74,0.1)', border: '1px solid var(--color-danger)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !date}>
            {saving ? 'Saving…' : edit ? 'Save Changes' : 'Create Chart'}
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: '/astrology' })}>Cancel</Button>
        </div>
      </div>

      {secretToastMessage && <Toast message={secretToastMessage} />}
    </div>
  )
}
