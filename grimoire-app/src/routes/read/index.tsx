import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useReadingStore } from '@/stores/reading'
import { useEngineStore } from '@/stores/engine'
import { BUILT_IN_DECK_FILTERS, BUILT_IN_SPREADS, SPREAD_ENTITY_CN } from '@/lib/built-in-data'
import type { DeckFilter, SpreadDefinition } from '@/lib/built-in-data'
import { Card, CardArtPlaceholder } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import React, { useEffect, useState } from 'react'
import type { BaseEntity } from '@grimoire/core'
import { getAllCustomSpreads, spreadRecordToDefinition, getAllCustomDecks, deckRecordToFilter } from '@/lib/custom-db'
import { Settings2, Info } from 'lucide-react'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { ZODIAC_SIGNS_IAU } from '@/lib/astro-engine'
import { loadSettings } from '@/lib/settings-store'
import { useSpreadById } from '@/lib/spread-hooks'

export const Route = createFileRoute('/read/')({
  component: ReadPage,
})

function ReadPage() {
  const { step, selectedDeck, selectedSpread, setDeck, setSpread, startDraw, reset } = useReadingStore()
  const { engine } = useEngineStore()
  const navigate = useNavigate()
  const spreadById = useSpreadById()

  // Pre-select the user's default reading spread when entering the spread step
  useEffect(() => {
    if (step !== 'spread' || selectedSpread) return
    const defaultId = loadSettings().defaultReadingSpreadId
    if (!defaultId) return
    const spread = spreadById.get(defaultId)
    if (spread) setSpread(spread)
  }, [step, selectedSpread, spreadById])

  // If drawing is in progress, notes pending, or reading is complete — go to draw screen
  useEffect(() => {
    if (step === 'draw' || step === 'notes' || step === 'complete') {
      navigate({ to: '/read/draw' })
    }
  }, [step, navigate])

  // Also redirect immediately on mount if we're mid-reading
  // (handles navigating to /read while a reading is in progress)
  useEffect(() => {
    if (step !== 'deck' && step !== 'spread') {
      navigate({ to: '/read/draw' })
    }
  }, [])

  const handleDeckSelect = (deck: DeckFilter) => {
    setDeck(deck)
  }

  const handleSpreadSelect = async (spreadRaw: SpreadDefinition) => {
    let spread = spreadRaw

    // ── year-ahead: inject real month names starting from this month ──────────
    if (spread.id === 'year-ahead') {
      const now         = new Date()
      const startMonth  = now.getMonth()
      const startYear   = now.getFullYear()
      const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
      spread = {
        ...spread,
        positions: spread.positions.map((p, i) => {
          const d    = new Date(startYear, startMonth + i, 1)
          const name = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
          return { ...p, name, meaning: `What ${name} holds for you.` }
        }),
      }
    }

    // ── zodiac-year: add Ophiuchus position when IAU mode is active ───────────
    if (spread.id === 'zodiac-year') {
      const { astrologyMode } = loadTraditionSettings()
      if (astrologyMode === 'iau') {
        const oph = ZODIAC_SIGNS_IAU[8]  // Ophiuchus, between Scorpius and Sagittarius
        const ophPosition = {
          id: oph.canonicalName,
          name: oph.name,
          meaning: 'Ophiuchus — the serpent-bearer; healing, transformation, esoteric knowledge.',
          drawOrder: 9,
          orientationRule: 'upright-reversed' as const,
          x: 0, y: 3, z: 0,
        }
        // Insert Ophiuchus after Scorpio (index 7) and renumber drawOrders
        const positions = [
          ...spread.positions.slice(0, 8),
          ophPosition,
          ...spread.positions.slice(8).map(p => ({ ...p, drawOrder: p.drawOrder + 1 })),
        ]
        spread = { ...spread, positions }
      }
    }

    if (!engine || !selectedDeck) return

    // Load card entities for this deck
    let items: BaseEntity[]
    try {
      if (selectedDeck.cardCanonicalNames) {
        const resolved = await Promise.all(
          selectedDeck.cardCanonicalNames.map(cn => engine.adapter.getEntityByCanonicalName(cn))
        )
        items = resolved.filter((e): e is BaseEntity => e !== null)
      } else {
        const result = await engine.adapter.listEntities(
          { tags: selectedDeck.tags, entityType: selectedDeck.entityType },
          { offset: 0, limit: 500 }
        )
        items = result.items
      }
    } catch (err) {
      console.error('Failed to load deck cards:', err)
      window.alert('Could not load the deck. Please try again.')
      return
    }

    // Only commit the step transition once the deck has actually loaded,
    // so the draw screen never opens with a stale/empty shuffled deck.
    setSpread(spread)
    startDraw(items)
    navigate({ to: '/read/draw' })
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>New Reading</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {step !== 'deck' && (
            <Button variant="ghost" size="sm" onClick={() => { if (window.confirm('Start over? Your current selection will be cleared.')) reset() }}>Reset</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/record' })}>Record Physical</Button>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step === 'deck' ? 0 : 1} />

      {step === 'deck' && (
        <DeckSelection onSelect={handleDeckSelect} selected={selectedDeck} onManage={() => navigate({ to: '/read/decks' })} />
      )}

      {step === 'spread' && selectedDeck && (
        <SpreadSelection
          deck={selectedDeck}
          onSelect={handleSpreadSelect}
          selected={selectedSpread}
          onManage={() => navigate({ to: '/read/spreads' })}
        />
      )}
    </div>
  )
}

// ─── Info button ──────────────────────────────────────────────────────────────

function InfoButton({ canonicalName }: { canonicalName: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName } })}
      title="View reference page"
      style={{
        position: 'absolute', top: '8px', right: '8px', zIndex: 1,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '3px', lineHeight: 1, borderRadius: '3px',
        color: 'var(--color-text-subtle)',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
    >
      <Info size={13} />
    </button>
  )
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Choose Deck', 'Choose Spread', 'Draw Cards', 'Notes']
  return (
    <div style={{ display: 'flex', gap: '0', marginBottom: '32px' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: i <= current ? 'var(--color-accent)' : 'var(--color-surface-2)',
              border: `1px solid ${i <= current ? 'var(--color-accent)' : 'var(--color-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 600,
              color: i <= current ? '#0d0d12' : 'var(--color-text-subtle)',
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: '11px', color: i === current ? 'var(--color-text)' : 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
              {s}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: '1px', background: i < current ? 'var(--color-accent-muted)' : 'var(--color-border)',
              marginTop: '14px', minWidth: '24px',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const TAROT_TAGS = new Set(['rider-waite-smith', 'thoth', 'tarot-de-marseille', 'etteilla', 'major-arcana'])
function isTarotDeck(deck: DeckFilter): boolean {
  if (deck.tags?.some(t => TAROT_TAGS.has(t))) return true
  return deck.variants?.some(v => v.tags?.some(t => TAROT_TAGS.has(t))) ?? false
}

function DeckSelection({ onSelect, selected, onManage }: { onSelect: (d: DeckFilter) => void; selected: DeckFilter | null; onManage: () => void }) {
  const [pendingDeck, setPendingDeck]   = useState<DeckFilter | null>(null)
  const [customDecks, setCustomDecks]   = useState<DeckFilter[]>([])

  useEffect(() => {
    getAllCustomDecks().then(records => setCustomDecks(records.map(deckRecordToFilter)))
  }, [])

  const handleDeckClick = (deck: DeckFilter) => {
    if (!deck.variants) {
      setPendingDeck(null)
      onSelect(deck)
    } else {
      setPendingDeck(prev => prev?.id === deck.id ? null : deck)
    }
  }

  const handleVariantClick = (deck: DeckFilter, variantId: string) => {
    const variant = deck.variants!.find(v => v.id === variantId)!
    const resolved: DeckFilter = {
      id: variant.id,
      displayName: deck.displayName,
      description: deck.description,
      tags: variant.tags,
      entityType: variant.entityType ?? deck.entityType,
      reversalEnabled: deck.reversalEnabled,
    }
    setPendingDeck(null)
    onSelect(resolved)
  }

  // Determine which parent deck id is "active" (either a variant was selected, or pending)
  const selectedParentId = selected
    ? BUILT_IN_DECK_FILTERS.find(d => d.variants?.some(v => v.id === selected.id))?.id ?? selected.id
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-text-muted)', margin: 0 }}>
          Step 1 — Choose a Deck
        </h2>
        <button
          onClick={onManage}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}
        >
          <Settings2 size={12} /> Manage custom decks
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {BUILT_IN_DECK_FILTERS.map(deck => {
          const isPending = pendingDeck?.id === deck.id
          const isSelected = selectedParentId === deck.id
          return (
            <div key={deck.id} style={{ position: 'relative' }}>
              <Card
                onClick={() => handleDeckClick(deck)}
                selected={isSelected || isPending}
              >
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px', paddingRight: deck.infoCanonicalName ? '18px' : 0 }}>
                  {deck.displayName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  {deck.description}
                </div>
                {isTarotDeck(deck) && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                    Reversals: {deck.reversalEnabled ? 'enabled' : 'disabled'}
                  </div>
                )}
                {isPending && deck.variants && (
                  <div style={{ marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>Choose a variant to continue:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {deck.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleVariantClick(deck, v.id)}
                        style={{
                          padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                          background: selected?.id === v.id ? 'var(--color-accent)' : 'var(--color-surface-3)',
                          color: selected?.id === v.id ? '#0d0d12' : 'var(--color-text)',
                          border: `1px solid ${selected?.id === v.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          fontFamily: 'inherit',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  </div>
                )}
              </Card>
              {deck.infoCanonicalName && <InfoButton canonicalName={deck.infoCanonicalName} />}
            </div>
          )
        })}
        {customDecks.map(deck => (
          <Card
            key={deck.id}
            onClick={() => onSelect(deck)}
            selected={selected?.id === deck.id}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px' }}>{deck.displayName}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{deck.description}</div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
              {deck.cardCanonicalNames!.length} cards
              {deck.reversalEnabled ? ' · Reversals on' : ''}
              <span style={{ marginLeft: '6px', color: 'var(--color-accent)' }}>Custom</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SpreadCard({ spread, onSelect, isSelected }: { spread: SpreadDefinition; onSelect: (s: SpreadDefinition) => void; isSelected: boolean }) {
  const entityCn = SPREAD_ENTITY_CN[spread.id]
  return (
    <div style={{ position: 'relative' }}>
      <Card onClick={() => onSelect(spread)} selected={isSelected}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px', paddingRight: entityCn ? '18px' : 0 }}>
          {spread.displayName}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
          {spread.description}
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
          {spread.positions.length === 0 ? 'Free form' : `${spread.positions.length} position${spread.positions.length !== 1 ? 's' : ''}`}
          {!spread.isBuiltIn && <span style={{ marginLeft: '6px', color: 'var(--color-accent)' }}>Custom</span>}
        </div>
      </Card>
      {entityCn && <InfoButton canonicalName={entityCn} />}
    </div>
  )
}

function SpreadSelection({ deck, onSelect, selected, onManage }: {
  deck: DeckFilter
  onSelect: (s: SpreadDefinition) => void
  selected: SpreadDefinition | null
  onManage: () => void
}) {
  const [customSpreads, setCustomSpreads] = useState<SpreadDefinition[]>([])

  useEffect(() => {
    getAllCustomSpreads().then(records => setCustomSpreads(records.map(spreadRecordToDefinition)))
  }, [])

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        {deck.displayName}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-text-muted)', margin: 0 }}>
          Step 2 — Choose a Spread
        </h2>
        <button
          onClick={onManage}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}
        >
          <Settings2 size={12} /> Manage custom spreads
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {BUILT_IN_SPREADS
          .filter(s => !s.requiredDeckId || s.requiredDeckId === deck.id)
          .map(spread => (
            <SpreadCard key={spread.id} spread={spread} onSelect={onSelect} isSelected={selected?.id === spread.id} />
          ))}
        {customSpreads.map(spread => (
          <SpreadCard key={spread.id} spread={spread} onSelect={onSelect} isSelected={selected?.id === spread.id} />
        ))}
      </div>
    </div>
  )
}
