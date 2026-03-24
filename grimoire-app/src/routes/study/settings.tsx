import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import {
  getSettings, saveSettings, exportQuizData, importQuizData,
  DEFAULT_SETTINGS,
} from '@/lib/quiz-db'
import type { QuizSettings, QuestionMode } from '@/lib/quiz-db'
import { QUESTION_TYPE_DEFS, ENTITY_TYPE_LABELS } from '@/lib/quiz-engine'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Download, Upload } from 'lucide-react'

export const Route = createFileRoute('/study/settings')({
  component: StudySettingsPage,
})


function StudySettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<QuizSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const save = useCallback(async (next: QuizSettings) => {
    setSettings(next)
    await saveSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [])

  const toggleMode = (mode: QuestionMode) => {
    if (!settings) return
    const has = settings.enabledModes.includes(mode)
    if (has && settings.enabledModes.length === 1) return  // keep at least one
    const next = has
      ? settings.enabledModes.filter(m => m !== mode)
      : [...settings.enabledModes, mode]
    save({ ...settings, enabledModes: next })
  }

  const toggleEntityType = (et: string) => {
    if (!settings) return
    const has = settings.enabledEntityTypes.includes(et)
    const next = has
      ? settings.enabledEntityTypes.filter(t => t !== et)
      : [...settings.enabledEntityTypes, et]
    save({ ...settings, enabledEntityTypes: next })
  }

  const toggleQuestionType = (entityType: string, key: string) => {
    if (!settings) return
    const current = settings.enabledQuestionTypes[entityType] ?? []
    const has = current.includes(key)
    const next = has ? current.filter(k => k !== key) : [...current, key]
    save({ ...settings, enabledQuestionTypes: { ...settings.enabledQuestionTypes, [entityType]: next } })
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
        const fresh = await getSettings()
        setSettings(fresh)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch {
        setImportError('Invalid file format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!settings) return <div style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Loading…</div>

  const allEntityTypes = Object.keys(ENTITY_TYPE_LABELS)

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
          <ArrowLeft size={13} /> Study
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Study Settings</h1>
        {saved && <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: 'auto' }}>Saved</span>}
      </div>

      {/* Session settings */}
      <Section label="Session">
        <Row label="Cards per session">
          <input
            type="number" min={1} max={500} value={settings.sessionSize}
            onChange={e => save({ ...settings, sessionSize: Math.max(1, parseInt(e.target.value) || 1) })}
            style={inputStyle}
          />
        </Row>
        <Row label="Multiple-choice options">
          <input
            type="number" min={2} max={8} value={settings.multipleChoiceCount}
            onChange={e => save({ ...settings, multipleChoiceCount: Math.max(2, parseInt(e.target.value) || 2) })}
            style={inputStyle}
          />
        </Row>
        <Row label="Include user-created cards">
          <Toggle on={settings.includeUserCards} onToggle={() => save({ ...settings, includeUserCards: !settings.includeUserCards })} />
        </Row>
      </Section>

      {/* Question modes */}
      <Section label="Question Modes">
        {([
          ['flashcard',         'Flashcard — flip to reveal answer'],
          ['multiple-choice',   'Multiple Choice — pick from options'],
          ['fill-in-blank',     'Fill in the Blank — type the answer'],
          ['image-recognition', 'Image Recognition — identify from visual'],
        ] as [QuestionMode, string][]).map(([mode, desc]) => (
          <div key={mode} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
              <span style={{ fontSize: '13px', color: settings.enabledModes.includes(mode) ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {mode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <Toggle on={settings.enabledModes.includes(mode)} onToggle={() => toggleMode(mode)} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', paddingRight: '44px' }}>{desc}</div>
          </div>
        ))}
      </Section>

      {/* Entity types + fields */}
      <Section label="Entity Types & Fields">
        {allEntityTypes.map(et => {
          const enabled    = settings.enabledEntityTypes.includes(et)
          const defs       = QUESTION_TYPE_DEFS[et] ?? []
          const enabledKeys = settings.enabledQuestionTypes[et] ?? []
          return (
            <div key={et} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? '8px' : 0 }}>
                <span style={{ fontSize: '13px', color: enabled ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                  {ENTITY_TYPE_LABELS[et] ?? et}
                </span>
                <Toggle on={enabled} onToggle={() => toggleEntityType(et)} />
              </div>
              {enabled && defs.length > 0 && (
                <div style={{ paddingLeft: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {defs.map(def => {
                    const active = enabledKeys.includes(def.key)
                    return (
                      <button
                        key={def.key}
                        onClick={() => toggleQuestionType(et, def.key)}
                        style={{
                          padding: '4px 10px', fontSize: '11px', fontFamily: 'inherit',
                          border: '1px solid', borderRadius: '4px', cursor: 'pointer',
                          borderColor: active ? 'var(--color-accent-muted)' : 'var(--color-border)',
                          background: active ? 'rgba(180,156,90,0.1)' : 'transparent',
                          color: active ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                        }}
                      >
                        {def.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Section>

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
          {importError && (
            <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{importError}</span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
          Exports all SM-2 card state, settings, and last result. Import merges into current data.
        </div>
      </Section>

      {/* Reset */}
      <div style={{ marginTop: '8px' }}>
        <button
          onClick={() => { if (confirm('Reset all settings to defaults?')) save(structuredClone(DEFAULT_SETTINGS)) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', padding: 0, fontFamily: 'inherit' }}
        >
          Reset settings to defaults
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', padding: 0,
        background: on ? 'var(--color-accent)' : 'var(--color-border)', position: 'relative', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '3px', left: on ? '19px' : '3px',
        transition: 'left 0.15s',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '70px', padding: '6px 10px', textAlign: 'right',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none',
}
