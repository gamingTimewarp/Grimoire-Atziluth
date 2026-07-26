import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useReadingStore } from '@/stores/reading'
import type { DrawnCard } from '@/stores/reading'
import { EntityArt } from '@/components/ui/EntityArt'
import { SpreadGrid } from '@/components/ui/SpreadGrid'
import type { CardSlot } from '@/components/ui/SpreadGrid'
import { TreeOfLifeSpreadDisplay } from '@/components/ui/TreeOfLifeSpread'
import { ChakraSpreadDisplay } from '@/components/ui/ChakraSpread'
import { YearAheadSpreadDisplay } from '@/components/ui/YearAheadSpread'
import { ZodiacYearSpreadDisplay } from '@/components/ui/ZodiacYearSpread'
import { GrandTableauSpreadDisplay } from '@/components/ui/GrandTableauSpread'
import { LENORMAND_COMBINATIONS } from '@/lib/lenormand-combinations'
import type { SpreadPosition } from '@grimoire/core'
import { Button } from '@/components/ui/Button'
import { RichTextEditor, RichTextRenderer } from '@/components/ui/RichText'
import React, { useRef, useState } from 'react'
import { RotateCcw, ChevronRight, Plus, Sparkles, Trash2, Share2, X, Flag } from 'lucide-react'
import { loadAccessibilitySettings } from '@/lib/accessibility-store'
import { getVoidOfCourseMoon } from '@/lib/astro-engine'
import { exportReadingAsMarkdown, exportReadingAsImage } from '@/lib/reading-export'

export const Route = createFileRoute('/read/draw')({
  component: DrawPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCardSlots(drawnCards: DrawnCard[]): CardSlot[] {
  return drawnCards.map(dc => ({
    positionId: dc.positionId ?? '',
    label: dc.card.primaryDisplayName,
    orientation: dc.orientation,
    canonicalName: dc.card.canonicalName,
    entity: dc.card,
  }))
}

// ─── Shared card display (spread grid or free row) ────────────────────────────

function CardDisplay({
  positions,
  drawnCards,
  isFree,
  scale = 1,
  onCardClick,
  onLabelClick,
  spreadId,
  navigateFn,
}: {
  positions: SpreadPosition[]
  drawnCards: DrawnCard[]
  isFree: boolean
  scale?: number
  onCardClick: (canonicalName: string) => void
  onLabelClick?: (canonicalName: string) => void
  spreadId?: string
  /** Navigate-always fn passed to Grand Tableau (which has its own selection mechanism). */
  navigateFn?: (canonicalName: string) => void
}) {
  const a11y = loadAccessibilitySettings()
  if (!isFree) {
    if (spreadId === 'tree-of-life') {
      return (
        <TreeOfLifeSpreadDisplay
          cards={toCardSlots(drawnCards)}
          onCardClick={onCardClick}
          onLabelClick={onLabelClick}
          scale={scale}
        />
      )
    }
    if (spreadId === 'chakra') {
      return (
        <ChakraSpreadDisplay
          cards={toCardSlots(drawnCards)}
          onCardClick={onCardClick}
          onLabelClick={onLabelClick}
          scale={scale}
        />
      )
    }
    if (spreadId === 'year-ahead') {
      return (
        <YearAheadSpreadDisplay
          cards={toCardSlots(drawnCards)}
          onCardClick={onCardClick}
          scale={scale}
        />
      )
    }
    if (spreadId === 'zodiac-year') {
      return (
        <ZodiacYearSpreadDisplay
          cards={toCardSlots(drawnCards)}
          onCardClick={onCardClick}
          onLabelClick={onLabelClick}
          scale={scale}
        />
      )
    }
    if (spreadId === 'grand-tableau') {
      return (
        <GrandTableauSpreadDisplay
          cards={toCardSlots(drawnCards)}
          onCardClick={navigateFn ?? onCardClick}
          scale={scale}
          combinations={LENORMAND_COMBINATIONS}
        />
      )
    }
    return (
      <SpreadGrid
        positions={positions}
        cards={toCardSlots(drawnCards)}
        scale={scale}
        onCardClick={onCardClick}
        showCaptions={a11y.cardCaptions}
        reversedDisplay={a11y.reversedDisplay}
      />
    )
  }

  if (drawnCards.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {drawnCards.map((dc, i) => (
        <div
          key={i}
          style={{ textAlign: 'center', cursor: 'pointer' }}
          onClick={() => onCardClick(dc.card.canonicalName)}
          title={dc.card.primaryDisplayName}
        >
          <EntityArt
            entity={dc.card}
            width={Math.round(80 * scale)}
            height={Math.round(128 * scale)}
          />
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>
            {dc.orientation === 'reversed' ? '↓ Rev' : '↑'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Keyword panel ────────────────────────────────────────────────────────────

function CardKeywordPanel({ drawnCard, onNavigate, onClose }: {
  drawnCard: DrawnCard
  onNavigate: () => void
  onClose: () => void
}) {
  const card = drawnCard.card
  const isReversed = drawnCard.orientation === 'reversed'

  // Support both string meanings (RWS/Lenormand) and keyword arrays (Etteilla)
  const uprightRaw = card.extendedData?.uprightMeaning ?? card.extendedData?.uprightKeywords
  const reversedRaw = card.extendedData?.reversedMeaning ?? card.extendedData?.reversedKeywords
  const upright = Array.isArray(uprightRaw) ? uprightRaw.join(', ') : uprightRaw as string | undefined
  const reversed = Array.isArray(reversedRaw) ? reversedRaw.join(', ') : reversedRaw as string | undefined
  const meaning = isReversed && reversed ? reversed : upright

  return (
    <div style={{
      marginTop: '12px', padding: '14px 16px',
      background: 'var(--color-surface-2)', border: '1px solid var(--color-accent-muted)',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: meaning ? '8px' : 0 }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
          {card.primaryDisplayName}{isReversed ? ' ↓' : ''}
        </span>
        <button
          onClick={onClose}
          aria-label="Close keyword panel"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: '2px', marginLeft: '8px', flexShrink: 0 }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
      {meaning ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 10px', lineHeight: '1.5' }}>
          <em style={{ color: 'var(--color-text-subtle)' }}>{isReversed && reversed ? 'Reversed: ' : 'Upright: '}</em>
          {meaning}
        </p>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)', margin: '0 0 10px' }}>
          No keywords available.
        </p>
      )}
      <button
        onClick={onNavigate}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px', padding: 0, fontFamily: 'inherit' }}
      >
        View in Reference →
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DrawPage() {
  const {
    step, selectedDeck, selectedSpread, shuffledCards, reversalsEnabled,
    drawnCards, currentPositionIndex, drawCard, flipLastCard, drawClarifier,
    question, setQuestion, notes, setNotes, subject, setSubject,
    saveAndFinish, savedReading, reset,
  } = useReadingStore()
  const navigate = useNavigate()
  const [saving,           setSaving]          = useState(false)
  const [saveError,        setSaveError]       = useState<string | null>(null)
  const [announcement,     setAnnouncement]    = useState('')
  const [confirmDiscard,   setConfirmDiscard]  = useState(false)
  const [confirmEndEarly,  setConfirmEndEarly] = useState(false)
  const [exporting,        setExporting]       = useState(false)
  const [selectedCardName, setSelectedCardName] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Reset keyword panel when switching steps
  React.useEffect(() => { setSelectedCardName(null) }, [step])

  // Announce newly drawn cards to screen readers when captions are enabled
  const a11y = loadAccessibilitySettings()
  React.useEffect(() => {
    if (!a11y.cardCaptions || drawnCards.length === 0) return
    const last = drawnCards[drawnCards.length - 1]
    if (!last) return
    const posName = selectedSpread?.positions.find(p => p.id === last.positionId)?.name
    const text = `${last.card.primaryDisplayName}, ${last.orientation}${posName ? `, ${posName}` : ''}`
    setAnnouncement(text)
  }, [drawnCards.length])

  if (!selectedDeck) {
    navigate({ to: '/read' })
    return null
  }

  const positions = selectedSpread
    ? [...selectedSpread.positions].sort((a, b) => a.drawOrder - b.drawOrder)
    : []
  const isFree = positions.length === 0
  // Spread readings: separate positional cards from clarifiers (positionId === null)
  const spreadCards = isFree ? drawnCards : drawnCards.filter(dc => dc.positionId !== null)
  const clarifierCards = isFree ? [] : drawnCards.filter(dc => dc.positionId === null)
  const currentPosition = isFree ? null : positions[currentPositionIndex] ?? null
  const allPositionsFilled = !isFree && spreadCards.length >= positions.length
  const canDrawMore = shuffledCards.length > drawnCards.length
  // Spreads like the Grand Tableau consume the entire deck by definition — every
  // card already has a place, so a separate clarifier pull doesn't apply.
  const allowClarifiers = selectedSpread?.allowClarifiers !== false
  const lastDrawn = drawnCards[drawnCards.length - 1] ?? null

  const goToReference = (canonicalName: string) => {
    if (!canonicalName) return
    navigate({ to: '/reference/$canonicalName', params: { canonicalName } })
  }

  const handleKeywordPanelClick = (canonicalName: string) => {
    if (selectedCardName === canonicalName) {
      goToReference(canonicalName)
      setSelectedCardName(null)
    } else {
      setSelectedCardName(canonicalName)
    }
  }

  const selectedDrawnCard = selectedCardName
    ? drawnCards.find(dc => dc.card.canonicalName === selectedCardName) ?? null
    : null

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await saveAndFinish()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Complete screen ──────────────────────────────────────────────────────
  if (step === 'complete' && savedReading) {
    const entityNameMap = new Map(drawnCards.map(dc => [dc.card.canonicalName, dc.card.primaryDisplayName]))
    const positionNameMap = new Map(positions.map(p => [p.id, p.name]))

    const handleExportMarkdown = async () => {
      setExporting(true)
      try {
        await exportReadingAsMarkdown(
          savedReading,
          selectedSpread?.displayName ?? null,
          selectedDeck.displayName,
          positionNameMap,
          entityNameMap,
        )
      } catch (e) { console.error(e) } finally { setExporting(false) }
    }

    const handleExportImage = async () => {
      if (!exportRef.current) return
      setExporting(true)
      try {
        await exportReadingAsImage(exportRef.current)
      } catch (e) { console.error(e) } finally { setExporting(false) }
    }

    return (
      <div style={{ maxWidth: '760px' }}>
        <div ref={exportRef} style={{ padding: '16px', background: 'var(--color-surface-1)', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-accent)', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Reading saved
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: savedReading.question ? '6px' : '20px' }}>
          {selectedSpread?.displayName ?? 'Free Reading'} — {selectedDeck.displayName}
        </h1>
        {savedReading.question && (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '20px', marginTop: 0 }}>
            "{savedReading.question}"
          </p>
        )}

        <div style={{ marginBottom: '20px' }}>
          <CardDisplay
            positions={positions}
            drawnCards={isFree ? drawnCards : spreadCards}
            isFree={isFree}
            scale={0.8}
            onCardClick={handleKeywordPanelClick}
            onLabelClick={goToReference}
            spreadId={selectedSpread?.id}
            navigateFn={goToReference}
          />
          {clarifierCards.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Clarifier{clarifierCards.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {clarifierCards.map((dc, i) => (
                  <div key={i} role="button" tabIndex={0} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleKeywordPanelClick(dc.card.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeywordPanelClick(dc.card.canonicalName) } }} aria-label={dc.card.primaryDisplayName}>
                    <EntityArt entity={dc.card} width={Math.round(80 * 0.8)} height={Math.round(128 * 0.8)} />
                    <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>{dc.card.primaryDisplayName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>{dc.orientation === 'reversed' ? '↓ Rev' : '↑'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {savedReading.notes && (
          <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
            <RichTextRenderer markdown={savedReading.notes} />
          </div>
        )}

        </div>{/* end exportRef */}

        {selectedDrawnCard && (
          <CardKeywordPanel
            drawnCard={selectedDrawnCard}
            onNavigate={() => goToReference(selectedDrawnCard.card.canonicalName)}
            onClose={() => setSelectedCardName(null)}
          />
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button onClick={reset}>New Reading</Button>
          <Button variant="ghost" onClick={() => navigate({ to: '/journal' })}>View in Journal</Button>
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <Button variant="ghost" size="sm" onClick={handleExportMarkdown} disabled={exporting}>
              <Share2 size={13} /> Markdown
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportImage} disabled={exporting}>
              <Share2 size={13} /> Image
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Notes screen ─────────────────────────────────────────────────────────
  if (step === 'notes') {
    return (
      <div style={{ maxWidth: '760px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '4px' }}>Notes</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '20px' }}>
          {selectedDeck.displayName} — {selectedSpread?.displayName ?? 'Free Reading'} — {drawnCards.length} cards
        </p>

        {/* Card summary — spread grid or free row, all cards clickable */}
        <div style={{ marginBottom: clarifierCards.length > 0 ? '12px' : '4px' }}>
          <CardDisplay
            positions={positions}
            drawnCards={isFree ? drawnCards : spreadCards}
            isFree={isFree}
            scale={0.75}
            onCardClick={handleKeywordPanelClick}
            onLabelClick={goToReference}
            spreadId={selectedSpread?.id}
            navigateFn={goToReference}
          />
        </div>
        {clarifierCards.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Clarifier{clarifierCards.length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {clarifierCards.map((dc, i) => (
                <div key={i} role="button" tabIndex={0} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleKeywordPanelClick(dc.card.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeywordPanelClick(dc.card.canonicalName) } }} aria-label={dc.card.primaryDisplayName}>
                  <EntityArt entity={dc.card} width={Math.round(60 * 0.75)} height={Math.round(96 * 0.75)} />
                  <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>{dc.card.primaryDisplayName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>{dc.orientation === 'reversed' ? '↓ Rev' : '↑'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedDrawnCard && (
          <CardKeywordPanel
            drawnCard={selectedDrawnCard}
            onNavigate={() => goToReference(selectedDrawnCard.card.canonicalName)}
            onClose={() => setSelectedCardName(null)}
          />
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Question / Intention</label>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What are you asking? (optional)"
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="self"
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Notes</label>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            placeholder="Observations, interpretations, feelings…"
            minHeight={160}
          />
        </div>

        {saveError && (
          <div style={{ padding: '10px 14px', background: 'rgba(196,74,74,0.1)', border: '1px solid var(--color-danger)', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-danger)' }}>
            Save failed: {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Reading'}
          </Button>
          {confirmDiscard ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Discard this reading?</span>
              <Button variant="ghost" size="sm" onClick={() => { reset(); navigate({ to: '/read' }) }}>
                Yes, discard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)}>
              <Trash2 size={13} /> Discard
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Draw screen ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        {selectedDeck.displayName} — {selectedSpread?.displayName ?? 'Free Reading'}
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: drawnCards.length === 0 ? '16px' : '4px' }}>
        {currentPosition ? `Draw: ${currentPosition.name}` : allPositionsFilled ? 'All Cards Drawn' : 'Draw Cards'}
      </h1>

      {/* Question field — editable before first card, shown as subtitle after */}
      {drawnCards.length === 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What are you asking? (optional)"
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '14px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ) : question ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '16px', marginTop: 0 }}>
          "{question}"
        </p>
      ) : null}

      {/* Void-of-course Moon notice */}
      {(() => { const voc = getVoidOfCourseMoon(new Date()); return voc.isVoid ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '5px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          <span>☽ v/c</span>
          <span>Moon void-of-course · {voc.degreesRemaining.toFixed(1)}° to ingress</span>
        </div>
      ) : null })()}

      {/* Screen reader announcements for card draws */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      {/* Position context — current sephira / position name and meaning */}
      {currentPosition && (
        <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>{currentPosition.name}</strong>
          {' — '}{currentPosition.meaning}
        </div>
      )}

      {/* ── Action area — always above the spread so it's never below the fold ── */}

      {/* Spread: drawing in progress (or deck exhausted before all positions filled) */}
      {!isFree && !allPositionsFilled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {canDrawMore ? (
            <>
              <Button onClick={drawCard}>Draw Card</Button>
              {allowClarifiers && spreadCards.length > 0 && (
                <Button variant="ghost" size="sm" onClick={drawClarifier}>
                  <Sparkles size={13} />
                  Clarifier
                </Button>
              )}
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                {shuffledCards.length - drawnCards.length} remaining
              </span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              No cards left in the deck.
            </span>
          )}
          {drawnCards.length > 0 && (
            confirmEndEarly ? (
              <>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  End reading now? Unfilled positions will be left blank.
                </span>
                <Button variant="ghost" size="sm" onClick={() => useReadingStore.setState({ step: 'notes' })}>
                  Yes, end reading
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmEndEarly(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmEndEarly(true)}>
                <Flag size={13} />
                End Reading
              </Button>
            )
          )}
        </div>
      )}

      {/* Spread: all positions filled */}
      {allPositionsFilled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Button onClick={() => useReadingStore.setState({ step: 'notes' })}>
            Continue to Notes <ChevronRight size={16} />
          </Button>
          {allowClarifiers && canDrawMore && (
            <Button variant="ghost" size="sm" onClick={drawClarifier}>
              <Sparkles size={13} />
              Clarifier
            </Button>
          )}
        </div>
      )}

      {/* Flip — standalone so it's visible after every draw, not gated by canDrawMore */}
      {!isFree && lastDrawn && reversalsEnabled && (
        <div style={{ marginBottom: '20px' }}>
          <Button variant="ghost" size="sm" onClick={flipLastCard}>
            <RotateCcw size={13} />
            Flip {lastDrawn.orientation === 'reversed' ? '(→ Upright)' : '(→ Reversed)'}
          </Button>
        </div>
      )}

      {/* Free reading: draw more or proceed */}
      {isFree && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          {canDrawMore && (
            <Button variant={drawnCards.length === 0 ? 'primary' : 'ghost'} onClick={drawCard}>
              {drawnCards.length === 0 ? 'Draw Card' : <><Plus size={14} /> Draw Another</>}
            </Button>
          )}
          {lastDrawn && reversalsEnabled && (
            <Button variant="ghost" size="sm" onClick={flipLastCard}>
              <RotateCcw size={13} />
              Flip {lastDrawn.orientation === 'reversed' ? '(→ Upright)' : '(→ Reversed)'}
            </Button>
          )}
          {drawnCards.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              {shuffledCards.length - drawnCards.length} remaining
            </span>
          )}
          {drawnCards.length > 0 && (
            <Button onClick={() => useReadingStore.setState({ step: 'notes' })}>
              Continue to Notes <ChevronRight size={16} />
            </Button>
          )}
        </div>
      )}

      {/* ── Spread display ─────────────────────────────────────────────────────── */}

      {/* Spread grid */}
      {!isFree && (
        <div style={{ marginBottom: clarifierCards.length > 0 ? '12px' : '4px' }}>
          {selectedSpread?.id === 'tree-of-life' ? (
            <TreeOfLifeSpreadDisplay
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={handleKeywordPanelClick}
              onLabelClick={goToReference}
            />
          ) : selectedSpread?.id === 'chakra' ? (
            <ChakraSpreadDisplay
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={handleKeywordPanelClick}
              onLabelClick={goToReference}
            />
          ) : selectedSpread?.id === 'year-ahead' ? (
            <YearAheadSpreadDisplay
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={handleKeywordPanelClick}
            />
          ) : selectedSpread?.id === 'zodiac-year' ? (
            <ZodiacYearSpreadDisplay
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={handleKeywordPanelClick}
              onLabelClick={goToReference}
            />
          ) : selectedSpread?.id === 'grand-tableau' ? (
            <GrandTableauSpreadDisplay
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={goToReference}
              combinations={LENORMAND_COMBINATIONS}
            />
          ) : (
            <SpreadGrid
              positions={positions}
              cards={toCardSlots(spreadCards)}
              currentPositionId={currentPosition?.id ?? null}
              onCardClick={handleKeywordPanelClick}
              showCaptions={a11y.cardCaptions}
              reversedDisplay={a11y.reversedDisplay}
            />
          )}
        </div>
      )}

      {/* Clarifier cards — shown below the spread grid */}
      {clarifierCards.length > 0 && (
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Clarifier{clarifierCards.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {clarifierCards.map((dc, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => handleKeywordPanelClick(dc.card.canonicalName)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeywordPanelClick(dc.card.canonicalName) } }}
                title={dc.card.primaryDisplayName}
                aria-label={dc.card.primaryDisplayName}
              >
                <EntityArt entity={dc.card} width={66} height={106} />
                <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>
                  {dc.card.primaryDisplayName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                  {dc.orientation === 'reversed' ? '↓ Rev' : '↑ Upright'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free reading: drawn cards in a row */}
      {isFree && drawnCards.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {drawnCards.map((dc, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              style={{ textAlign: 'center', cursor: 'pointer' }}
              onClick={() => handleKeywordPanelClick(dc.card.canonicalName)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeywordPanelClick(dc.card.canonicalName) } }}
              title={dc.card.primaryDisplayName}
              aria-label={dc.card.primaryDisplayName}
            >
              <EntityArt entity={dc.card} width={80} height={128} />
              <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', marginTop: '3px' }}>
                {dc.orientation === 'reversed' ? '↓ Reversed' : '↑ Upright'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyword panel — shown when a card is selected */}
      {selectedDrawnCard && (
        <CardKeywordPanel
          drawnCard={selectedDrawnCard}
          onNavigate={() => goToReference(selectedDrawnCard.card.canonicalName)}
          onClose={() => setSelectedCardName(null)}
        />
      )}
    </div>
  )
}
