/**
 * record.tsx
 * Manual / physical-reading recorder.
 *
 * Lets the user record a tarot or oracle reading they performed offline:
 * choose a deck and spread, assign drawn cards to positions manually,
 * set the date and time, optionally attach an astrological snapshot, add
 * notes, and save to the journal — identical data shape as a digital reading.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useMemo, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import { BUILT_IN_DECK_FILTERS, BUILT_IN_SPREADS } from '@/lib/built-in-data'
import type { DeckFilter, SpreadDefinition } from '@/lib/built-in-data'
import { getAllCustomSpreads, spreadRecordToDefinition, getAllCustomDecks, deckRecordToFilter } from '@/lib/custom-db'
import { saveReading } from '@/lib/reading-db'
import { getNatalChart, ZODIAC_SIGNS_IAU } from '@/lib/astro-engine'
import { getHomeLocation } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'
import type { BaseEntity, CardOrientation, SpreadPosition } from '@grimoire/core'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichText'
import { ArrowLeft, Plus, X } from 'lucide-react'

export const Route = createFileRoute('/read/record')({
  component: RecordReadingPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatDeckOption {
  id: string
  label: string
  filter: DeckFilter
}

interface Assignment {
  uid: string
  entity: BaseEntity
  orientation: CardOrientation
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function newUid() { return crypto.randomUUID() }

function injectSpreadNames(spread: SpreadDefinition, astrologyMode: string): SpreadDefinition {
  if (spread.id === 'year-ahead') {
    const now = new Date()
    const startMonth = now.getMonth()
    const startYear = now.getFullYear()
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
    return {
      ...spread,
      positions: spread.positions.map((p, i) => {
        const d = new Date(startYear, startMonth + i, 1)
        const name = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
        return { ...p, name, meaning: `What ${name} holds for you.` }
      }),
    }
  }
  if (spread.id === 'zodiac-year' && astrologyMode === 'iau') {
    const oph = ZODIAC_SIGNS_IAU[8]
    const ophPos: SpreadPosition = {
      id: oph.canonicalName,
      name: oph.name,
      meaning: 'Ophiuchus — the serpent-bearer; healing, transformation, esoteric knowledge.',
      drawOrder: 9,
      orientationRule: 'upright-reversed',
      x: 0, y: 3, z: 0,
    }
    return {
      ...spread,
      positions: [
        ...spread.positions.slice(0, 8),
        ophPos,
        ...spread.positions.slice(8).map(p => ({ ...p, drawOrder: p.drawOrder + 1 })),
      ],
    }
  }
  return spread
}

// ─── Component ───────────────────────────────────────────────────────────────

function RecordReadingPage() {
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  // ── Setup state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<'setup' | 'record'>('setup')
  const [deckOptions, setDeckOptions] = useState<FlatDeckOption[]>([])
  const [allSpreads, setAllSpreads] = useState<SpreadDefinition[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [selectedSpreadId, setSelectedSpreadId] = useState('')

  // Resolved after "Continue"
  const [deckFilter, setDeckFilter] = useState<DeckFilter | null>(null)
  const [spread, setSpread] = useState<SpreadDefinition | null>(null)
  const [deckCards, setDeckCards] = useState<BaseEntity[]>([])

  // ── Record form state ────────────────────────────────────────────────────
  const [readingDate, setReadingDate] = useState(() => toLocalDatetimeString(new Date()))
  const [question, setQuestion] = useState('')
  const [subject, setSubject] = useState('self')
  const [notes, setNotes] = useState('')
  const [includeSnapshot, setIncludeSnapshot] = useState(false)

  // Fixed-position assignments: positionId → Assignment
  const [posAssignments, setPosAssignments] = useState<Map<string, Assignment>>(new Map())

  // Free-reading cards (isFree spreads)
  const [freeCards, setFreeCards] = useState<Assignment[]>([])
  const [addingFreeCard, setAddingFreeCard] = useState(false)

  // Clarifier cards (always available)
  const [clarifiers, setClarifiers] = useState<Assignment[]>([])
  const [addingClarifier, setAddingClarifier] = useState(false)

  // Save
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isFree = !spread || spread.positions.length === 0

  const sortedPositions = useMemo(() =>
    spread ? [...spread.positions].sort((a, b) => a.drawOrder - b.drawOrder) : [],
    [spread]
  )

  // ── Load custom decks + spreads ──────────────────────────────────────────
  useEffect(() => {
    const builtIn: FlatDeckOption[] = []
    for (const deck of BUILT_IN_DECK_FILTERS) {
      if (deck.variants?.length) {
        for (const v of deck.variants) {
          builtIn.push({
            id: v.id,
            label: `${deck.displayName} — ${v.label}`,
            filter: { ...deck, id: v.id, tags: v.tags ?? deck.tags, entityType: v.entityType ?? deck.entityType },
          })
        }
      } else {
        builtIn.push({ id: deck.id, label: deck.displayName, filter: deck })
      }
    }
    getAllCustomDecks()
      .then(records => setDeckOptions([...builtIn, ...records.map(r => { const f = deckRecordToFilter(r); return { id: f.id, label: f.displayName, filter: f } })]))
      .catch(() => setDeckOptions(builtIn))

    const { astrologyMode } = loadTraditionSettings()
    const builtInSpreads = BUILT_IN_SPREADS.map(s => injectSpreadNames(s, astrologyMode))
    getAllCustomSpreads()
      .then(records => setAllSpreads([...builtInSpreads, ...records.map(spreadRecordToDefinition)]))
      .catch(() => setAllSpreads(builtInSpreads))
  }, [])

  // ── Continue from setup ───────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!engine || !selectedDeckId) return
    const opt = deckOptions.find(o => o.id === selectedDeckId)
    if (!opt) return
    const resolvedSpread = allSpreads.find(s => s.id === selectedSpreadId) ?? null

    let cards: BaseEntity[] = []
    try {
      if (opt.filter.cardCanonicalNames) {
        const resolved = await Promise.all(
          opt.filter.cardCanonicalNames.map(cn => engine.adapter.getEntityByCanonicalName(cn))
        )
        cards = resolved.filter((e): e is BaseEntity => e !== null)
      } else {
        const result = await engine.adapter.listEntities(
          { tags: opt.filter.tags, entityType: opt.filter.entityType },
          { offset: 0, limit: 500 }
        )
        cards = result.items
      }
    } catch (e) {
      console.error('Failed to load deck cards:', e)
    }

    setDeckFilter(opt.filter)
    setSpread(resolvedSpread)
    setDeckCards(cards)
    setPosAssignments(new Map())
    setFreeCards([])
    setClarifiers([])
    setAddingFreeCard(false)
    setAddingClarifier(false)
    setStep('record')
  }

  // ── Assignment helpers ────────────────────────────────────────────────────
  const assignPosition = (posId: string, entity: BaseEntity) =>
    setPosAssignments(m => new Map(m).set(posId, { uid: newUid(), entity, orientation: 'upright' }))

  const clearPosition = (posId: string) =>
    setPosAssignments(m => { const n = new Map(m); n.delete(posId); return n })

  const togglePositionOrientation = (posId: string) =>
    setPosAssignments(m => {
      const a = m.get(posId)
      if (!a) return m
      return new Map(m).set(posId, { ...a, orientation: a.orientation === 'reversed' ? 'upright' : 'reversed' })
    })

  const toggleFreeOrientation = (uid: string) =>
    setFreeCards(prev => prev.map(c => c.uid === uid ? { ...c, orientation: c.orientation === 'reversed' ? 'upright' : 'reversed' } : c))

  const toggleClarifierOrientation = (uid: string) =>
    setClarifiers(prev => prev.map(c => c.uid === uid ? { ...c, orientation: c.orientation === 'reversed' ? 'upright' : 'reversed' } : c))

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!engine || !deckFilter) return
    setSaving(true)
    setSaveError(null)

    const cardInputs: { id: string; cardCanonicalName: string; positionId: string | null; drawOrder: number; orientation: CardOrientation }[] = []

    if (isFree) {
      freeCards.forEach((fc, i) => {
        cardInputs.push({ id: '', cardCanonicalName: fc.entity.canonicalName, positionId: null, drawOrder: i + 1, orientation: fc.orientation })
      })
    } else {
      sortedPositions.forEach(pos => {
        const a = posAssignments.get(pos.id)
        if (a) cardInputs.push({ id: '', cardCanonicalName: a.entity.canonicalName, positionId: pos.id, drawOrder: pos.drawOrder, orientation: a.orientation })
      })
    }
    clarifiers.forEach((c, i) => {
      cardInputs.push({ id: '', cardCanonicalName: c.entity.canonicalName, positionId: null, drawOrder: cardInputs.length + i + 1, orientation: c.orientation })
    })

    let astroSnapshot = null
    if (includeSnapshot) {
      try {
        const loc = getHomeLocation()
        const { astrologyMode, houseSystem } = loadTraditionSettings()
        astroSnapshot = getNatalChart(new Date(readingDate), loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode)
      } catch (e) { console.error('Astro snapshot failed:', e) }
    }

    try {
      await saveReading({
        readingDate: new Date(readingDate).toISOString(),
        deckId: deckFilter.id,
        spreadId: spread?.id ?? null,
        isFreeReading: isFree,
        cards: cardInputs,
        question: question.trim() || null,
        subject: subject.trim() || null,
        notes,
        tags: [],
        traditionSnapshot: [],
        astroSnapshot: null,
      }, { astroSnapshot })
      navigate({ to: '/journal' })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save reading.')
      setSaving(false)
    }
  }

  // ── Render: setup step ────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read' })}>
            <ArrowLeft size={13} /> Read
          </Button>
          <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Record Physical Reading</h1>
        </div>

        <FormSection label="Deck">
          <select value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)} style={selectStyle}>
            <option value="">— Select a deck —</option>
            {deckOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </FormSection>

        <FormSection label="Spread">
          <select value={selectedSpreadId} onChange={e => setSelectedSpreadId(e.target.value)} style={selectStyle}>
            <option value="">— Free reading (no fixed positions) —</option>
            {allSpreads.filter(s => s.id !== 'free').map(s => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
        </FormSection>

        <Button onClick={handleContinue} disabled={!selectedDeckId || !engine}>
          Continue →
        </Button>
      </div>
    )
  }

  // ── Render: record step ───────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>
          <ArrowLeft size={13} /> Back
        </Button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Record Physical Reading</h1>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
            {deckFilter?.displayName}
            {spread && spread.positions.length > 0 ? ` — ${spread.displayName}` : ' — Free Reading'}
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <FormSection label="Date & Time">
        <input
          type="datetime-local"
          value={readingDate}
          onChange={e => setReadingDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </FormSection>

      {/* Question + Subject */}
      <FormSection label="Context">
        <FormRow label="Question">
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What were you asking? (optional)" style={inputStyle} />
        </FormRow>
        <FormRow label="Subject">
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="self" style={inputStyle} />
        </FormRow>
      </FormSection>

      {/* Cards — fixed positions */}
      {!isFree && (
        <FormSection label={`Cards (${sortedPositions.length} positions)`}>
          {sortedPositions.map((pos, idx) => {
            const assigned = posAssignments.get(pos.id)
            const isLast = idx === sortedPositions.length - 1
            return (
              <div key={pos.id} style={{ marginBottom: isLast ? 0 : '14px', paddingBottom: isLast ? 0 : '14px', borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{pos.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{pos.meaning}</span>
                </div>
                {assigned ? (
                  <AssignedCard
                    name={assigned.entity.primaryDisplayName}
                    orientation={assigned.orientation}
                    onToggleOrientation={() => togglePositionOrientation(pos.id)}
                    onClear={() => clearPosition(pos.id)}
                  />
                ) : (
                  <CardSearch allCards={deckCards} onSelect={entity => assignPosition(pos.id, entity)} />
                )}
              </div>
            )
          })}
        </FormSection>
      )}

      {/* Cards — free reading */}
      {isFree && (
        <FormSection label="Cards">
          {freeCards.length === 0 && !addingFreeCard && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '10px' }}>
              No cards added yet.
            </div>
          )}
          {freeCards.map((fc, i) => (
            <div key={fc.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', minWidth: '18px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <AssignedCard
                name={fc.entity.primaryDisplayName}
                orientation={fc.orientation}
                onToggleOrientation={() => toggleFreeOrientation(fc.uid)}
                onClear={() => setFreeCards(prev => prev.filter(c => c.uid !== fc.uid))}
              />
            </div>
          ))}
          {addingFreeCard ? (
            <>
              <CardSearch allCards={deckCards} onSelect={entity => setFreeCards(prev => [...prev, { uid: newUid(), entity, orientation: 'upright' }])} placeholder="Search and add card…" />
              <div style={{ marginTop: '6px' }}>
                <Button variant="ghost" size="sm" onClick={() => setAddingFreeCard(false)}>Done adding</Button>
              </div>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAddingFreeCard(true)}>
              <Plus size={12} /> Add card
            </Button>
          )}
        </FormSection>
      )}

      {/* Clarifiers */}
      <FormSection label="Clarifiers">
        {clarifiers.map((c, i) => (
          <div key={c.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', minWidth: '18px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <AssignedCard
              name={c.entity.primaryDisplayName}
              orientation={c.orientation}
              onToggleOrientation={() => toggleClarifierOrientation(c.uid)}
              onClear={() => setClarifiers(prev => prev.filter(x => x.uid !== c.uid))}
            />
          </div>
        ))}
        {addingClarifier ? (
          <>
            <CardSearch allCards={deckCards} onSelect={entity => setClarifiers(prev => [...prev, { uid: newUid(), entity, orientation: 'upright' }])} placeholder="Search and add clarifier…" />
            <div style={{ marginTop: '6px' }}>
              <Button variant="ghost" size="sm" onClick={() => setAddingClarifier(false)}>Done adding</Button>
            </div>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingClarifier(true)}>
            <Plus size={12} /> Add clarifier
          </Button>
        )}
      </FormSection>

      {/* Astrological snapshot */}
      <FormSection label="Astrological Snapshot">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={includeSnapshot}
            onChange={e => setIncludeSnapshot(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)', flexShrink: 0 }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Include sky chart for this date and time
          </span>
        </label>
        {includeSnapshot && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-subtle)', paddingLeft: '26px' }}>
            Chart will use your home location from Astrology settings, or 0°N 0°E if not set.
          </div>
        )}
      </FormSection>

      {/* Notes */}
      <FormSection label="Notes">
        <RichTextEditor
          value={notes}
          onChange={setNotes}
          placeholder="Observations, interpretations, feelings…"
          minHeight={120}
        />
      </FormSection>

      {saveError && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-danger, #e06060)' }}>
          {saveError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save to Journal'}
        </Button>
        <Button variant="ghost" onClick={() => navigate({ to: '/read' })}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── AssignedCard ─────────────────────────────────────────────────────────────

function AssignedCard({ name, orientation, onToggleOrientation, onClear }: {
  name: string
  orientation: CardOrientation
  onToggleOrientation: () => void
  onClear: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{name}</span>
      <button
        onClick={onToggleOrientation}
        style={{
          background: orientation === 'reversed' ? 'var(--color-accent-muted)' : 'var(--color-surface-3)',
          border: `1px solid ${orientation === 'reversed' ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: '3px', padding: '2px 8px', fontSize: '11px',
          color: orientation === 'reversed' ? 'var(--color-accent)' : 'var(--color-text-subtle)',
          cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.5,
        }}
      >
        {orientation === 'reversed' ? '↓ Reversed' : '↑ Upright'}
      </button>
      <button
        onClick={onClear}
        title="Clear card"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex', lineHeight: 1 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── CardSearch ───────────────────────────────────────────────────────────────

function CardSearch({ allCards, onSelect, placeholder = 'Search cards…' }: {
  allCards: BaseEntity[]
  onSelect: (entity: BaseEntity) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() =>
    query.trim()
      ? allCards.filter(c => c.primaryDisplayName.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
      : [],
    [allCards, query]
  )

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: '0 0 6px 6px', maxHeight: '240px', overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {results.map(card => (
            <div
              key={card.canonicalName}
              onMouseDown={() => { onSelect(card); setQuery(''); setOpen(false) }}
              style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {card.primaryDisplayName}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '12px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0, minWidth: '80px' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  colorScheme: 'dark',
}
