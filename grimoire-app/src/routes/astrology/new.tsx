import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { saveNatalChart, updateNatalChart, getNatalChartById } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { loadSettings } from '@/lib/settings-store'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'

export const Route = createFileRoute('/astrology/new')({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === 'string' ? s.edit : undefined,
  }),
  component: NewChartPage,
})

function NewChartPage() {
  const navigate  = useNavigate()
  const { edit }  = Route.useSearch()

  const [name,     setName]    = useState('')
  const [date,     setDate]    = useState('')
  const [time,     setTime]    = useState('')
  const [lat,      setLat]     = useState('')
  const [lon,      setLon]     = useState('')
  const [locLabel, setLocLabel] = useState('')
  const [notes,    setNotes]   = useState('')
  const [isSelf,   setIsSelf]  = useState(false)
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState<string | null>(null)

  // Load existing chart if editing
  useEffect(() => {
    if (edit) {
      getNatalChartById(edit).then(chart => {
        if (!chart) return
        setName(chart.name)
        setDate(chart.birthDate)
        setTime(chart.birthTime ?? '')
        setLat(chart.birthLat?.toString() ?? '')
        setLon(chart.birthLon?.toString() ?? '')
        setLocLabel(chart.birthLocationLabel ?? '')
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
        setLat(settings.homeLocation.lat.toString())
        setLon(settings.homeLocation.lon.toString())
        setLocLabel(settings.homeLocation.label)
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
        birthLat: lat ? parseFloat(lat) : null,
        birthLon: lon ? parseFloat(lon) : null,
        birthLocationLabel: locLabel.trim() || null,
        notes: notes.trim(),
        isSelf,
      }
      if (edit) {
        await updateNatalChart(edit, input)
        navigate({ to: '/astrology/$id', params: { id: edit } })
      } else {
        const chart = await saveNatalChart(input)
        navigate({ to: '/astrology/$id', params: { id: chart.id } })
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

        <div>
          {label('Birth Location Label')}
          <input value={locLabel} onChange={e => setLocLabel(e.target.value)} placeholder="e.g. London, UK" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            {label('Latitude')}
            <input value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 51.5074" style={inputStyle} />
          </div>
          <div>
            {label('Longitude')}
            <input value={lon} onChange={e => setLon(e.target.value)} placeholder="e.g. -0.1278" style={inputStyle} />
          </div>
        </div>

        {(!lat || !lon) && (
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
    </div>
  )
}
