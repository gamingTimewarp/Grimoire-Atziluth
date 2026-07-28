import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Settings2, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useEngineStore } from '@/stores/engine'
import { useStudyStore } from '@/stores/study'
import { getAllStudyPresets, getAllCardStates, saveStudyPreset } from '@/lib/quiz-db'
import type { StudyPreset } from '@/lib/quiz-db'
import { buildSession, countDueCards } from '@/lib/quiz-engine'
import { useEntityTypeDiscovery } from '@/lib/quiz-discovery-hooks'
import { StudySettingsFields } from '@/components/ui/StudySettingsFields'

export const Route = createFileRoute('/study/new')({
  component: NewSessionPage,
})

function newId() {
  return `study-preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function NewSessionPage() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const { step, activePreset, sessionConfig, choosePreset, updateOneTimeConfig, startSession } = useStudyStore()

  const [presets, setPresets]   = useState<StudyPreset[]>([])
  const [loading, setLoading]   = useState(true)
  const [customizing, setCustomizing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [dueCount, setDueCount] = useState<{ due: number; total: number } | null>(null)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')

  // A session already in progress resumes directly instead of showing the
  // picker again — mirrors /read redirecting to /read/draw. (A 'complete' step
  // never lingers here: the complete screen resets the store before returning.)
  useEffect(() => {
    if (step === 'session') navigate({ to: '/study/session' })
  }, [step, navigate])

  // Blank has nothing to show without the customizer open — jump straight
  // into it rather than making the user notice and click "Customize" first.
  useEffect(() => {
    if (activePreset?.isBlank) setCustomizing(true)
  }, [activePreset])

  useEffect(() => {
    getAllStudyPresets().then(list => {
      setPresets(list)
      setLoading(false)
      if (!activePreset) {
        // Blank first: a brand-new custom preset should start from nothing,
        // not a silent copy of Default's choices — Default is always right
        // there in the list if that's what's actually wanted.
        const def = list.find(p => p.isBlank) ?? list.find(p => p.isDefault) ?? list[0]
        if (def) choosePreset(def)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const discovery = useEntityTypeDiscovery(engine?.adapter ?? null, sessionConfig?.enabledEntityTypes ?? [])

  useEffect(() => {
    if (!engine || !sessionConfig) return
    getAllCardStates().then(states => countDueCards(engine.adapter, sessionConfig, states)).then(setDueCount)
  }, [engine, sessionConfig])

  const handleSelectPreset = (p: StudyPreset) => {
    choosePreset(p)
    setCustomizing(false)
    setShowSaveAs(false)
  }

  const handleStart = async () => {
    if (!engine || !sessionConfig) return
    setStarting(true)
    try {
      const states = await getAllCardStates()
      const cards = await buildSession(engine.adapter, sessionConfig, states)
      startSession(cards)
      navigate({ to: '/study/session' })
    } finally {
      setStarting(false)
    }
  }

  const handleUpdatePreset = async () => {
    if (!activePreset || !sessionConfig || activePreset.isDefault || activePreset.isBlank) return
    const updated: StudyPreset = { ...activePreset, settings: sessionConfig, updatedAt: new Date().toISOString() }
    await saveStudyPreset(updated)
    setPresets(prev => prev.map(p => p.id === updated.id ? updated : p))
    choosePreset(updated)
  }

  const handleSaveAsNew = async () => {
    if (!sessionConfig || !saveAsName.trim()) return
    const now = new Date().toISOString()
    const created: StudyPreset = {
      id: newId(),
      displayName: saveAsName.trim(),
      description: '',
      settings: sessionConfig,
      isDefault: false,
      isBlank: false,
      createdAt: now,
      updatedAt: now,
    }
    await saveStudyPreset(created)
    setPresets(prev => [...prev, created])
    choosePreset(created)
    setShowSaveAs(false)
    setSaveAsName('')
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
    borderRadius: '5px', color: 'var(--color-text)', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/study' })}>
            <ArrowLeft size={14} /> Study
          </Button>
          <h1 style={{ fontSize: '20px', fontWeight: 300, margin: 0 }}>New Session</h1>
        </div>
        <button
          onClick={() => navigate({ to: '/study/presets' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}
        >
          <Settings2 size={12} /> Manage presets
        </button>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Choose a preset</div>
      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {presets.map(p => (
            <Card key={p.id} onClick={() => handleSelectPreset(p)} selected={activePreset?.id === p.id}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px' }}>
                {p.displayName}
                {p.isDefault && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-accent)' }}>Default</span>}
                {p.isBlank && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>Blank</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{p.description}</div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                {p.settings.sessionSize} cards · {p.settings.enabledEntityTypes.length} entity type{p.settings.enabledEntityTypes.length !== 1 ? 's' : ''}
              </div>
            </Card>
          ))}
        </div>
      )}

      {sessionConfig && (
        <>
          <button
            onClick={() => setCustomizing(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent)', fontFamily: 'inherit', padding: 0, marginBottom: '16px', display: 'block' }}
          >
            {customizing ? 'Hide customization' : 'Customize for this session only'}
          </button>

          {customizing && (
            <div style={{ marginBottom: '20px' }}>
              <StudySettingsFields settings={sessionConfig} onChange={updateOneTimeConfig} discovery={discovery} />

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '-6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                  Changes here apply to this session only, unless saved below.
                </span>
                {activePreset && !activePreset.isDefault && !activePreset.isBlank && (
                  <Button variant="ghost" size="sm" onClick={handleUpdatePreset}>
                    Update "{activePreset.displayName}"
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowSaveAs(v => !v)}>
                  Save as New Preset…
                </Button>
              </div>

              {showSaveAs && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={saveAsName}
                    onChange={e => setSaveAsName(e.target.value)}
                    placeholder="Preset name…"
                    autoFocus
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <Button size="sm" onClick={handleSaveAsNew} disabled={!saveAsName.trim()}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSaveAs(false)}>Cancel</Button>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '20px 22px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {activePreset?.isBlank ? (
              <>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Blank has no entity types selected yet — customize it above, then save as a new preset to study with it.
                </div>
                <Button disabled>
                  <PlayCircle size={15} /> Start Session
                </Button>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 300, color: dueCount && dueCount.due > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)', lineHeight: 1 }}>
                    {dueCount?.due ?? '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                    due · {dueCount?.total ?? 0} total
                  </div>
                </div>
                <Button onClick={handleStart} disabled={starting || !dueCount || dueCount.due === 0}>
                  <PlayCircle size={15} /> {starting ? 'Starting…' : 'Start Session'}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
