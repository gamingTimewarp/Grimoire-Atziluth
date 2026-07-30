import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Pencil, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import {
  getAllStudyPresets, saveStudyPreset, deleteStudyPreset, getStudyPreset,
  getSessionHistoryForPreset, DEFAULT_PRESET_ID, DEFAULT_SETTINGS,
  BLANK_PRESET_ID, BLANK_SETTINGS,
  exportQuizData, importQuizData,
} from '@/lib/quiz-db'
import type { StudyPreset, QuizSettings, SessionHistoryEntry } from '@/lib/quiz-db'
import { useEntityTypeDiscovery } from '@/lib/quiz-discovery-hooks'
import { Section, StudySettingsFields } from '@/components/ui/StudySettingsFields'

export const Route = createFileRoute('/study/presets')({
  component: PresetsPage,
})

function newId() {
  return `study-preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Preset editor ──────────────────────────────────────────────────────────────

function PresetEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: StudyPreset | null
  onSave: (p: StudyPreset) => void
  onCancel: () => void
}) {
  const { engine } = useEngineStore()
  const [name, setName]         = useState(initial?.displayName ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [settings, setSettings] = useState<QuizSettings>(initial?.settings ?? structuredClone(DEFAULT_SETTINGS))
  const [error, setError]       = useState('')

  const discovery = useEntityTypeDiscovery(engine?.adapter ?? null, settings.enabledEntityTypes)

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    const now = new Date().toISOString()
    onSave({
      id:          initial?.id ?? newId(),
      displayName: initial?.isDefault ? initial.displayName : name.trim(),
      description: description.trim(),
      settings,
      isDefault:   initial?.isDefault ?? false,
      isBlank:     initial?.isBlank ?? false,
      isBuiltIn:   initial?.isBuiltIn ?? false,
      createdAt:   initial?.createdAt ?? now,
      updatedAt:   now,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ border: '1px solid var(--color-accent-muted)', borderRadius: '8px', padding: '20px', background: 'var(--color-surface-2)', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 400 }}>
        {initial ? `Edit ${initial.isDefault ? 'Default Preset' : initial.isBlank ? 'Blank Preset' : 'Preset'}` : 'New Preset'}
      </h3>

      {error && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '12px' }}>{error}</div>}

      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Name</label>
      <input
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        placeholder="e.g. Quick Tarot Drill"
        disabled={!!initial?.isDefault}
        autoFocus={!initial?.isDefault}
        style={{ ...inputStyle, marginBottom: '12px', opacity: initial?.isDefault ? 0.6 : 1 }}
      />
      {initial?.isDefault && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '-8px', marginBottom: '12px' }}>
          The Default preset's name can't be changed.
        </div>
      )}

      <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Description</label>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" style={{ ...inputStyle, marginBottom: '20px' }} />

      <StudySettingsFields settings={settings} onChange={setSettings} discovery={discovery} />

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={13} /> Save Preset
        </Button>
      </div>
    </div>
  )
}

// ─── Preset row (with expandable session history) ──────────────────────────────

function PresetRow({ preset, onEdit, onDelete }: {
  preset: StudyPreset
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory]   = useState<SessionHistoryEntry[] | null>(null)

  useEffect(() => {
    if (!expanded || history !== null) return
    getSessionHistoryForPreset(preset.id, 20).then(setHistory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  return (
    <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10px', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
            {preset.displayName}
            {preset.isDefault && <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>Default</span>}
            {preset.isBlank && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Blank</span>}
          </div>
          {preset.description && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', paddingLeft: '15px' }}>{preset.description}</div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', paddingLeft: '15px' }}>
            {preset.settings.sessionSize} cards/session · {preset.settings.enabledEntityTypes.length} entity type{preset.settings.enabledEntityTypes.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={onEdit}><Pencil size={12} /></Button>
          {!preset.isDefault && !preset.isBlank && (
            <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></Button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '10px', paddingLeft: '15px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Recent Sessions
          </div>
          {history === null ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>No sessions run with this preset yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {history.map((h, i) => {
                const pct = h.cardsReviewed > 0 ? Math.round((h.cardsCorrect / h.cardsReviewed) * 100) : 0
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{new Date(h.completedAt).toLocaleDateString()}</span>
                    <span style={{ color: 'var(--color-text-subtle)' }}>{h.cardsCorrect}/{h.cardsReviewed} · {pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function PresetsPage() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<StudyPreset[]>([])
  const [editing, setEditing] = useState<StudyPreset | null | 'new'>(null)
  const [loading, setLoading] = useState(true)
  const [importError, setImportError] = useState<string | null>(null)
  const [imported, setImported] = useState(false)

  // Built-in presets (BUILT_IN_PRESETS) are curated and non-editable — keep them
  // out of this list entirely so there's no edit/delete affordance for them at
  // all. They're still selectable to start a session from /study/new.
  const reload = () => getAllStudyPresets()
    .then(list => setPresets(list.filter(p => !p.isBuiltIn)))
    .finally(() => setLoading(false))
  useEffect(() => { reload() }, [])

  const handleSave = async (p: StudyPreset) => {
    await saveStudyPreset(p)
    setPresets(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]
    })
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this preset?')) return
    await deleteStudyPreset(id)
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  const handleResetDefault = async () => {
    if (!window.confirm('Reset the Default preset to its built-in configuration?')) return
    const current = await getStudyPreset(DEFAULT_PRESET_ID)
    if (!current) return
    const reset: StudyPreset = { ...current, settings: structuredClone(DEFAULT_SETTINGS), updatedAt: new Date().toISOString() }
    await handleSave(reset)
  }

  const handleResetBlank = async () => {
    if (!window.confirm('Reset the Blank preset back to empty?')) return
    const current = await getStudyPreset(BLANK_PRESET_ID)
    if (!current) return
    const reset: StudyPreset = { ...current, settings: structuredClone(BLANK_SETTINGS), updatedAt: new Date().toISOString() }
    await handleSave(reset)
  }

  const handleExport = async () => {
    const data = await exportQuizData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `grimoire-study-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        await importQuizData(data)
        await reload()
        setImported(true)
        setTimeout(() => setImported(false), 2000)
      } catch {
        setImportError('Invalid file format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
          <ArrowLeft size={14} /> Study
        </Button>
        <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0 }}>Study Presets</h1>
        {editing === null && (
          <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing('new')}>
            <Plus size={13} /> New Preset
          </Button>
        )}
      </div>

      {editing !== null && (
        <PresetEditor
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {presets.map(p => (
            <PresetRow key={p.id} preset={p} onEdit={() => setEditing(p)} onDelete={() => handleDelete(p.id)} />
          ))}
          {editing === null && (
            <Button variant="primary" size="sm" onClick={() => setEditing('new')} style={{ alignSelf: 'flex-start' }}>
              <Plus size={13} /> New Preset
            </Button>
          )}
        </div>
      )}

      {/* Export / Import */}
      <Section label="Export & Import">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export JSON
          </Button>
          <label
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              padding: '5px 12px', fontSize: '13px', fontFamily: 'inherit',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              background: 'transparent', color: 'var(--color-text-muted)',
            }}
          >
            <Upload size={13} /> Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          {imported && <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>Imported</span>}
          {importError && (
            <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{importError}</span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
          Exports all SM-2 card state, presets, session history, and last result. Import merges into current data.
        </div>
      </Section>

      <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handleResetDefault}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', padding: 0, fontFamily: 'inherit' }}
        >
          Reset Default preset to built-in configuration
        </button>
        <button
          onClick={handleResetBlank}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', padding: 0, fontFamily: 'inherit' }}
        >
          Reset Blank preset to empty
        </button>
      </div>
    </div>
  )
}
